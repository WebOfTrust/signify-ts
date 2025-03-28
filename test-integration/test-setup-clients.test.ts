import { afterAll, assert, beforeAll, describe, test } from 'vitest';
import { SignifyClient } from 'signify-ts';
import {
    assertOperations,
    getOrCreateClients,
    getOrCreateContact,
    getOrCreateIdentifier,
} from './utils/test-util.ts';

let client1: SignifyClient, client2: SignifyClient;
let name1_id: string, name1_oobi: string;
let name2_id: string, name2_oobi: string;
let contact1_id: string, contact2_id: string;

beforeAll(async () => {
    // create two clients with random secrets
    [client1, client2] = await getOrCreateClients(2);
});
beforeAll(async () => {
    [name1_id, name1_oobi] = await getOrCreateIdentifier(client1, 'name1');
    [name2_id, name2_oobi] = await getOrCreateIdentifier(client2, 'name2');
});
beforeAll(async () => {
    contact1_id = await getOrCreateContact(client2, 'contact1', name1_oobi);
    contact2_id = await getOrCreateContact(client1, 'contact2', name2_oobi);
});
afterAll(async () => {
    await assertOperations(client1, client2);
});

describe('test-setup-clients', () => {
    test('step1', async () => {
        assert.equal(name1_id, contact1_id);
    });
    test('step2', async () => {
        assert.equal(name2_id, contact2_id);
    });
});
