import { strict as assert } from 'assert';
import signify from 'signify-ts';
import {
    assertNotifications,
    assertOperations,
    createAID,
    createTimestamp,
    getOrCreateClient,
    getOrCreateContact,
    markAndRemoveNotification,
    resolveOobi,
    waitForNotifications,
    waitOperation,
} from './utils/test-util';
import {
    acceptMultisigIncept,
    addEndRoleMultisig,
    delegateMultisig,
    startMultisigIncept,
    waitAndMarkNotification,
} from './utils/multisig-utils';
import { step } from './utils/test-step';

const gtor = 'gtor';
const gtee = 'gtee';
const tor1 = 'tor1';
const tor2 = 'tor2';
const tee1 = 'tee1';
const tee2 = 'tee2';

test('delegation-multisig', async () => {
    await signify.ready();
    // Boot three clients
    const [ctor1, ctor2, ctee1, ctee2] = await step(
        'Creating single sig clients',
        async () => {
            return await Promise.all([
                getOrCreateClient(),
                getOrCreateClient(),
                getOrCreateClient(),
                getOrCreateClient(),
            ]);
        }
    );

    // Create delegator and delegatee identifiers clients
    const [ator1, ator2, atee1, atee2] = await step(
        'Creating single sig aids',
        async () => {
            return await Promise.all([
                createAID(ctor1, tor1),
                createAID(ctor2, tor2),
                createAID(ctee1, tee1),
                createAID(ctee2, tee2),
            ]);
        }
    );

    // Exchange OOBIs
    const [toroobi1, toroobi2, teeoobi1, teeoobi2] = await step(
        'Getting OOBIs before resolving...',
        async () => {
            return await Promise.all([
                await ctor1.oobis().get(tor1, 'agent'),
                await ctor2.oobis().get(tor2, 'agent'),
                await ctee1.oobis().get(tee1, 'agent'),
                await ctee2.oobis().get(tee2, 'agent'),
            ]);
        }
    );

    await step('Resolving OOBIs', async () => {
        await Promise.all([
            resolveOobi(ctor1, toroobi2.oobis[0], tor2),
            resolveOobi(ctor2, toroobi1.oobis[0], tor1),
            resolveOobi(ctee1, teeoobi2.oobis[0], tee2),
            resolveOobi(ctee2, teeoobi1.oobis[0], tee1),
        ]);
    });
    console.log(
        `${tor1}(${ator1.prefix}) and ${tee1}(${atee1.prefix}) resolved ${tor2}(${ator2.prefix}) and ${tee2}(${atee2.prefix}) OOBIs and vice versa`
    );

    // First member start the creation of a multisig identifier
    // Create a multisig AID for the GEDA.
    // Skip if a GEDA AID has already been incepted.
    const otor1 = await step(
        `${tor1}(${ator1.prefix}) initiated delegator multisig, waiting for ${tor2}(${ator2.prefix}) to join...`,
        async () => {
            return await startMultisigIncept(ctor1, {
                groupName: gtor,
                localMemberName: ator1.name,
                participants: [ator1.prefix, ator2.prefix],
                isith: 2,
                nsith: 2,
                toad: 2,
                wits: [
                    'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                    'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
                    'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',
                ],
            });
        }
    );

    const [ntor] = await waitForNotifications(ctor2, '/multisig/icp', {
        maxSleep: 10000,
        minSleep: 1000,
        maxRetries: undefined,
        timeout: 30000,
    });
    await markAndRemoveNotification(ctor2, ntor);
    assert(ntor.a.d);
    const otor2 = await acceptMultisigIncept(ctor2, {
        localMemberName: ator2.name,
        groupName: gtor,
        msgSaid: ntor.a.d,
    });

    const torpre = otor1.name.split('.')[1];
    await Promise.all([
        waitOperation(ctor1, otor1),
        waitOperation(ctor2, otor2),
    ]);

    const agtor1 = await ctor1.identifiers().get(gtor);
    const agtor2 = await ctor2.identifiers().get(gtor);

    assert.equal(agtor1.prefix, agtor2.prefix);
    assert.equal(agtor1.name, agtor2.name);
    const agtor = agtor1;

    //Resolve delegator OOBI
    const gtorOobi = await step(
        `Add and resolve delegator OOBI ${gtor}(${agtor.prefix})`,
        async () => {
            // const ogtor1 = await ctor1.oobis().get(gtor, 'agent');
            // return await resolveOobi(ctor1, ogtor1.oobis[0], gtor);
            const timestamp = createTimestamp();
            const opList1 = await addEndRoleMultisig(
                ctor1,
                gtor,
                ator1,
                [ator2],
                agtor,
                timestamp,
                true
            );
            const opList2 = await addEndRoleMultisig(
                ctor2,
                gtor,
                ator2,
                [ator1],
                agtor,
                timestamp
            );

            await Promise.all(opList1.map((op) => waitOperation(ctor1, op)));
            await Promise.all(opList2.map((op) => waitOperation(ctor2, op)));

            await waitAndMarkNotification(ctor1, '/multisig/rpy');
            await waitAndMarkNotification(ctor2, '/multisig/rpy');

            const [ogtor1, ogtor2] = await Promise.all([
                ctor1.oobis().get(agtor.name, 'agent'),
                ctor2.oobis().get(agtor.name, 'agent'),
            ]);

            assert.equal(ogtor1.role, ogtor2.role);
            assert.equal(ogtor1.oobis[0], ogtor2.oobis[0]);

            return ogtor1.oobis[0];
        }
    );

    const oobiGtor = gtorOobi.split('/agent/')[0];
    await Promise.all([
        getOrCreateContact(ctee1, agtor.name, oobiGtor),
        getOrCreateContact(ctee2, agtor.name, oobiGtor),
    ]);

    const otee1 = await step(
        `${tee1}(${atee1.prefix}) initiated delegatee multisig, waiting for ${tee2}(${atee2.prefix}) to join...`,
        async () => {
            return await startMultisigIncept(ctee1, {
                groupName: gtee,
                localMemberName: atee1.name,
                participants: [atee1.prefix, atee2.prefix],
                isith: 2,
                nsith: 2,
                toad: 2,
                delpre: torpre,
                wits: [
                    'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                    'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
                    'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',
                ],
            });
        }
    );

    // Second member of delegatee check notifications and join the multisig
    const [ntee] = await waitForNotifications(ctee2, '/multisig/icp');
    await markAndRemoveNotification(ctee2, ntee);
    assert(ntee.a.d);

    const otee2 = await acceptMultisigIncept(ctee2, {
        localMemberName: atee2.name,
        groupName: gtee,
        msgSaid: ntee.a.d,
    });

    console.log(`${tee2} joined multisig, waiting for delegator...`);

    const agtee1 = await ctee1.identifiers().get(gtee);
    const agtee2 = await ctee2.identifiers().get(gtee);

    assert.equal(agtee1.prefix, agtee2.prefix);
    assert.equal(agtee1.name, agtee2.name);

    const teepre = otee1.name.split('.')[1];
    assert.equal(otee2.name.split('.')[1], teepre);
    console.log('Delegatee prefix:', teepre);

    await step('delegator anchors/approves delegation', async () => {
        // GEDA anchors delegation with an interaction event.
        const anchor = {
            i: teepre,
            s: '0',
            d: teepre,
        };
        const delApprOp1 = await delegateMultisig(
            ctor1,
            ator1,
            [ator2],
            agtor,
            anchor,
            true
        );
        const delApprOp2 = await delegateMultisig(
            ctor2,
            ator2,
            [ator1],
            agtor,
            anchor
        );
        const [dresult1, dresult2] = await Promise.all([
            waitOperation(ctor1, delApprOp1),
            waitOperation(ctor2, delApprOp2),
        ]);

        assert.equal(dresult1.response, dresult2.response);

        await waitAndMarkNotification(ctor1, '/multisig/ixn');
    });

    const queryOp1 = await ctor1.keyStates().query(agtor.prefix, '1');
    const queryOp2 = await ctor2.keyStates().query(agtor.prefix, '1');

    const kstor1 = await waitOperation(ctor1, queryOp1);
    const kstor2 = await waitOperation(ctor2, queryOp2);

    // QARs query the GEDA's key state
    const ksteetor1 = await ctee1.keyStates().query(agtor.prefix, '1');
    const ksteetor2 = await ctee2.keyStates().query(agtor.prefix, '1');
    const teeTor1 = await waitOperation(ctee1, ksteetor1);
    const teeTor2 = await waitOperation(ctee2, ksteetor2);

    const teeDone1 = await waitOperation(ctee1, otee1);
    const teeDone2 = await waitOperation(ctee2, otee2);
    console.log('Delegated multisig created!');

    const agtee = await ctee1.identifiers().get(gtee);
    assert.equal(agtee.prefix, teepre);

    await assertOperations(ctor1, ctor2, ctee1, ctee2);
    await assertNotifications(ctor1, ctor2, ctee1, ctee2);
}, 600000);
