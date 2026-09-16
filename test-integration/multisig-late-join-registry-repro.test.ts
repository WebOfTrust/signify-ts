import assert from 'assert';
import { test } from 'vitest';
import signify, {
    CreateIdentiferArgs,
    CredentialData,
    CredentialResult,
    EventResult,
    HabState,
    KeyState,
    Registry,
    Serder,
    Siger,
    SignifyClient,
    assertMultisigIss,
    assertMultisigRot,
    d,
    messagize,
    randomNonce,
} from 'signify-ts';
import { resolveEnvironment } from './utils/resolve-env.ts';
import { retry } from './utils/retry.ts';
import {
    createTimestamp,
    getIssuedCredential,
    getOrCreateClients,
    markNotification,
    Notification,
    waitAndMarkNotification,
    waitOperation,
} from './utils/test-util.ts';
import {
    acceptMultisigIncept,
    addEndRoleMultisig,
    createRegistryMultisig,
    issueCredentialMultisig,
    startMultisigIncept,
} from './utils/multisig-utils.ts';

const { agentUrl, vleiServerUrl, witnessIds } = resolveEnvironment();

const QVI_SCHEMA_SAID = 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao';
const QVI_SCHEMA_URL = `${vleiServerUrl}/oobi/${QVI_SCHEMA_SAID}`;
const NOTIFICATION_WAIT = {
    minSleep: 250,
    maxSleep: 1000,
    timeout: 120_000,
};
const RETRY_WAIT = {
    minSleep: 250,
    maxSleep: 1000,
    timeout: 120_000,
};

test('late joined member can recover simple multisig registry and credential from credential CESR export', async () => {
    await signify.ready();

    const suffix = Date.now().toString(36);
    const names = {
        memberA: `late-reg-a-${suffix}`,
        memberB: `late-reg-b-${suffix}`,
        memberC: `late-reg-c-${suffix}`,
        holder: `late-reg-holder-${suffix}`,
        group: `late-reg-group-${suffix}`,
        registry: `late-registry-${suffix}`,
    };

    const [clientA, clientB, clientC, holderClient] =
        await getOrCreateClients(4);

    const aidArgs = {
        toad: witnessIds.length,
        wits: witnessIds,
    };
    const [memberA, memberB, memberC, holder] = await Promise.all([
        createAidWithTimeout(clientA, names.memberA, aidArgs),
        createAidWithTimeout(clientB, names.memberB, aidArgs),
        createAidWithTimeout(clientC, names.memberC, aidArgs),
        createAidWithTimeout(holderClient, names.holder, aidArgs),
    ]);

    await resolveOobis([
        [clientB, clientA, names.memberB, memberB],
        [clientA, clientB, names.memberA, memberA],
        [holderClient, clientA, names.holder, holder],
        [holderClient, clientB, names.holder, holder],
    ]);
    await Promise.all([
        resolveOobiWithTimeout(clientA, QVI_SCHEMA_URL, QVI_SCHEMA_SAID),
        resolveOobiWithTimeout(clientB, QVI_SCHEMA_URL, QVI_SCHEMA_SAID),
        resolveOobiWithTimeout(clientC, QVI_SCHEMA_URL, QVI_SCHEMA_SAID),
    ]);

    const group = await createTwoOfTwoMultisig(
        clientA,
        clientB,
        names,
        memberA,
        memberB
    );

    const registry = await createSharedRegistry(
        clientA,
        clientB,
        names,
        memberA,
        memberB,
        group
    );

    const credentialSaid = await issueSharedCredential(
        clientA,
        clientB,
        memberA,
        memberB,
        group,
        registry,
        holder
    );
    await assertCredentialReadableAndExportable(
        clientA,
        credentialSaid,
        registry.regk
    );
    await assertCredentialReadableAndExportable(
        clientB,
        credentialSaid,
        registry.regk
    );

    await resolveLateJoinOobis(
        clientA,
        clientB,
        clientC,
        names,
        memberA,
        memberB,
        memberC
    );
    await rotateLateMemberIntoCurrentSigningSet(
        clientA,
        clientB,
        clientC,
        names,
        memberA,
        memberB,
        memberC
    );

    const joinedGroup = await clientC.identifiers().get(names.group);
    assert.equal(joinedGroup.prefix, group.prefix);
    assert.equal(joinedGroup.state.k.length, 3);
    assert.equal(joinedGroup.state.n.length, 3);

    await assertRegistryNotVisible(clientC, names.group, registry.regk);

    const exportedCesr = await clientA.credentials().get(credentialSaid, true);
    await importCredentialCesr(memberC.prefix, exportedCesr);
    await assertCredentialStateVisible(clientC, registry.regk, credentialSaid);
    await assertCredentialReadable(clientC, credentialSaid);

    await clientC
        .registries()
        .rename(names.group, registry.regk, registry.name);
    await assertRegistryVisible(clientC, names.group, registry.regk);
    await assertCredentialReadableAndExportable(
        clientC,
        credentialSaid,
        registry.regk
    );

    const postJoinCredentialSaid = await issuePostJoinCredentialWithAllMembers(
        clientA,
        clientB,
        clientC,
        memberA,
        memberB,
        memberC,
        names.group,
        registry,
        holder
    );
    assert.notEqual(postJoinCredentialSaid, credentialSaid);
}, 420_000);

