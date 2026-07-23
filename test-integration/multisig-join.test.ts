import signify, {
    HabState,
    KeyState,
    Serder,
    SignifyClient,
    assertMultisigIcp,
    assertMultisigRot,
} from 'signify-ts';
import {
    getOrCreateClient,
    getOrCreateIdentifier,
    markNotification,
    waitAndMarkNotification as waitAndMarkNotificationWithRetry,
    waitForNotifications,
    waitOperation,
} from './utils/test-util.ts';
import {
    acceptMultisigIncept,
    startMultisigIncept,
} from './utils/multisig-utils.ts';
import { assert, beforeAll, describe, test } from 'vitest';

const NOTIFICATION_WAIT = {
    maxRetries: 30,
    minSleep: 500,
    maxSleep: 500,
    timeout: 15_000,
};

describe('multisig-join', () => {
    const nameMember1 = 'member1';
    const nameMember2 = 'member2';
    const nameMember3 = 'member3';
    const nameMultisig = 'multisigGroup';

    let client1: SignifyClient;
    let client2: SignifyClient;
    let client3: SignifyClient;

    beforeAll(async () => {
        await signify.ready();

        [client1, client2] = await Promise.all([
            getOrCreateClient(),
            getOrCreateClient(),
        ]);

        await Promise.all([
            createAID(client1, nameMember1, []),
            createAID(client2, nameMember2, []),
        ]);

        const [oobi1, oobi2] = await Promise.all([
            client1.oobis().get(nameMember1, 'agent'),
            client2.oobis().get(nameMember2, 'agent'),
        ]);

        const opOobi1 = await client1
            .oobis()
            .resolve(oobi2.oobis[0], nameMember2);
        const opOobi2 = await client2
            .oobis()
            .resolve(oobi1.oobis[0], nameMember1);
        await Promise.all([
            waitOperation(client1, opOobi1),
            waitOperation(client2, opOobi2),
        ]);
    });

    test('should create multisig', async () => {
        const [aid1, aid2] = await Promise.all([
            client1.identifiers().get(nameMember1),
            client2.identifiers().get(nameMember2),
        ]);
        const states = [aid1.state, aid2.state];
        const icpResult = await client1.identifiers().create(nameMultisig, {
            algo: signify.Algos.group,
            mhab: aid1,
            isith: 1,
            nsith: 1,
            toad: aid1.state.b.length,
            wits: aid1.state.b,
            states: states,
            rstates: states,
        });

        const createMultisig1 = await icpResult.op();

        const serder = icpResult.serder;

        const sigs = icpResult.sigs;
        const sigers = sigs.map((sig) => new signify.Siger({ qb64: sig }));

        const ims = signify.d(signify.messagize(serder, sigers));
        const atc = ims.substring(serder.size);
        const embeds = {
            icp: [serder, atc],
        };

        const smids = [aid2.state.i];
        const recipients = [aid2.state.i];

        await client1
            .exchanges()
            .send(
                nameMember1,
                nameMultisig,
                aid1,
                '/multisig/icp',
                { gid: serder.pre, smids: smids, rmids: smids },
                embeds,
                recipients
            );

        const msgSaid = await waitAndMarkNotification(client2, '/multisig/icp');

        const response = await client2.groups().getRequest(msgSaid);
        const multisigIcpGroup = assertMultisigIcp(response[0]);
        const exn = multisigIcpGroup.exn;
        const icp = exn.e.icp;

        const icpResult2 = await client2.identifiers().create(nameMultisig, {
            algo: signify.Algos.group,
            mhab: aid2,
            isith: icp.kt,
            nsith: icp.nt,
            toad: parseInt(icp.bt),
            wits: icp.b,
            states,
            rstates: states,
        });
        const createMultisig2 = await icpResult2.op();

        const [createResult1, createResult2] = await Promise.all([
            waitOperation(client1, createMultisig1),
            waitOperation(client2, createMultisig2),
        ]);

        assert.equal(createResult1.response.k[0], aid1.state.k[0]);
        assert.equal(createResult1.response.k[1], aid2.state.k[0]);
        assert.equal(createResult2.response.k[0], aid1.state.k[0]);
        assert.equal(createResult2.response.k[1], aid2.state.k[0]);

        const members1 = await client1.identifiers().members(nameMultisig);
        const members2 = await client2.identifiers().members(nameMultisig);

        const agentEnds1 = members1.signing[0].ends.agent;
        if (!agentEnds1) {
            throw new Error(
                'members1.signing[0].ends.agent is null or undefined'
            );
        }
        const eid1 = Object.keys(agentEnds1)[0];

        const agentEnds2 = members2.signing[1].ends.agent;
        if (!agentEnds2) {
            throw new Error(
                'members2.signing[1].ends.agent is null or undefined'
            );
        }
        const eid2 = Object.keys(agentEnds2)[0];

        const [endRoleOperation1, endRoleOperation2] = await Promise.all([
            client1.identifiers().addEndRole(nameMultisig, 'agent', eid1),
            client2.identifiers().addEndRole(nameMultisig, 'agent', eid2),
        ]);

        await waitOperation(client1, await endRoleOperation1.op());
        await waitOperation(client2, await endRoleOperation2.op());
    });

    test('should add member3 to multisig', async () => {
        client3 = await getOrCreateClient();

        const aid3 = await createAID(client3, nameMember3, []);

        const [oobi1, oobi2, oobi3, oobi4] = await Promise.all([
            client1.oobis().get(nameMember1, 'agent'),
            client2.oobis().get(nameMember2, 'agent'),
            client3.oobis().get(nameMember3, 'agent'),
            client1.oobis().get(nameMultisig, 'agent'),
        ]);

        const oobiMultisig = oobi4.oobis[0].split('/agent/')[0];

        const [opOobi1, opOobi2, opOobi3, opOobi4, opOobi5] = await Promise.all(
            [
                client1.oobis().resolve(oobi3.oobis[0], nameMember3),
                client2.oobis().resolve(oobi3.oobis[0], nameMember3),
                client3.oobis().resolve(oobi1.oobis[0], nameMember1),
                client3.oobis().resolve(oobi2.oobis[0], nameMember2),
                client3.oobis().resolve(oobiMultisig, nameMultisig),
            ]
        );
        await Promise.all([
            waitOperation(client1, opOobi1),
            waitOperation(client2, opOobi2),
            waitOperation(client3, opOobi3),
            waitOperation(client3, opOobi4),
            waitOperation(client3, opOobi5),
        ]);

        // rotate single sig
        const [rotateResult1, rotateResult2] = await Promise.all([
            client1.identifiers().rotate(nameMember1),
            client2.identifiers().rotate(nameMember2),
        ]);

        await Promise.all([
            waitOperation(client1, await rotateResult1.op()),
            waitOperation(client2, await rotateResult2.op()),
        ]);

        const [aid1, aid2] = await Promise.all([
            client1.identifiers().get(nameMember1),
            client2.identifiers().get(nameMember2),
        ]);

        const updates = await Promise.all([
            await client1.keyStates().query(aid2.prefix, '1'),
            await client1.keyStates().query(aid3.prefix, '0'),
            await client2.keyStates().query(aid1.prefix, '1'),
            await client2.keyStates().query(aid3.prefix, '0'),
            await client3.keyStates().query(aid1.prefix, '1'),
            await client3.keyStates().query(aid2.prefix, '1'),
        ]);

        const [aid2State, aid3State, aid1State] = await Promise.all([
            waitOperation(client1, updates[0]),
            waitOperation(client1, updates[1]),
            waitOperation(client2, updates[2]),
            waitOperation(client2, updates[3]),
            waitOperation(client3, updates[4]),
            waitOperation(client3, updates[5]),
        ]);

        const states = [aid1State.response, aid2State.response];
        const rstates = [...states, aid3State.response];
        const rotateOperation1 = await client1
            .identifiers()
            .rotate(nameMultisig, { states, rstates });

        const serder1 = rotateOperation1.serder;
        const sigers = rotateOperation1.sigs.map(
            (sig) => new signify.Siger({ qb64: sig })
        );
        const ims = signify.d(signify.messagize(serder1, sigers));
        const atc = ims.substring(serder1.size);
        const rembeds = {
            rot: [serder1, atc],
        };
        const smids = states.map((state) => state['i']);
        const rmids = rstates.map((state) => state['i']);
        const recp = [aid2.state, aid3.state].map((state) => state['i']);

        await client1
            .exchanges()
            .send(
                nameMember1,
                nameMultisig,
                aid1,
                '/multisig/rot',
                { gid: serder1.pre, smids, rmids },
                rembeds,
                recp
            );

        await Promise.all([
            waitAndMarkNotification(client2, '/multisig/rot'),
            waitAndMarkNotification(client3, '/multisig/rot'),
        ]);

        const multisigAid = await client1.identifiers().get(nameMultisig);

        assert.equal(multisigAid.state.k.length, 2);
        assert.equal(multisigAid.state.k[0], aid1.state.k[0]);
        assert.equal(multisigAid.state.k[1], aid2.state.k[0]);

        assert.equal(multisigAid.state.n.length, 3);
        assert.equal(multisigAid.state.n[0], aid1.state.n[0]);
        assert.equal(multisigAid.state.n[1], aid2.state.n[0]);
        assert.equal(multisigAid.state.n[2], aid3.state.n[0]);
    });
    test('Rotate again to get aid3 to current signing keys and join', async () => {
        const [rotateResult1, rotateResult2, rotateResult3] = await Promise.all(
            [
                client1.identifiers().rotate(nameMember1),
                client2.identifiers().rotate(nameMember2),
                client3.identifiers().rotate(nameMember3),
            ]
        );

        await Promise.all([
            waitOperation(client1, await rotateResult1.op()),
            waitOperation(client2, await rotateResult2.op()),
            waitOperation(client3, await rotateResult3.op()),
        ]);

        const [aid1, aid2, aid3] = await Promise.all([
            client1.identifiers().get(nameMember1),
            client2.identifiers().get(nameMember2),
            client3.identifiers().get(nameMember3),
        ]);

        const updates = await Promise.all([
            await client1.keyStates().query(aid2.prefix, '2'),
            await client1.keyStates().query(aid3.prefix, '1'),
            await client2.keyStates().query(aid1.prefix, '2'),
            await client2.keyStates().query(aid3.prefix, '1'),
            await client3.keyStates().query(aid1.prefix, '2'),
            await client3.keyStates().query(aid2.prefix, '2'),
        ]);

        const [aid2State, aid3State, aid1State] = await Promise.all([
            waitOperation(client1, updates[0]),
            waitOperation(client1, updates[1]),
            waitOperation(client2, updates[2]),
            waitOperation(client2, updates[3]),
            waitOperation(client3, updates[4]),
            waitOperation(client3, updates[5]),
        ]);

        const states = [
            aid1State.response,
            aid2State.response,
            aid3State.response,
        ];
        const rotateOperation1 = await client1
            .identifiers()
            .rotate(nameMultisig, { states, rstates: states });

        const serder1 = rotateOperation1.serder;
        const sigers = rotateOperation1.sigs.map(
            (sig) => new signify.Siger({ qb64: sig })
        );
        const ims = signify.d(signify.messagize(serder1, sigers));
        const atc = ims.substring(serder1.size);
        const rembeds = {
            rot: [serder1, atc],
        };
        const smids = states.map((state) => state['i']);
        const rmids = states.map((state) => state['i']);
        const recp = [aid2.state, aid3.state].map((state) => state['i']);

        await client1
            .exchanges()
            .send(
                nameMember1,
                'multisig',
                aid1,
                '/multisig/rot',
                { gid: serder1.pre, smids, rmids },
                rembeds,
                recp
            );

        const rotationNotification3 = await waitAndMarkNotification(
            client3,
            '/multisig/rot'
        );

        const response = await client3
            .groups()
            .getRequest(rotationNotification3);
        const multisigRotGroup = assertMultisigRot(response[0]);
        const exn3 = multisigRotGroup.exn;
        const serder3 = new Serder(exn3.e.rot);
        const keeper3 = await client3.manager!.get(aid3);
        const sigs3 = keeper3.sign(signify.b(serder3.raw));

        const exnA = exn3.a;
        const joinOperation = await client3
            .groups()
            .join(nameMultisig, serder3, sigs3, exnA.gid, smids, rmids);

        await waitOperation(client3, joinOperation);

        const multisigAid = await client3.identifiers().get(nameMultisig);

        assert.equal(multisigAid.state.k.length, 3);
        assert.equal(multisigAid.state.k[0], aid1.state.k[0]);
        assert.equal(multisigAid.state.k[1], aid2.state.k[0]);
        assert.equal(multisigAid.state.k[2], aid3.state.k[0]);

        assert.equal(multisigAid.state.n.length, 3);
        assert.equal(multisigAid.state.n[0], aid1.state.n[0]);
        assert.equal(multisigAid.state.n[1], aid2.state.n[0]);
        assert.equal(multisigAid.state.n[2], aid3.state.n[0]);

        const members = await client3.identifiers().members(nameMultisig);
        const agentEnds = members.signing[2].ends.agent;
        if (!agentEnds) {
            throw new Error(
                'members.signing[2].ends.agent is null or undefined'
            );
        }
        const eid = Object.keys(agentEnds)[0];
        const endRoleOperation = await client3
            .identifiers()
            .addEndRole(nameMultisig, 'agent', eid);
        const endRoleResult = await waitOperation(
            client3,
            await endRoleOperation.op()
        );
    });

    test('can replace a group member under a 3-of-3 threshold', async () => {
        const suffix = Date.now().toString(36);
        const names = {
            member1: `ondex-member1-${suffix}`,
            member2: `ondex-member2-${suffix}`,
            member3: `ondex-member3-${suffix}`,
            member4: `ondex-member4-${suffix}`,
            group: `ondex-group-${suffix}`,
        };

        const [
            replacementClient1,
            replacementClient2,
            replacementClient3,
            replacementClient4,
        ] = await Promise.all([
            getOrCreateClient(),
            getOrCreateClient(),
            getOrCreateClient(),
            getOrCreateClient(),
        ]);

        const [aid1, aid2, aid3, aid4] = await Promise.all([
            createAID(replacementClient1, names.member1, []),
            createAID(replacementClient2, names.member2, []),
            createAID(replacementClient3, names.member3, []),
            createAID(replacementClient4, names.member4, []),
        ]);

        await resolveOobisForReplacement(
            [replacementClient1, replacementClient2, replacementClient3],
            [
                [names.member1, replacementClient1],
                [names.member2, replacementClient2],
                [names.member3, replacementClient3],
                [names.member4, replacementClient4],
            ]
        );

        const groupOp1 = await startMultisigIncept(replacementClient1, {
            groupName: names.group,
            localMemberName: names.member1,
            participants: [aid1.prefix, aid2.prefix, aid3.prefix],
            isith: 3,
            nsith: 3,
            toad: 0,
            wits: [],
        });
        const msg2 = await waitAndMarkNotificationWithRetry(
            replacementClient2,
            '/multisig/icp',
            NOTIFICATION_WAIT
        );
        const groupOp2 = await acceptMultisigIncept(replacementClient2, {
            groupName: names.group,
            localMemberName: names.member2,
            msgSaid: msg2,
        });
        const msg3 = await waitAndMarkNotificationWithRetry(
            replacementClient3,
            '/multisig/icp',
            NOTIFICATION_WAIT
        );
        const groupOp3 = await acceptMultisigIncept(replacementClient3, {
            groupName: names.group,
            localMemberName: names.member3,
            msgSaid: msg3,
        });
        await Promise.all([
            waitOperation(
                replacementClient1,
                groupOp1,
                AbortSignal.timeout(20_000)
            ),
            waitOperation(
                replacementClient2,
                groupOp2,
                AbortSignal.timeout(20_000)
            ),
            waitOperation(
                replacementClient3,
                groupOp3,
                AbortSignal.timeout(20_000)
            ),
        ]);

        // Rotate the existing member AIDs so their current keys expose the
        // group prior next digests committed by the multisig inception.
        const [singleRot1, singleRot2, singleRot3] = await Promise.all([
            replacementClient1.identifiers().rotate(names.member1),
            replacementClient2.identifiers().rotate(names.member2),
            replacementClient3.identifiers().rotate(names.member3),
        ]);
        await Promise.all([
            waitOperation(
                replacementClient1,
                await singleRot1.op(),
                AbortSignal.timeout(20_000)
            ),
            waitOperation(
                replacementClient2,
                await singleRot2.op(),
                AbortSignal.timeout(20_000)
            ),
            waitOperation(
                replacementClient3,
                await singleRot3.op(),
                AbortSignal.timeout(20_000)
            ),
        ]);

        const [member1State, member2State, member3State, member4State] =
            await queryReplacementStates(replacementClient1, [
                aid1,
                aid2,
                aid3,
                aid4,
            ]);

        // Each recipient must also know the rotated member KELs before it can
        // verify and accept the multisig exchange messages signed by those
        // rotated member AIDs.
        await Promise.all([
            queryReplacementStates(replacementClient2, [
                aid1,
                aid2,
                aid3,
                aid4,
            ]),
            queryReplacementStates(replacementClient3, [
                aid1,
                aid2,
                aid3,
                aid4,
            ]),
        ]);

        // This is the protocol-valid first replacement step: the current
        // signing set is still LAR1/LAR2/LAR3, while the next set removes LAR3
        // and adds LAR4. LAR3 must still be able to sign because LAR3 was
        // committed in the prior next set.
        const states = [member1State, member2State, member3State];
        const rstates = [member1State, member2State, member4State];

        const rot1 = await replacementClient1
            .identifiers()
            .rotate(names.group, { states, rstates });
        const sig1 = new signify.Siger({ qb64: rot1.sigs[0] });
        assert.equal(sig1.index, 0);
        assert.equal(sig1.ondex, 0);

        const rot2 = await replacementClient2
            .identifiers()
            .rotate(names.group, { states, rstates });
        const sig2 = new signify.Siger({ qb64: rot2.sigs[0] });
        assert.equal(sig2.index, 1);
        assert.equal(sig2.ondex, 1);

        // This is the bug reproduction. LAR3 is signing with the third
        // current key, and its current key was committed at position 2 in the
        // group's prior next digests. Even though LAR3 is intentionally absent
        // from the proposed next rstates, its rotation signature should carry
        // index=2 and ondex=2.
        const rot3 = await replacementClient3
            .identifiers()
            .rotate(names.group, { states, rstates });
        const sig3 = new signify.Siger({ qb64: rot3.sigs[0] });
        assert.equal(sig3.index, 2);
        assert.equal(sig3.ondex, 2);
    }, 60_000);
});

async function createAID(client: SignifyClient, name: string, wits: string[]) {
    await getOrCreateIdentifier(client, name, {
        wits: wits,
        toad: wits.length,
    });
    return await client.identifiers().get(name);
}

async function waitAndMarkNotification(client: SignifyClient, route: string) {
    const notes = await waitForNotifications(client, route);

    await Promise.all(
        notes.map(async (note) => {
            await markNotification(client, note);
        })
    );

    return notes[notes.length - 1]?.a.d ?? '';
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
        aliases.map(
            async ([name, client]): Promise<[string, string]> => [
                name,
                (await client.oobis().get(name, 'agent')).oobis[0],
            ]
        )
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
