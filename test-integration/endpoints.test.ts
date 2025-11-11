import { beforeAll, describe, test } from 'vitest';
import { strict as assert } from 'assert';
import { SignifyClient } from 'signify-ts';
import {
    getEndRoles,
    getOrCreateClient,
    waitOperation,
} from './utils/test-util.ts';

let client: SignifyClient;
let cid: string;

beforeAll(async () => {
    client = await getOrCreateClient();
    const icpResult = await client.identifiers().create('aid1');
    cid = (await waitOperation(client, await icpResult.op())).response.i;
});

describe('endpoint authorisation', () => {
    test('can authorise agent role for KERIA', async () => {
        assert.equal((await getEndRoles(client, 'aid1', 'agent')).length, 0);

        const rpyResult = await client
            .identifiers()
            .addEndRole('aid1', 'agent', client.agent!.pre);
        await waitOperation(client, await rpyResult.op());

        const endRoles = await getEndRoles(client, 'aid1', 'agent');
        assert.equal(endRoles.length, 1);
        assert.equal(
            JSON.stringify(endRoles[0]),
            JSON.stringify({
                cid,
                role: 'agent',
                eid: client.agent!.pre,
            })
        );
    });

    test('can authorise an endpoint we control', async () => {
        // For sake of demonstrating this test, cid = eid.
        // Other use cases might have a different agent act as cid.
        const endRpyResult = await client
            .identifiers()
            .addEndRole('aid1', 'mailbox', cid);
        await waitOperation(client, await endRpyResult.op());

        const endRoles = await getEndRoles(client, 'aid1', 'mailbox');
        assert.equal(endRoles.length, 1);
        assert.equal(
            JSON.stringify(endRoles[0]),
            JSON.stringify({
                cid,
                role: 'mailbox',
                eid: cid,
            })
        );

        const locRpyResult = await client.identifiers().addLocScheme('aid1', {
            url: 'https://mymailbox.com',
            scheme: 'https',
        });
        await waitOperation(client, await locRpyResult.op());

        const oobi = (await client.oobis().get('aid1', 'mailbox')).oobis[0];
        assert.equal(oobi, `https://mymailbox.com/oobi/${cid}/mailbox/${cid}`);
    });
});