async function createTwoOfTwoMultisig(
    clientA: SignifyClient,
    clientB: SignifyClient,
    names: {
        memberA: string;
        memberB: string;
        group: string;
    },
    memberA: HabState,
    memberB: HabState
): Promise<HabState> {
    const opA = await startMultisigIncept(clientA, {
        groupName: names.group,
        localMemberName: names.memberA,
        participants: [memberA.prefix, memberB.prefix],
        isith: 2,
        nsith: 2,
        toad: witnessIds.length,
        wits: witnessIds,
    });
    const msgSaid = await waitAndMarkNotification(
        clientB,
        '/multisig/icp',
        NOTIFICATION_WAIT
    );
    const opB = await acceptMultisigIncept(clientB, {
        groupName: names.group,
        localMemberName: names.memberB,
        msgSaid,
    });

    await Promise.all([
        waitOperation(clientA, opA, operationSignal()),
        waitOperation(clientB, opB, operationSignal()),
    ]);
    await markIfPresent(clientA, '/multisig/icp');

    const [groupA, groupB] = await Promise.all([
        clientA.identifiers().get(names.group),
        clientB.identifiers().get(names.group),
    ]);
    assert.equal(groupA.prefix, groupB.prefix);
    assert.equal(groupA.state.k.length, 2);

    await addTwoMemberGroupAgentEndRoles(
        clientA,
        clientB,
        memberA,
        memberB,
        groupA,
        groupB
    );
    return await clientA.identifiers().get(names.group);
}

async function createAidWithTimeout(
    client: SignifyClient,
    name: string,
    args: CreateIdentiferArgs
) {
    const result = await client.identifiers().create(name, args);
    await waitOperation(client, await result.op(), operationSignal());

    const endRole = await client
        .identifiers()
        .addEndRole(name, 'agent', client.agent!.pre);
    await waitOperation(client, await endRole.op(), operationSignal());

    return await client.identifiers().get(name);
}

async function addTwoMemberGroupAgentEndRoles(
    clientA: SignifyClient,
    clientB: SignifyClient,
    memberA: HabState,
    memberB: HabState,
    groupA: HabState,
    groupB: HabState
) {
    const timestamp = createTimestamp();
    const opsA = await addEndRoleMultisig(
        clientA,
        groupA.name,
        memberA,
        [memberB],
        groupA,
        timestamp,
        true
    );
    const opsB = await addEndRoleMultisig(
        clientB,
        groupB.name,
        memberB,
        [memberA],
        groupB,
        timestamp
    );

    await Promise.all([
        ...opsA.map((op) => waitOperation(clientA, op, operationSignal())),
        ...opsB.map((op) => waitOperation(clientB, op, operationSignal())),
    ]);
    await markIfPresent(clientA, '/multisig/rpy');
}

