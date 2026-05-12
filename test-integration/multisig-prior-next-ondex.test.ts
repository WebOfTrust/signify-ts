import {
    Algos,
    HabState,
    KeyState,
    Serder,
    Siger,
    SignifyClient,
    assertMultisigIcp,
    d,
    messagize,
    ready,
} from 'signify-ts';
import { assert, test } from 'vitest';
import {
    getOrCreateClient,
    getOrCreateIdentifier,
    markNotification,
    waitForNotifications,
    waitOperation,
} from './utils/test-util.ts';

test('3-of-3 multisig replacement rotation signs with prior next ondexes', async () => {
    await ready();

    const suffix = Date.now().toString(36);
    const names = {
        member1: `ondex-member1-${suffix}`,
        member2: `ondex-member2-${suffix}`,
        member3: `ondex-member3-${suffix}`,
        member4: `ondex-member4-${suffix}`,
        group: `ondex-group-${suffix}`,
    };

    const [client1, client2, client3, client4] = await Promise.all([
        getOrCreateClient(),
        getOrCreateClient(),
        getOrCreateClient(),
        getOrCreateClient(),
    ]);

    const [aid1, aid2, aid3, aid4] = await Promise.all([
        createAID(client1, names.member1),
        createAID(client2, names.member2),
        createAID(client3, names.member3),
        createAID(client4, names.member4),
    ]);

    await resolveOobisForReplacement(
        [client1, client2, client3],
        [
            [names.member1, client1],
            [names.member2, client2],
            [names.member3, client3],
            [names.member4, client4],
        ]
    );

    await createThreeOfThreeGroup({
        clients: [client1, client2, client3],
        memberNames: [names.member1, names.member2, names.member3],
        groupName: names.group,
        aids: [aid1, aid2, aid3],
    });

    // Rotate the existing member AIDs so their current keys expose the
    // group prior next digests committed by the multisig inception.
    const [singleRot1, singleRot2, singleRot3] = await Promise.all([
        client1.identifiers().rotate(names.member1),
        client2.identifiers().rotate(names.member2),
        client3.identifiers().rotate(names.member3),
    ]);
    await Promise.all([
        waitOperation(
            client1,
            await singleRot1.op(),
            AbortSignal.timeout(20_000)
        ),
        waitOperation(
            client2,
            await singleRot2.op(),
            AbortSignal.timeout(20_000)
        ),
        waitOperation(
            client3,
            await singleRot3.op(),
            AbortSignal.timeout(20_000)
        ),
    ]);

    const [member1State, member2State, member3State, member4State] =
        await queryReplacementStates(client1, [aid1, aid2, aid3, aid4]);

    // Each recipient must also know the rotated member KELs before it can
    // verify and accept the multisig exchange messages signed by those
    // rotated member AIDs.
    await Promise.all([
        queryReplacementStates(client2, [aid1, aid2, aid3, aid4]),
        queryReplacementStates(client3, [aid1, aid2, aid3, aid4]),
    ]);

    // This is the protocol-valid first replacement step: the current
    // signing set is still LAR1/LAR2/LAR3, while the next set removes LAR3
    // and adds LAR4. LAR3 must still be able to sign because LAR3 was
    // committed in the prior next set.
    const states = [member1State, member2State, member3State];
    const rstates = [member1State, member2State, member4State];

    const rot1 = await client1
        .identifiers()
        .rotate(names.group, { states, rstates });
    const sig1 = new Siger({ qb64: rot1.sigs[0] });
    assert.equal(sig1.index, 0);
    assert.equal(sig1.ondex, 0);

    const rot2 = await client2
        .identifiers()
        .rotate(names.group, { states, rstates });
    const sig2 = new Siger({ qb64: rot2.sigs[0] });
    assert.equal(sig2.index, 1);
    assert.equal(sig2.ondex, 1);

    // This is the bug reproduction. LAR3 is signing with the third
    // current key, and its current key was committed at position 2 in the
    // group's prior next digests. Even though LAR3 is intentionally absent
    // from the proposed next rstates, its rotation signature should carry
    // index=2 and ondex=2.
    const rot3 = await client3
        .identifiers()
        .rotate(names.group, { states, rstates });
    const sig3 = new Siger({ qb64: rot3.sigs[0] });
    assert.equal(sig3.index, 2);
    assert.equal(sig3.ondex, 2);
}, 60_000);

async function createAID(client: SignifyClient, name: string) {
    await getOrCreateIdentifier(client, name, { wits: [], toad: 0 });
    return await client.identifiers().get(name);
}

