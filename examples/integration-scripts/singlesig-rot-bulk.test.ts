import { strict as assert } from 'assert';
import signify, { SignifyClient, CesrNumber } from 'signify-ts';
import { waitOperation } from './utils/test-util';
import { getOrCreateClient, getOrCreateIdentifier } from './utils/test-setup';

const WITNESS_AIDS = [
    'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
    'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
    'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',
];

test('multisig', async function run() {
    await signify.ready();

    const [client1] = await Promise.all([getOrCreateClient()]);

    let [aid1] = await Promise.all([createAID(client1, 'aid1', WITNESS_AIDS)]);

    aid1 = await client1.identifiers().get(aid1.name);
    assert.equal(aid1.name, 'aid1');
    assert.equal(aid1.state.s, '0');
    assert.equal(Number.isInteger(aid1.state.s), false);
    assert.equal(Number(aid1.state.s), 0);

    let rotCount = 15;
    for (let i = 1; i < rotCount; i++) {
        let rotResult = await client1.identifiers().rotate(aid1.name);
        await waitOperation(client1, await rotResult.op());

        aid1 = await client1.identifiers().get(aid1.name);
        let sner = new CesrNumber({}, undefined, aid1.state.s);
        assert.equal(sner.num, i);
        assert.equal(sner.numh, i.toString(16));
    }
}, 400000);

async function createAID(client: SignifyClient, name: string, wits: string[]) {
    await getOrCreateIdentifier(client, name, {
        wits: wits,
        toad: wits.length,
    });
    return await client.identifiers().get(name);
}