async function createSharedRegistry(
    clientA: SignifyClient,
    clientB: SignifyClient,
    names: { group: string; registry: string },
    memberA: HabState,
    memberB: HabState,
    group: HabState
): Promise<Registry> {
    const nonce = randomNonce();
    const opA = await createRegistryMultisig(
        clientA,
        memberA,
        [memberB],
        group,
        names.registry,
        nonce,
        true
    );
    const opB = await createRegistryMultisig(
        clientB,
        memberB,
        [memberA],
        group,
        names.registry,
        nonce
    );

    await Promise.all([
        waitOperation(clientA, opA, operationSignal()),
        waitOperation(clientB, opB, operationSignal()),
    ]);
    await markIfPresent(clientA, '/multisig/vcp');

    const [registryA, registryB] = await Promise.all([
        findRegistry(clientA, names.group, names.registry),
        findRegistry(clientB, names.group, names.registry),
    ]);
    assert.equal(registryA.regk, registryB.regk);
    return registryA;
}

async function issueSharedCredential(
    clientA: SignifyClient,
    clientB: SignifyClient,
    memberA: HabState,
    memberB: HabState,
    group: HabState,
    registry: Registry,
    holder: HabState
): Promise<string> {
    const credentialData: CredentialData = {
        i: group.prefix,
        ri: registry.regk,
        s: QVI_SCHEMA_SAID,
        a: {
            i: holder.prefix,
            dt: createTimestamp(),
            LEI: '5493001KJTIIGC8Y1R17',
        },
    };

    const resultA = await issueCredentialMultisig(
        clientA,
        memberA,
        [memberB],
        group.name,
        credentialData,
        true
    );
    const resultB = await issueCredentialMultisig(
        clientB,
        memberB,
        [memberA],
        group.name,
        credentialData
    );
    assert.equal(resultA.credentialSaid, resultB.credentialSaid);

    await Promise.all([
        waitOperation(clientA, resultA.op, operationSignal()),
        waitOperation(clientB, resultB.op, operationSignal()),
    ]);
    await markIfPresent(clientA, '/multisig/iss');

    const credential = await retry(async () => {
        const issued = await getIssuedCredential(
            clientA,
            group,
            holder,
            QVI_SCHEMA_SAID
        );
        if (!issued) {
            throw new Error('issued credential not found');
        }
        return issued as CredentialResult;
    }, RETRY_WAIT);
    assert.equal(credential.sad.d, resultA.credentialSaid);
    return resultA.credentialSaid;
}

async function issuePostJoinCredentialWithAllMembers(
    clientA: SignifyClient,
    clientB: SignifyClient,
    clientC: SignifyClient,
    memberA: HabState,
    memberB: HabState,
    memberC: HabState,
    groupName: string,
    registry: Registry,
    holder: HabState
): Promise<string> {
    const [
        currentMemberA,
        currentMemberB,
        currentMemberC,
        groupA,
        groupB,
        groupC,
    ] = await Promise.all([
        clientA.identifiers().get(memberA.name),
        clientB.identifiers().get(memberB.name),
        clientC.identifiers().get(memberC.name),
        clientA.identifiers().get(groupName),
        clientB.identifiers().get(groupName),
        clientC.identifiers().get(groupName),
    ]);
    assert.equal(groupA.prefix, groupB.prefix);
    assert.equal(groupA.prefix, groupC.prefix);
    assert.equal(groupA.state.k.length, 3);

    const credentialData: CredentialData = {
        i: groupA.prefix,
        ri: registry.regk,
        s: QVI_SCHEMA_SAID,
        a: {
            i: holder.prefix,
            dt: createTimestamp(),
            LEI: '54930084UKLVMY22DS16',
        },
    };

    const startedA = await issueCredentialMultisig(
        clientA,
        currentMemberA,
        [currentMemberB, currentMemberC],
        groupName,
        credentialData,
        true
    );
    await Promise.all([
        waitForMultisigIssRequest(clientB, startedA.credentialSaid),
        waitForMultisigIssRequest(clientC, startedA.credentialSaid),
    ]);

    const [startedB, startedC] = await Promise.all([
        issueCredentialMultisig(
            clientB,
            currentMemberB,
            [currentMemberA, currentMemberC],
            groupName,
            credentialData,
            true
        ),
        issueCredentialMultisig(
            clientC,
            currentMemberC,
            [currentMemberA, currentMemberB],
            groupName,
            credentialData,
            true
        ),
    ]);
    assert.equal(startedB.credentialSaid, startedA.credentialSaid);
    assert.equal(startedC.credentialSaid, startedA.credentialSaid);

    await Promise.all([
        waitOperation(clientA, startedA.op, operationSignal()),
        waitOperation(clientB, startedB.op, operationSignal()),
        waitOperation(clientC, startedC.op, operationSignal()),
    ]);

    await assertCredentialStateConvergence(
        [clientA, clientB, clientC],
        registry.regk,
        startedA.credentialSaid
    );
    await Promise.all([
        assertIssuedCredentialVisible(
            clientA,
            groupA.prefix,
            startedA.credentialSaid
        ),
        assertIssuedCredentialVisible(
            clientB,
            groupA.prefix,
            startedA.credentialSaid
        ),
        assertIssuedCredentialVisible(
            clientC,
            groupA.prefix,
            startedA.credentialSaid
        ),
        assertRegistryVisible(clientA, groupName, registry.regk),
        assertRegistryVisible(clientB, groupName, registry.regk),
        assertRegistryVisible(clientC, groupName, registry.regk),
        assertCredentialReadableAndExportable(
            clientA,
            startedA.credentialSaid,
            registry.regk
        ),
        assertCredentialReadableAndExportable(
            clientB,
            startedA.credentialSaid,
            registry.regk
        ),
        assertCredentialReadableAndExportable(
            clientC,
            startedA.credentialSaid,
            registry.regk
        ),
    ]);

    return startedA.credentialSaid;
}

