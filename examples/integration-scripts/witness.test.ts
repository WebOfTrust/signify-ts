// This scrip also work if you start keria with no config file with witness urls
import { strict as assert } from 'assert';
import signify from 'signify-ts';
import { resolveEnvironment } from './utils/resolve-env';
import { resolveOobi, waitOperation } from './utils/test-util';
import { step } from './utils/test-step';

const WITNESS_AID = 'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha';
const ID1_NAME = 'aid1'
const { url, bootUrl, witnessUrls } = resolveEnvironment();

test('test witness', async () => {
    await signify.ready();
    // Boot client
    const bran1 = signify.randomPasscode();
    const client1 = new signify.SignifyClient(
        url,
        bran1,
        signify.Tier.low,
        bootUrl
    );
    await client1.boot();
    await client1.connect();
    const state1 = await client1.state();
    console.log(
        'Client connected. Client AID:',
        state1.controller.state.i,
        'Agent AID: ',
        state1.agent.i
    );

    // Client 1 resolves witness OOBI
    await resolveOobi(client1, witnessUrls[0] + `/oobi/${WITNESS_AID}`, 'wit');
    console.log('Witness OOBI resolved');

    // Client 1 creates AID with 1 witness
    const  icpRes = await client1.identifiers().create(ID1_NAME, {
        toad: 1,
        wits: [WITNESS_AID],
    });
    await waitOperation(client1, await icpRes.op());
    const aidIcp = await client1.identifiers().get(ID1_NAME);
    console.log('AID:', aidIcp.prefix);
    assert.equal(aidIcp.state.b.length, 1);
    assert.equal(aidIcp.state.b[0], WITNESS_AID);

    const oobisWit = await client1.oobis().get(ID1_NAME, 'witness');
    expect(oobisWit.oobis).toHaveLength(1);

    const oobiWit1 = oobisWit.oobis[0]
    expect(oobiWit1).toEqual(
        `http://127.0.0.1:5642/oobi/${aidIcp.prefix}/witness/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha`
    );

    const oobiResolve = await client1.oobis().resolve(oobiWit1);
    const oobiResult = await waitOperation(client1, oobiResolve);
    expect(JSON.stringify(oobiResult['response']["b"][0])).toEqual(`\"${WITNESS_AID}\"`);

    const rotRes = await client1.identifiers().rotate(ID1_NAME);
    await waitOperation(client1, await rotRes.op());
    const aidRot = await client1.identifiers().get(ID1_NAME);
    assert.equal(aidRot.state.b.length, 1);
    assert.equal(aidRot.state.b[0], WITNESS_AID);

    const ooobiRotRes = await client1.oobis().resolve(oobiWit1);
    const oobiRot = await waitOperation(client1, ooobiRotRes);
    expect(JSON.stringify(oobiRot['response']["b"][0])).toEqual(`\"${WITNESS_AID}\"`);

    // Remove witness
    const rotCutRes = await client1
        .identifiers()
        .rotate(ID1_NAME, { cuts: [WITNESS_AID] });
    await waitOperation(client1, await rotCutRes.op());
    const aidRemWit = await client1.identifiers().get(ID1_NAME);
    assert.equal(aidRemWit.state.b.length, 0);

    const ooobiRotCutRes = await client1.oobis().resolve(oobiWit1);
    const oobiRotCut = await waitOperation(client1, ooobiRotCutRes);
    expect(JSON.stringify(oobiRotCut['response']["b"][0])).toEqual(undefined);

    // Add witness again
    const rotAddRes = await client1
        .identifiers()
        .rotate(ID1_NAME, { adds: [WITNESS_AID] });

    await waitOperation(client1, await rotAddRes.op());
    const rotAddId = await client1.identifiers().get(ID1_NAME);
    assert.equal(rotAddId.state.b.length, 1);
    assert.equal(rotAddId.state.b.length, 1);
    assert.equal(rotAddId.state.b[0], WITNESS_AID);

    const ooobiRotAddRes = await client1.oobis().resolve(oobiWit1);
    const oobiRotAdd = await waitOperation(client1, ooobiRotAddRes);
    expect(JSON.stringify(oobiRotAdd['response']["b"][0])).toEqual(`\"${WITNESS_AID}\"`);

    // force submit again to witnesses
    const subRes = await client1
        .identifiers()
        .submit_id(ID1_NAME);

    await waitOperation(client1, await subRes);
    const subId = await client1.identifiers().get(ID1_NAME);
    assert.equal(subId.state.b.length, 1);
    assert.equal(subId.state.b.length, 1);
    assert.equal(subId.state.b[0], WITNESS_AID);

    const ooobiSubRes = await client1.oobis().resolve(oobiWit1);
    const oobiSub = await waitOperation(client1, ooobiSubRes);
    expect(JSON.stringify(oobiSub['response']["b"][0])).toEqual(`\"${WITNESS_AID}\"`);

    const registry = await step('Create registry', async () => {
        const registryName = 'vLEI-test-registry';
        const regResult = await client1
            .registries()
            .create({ name: subId.name, registryName: registryName });

        await waitOperation(client1, await regResult.op());
        let registries = await client1.registries().list(subId.name);
        const registry: { name: string; regk: string } = registries[0];
        assert.equal(registries.length, 1);
        assert.equal(registry.name, registryName);
    })

    const ooobiRegRes = await client1.oobis().resolve(oobiWit1);
    const oobiReg = await waitOperation(client1, ooobiRegRes);
    expect(JSON.stringify(oobiReg['response']["b"][0])).toEqual(`\"${WITNESS_AID}\"`);
    expect(JSON.stringify(oobiReg['response']["et"])).toEqual(`\"ixn\"`);

    // force submit again to witnesses
    const subRegRes = await client1
    .identifiers()
    .submit_id(ID1_NAME);

    await waitOperation(client1, await subRegRes);
    const subRegId = await client1.identifiers().get(ID1_NAME);
    assert.equal(subRegId.state.b.length, 1);
    assert.equal(subRegId.state.b.length, 1);
    assert.equal(subRegId.state.b[0], WITNESS_AID);

    const ooobiSubRegRes = await client1.oobis().resolve(oobiWit1);
    const oobiSubReg = await waitOperation(client1, ooobiSubRegRes);
    expect(JSON.stringify(oobiSubReg['response']["b"][0])).toEqual(`\"${WITNESS_AID}\"`);
    expect(JSON.stringify(oobiSubReg['response']["et"])).toEqual(`\"ixn\"`);
}, 600000);
