import signify, { Serder, SignifyClient } from 'signify-ts';
import { resolveEnvironment } from './utils/resolve-env';
import { getOrCreateClient, getOrCreateIdentifier } from './utils/test-setup';
import {
    markNotification,
    waitForNotifications,
    waitOperation,
} from './utils/test-util';
import assert from 'assert';

const { vleiServerUrl, url } = resolveEnvironment();

describe('multisig-join', () => {
    const nameMember1 = 'member1';
    const nameMember2 = 'member2';
    const nameMultisig = 'multisigGroup';

    let client1: SignifyClient;
    let client2: SignifyClient;

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
        const icp = response[0].exn.e.icp;

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
    });

    test('should add member3 to multisig', async () => {
        const nameMember3 = 'member3';
        const client3 = await getOrCreateClient();

        const aid3 = await createAID(client3, nameMember3, []);

        const [oobi1, oobi2, oobi3] = await Promise.all([
            client1.oobis().get(nameMember1, 'agent'),
            client2.oobis().get(nameMember2, 'agent'),
            client3.oobis().get(nameMember3, 'agent'),
        ]);

        const multisigIdentifier = await client1
            .identifiers()
            .get(nameMultisig);
        const multisigOobiUrl = `${'http://127.0.0.1:3902'}/oobi/${
            multisigIdentifier.prefix
        }`;
        console.log('oobis', oobi1, oobi2, oobi3, multisigOobiUrl);

        const [opOobi1, opOobi2, opOobi3, opOobi4, opOobi5] = await Promise.all(
            [
                client1.oobis().resolve(oobi3.oobis[0], nameMember3),
                client2.oobis().resolve(oobi3.oobis[0], nameMember3),
                client3.oobis().resolve(oobi1.oobis[0], nameMember1),
                client3.oobis().resolve(oobi2.oobis[0], nameMember2),
                client3
                    .oobis()
                    .resolve(multisigOobiUrl.toString(), nameMultisig),
            ]
        );
        await Promise.all([
            waitOperation(client1, opOobi1),
            waitOperation(client2, opOobi2),
            waitOperation(client3, opOobi3),
            waitOperation(client3, opOobi4),
            waitOperation(client3, opOobi5),
        ]);

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
                'member1',
                'multisig',
                aid1,
                '/multisig/rot',
                { gid: serder1.pre, smids, rmids },
                rembeds,
                recp
            );

        const rotationNotification = await waitAndMarkNotification(
            client3,
            '/multisig/rot'
        );

        const response = await client3
            .groups()
            .getRequest(rotationNotification);
        const exn = response[0].exn;

        const serder3 = new Serder(exn.e.rot);

        const keeper = await client3.manager!.get(aid3);
        const sigs = keeper.sign(serder3.raw);

        const joinOperation = await client3
            .groups()
            .join(
                nameMultisig,
                serder3,
                sigs,
                exn.a?.gid as string,
                smids,
                rmids
            );

        await waitOperation(client3, joinOperation);
    });
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