async function waitForMultisigIssRequest(
    client: SignifyClient,
    credentialSaid: string
) {
    return await retry(async () => {
        const response = (await client.notifications().list()) as {
            notes: Notification[];
        };
        const notes = response.notes.filter(
            (note) => note.a.r === '/multisig/iss' && note.r === false
        );

        for (const note of notes.reverse()) {
            const requestSaid = note.a.d;
            if (!requestSaid) {
                continue;
            }

            try {
                const request = await client.groups().getRequest(requestSaid);
                if (!request.length) {
                    continue;
                }

                const issueGroup = assertMultisigIss(request[0]);
                const exn = issueGroup.exn as {
                    e?: { acdc?: { d?: string } };
                };
                if (exn.e?.acdc?.d === credentialSaid) {
                    await markNotification(client, note);
                    return request;
                }
            } catch {
                continue;
            }
        }

        throw new Error(
            `multisig issuance request for credential ${credentialSaid} not found`
        );
    }, RETRY_WAIT);
}

async function assertIssuedCredentialVisible(
    client: SignifyClient,
    issuerPrefix: string,
    credentialSaid: string
): Promise<CredentialResult> {
    return await retry(async () => {
        const credentials = await client.credentials().list({
            filter: { '-i': issuerPrefix },
        });
        const credential = credentials.find(
            (entry) => entry.sad.d === credentialSaid
        );
        if (!credential) {
            throw new Error(`issued credential ${credentialSaid} not found`);
        }
        return credential as CredentialResult;
    }, RETRY_WAIT);
}

async function assertCredentialStateConvergence(
    clients: SignifyClient[],
    registrySaid: string,
    credentialSaid: string
) {
    await retry(async () => {
        const states = await Promise.all(
            clients.map((client) =>
                client.credentials().state(registrySaid, credentialSaid)
            )
        );
        states.forEach((state) => assert.equal(state.et, 'iss'));

        const [first, ...rest] = states.map((state) => {
            const comparable = { ...state } as Record<string, unknown>;
            delete comparable.dt;
            return comparable;
        });
        rest.forEach((state) => assert.deepEqual(state, first));
    }, RETRY_WAIT);
}

