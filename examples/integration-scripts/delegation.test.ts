import { strict as assert } from 'assert';
import signify from 'signify-ts';
import { resolveEnvironment } from './utils/resolve-env';
import {
    assertOperations,
    getOrCreateContact,
    resolveOobi,
    waitOperation,
} from './utils/test-util';
import { retry } from './utils/retry';
import { step } from './utils/test-step';

const { url, bootUrl } = resolveEnvironment();

test('delegation', async () => {
    await signify.ready();
    // Boot two clients
    const bran1 = signify.randomPasscode();
    const bran2 = signify.randomPasscode();
    const client1 = new signify.SignifyClient(
        url,
        bran1,
        signify.Tier.low,
        bootUrl
    );
    const client2 = new signify.SignifyClient(
        url,
        bran2,
        signify.Tier.low,
        bootUrl
    );
    await client1.boot();
    await client2.boot();
    await client1.connect();
    await client2.connect();
    const state1 = await client1.state();
    const state2 = await client2.state();
    console.log(
        'Client 1 connected. Client AID:',
        state1.controller.state.i,
        'Agent AID: ',
        state1.agent.i
    );
    console.log(
        'Client 2 connected. Client AID:',
        state2.controller.state.i,
        'Agent AID: ',
        state2.agent.i
    );

    // Client 1 create delegator AID
    const icpResult1 = await client1.identifiers().create('delegator', {
        toad: 3,
        wits: [
            'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
            'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',
        ],
    });
    await waitOperation(client1, await icpResult1.op());
    const ator = await client1.identifiers().get('delegator');
    const rpyResult1 = await client1
        .identifiers()
        .addEndRole('delegator', 'agent', client1!.agent!.pre);
    await waitOperation(client1, await rpyResult1.op());
    console.log("Delegator's AID:", ator.prefix);

    // Client 2 resolves delegator OOBI
    console.log('Client 2 resolving delegator OOBI');
    const oobi1 = await client1.oobis().get('delegator', 'agent');
    await resolveOobi(client2, oobi1.oobis[0], 'delegator');
    console.log('OOBI resolved');

    // Client 2 creates delegate AID
    const icpResult2 = await client2
        .identifiers()
        .create('delegate', { delpre: ator.prefix });
    const op2 = await icpResult2.op();
    const delegatePrefix = op2.name.split('.')[1];
    console.log("Delegate's prefix:", delegatePrefix);
    console.log('Delegate waiting for approval...');

    // Client 1 approves delegation
    const anchor = {
        i: delegatePrefix,
        s: '0',
        d: delegatePrefix,
    };

    await step('delegator approves delegation', async () => {
        const result = await retry(async () => {
            const apprDelRes = await client1
                .delegations()
                .approve('delegator', anchor);
            await waitOperation(client1, await apprDelRes.op());
            console.log('Delegator approve delegation submitted');
            return apprDelRes;
        });
        assert.equal(
            JSON.stringify(result.serder.ked.a[0]),
            JSON.stringify(anchor)
        );
    });

    const op3 = await client2.keyStates().query(ator.prefix, '1');
    await waitOperation(client2, op3);

    // Client 2 check approval
    await waitOperation(client2, op2);
    const aid2 = await client2.identifiers().get('delegate');
    assert.equal(aid2.prefix, delegatePrefix);
    console.log('Delegation approved for aid:', aid2.prefix);

    await assertOperations(client1, client2);
    const rpyResult2 = await client2
        .identifiers()
        .addEndRole('delegate', 'agent', client2!.agent!.pre);
    await waitOperation(client2, await rpyResult2.op());
    const oobis = await client2.oobis().get('delegate');

    const contactId = await getOrCreateContact(
        client1,
        'delegate',
        oobis.oobis[0].split('/agent/')[0]
    );

    expect(contactId).toEqual(aid2.prefix);
}, 600000);
