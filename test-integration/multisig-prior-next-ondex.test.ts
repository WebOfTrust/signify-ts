import { HabState, KeyState, Siger, SignifyClient, ready } from 'signify-ts';
import { assert, test } from 'vitest';
import {
    getOrCreateClient,
    getOrCreateIdentifier,
    waitAndMarkNotification,
    waitOperation,
} from './utils/test-util.ts';
import {
    acceptMultisigIncept,
    startMultisigIncept,
} from './utils/multisig-utils.ts';

const NOTIFICATION_WAIT = {
    maxRetries: 30,
    minSleep: 500,
    maxSleep: 500,
    timeout: 15_000,
};

test('can replace a group member under a 3-of-3 threshold', async () => {
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

    const groupOp1 = await startMultisigIncept(client1, {
        groupName: names.group,
        localMemberName: names.member1,
        participants: [aid1.prefix, aid2.prefix, aid3.prefix],
        isith: 3,
        nsith: 3,
        toad: 0,
        wits: [],
    });
    const msg2 = await waitAndMarkNotification(
        client2,
        '/multisig/icp',
        NOTIFICATION_WAIT
    );
    const groupOp2 = await acceptMultisigIncept(client2, {
        groupName: names.group,
        localMemberName: names.member2,
        msgSaid: msg2,
    });
    const msg3 = await waitAndMarkNotification(
        client3,
        '/multisig/icp',
        NOTIFICATION_WAIT
    );
    const groupOp3 = await acceptMultisigIncept(client3, {
        groupName: names.group,
        localMemberName: names.member3,
        msgSaid: msg3,
    });
    await Promise.all([
        waitOperation(client1, groupOp1, AbortSignal.timeout(20_000)),
        waitOperation(client2, groupOp2, AbortSignal.timeout(20_000)),
        waitOperation(client3, groupOp3, AbortSignal.timeout(20_000)),
    ]);

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