async function rotateLateMemberIntoCurrentSigningSet(
    clientA: SignifyClient,
    clientB: SignifyClient,
    clientC: SignifyClient,
    names: {
        memberA: string;
        memberB: string;
        memberC: string;
        group: string;
    },
    memberA: HabState,
    memberB: HabState,
    memberC: HabState
) {
    const [memberAFirst, memberBFirst] = await Promise.all([
        rotateMember(clientA, names.memberA),
        rotateMember(clientB, names.memberB),
    ]);

    await queryKnownStates(clientA, [
        [memberBFirst.prefix, '1'],
        [memberC.prefix, '0'],
    ]);
    await queryKnownStates(clientB, [
        [memberAFirst.prefix, '1'],
        [memberC.prefix, '0'],
    ]);
    await queryKnownStates(clientC, [
        [memberAFirst.prefix, '1'],
        [memberBFirst.prefix, '1'],
    ]);

    const firstStates = [
        await getState(clientA, memberAFirst.prefix),
        await getState(clientA, memberBFirst.prefix),
    ];
    const firstRstates = [
        ...firstStates,
        await getState(clientA, memberC.prefix),
    ];

    await rotateExistingMembers(
        clientA,
        clientB,
        names,
        memberAFirst,
        memberBFirst,
        firstStates,
        firstRstates,
        [memberC.prefix]
    );
    await markIfPresent(clientC, '/multisig/rot');

    const firstRotationGroup = await clientA.identifiers().get(names.group);
    await queryState(
        clientC,
        firstRotationGroup.prefix,
        firstRotationGroup.state.s
    );

    const [memberASecond, memberBSecond, memberCSecond] = await Promise.all([
        rotateMember(clientA, names.memberA),
        rotateMember(clientB, names.memberB),
        rotateMember(clientC, names.memberC),
    ]);

    await queryKnownStates(clientA, [
        [memberBSecond.prefix, '2'],
        [memberCSecond.prefix, '1'],
    ]);
    await queryKnownStates(clientB, [
        [memberASecond.prefix, '2'],
        [memberCSecond.prefix, '1'],
    ]);
    await queryKnownStates(clientC, [
        [memberASecond.prefix, '2'],
        [memberBSecond.prefix, '2'],
    ]);

    const secondStates = [
        await getState(clientA, memberASecond.prefix),
        await getState(clientA, memberBSecond.prefix),
        await getState(clientA, memberCSecond.prefix),
    ];

    const opA = await rotateGroup(
        clientA,
        names.memberA,
        names.group,
        memberASecond,
        secondStates,
        secondStates,
        [memberBSecond.prefix, memberCSecond.prefix]
    );

    const bRotationNotice = await waitAndMarkNotification(
        clientB,
        '/multisig/rot',
        NOTIFICATION_WAIT
    );
    await assertRotationRequest(clientB, bRotationNotice);
    const opB = await rotateGroup(
        clientB,
        names.memberB,
        names.group,
        memberBSecond,
        secondStates,
        secondStates,
        [memberASecond.prefix, memberCSecond.prefix]
    );

    const cRotationNotice = await waitAndMarkNotification(
        clientC,
        '/multisig/rot',
        NOTIFICATION_WAIT
    );
    const opC = await joinGroupRotation(
        clientC,
        names.group,
        memberCSecond,
        cRotationNotice
    );

    await Promise.all([
        waitOperation(clientA, opA, operationSignal()),
        waitOperation(clientB, opB, operationSignal()),
        waitOperation(clientC, opC, operationSignal()),
    ]);
    await markIfPresent(clientA, '/multisig/rot');
    await markIfPresent(clientC, '/multisig/rot');
    await addThreeMemberGroupAgentEndRoles(
        clientA,
        clientB,
        clientC,
        memberASecond,
        memberBSecond,
        memberCSecond,
        names.group
    );
}

async function addThreeMemberGroupAgentEndRoles(
    clientA: SignifyClient,
    clientB: SignifyClient,
    clientC: SignifyClient,
    memberA: HabState,
    memberB: HabState,
    memberC: HabState,
    groupName: string
) {
    const [groupA, groupB, groupC] = await Promise.all([
        clientA.identifiers().get(groupName),
        clientB.identifiers().get(groupName),
        clientC.identifiers().get(groupName),
    ]);
    const timestamp = createTimestamp();
    const opsA = await addEndRoleMultisig(
        clientA,
        groupName,
        memberA,
        [memberB, memberC],
        groupA,
        timestamp,
        true
    );
    const [opsB, opsC] = await Promise.all([
        addEndRoleMultisig(
            clientB,
            groupName,
            memberB,
            [memberA, memberC],
            groupB,
            timestamp
        ),
        addEndRoleMultisig(
            clientC,
            groupName,
            memberC,
            [memberA, memberB],
            groupC,
            timestamp
        ),
    ]);

    await Promise.all([
        ...opsA.map((op) => waitOperation(clientA, op, operationSignal())),
        ...opsB.map((op) => waitOperation(clientB, op, operationSignal())),
        ...opsC.map((op) => waitOperation(clientC, op, operationSignal())),
    ]);
    await markIfPresent(clientA, '/multisig/rpy');
    await markIfPresent(clientB, '/multisig/rpy');
    await markIfPresent(clientC, '/multisig/rpy');
}