async function createThreeOfThreeGroup({
    clients,
    memberNames,
    groupName,
    aids,
}: {
    clients: [SignifyClient, SignifyClient, SignifyClient];
    memberNames: [string, string, string];
    groupName: string;
    aids: [HabState, HabState, HabState];
}) {
    const states = aids.map((aid) => aid.state);
    const [client1, client2, client3] = clients;
    const [aid1, aid2, aid3] = aids;

    const icp1 = await client1.identifiers().create(groupName, {
        algo: Algos.group,
        mhab: aid1,
        isith: 3,
        nsith: 3,
        toad: 0,
        wits: [],
        states,
        rstates: states,
    });
    const groupOp1 = await icp1.op();
    await sendInceptionNotice({
        client: client1,
        localMemberName: memberNames[0],
        groupName,
        localAid: aid1,
        serder: icp1.serder,
        sigs: icp1.sigs,
        recipients: [aid2.prefix, aid3.prefix],
        smids: states.map((state) => state.i),
    });

    const msg2 = await waitAndMarkNotification(client2, '/multisig/icp');
    const icpExn2 = assertMultisigIcp(
        (await client2.groups().getRequest(msg2))[0]
    ).exn;
    const icp2 = await client2.identifiers().create(groupName, {
        algo: Algos.group,
        mhab: aid2,
        isith: icpExn2.e.icp.kt,
        nsith: icpExn2.e.icp.nt,
        toad: parseInt(icpExn2.e.icp.bt),
        wits: icpExn2.e.icp.b,
        states,
        rstates: states,
    });
    const groupOp2 = await icp2.op();
    await sendInceptionNotice({
        client: client2,
        localMemberName: memberNames[1],
        groupName,
        localAid: aid2,
        serder: icp2.serder,
        sigs: icp2.sigs,
        recipients: [aid1.prefix, aid3.prefix],
        smids: icpExn2.a.smids,
    });

    const msg3 = await waitAndMarkNotification(client3, '/multisig/icp');
    const icpExn3 = assertMultisigIcp(
        (await client3.groups().getRequest(msg3))[0]
    ).exn;
    const icp3 = await client3.identifiers().create(groupName, {
        algo: Algos.group,
        mhab: aid3,
        isith: icpExn3.e.icp.kt,
        nsith: icpExn3.e.icp.nt,
        toad: parseInt(icpExn3.e.icp.bt),
        wits: icpExn3.e.icp.b,
        states,
        rstates: states,
    });
    const groupOp3 = await icp3.op();
    await sendInceptionNotice({
        client: client3,
        localMemberName: memberNames[2],
        groupName,
        localAid: aid3,
        serder: icp3.serder,
        sigs: icp3.sigs,
        recipients: [aid1.prefix, aid2.prefix],
        smids: icpExn3.a.smids,
    });

    await Promise.all([
        waitOperation(client1, groupOp1, AbortSignal.timeout(20_000)),
        waitOperation(client2, groupOp2, AbortSignal.timeout(20_000)),
        waitOperation(client3, groupOp3, AbortSignal.timeout(20_000)),
    ]);
}

async function queryReplacementStates(
    client: SignifyClient,
    aids: [HabState, HabState, HabState, HabState]
): Promise<[KeyState, KeyState, KeyState, KeyState]> {
    const [state1, state2, state3, state4] = await Promise.all([
        queryState(client, aids[0].prefix, '1'),
        queryState(client, aids[1].prefix, '1'),
        queryState(client, aids[2].prefix, '1'),
        queryState(client, aids[3].prefix, '0'),
    ]);
    return [state1, state2, state3, state4];
}

async function queryState(client: SignifyClient, prefix: string, sn: string) {
    const op = await client.keyStates().query(prefix, sn);
    const result = await waitOperation(client, op, AbortSignal.timeout(20_000));
    return result.response;
}

async function resolveOobisForReplacement(
    clients: SignifyClient[],
    aliases: Array<[string, SignifyClient]>
) {
    const oobis = await Promise.all(
        aliases.map(async ([name, client]) => [
            name,
            (await client.oobis().get(name, 'agent')).oobis[0],
        ])
    );

    await Promise.all(
        clients.flatMap((client) =>
            oobis.map(async ([name, oobi]) => {
                const op = await client.oobis().resolve(oobi, name);
                await waitOperation(client, op, AbortSignal.timeout(20_000));
            })
        )
    );
}

async function sendInceptionNotice({
    client,
    localMemberName,
    groupName,
    localAid,
    serder,
    sigs,
    recipients,
    smids,
}: {
    client: SignifyClient;
    localMemberName: string;
    groupName: string;
    localAid: HabState;
    serder: Serder;
    sigs: string[];
    recipients: string[];
    smids: string[];
}) {
    const atc = attachment(serder, sigs);
    await client
        .exchanges()
        .send(
            localMemberName,
            groupName,
            localAid,
            '/multisig/icp',
            { gid: serder.pre, smids, rmids: smids },
            { icp: [serder, atc] },
            recipients
        );
}

function attachment(serder: Serder, sigs: string[]) {
    const sigers = sigs.map((sig) => new Siger({ qb64: sig }));
    const ims = d(messagize(serder, sigers));
    return ims.substring(serder.size);
}

async function waitAndMarkNotification(client: SignifyClient, route: string) {
    const notes = await waitForNotifications(client, route, {
        maxRetries: 30,
        minSleep: 500,
        maxSleep: 500,
        timeout: 15_000,
    });
    await Promise.all(notes.map((note) => markNotification(client, note)));
    return notes[notes.length - 1]?.a.d ?? '';
}
