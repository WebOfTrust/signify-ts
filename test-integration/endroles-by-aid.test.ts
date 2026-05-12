import { beforeAll, afterAll, describe, test, expect } from 'vitest';
import assert from 'assert';
import signify, { SignifyClient } from 'signify-ts';
import type { EndRole } from '../src/keri/core/keyState.ts';
import {
    assertOperations,
    getOrCreateClient,
    getOrCreateIdentifier,
    resolveOobi,
    waitForNotifications,
    waitOperation,
} from './utils/test-util.ts';
import {
    addEndRoleMultisig,
    startMultisigIncept,
    acceptMultisigIncept,
} from './utils/multisig-utils.ts';
import { step } from './utils/test-step.ts';

const groupName = 'endroles-byaid-group';

let client1: SignifyClient, client2: SignifyClient, aliceClient: SignifyClient;
let aid1: string, aid2: string;
let groupAid: string;
let agentEids: string[];

beforeAll(async () => {
    await signify.ready();
    [client1, client2, aliceClient] = await Promise.all([
        getOrCreateClient(),
        getOrCreateClient(),
        getOrCreateClient(),
    ]);
});

beforeAll(async () => {
    const [[id1], [id2]] = await Promise.all([
        getOrCreateIdentifier(client1, 'member1'),
        getOrCreateIdentifier(client2, 'member2'),
        getOrCreateIdentifier(aliceClient, 'alice'),
    ]);
    aid1 = id1;
    aid2 = id2;

    await step('Resolve member oobis across group', async () => {
        const [oobi1, oobi2] = await Promise.all([
            client1.oobis().get('member1', 'agent'),
            client2.oobis().get('member2', 'agent'),
        ]);
        await Promise.all([
            resolveOobi(client1, oobi2.oobis[0], 'member2'),
            resolveOobi(client2, oobi1.oobis[0], 'member1'),
        ]);
    });

    await step('Create 2-member multisig group (2-of-2)', async () => {
        const op1 = await startMultisigIncept(client1, {
            groupName,
            localMemberName: 'member1',
            participants: [aid1, aid2],
            isith: 2,
            nsith: 2,
            toad: 3,
            wits: [
                'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
                'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',
            ],
        });

        const notes = await waitForNotifications(client2, '/multisig/icp');
        await Promise.all(
            notes.map((note) => client2.notifications().mark(note.i))
        );
        const msgSaid = notes[notes.length - 1].a.d;
        assert(msgSaid, 'msgSaid not defined');
        const op2 = await acceptMultisigIncept(client2, {
            localMemberName: 'member2',
            groupName,
            msgSaid,
        });

        await Promise.all([
            waitOperation(client1, op1),
            waitOperation(client2, op2),
        ]);

        const multisig = await client1.identifiers().get(groupName);
        groupAid = multisig.prefix;
        console.log('Multisig created:', groupAid);
    });

    await step('Add agent end roles for group', async () => {
        const aid1Hab = await client1.identifiers().get('member1');
        const aid2Hab = await client2.identifiers().get('member2');
        const multisigAID = await client1.identifiers().get(groupName);
        const stamp = new Date().toISOString().replace('Z', '000+00:00');

        const [ops1, ops2] = await Promise.all([
            addEndRoleMultisig(
                client1,
                groupName,
                aid1Hab,
                [aid2Hab],
                multisigAID,
                stamp,
                true
            ),
            addEndRoleMultisig(
                client2,
                groupName,
                aid2Hab,
                [aid1Hab],
                multisigAID,
                stamp
            ),
        ]);

        await Promise.all([
            ...ops1.map((op) => waitOperation(client1, op)),
            ...ops2.map((op) => waitOperation(client2, op)),
        ]);

        agentEids = [client1.agent!.pre, client2.agent!.pre];
        console.log('Agent EIDs:', agentEids);
    });

    await step('Alice resolves group oobi', async () => {
        const groupOobi = await client1.oobis().get(groupName, 'agent');
        const oobiUrl = groupOobi.oobis[0].split('/agent/')[0];
        await resolveOobi(aliceClient, oobiUrl, groupName);
    });
});

afterAll(async () => {
    await assertOperations(client1, client2, aliceClient);
});

describe('endroles-by-aid', () => {
    test('alice queries /endroles/{aid}', async () => {
        const result: EndRole[] = await aliceClient.oobis().endroles(groupAid);
        expect(result).not.toHaveLength(0);
        expect(result.every((r: EndRole) => r.cid === groupAid)).toBe(true);
        expect(result.every((r: EndRole) => r.role === 'agent')).toBe(true);
        const eids = result.map((r: EndRole) => r.eid).sort();
        expect(eids).toEqual([...agentEids].sort());
    });

    test('alice queries /endroles/{aid}/agent', async () => {
        const result: EndRole[] = await aliceClient
            .oobis()
            .endroles(groupAid, 'agent');
        expect(result).not.toHaveLength(0);
        expect(result.every((r: EndRole) => r.role === 'agent')).toBe(true);
        expect(result.every((r: EndRole) => r.cid === groupAid)).toBe(true);
        const eids = result.map((r: EndRole) => r.eid).sort();
        expect(eids).toEqual([...agentEids].sort());
    });

    test('alice queries non-existent role returns empty', async () => {
        const result: EndRole[] = await aliceClient
            .oobis()
            .endroles(groupAid, 'mailbox');
        expect(result).toHaveLength(0);
    });

    test('alice queries unknown AID returns empty', async () => {
        const result: EndRole[] = await aliceClient
            .oobis()
            .endroles('EXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        expect(result).toHaveLength(0);
    });

    test('alice queries her own AID returns her agent eid', async () => {
        const aliceAid = (await aliceClient.identifiers().get('alice')).prefix;
        const result: EndRole[] = await aliceClient.oobis().endroles(aliceAid);
        expect(result).toHaveLength(1);
        expect(result[0].role).toEqual('agent');
        expect(result[0].cid).toEqual(aliceAid);
    });
});