async function rotateExistingMembers(
    clientA: SignifyClient,
    clientB: SignifyClient,
    names: { memberA: string; memberB: string; group: string },
    memberA: HabState,
    memberB: HabState,
    states: KeyState[],
    rstates: KeyState[],
    extraRecipients: string[]
) {
    const opA = await rotateGroup(
        clientA,
        names.memberA,
        names.group,
        memberA,
        states,
        rstates,
        [memberB.prefix, ...extraRecipients]
    );
    const bRotationNotice = await waitAndMarkNotification(
        clientB,
        '/multisig/rot',
        NOTIFICATION_WAIT
    );
    await assertRotationRequest(clientB, bRotationNotice);
    const opB = await rotateGroup(
        clientB,
        names.memberB,
        names.group,
        memberB,
        states,
        rstates,
        [memberA.prefix, ...extraRecipients]
    );

    await Promise.all([
        waitOperation(clientA, opA, operationSignal()),
        waitOperation(clientB, opB, operationSignal()),
    ]);
    await markIfPresent(clientA, '/multisig/rot');
}

async function rotateGroup(
    client: SignifyClient,
    localMemberName: string,
    groupName: string,
    localMember: HabState,
    states: KeyState[],
    rstates: KeyState[],
    recipients: string[]
) {
    const rotation = await client
        .identifiers()
        .rotate(groupName, { states, rstates, nsith: states.length });
    await sendRotationExchange(
        client,
        localMemberName,
        groupName,
        localMember,
        rotation,
        states,
        rstates,
        recipients
    );
    return await rotation.op();
}

async function sendRotationExchange(
    client: SignifyClient,
    localMemberName: string,
    groupName: string,
    localMember: HabState,
    rotation: EventResult,
    states: KeyState[],
    rstates: KeyState[],
    recipients: string[]
) {
    const sigers = rotation.sigs.map((sig) => new Siger({ qb64: sig }));
    const ims = d(messagize(rotation.serder, sigers));
    const atc = ims.substring(rotation.serder.size);
    const embeds = {
        rot: [rotation.serder, atc],
    };

    await client.exchanges().send(
        localMemberName,
        groupName,
        localMember,
        '/multisig/rot',
        {
            gid: rotation.serder.pre,
            smids: states.map((state) => state.i),
            rmids: rstates.map((state) => state.i),
        },
        embeds,
        recipients
    );
}

async function joinGroupRotation(
    client: SignifyClient,
    groupName: string,
    localMember: HabState,
    notificationSaid: string
) {
    const rotation = await assertRotationRequest(client, notificationSaid);
    const exn = rotation.exn as {
        a: { gid: string; smids: string[]; rmids?: string[] };
        e: { rot: object };
    };
    const serder = new Serder(exn.e.rot);
    const keeper = await client.manager!.get(localMember);
    const smids = exn.a.smids;
    const rmids = exn.a.rmids ?? smids;
    const lateIndex = smids.indexOf(localMember.prefix);
    assert(lateIndex >= 0, 'late member is not in rotation signing set');
    const sigs = await keeper.sign(
        signify.b(serder.raw),
        true,
        [lateIndex],
        [lateIndex]
    );
    return await client
        .groups()
        .join(groupName, serder, sigs, exn.a.gid, smids, rmids);
}

async function assertRotationRequest(client: SignifyClient, said: string) {
    const response = await client.groups().getRequest(said);
    return assertMultisigRot(response[0]);
}

async function rotateMember(client: SignifyClient, name: string) {
    const result = await client.identifiers().rotate(name);
    await waitOperation(client, await result.op(), operationSignal());
    return await client.identifiers().get(name);
}

async function queryKnownStates(
    client: SignifyClient,
    queries: Array<[string, string]>
) {
    await Promise.all(
        queries.map(async ([prefix, sequenceNumber]) => {
            await queryState(client, prefix, sequenceNumber);
        })
    );
}

async function queryState(
    client: SignifyClient,
    prefix: string,
    sequenceNumber: string
) {
    const operation = await client.keyStates().query(prefix, sequenceNumber);
    const result = await waitOperation(client, operation, operationSignal());
    return result.response as KeyState;
}

