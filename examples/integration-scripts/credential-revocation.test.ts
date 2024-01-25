import {
    Algos,
    Siger,
    SignifyClient,
    b,
    d,
    messagize,
    randomNonce,
} from 'signify-ts';
import { resolveEnvironment } from './utils/resolve-env';
import { resolveOobi, waitOperation } from './utils/test-util';
import {
    getOrCreateClients,
    getOrCreateContact,
    getOrCreateIdentifier,
} from './utils/test-setup';
import { step } from './utils/test-step';

const { vleiServerUrl, witnessIds } = resolveEnvironment();
const WITNESS_AIDS = witnessIds;

// Uncomment this to try without witnesses
// const WITNESS_AIDS = [] as string[];

const QVI_SCHEMA_SAID = 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao';
const vLEIServerHostUrl = `${vleiServerUrl}/oobi`;
const QVI_SCHEMA_URL = `${vLEIServerHostUrl}/${QVI_SCHEMA_SAID}`;

interface Aid {
    name: string;
    prefix: string;
    oobi: string;
}

function createTimestamp() {
    return new Date().toISOString().replace('Z', '000+00:00');
}

async function createAid(client: SignifyClient, name: string): Promise<Aid> {
    const [prefix, oobi] = await getOrCreateIdentifier(client, name);
    return { prefix, oobi, name };
}

let client1: SignifyClient;
let client2: SignifyClient;
let client3: SignifyClient;

let aid1: Aid;
let aid2: Aid;
let aid3: Aid;

beforeAll(async () => {
    [client1, client2, client3] = await getOrCreateClients(3);
});

beforeAll(async () => {
    [aid1, aid2, aid3] = await Promise.all([
        createAid(client1, 'issuer1'),
        createAid(client2, 'issuer2'),
        createAid(client3, 'holder'),
    ]);
});

beforeAll(async () => {
    await Promise.all([
        getOrCreateContact(client1, 'issuer1', aid2.oobi),
        getOrCreateContact(client1, 'holder', aid3.oobi),
        getOrCreateContact(client2, 'issuer2', aid1.oobi),
        getOrCreateContact(client2, 'holder', aid3.oobi),
    ]);
});

