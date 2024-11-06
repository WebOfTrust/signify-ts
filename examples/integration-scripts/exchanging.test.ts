import signify, {exchange, SignifyClient} from "signify-ts";
import {getOrCreateClient, getOrCreateIdentifier, waitOperation} from "./utils/test-util";
import {resolveEnvironment} from "./utils/resolve-env";

const { vleiServerUrl } = resolveEnvironment();
const WITNESS_AIDS = [
    'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
    'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
    'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',
];

const SCHEMA_SAID = 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao';
const SCHEMA_OOBI = `${vleiServerUrl}/oobi/${SCHEMA_SAID}`;

test('ESSR exchanging', async function run() {
    await signify.ready();
    // Boot two clients
    const [client1, client2] = await Promise.all([
        getOrCreateClient(),
        getOrCreateClient()
    ]);

    // Exchange OOBIs
    console.log('Resolving OOBIs');
    const [oobi1, oobi2] = await Promise.all([
        client1.oobis().get('client1', 'agent'),
        client2.oobis().get('client2', 'agent'),
    ]);

    let op1 = await client1.oobis().resolve(oobi2.oobis[0], 'client2');
    op1 = await waitOperation(client1, op1);
    op1 = await client1.oobis().resolve(SCHEMA_OOBI, 'schema');
    op1 = await waitOperation(client1, op1);
    console.log('Client1 resolved client2 OOBI');


    let op2 = await client2.oobis().resolve(oobi1.oobis[0], 'client1');
    op2 = await waitOperation(client2, op2);
    op2 = await client2.oobis().resolve(SCHEMA_OOBI, 'schema');
    op2 = await waitOperation(client2, op2);
    console.log('Client2 resolved client1 OOBI');


    // Create ESSR payload
    let [exn, end] = exchange('/essr/req', {}, 'test', '', undefined);
});

async function createAID(client: SignifyClient, name: string, wits: string[]) {
    await getOrCreateIdentifier(client, name, {
        wits: wits,
        toad: wits.length,
    });
    return await client.identifiers().get(name);
}