async function getState(client: SignifyClient, prefix: string) {
    const states = await client.keyStates().get(prefix);
    assert(states.length > 0);
    return states[0] as KeyState;
}

async function resolveLateJoinOobis(
    clientA: SignifyClient,
    clientB: SignifyClient,
    clientC: SignifyClient,
    names: { memberA: string; memberB: string; memberC: string; group: string },
    memberA: HabState,
    memberB: HabState,
    memberC: HabState
) {
    const groupOobiResult = await clientA.oobis().get(names.group, 'agent');
    const groupOobi = groupOobiResult.oobis[0].split('/agent/')[0];

    await resolveOobis([
        [clientC, clientA, names.memberC, memberC],
        [clientC, clientB, names.memberC, memberC],
        [clientA, clientC, names.memberA, memberA],
        [clientB, clientC, names.memberB, memberB],
    ]);
    await resolveOobiWithTimeout(clientC, groupOobi, names.group);
}

async function resolveOobis(
    entries: Array<[SignifyClient, SignifyClient, string, HabState]>
) {
    await Promise.all(
        entries.map(async ([sourceClient, targetClient, alias, aid]) => {
            const oobi = await sourceClient.oobis().get(aid.name, 'agent');
            await resolveOobiWithTimeout(targetClient, oobi.oobis[0], alias);
        })
    );
}

async function findRegistry(
    client: SignifyClient,
    groupName: string,
    registryName: string
) {
    return await retry(async () => {
        const registries = await client.registries().list(groupName);
        const registry = registries.find(
            (entry) => entry.name === registryName
        );
        if (!registry) {
            throw new Error(`registry ${registryName} not found`);
        }
        return registry;
    }, RETRY_WAIT);
}

async function assertRegistryVisible(
    client: SignifyClient,
    groupName: string,
    registrySaid: string
) {
    await retry(async () => {
        const registries = await client.registries().list(groupName);
        assert(
            registries.some((registry) => registry.regk === registrySaid),
            `registry ${registrySaid} is not visible`
        );
    }, RETRY_WAIT);
}

async function assertRegistryNotVisible(
    client: SignifyClient,
    groupName: string,
    registrySaid: string
) {
    const registries = await client.registries().list(groupName);
    assert(
        !registries.some((registry) => registry.regk === registrySaid),
        `registry ${registrySaid} should not be visible before import`
    );
}

async function assertCredentialReadableAndExportable(
    client: SignifyClient,
    credentialSaid: string,
    registrySaid: string
) {
    await assertCredentialReadable(client, credentialSaid);
    await assertCredentialStateVisible(client, registrySaid, credentialSaid);
    const cesr = await client.credentials().get(credentialSaid, true);
    assert(cesr.length > 0);
    assert(cesr.includes(registrySaid));
    assert(cesr.includes(credentialSaid));
}

async function assertCredentialReadable(
    client: SignifyClient,
    credentialSaid: string
) {
    await retry(async () => {
        const credential = await client.credentials().get(credentialSaid);
        assert.equal(credential.sad.d, credentialSaid);
    }, RETRY_WAIT);
}

async function assertCredentialStateVisible(
    client: SignifyClient,
    registrySaid: string,
    credentialSaid: string
) {
    await retry(async () => {
        const state = await client
            .credentials()
            .state(registrySaid, credentialSaid);
        assert.equal(state.et, 'iss');
    }, RETRY_WAIT);
}

async function importCredentialCesr(destinationPrefix: string, cesr: string) {
    const response = await fetch(`${agentUrl}/`, {
        method: 'PUT',
        body: cesr,
        headers: {
            'Content-Type': 'application/octet-stream',
            'CESR-DESTINATION': destinationPrefix,
        },
    });
    assert.equal(response.status, 204, await response.text());
}

async function markIfPresent(client: SignifyClient, route: string) {
    try {
        await waitAndMarkNotification(client, route, {
            minSleep: 50,
            maxSleep: 100,
            timeout: 1000,
        });
    } catch (error) {
        assert(error instanceof Error);
    }
}

function operationSignal() {
    return AbortSignal.timeout(120_000);
}

async function resolveOobiWithTimeout(
    client: SignifyClient,
    oobi: string,
    alias?: string
) {
    const operation = await client.oobis().resolve(oobi, alias);
    await waitOperation(client, operation, operationSignal());
}