test('multisig credential revocation', async () => {
    await step('Resolve schemas oobis', async () => {
        await Promise.all([
            resolveOobi(client1, QVI_SCHEMA_URL),
            resolveOobi(client2, QVI_SCHEMA_URL),
        ]);
    });

    const aid1Hab = await client1.identifiers().get(aid1.name);
    const aid2Hab = await client2.identifiers().get(aid2.name);

    const multisigAid = await step('Create multisig', async () => {
        const multisigName = 'multisig';
        const { state: aid1State } = aid1Hab;
        const { state: aid2State } = aid2Hab;

        const states = [aid1State, aid2State];
        const icpResult1 = await client1.identifiers().create(multisigName, {
            algo: Algos.group,
            mhab: aid1Hab,
            isith: 2,
            nsith: 2,
            states,
            rstates: states,
            wits: WITNESS_AIDS,
            toad: WITNESS_AIDS.length,
        });
        const icpOperation1 = await icpResult1.op();

        const sigers1 = icpResult1.sigs.map((sig) => new Siger({ qb64: sig }));
        const embeds1 = {
            icp: [
                icpResult1.serder,
                d(messagize(icpResult1.serder, sigers1)).substring(
                    icpResult1.serder.size
                ),
            ],
        };

        const smids = states.map((state) => state['i']);

        await client1
            .exchanges()
            .send(
                aid1.name,
                'multisig',
                aid1Hab,
                '/multisig/icp',
                { gid: icpResult1.serder.pre, smids: smids, rmids: smids },
                embeds1,
                [aid2.prefix]
            );

        const icpResult2 = await client2.identifiers().create(multisigName, {
            algo: Algos.group,
            mhab: aid2Hab,
            isith: 2,
            nsith: 2,
            states,
            rstates: states,
            wits: WITNESS_AIDS,
            toad: WITNESS_AIDS.length,
        });

        const icpOperation2 = await icpResult2.op();

        const sigers2 = icpResult2.sigs.map((sig) => new Siger({ qb64: sig }));
        const embeds2 = {
            icp: [
                icpResult2.serder,
                d(messagize(icpResult2.serder, sigers2)).substring(
                    icpResult2.serder.size
                ),
            ],
        };

        await client2
            .exchanges()
            .send(
                aid2.name,
                'multisig',
                aid2Hab,
                '/multisig/icp',
                { gid: icpResult2.serder.pre, smids: smids, rmids: smids },
                embeds2,
                [aid1.prefix]
            );

        await waitOperation(client1, icpOperation1);
        await waitOperation(client2, icpOperation2);

        return { prefix: icpResult1.serder.pre, name: multisigName };
    });

    const registry = await step('Create registry', async () => {
        const registryName = 'vLEI-test-registry';
        const nonce = randomNonce();

        const regResult1 = await client1.registries().create({
            name: multisigAid.name,
            registryName: registryName,
            nonce,
        });
        const regOperation1 = await regResult1.op();

        const embeds1 = {
            vcp: [regResult1.regser, ''],
            anc: [
                regResult1.serder,
                d(
                    messagize(
                        regResult1.serder,
                        regResult1.sigs.map((sig) => new Siger({ qb64: sig }))
                    )
                ).substring(regResult1.serder.size),
            ],
        };

        await client1
            .exchanges()
            .send(
                aid1.name,
                'registry',
                aid1Hab,
                '/multisig/vcp',
                { gid: multisigAid.prefix, usage: 'Issue vLEIs' },
                embeds1,
                [aid2.prefix]
            );

        const regResult2 = await client2.registries().create({
            name: multisigAid.name,
            registryName: registryName,
            nonce,
        });
        const regOperation2 = await regResult2.op();
        const embeds2 = {
            vcp: [regResult2.regser, ''],
            anc: [
                regResult2.serder,
                d(
                    messagize(
                        regResult2.serder,
                        regResult2.sigs.map((sig) => new Siger({ qb64: sig }))
                    )
                ).substring(regResult2.serder.size),
            ],
        };

        await client2
            .exchanges()
            .send(
                aid2.name,
                'registry',
                aid2Hab,
                '/multisig/vcp',
                { gid: multisigAid.prefix, usage: 'Issue vLEIs' },
                embeds2,
                [aid1.prefix]
            );

        await waitOperation(client1, regOperation1);
        await waitOperation(client2, regOperation2);

        // TODO: Add this, it causes things to fail
        // console.dir(await client1.registries().list(multisigAid.name));
        return {
            regk1: regResult1.regser.pre,
            regk2: regResult2.regser.pre,
            name: registryName,
        };
    });

    const qviCredentialId = await step('create QVI credential', async () => {
        const TIME = createTimestamp();
        const vcdata = {
            LEI: '5493001KJTIIGC8Y1R17',
        };

        const issResult1 = await client1.credentials().issue({
            issuerName: multisigAid.name,
            registryId: registry.regk1,
            schemaId: QVI_SCHEMA_SAID,
            recipient: aid3.prefix,
            data: vcdata,
            datetime: TIME,
        });

        const groupHab1 = await client1.identifiers().get(multisigAid.name);
        const groupKeeper1 = client1.manager!.get(groupHab1);
        const sigs1 = await groupKeeper1.sign(b(issResult1.anc.raw));
        const sigers1 = sigs1.map((sig: string) => new Siger({ qb64: sig }));

        const embeds1 = {
            acdc: [issResult1.acdc, ''],
            iss: [issResult1.iss, ''],
            anc: [
                issResult1.anc,
                d(messagize(issResult1.anc, sigers1)).substring(
                    issResult1.anc.size
                ),
            ],
        };

        await client1
            .exchanges()
            .send(
                aid1.name,
                'multisig',
                aid1Hab,
                '/multisig/iss',
                { gid: multisigAid.prefix },
                embeds1,
                [aid2.prefix]
            );

        const issResult2 = await client2.credentials().issue({
            issuerName: multisigAid.name,
            registryId: registry.regk2,
            schemaId: QVI_SCHEMA_SAID,
            recipient: aid3.prefix,
            data: vcdata,
            datetime: TIME,
        });

        const groupHab2 = await client2.identifiers().get(multisigAid.name);
        const groupKeeper2 = client2.manager!.get(groupHab2);
        const sigs2 = await groupKeeper2.sign(b(issResult2.anc.raw));
        const sigers2 = sigs2.map((sig: string) => new Siger({ qb64: sig }));

        const embeds2 = {
            acdc: [issResult2.acdc, ''],
            iss: [issResult2.iss, ''],
            anc: [
                issResult2.anc,
                d(messagize(issResult2.anc, sigers2)).substring(
                    issResult2.anc.size
                ),
            ],
        };

        await client2
            .exchanges()
            .send(
                aid2.name,
                'multisig',
                aid2Hab,
                '/multisig/iss',
                { gid: multisigAid.prefix },
                embeds2,
                [aid1.prefix]
            );

        await waitOperation(client1, issResult1.op);
        await waitOperation(client2, issResult2.op);

        return issResult1.acdc.ked.d as string;
    });

    await step('Revoke credential', async () => {
        // KERIA Crashes here, so no point in going further
        await client1.credentials().revoke(multisigAid.name, qviCredentialId);

        await client2.credentials().revoke(multisigAid.name, qviCredentialId);
    });
}, 90000);
