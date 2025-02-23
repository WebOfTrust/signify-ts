import { strict as assert } from 'assert';
import libsodium from 'libsodium-wrappers-sumo';
import {
    randomPasscode,
    randomNonce,
    Operations,
    OperationsDeps,
} from '../../src/keri/app/coring';
import { SignifyClient } from '../../src/keri/app/clienting';
import { Authenticater } from '../../src/keri/core/authing';
import { Salter, Tier } from '../../src/keri/core/salter';
import fetchMock from 'jest-fetch-mock';
import 'whatwg-fetch';
import { randomUUID } from 'crypto';

fetchMock.enableMocks();

const url = 'http://127.0.0.1:3901';
const boot_url = 'http://127.0.0.1:3903';

fetchMock.enableMocks();

const mockConnect =
    '{"agent":{"vn":[1,0],"i":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei",' +
    '"s":"0","p":"","d":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei","f":"0",' +
    '"dt":"2023-08-19T21:04:57.948863+00:00","et":"dip","kt":"1",' +
    '"k":["DMZh_y-H5C3cSbZZST-fqnsmdNTReZxIh0t2xSTOJQ8a"],"nt":"1",' +
    '"n":["EM9M2EQNCBK0MyAhVYBvR98Q0tefpvHgE-lHLs82XgqC"],"bt":"0","b":[],' +
    '"c":[],"ee":{"s":"0","d":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei","br":[],"ba":[]},' +
    '"di":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose"},"controller":{"state":{"vn":[1,0],' +
    '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","p":"",' +
    '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","f":"0","dt":"2023-08-19T21:04:57.959047+00:00",' +
    '"et":"icp","kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1",' +
    '"n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"ee":{"s":"0",' +
    '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","br":[],"ba":[]},"di":""},' +
    '"ee":{"v":"KERI10JSON00012b_","t":"icp","d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose",' +
    '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","kt":"1",' +
    '"k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1",' +
    '"n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"a":[]}},"ridx":0,' +
    '"pidx":0}';
const mockGetAID = {
    name: 'aid1',
    prefix: 'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
    salty: {
        sxlt: '1AAHnNQTkD0yxOC9tSz_ukbB2e-qhDTStH18uCsi5PCwOyXLONDR3MeKwWv_AVJKGKGi6xiBQH25_R1RXLS2OuK3TN3ovoUKH7-A',
        pidx: 0,
        kidx: 0,
        stem: 'signify:aid',
        tier: 'low',
        dcode: 'E',
        icodes: ['A'],
        ncodes: ['A'],
        transferable: true,
    },
    transferable: true,
    state: {
        vn: [1, 0],
        i: 'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
        s: '0',
        p: '',
        d: 'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
        f: '0',
        dt: '2023-08-21T22:30:46.473545+00:00',
        et: 'icp',
        kt: '1',
        k: ['DPmhSfdhCPxr3EqjxzEtF8TVy0YX7ATo0Uc8oo2cnmY9'],
        nt: '1',
        n: ['EAORnRtObOgNiOlMolji-KijC_isa3lRDpHCsol79cOc'],
        bt: '0',
        b: [],
        c: [],
        ee: {
            s: '0',
            d: 'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
            br: [],
            ba: [],
        },
        di: '',
    },
    windexes: [],
};

const mockCredential = {
    sad: {
        v: 'ACDC10JSON000197_',
        d: 'EMwcsEMUEruPXVwPCW7zmqmN8m0I3CihxolBm-RDrsJo',
        i: 'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1',
        ri: 'EGK216v1yguLfex4YRFnG7k1sXRjh3OKY7QqzdKsx7df',
        s: 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao',
        a: {
            d: 'EK0GOjijKd8_RLYz9qDuuG29YbbXjU8yJuTQanf07b6P',
            i: 'EKvn1M6shPLnXTb47bugVJblKMuWC0TcLIePP8p98Bby',
            dt: '2023-08-23T15:16:07.553000+00:00',
            LEI: '5493001KJTIIGC8Y1R17',
        },
    },
    pre: 'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1',
    sadsigers: [
        {
            path: '-',
            pre: 'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1',
            sn: 0,
            d: 'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1',
        },
    ],
    sadcigars: [],
    chains: [],
    status: {
        v: 'KERI10JSON000135_',
        i: 'EMwcsEMUEruPXVwPCW7zmqmN8m0I3CihxolBm-RDrsJo',
        s: '0',
        d: 'ENf3IEYwYtFmlq5ZzoI-zFzeR7E3ZNRN2YH_0KAFbdJW',
        ri: 'EGK216v1yguLfex4YRFnG7k1sXRjh3OKY7QqzdKsx7df',
        ra: {},
        a: { s: 2, d: 'EIpgyKVF0z0Pcn2_HgbWhEKmJhOXFeD4SA62SrxYXOLt' },
        dt: '2023-08-23T15:16:07.553000+00:00',
        et: 'iss',
    },
};

fetchMock.mockResponse((req) => {
    if (req.url.startsWith(url + '/agent')) {
        return Promise.resolve({ body: mockConnect, init: { status: 202 } });
    } else if (req.url == boot_url + '/boot') {
        return Promise.resolve({ body: '', init: { status: 202 } });
    } else {
        const headers = new Headers();
        let signed_headers = new Headers();

        headers.set(
            'Signify-Resource',
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        headers.set(
            'Signify-Timestamp',
            new Date().toISOString().replace('Z', '000+00:00')
        );
        headers.set('Content-Type', 'application/json');

        const requrl = new URL(req.url);
        const salter = new Salter({ qb64: '0AAwMTIzNDU2Nzg5YWJjZGVm' });
        const signer = salter.signer(
            'A',
            true,
            'agentagent-ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose00',
            Tier.low
        );

        const authn = new Authenticater(signer!, signer!.verfer);
        signed_headers = authn.sign(
            headers,
            req.method,
            requrl.pathname.split('?')[0]
        );
        const body = req.url.startsWith(url + '/identifiers/aid1/credentials')
            ? mockCredential
            : mockGetAID;

        return Promise.resolve({
            body: JSON.stringify(body),
            init: { status: 202, headers: signed_headers },
        });
    }
});

describe('Coring', () => {
    it('Random passcode', async () => {
        await libsodium.ready;
        const passcode = randomPasscode();
        assert.equal(passcode.length, 21);
    });

    it('Random nonce', async () => {
        await libsodium.ready;
        const nonce = randomNonce();
        assert.equal(nonce.length, 44);
    });

    it('OOBIs', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';

        const client = new SignifyClient(url, bran, Tier.low, boot_url);

        await client.boot();
        await client.connect();

        const oobis = client.oobis();

        await oobis.get('aid', 'agent');
        let lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(lastCall[0]!, url + '/identifiers/aid/oobis?role=agent');
        assert.equal(lastCall[1]!.method, 'GET');

        await oobis.resolve('http://oobiurl.com');
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        let lastBody = JSON.parse(lastCall[1]!.body!.toString());
        assert.equal(lastCall[0]!, url + '/oobis');
        assert.equal(lastCall[1]!.method, 'POST');
        assert.deepEqual(lastBody.url, 'http://oobiurl.com');

        await oobis.resolve('http://oobiurl.com', 'witness');
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        lastBody = JSON.parse(lastCall[1]!.body!.toString());
        assert.equal(lastCall[0]!, url + '/oobis');
        assert.equal(lastCall[1]!.method, 'POST');
        assert.deepEqual(lastBody.url, 'http://oobiurl.com');
        assert.deepEqual(lastBody.oobialias, 'witness');
    });

    it('Events and states', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';

        const client = new SignifyClient(url, bran, Tier.low, boot_url);

        await client.boot();
        await client.connect();

        const keyEvents = client.keyEvents();
        const keyStates = client.keyStates();

        await keyEvents.get('EP10ooRj0DJF0HWZePEYMLPl-arMV-MAoTKK-o3DXbgX');
        let lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(
            lastCall[0]!,
            url + '/events?pre=EP10ooRj0DJF0HWZePEYMLPl-arMV-MAoTKK-o3DXbgX'
        );
        assert.equal(lastCall[1]!.method, 'GET');

        await keyStates.get('EP10ooRj0DJF0HWZePEYMLPl-arMV-MAoTKK-o3DXbgX');
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(
            lastCall[0]!,
            url + '/states?pre=EP10ooRj0DJF0HWZePEYMLPl-arMV-MAoTKK-o3DXbgX'
        );
        assert.equal(lastCall[1]!.method, 'GET');

        await keyStates.list([
            'EP10ooRj0DJF0HWZePEYMLPl-arMV-MAoTKK-o3DXbgX',
            'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
        ]);
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(
            lastCall[0]!,
            url +
                '/states?pre=EP10ooRj0DJF0HWZePEYMLPl-arMV-MAoTKK-o3DXbgX&pre=ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK'
        );
        assert.equal(lastCall[1]!.method, 'GET');

        await keyStates.query(
            'EP10ooRj0DJF0HWZePEYMLPl-arMV-MAoTKK-o3DXbgX',
            '1',
            'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao'
        );
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        const lastBody = JSON.parse(lastCall[1]!.body!.toString());
        assert.equal(lastCall[0]!, url + '/queries');
        assert.equal(lastCall[1]!.method, 'POST');
        assert.equal(
            lastBody.pre,
            'EP10ooRj0DJF0HWZePEYMLPl-arMV-MAoTKK-o3DXbgX'
        );
        assert.equal(lastBody.sn, '1');
        assert.equal(
            lastBody.anchor,
            'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao'
        );
    });

    it('Agent configuration', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';

        const client = new SignifyClient(url, bran, Tier.low, boot_url);

        await client.boot();
        await client.connect();

        const config = client.config();

        await config.get();
        const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(lastCall[0]!, url + '/config');
        assert.equal(lastCall[1]!.method, 'GET');
    });
});

describe('Operations', () => {
    class MockClient implements OperationsDeps {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fetch = jest.fn<Promise<Response>, [string, string, any]>();

        constructor() {}

        operations() {
            return new Operations(this);
        }

        getLastMockRequest() {
            const [pathname, method, body] = this.fetch.mock.lastCall ?? [];

            return {
                path: pathname,
                method: method,
                body: body,
            };
        }
    }

    let client: MockClient;
    beforeEach(async () => {
        await libsodium.ready;
        client = new MockClient();
    });

    it('Can get operation by name', async () => {
        await libsodium.ready;

        client.fetch.mockResolvedValue(
            new Response(JSON.stringify({ name: randomUUID() }), {
                status: 200,
            })
        );
        await client.operations().get('operationName');
        const lastCall = client.getLastMockRequest();
        assert.equal(lastCall.path, '/operations/operationName');
        assert.equal(lastCall.method, 'GET');
    });

    it('Can list operations', async () => {
        client.fetch.mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
            })
        );
        await client.operations().list();
        const lastCall = client.getLastMockRequest();
        assert.equal(lastCall.path, '/operations?');
        assert.equal(lastCall.method, 'GET');
    });

    it('Can list operations by type', async () => {
        client.fetch.mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
            })
        );
        await client.operations().list('witness');
        const lastCall = client.getLastMockRequest();
        assert.equal(lastCall.path, '/operations?type=witness');
        assert.equal(lastCall.method, 'GET');
    });

    it('Can delete operation by name', async () => {
        client.fetch.mockResolvedValue(
            new Response(JSON.stringify({}), {
                status: 200,
            })
        );
        await client.operations().delete('operationName');
        const lastCall = client.getLastMockRequest();
        assert.equal(lastCall.path, '/operations/operationName');
        assert.equal(lastCall.method, 'DELETE');
    });

    describe('wait', () => {
        it('does not wait for operation that is already "done"', async () => {
            const name = randomUUID();
            client.fetch.mockResolvedValue(
                new Response(JSON.stringify({ name }), {
                    status: 200,
                })
            );

            const op = { name, done: true };
            const result = await client.operations().wait(op);
            assert.equal(client.fetch.mock.calls.length, 0);
            assert.equal(op, result);
        });

        it('returns when operation is done after first call', async () => {
            const name = randomUUID();
            client.fetch.mockResolvedValue(
                new Response(JSON.stringify({ name, done: true }), {
                    status: 200,
                })
            );

            const op = { name, done: false };
            await client.operations().wait(op);
            assert.equal(client.fetch.mock.calls.length, 1);
        });

        it('returns when operation is done after second call', async () => {
            const name = randomUUID();
            client.fetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ name, done: false }), {
                    status: 200,
                })
            );

            client.fetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ name, done: true }), {
                    status: 200,
                })
            );

            const op = { name, done: false };
            await client.operations().wait(op, { maxSleep: 10 });
            assert.equal(client.fetch.mock.calls.length, 2);
        });

        it('throw if aborted', async () => {
            const name = randomUUID();
            client.fetch.mockImplementation(
                async () =>
                    new Response(JSON.stringify({ name, done: false }), {
                        status: 200,
                    })
            );

            const op = { name, done: false };

            const controller = new AbortController();
            const promise = client
                .operations()
                .wait(op, { signal: controller.signal })
                .catch((e) => e);

            const abortError = new Error('Aborted');
            controller.abort(abortError);

            const error = await promise;

            assert.equal(error, abortError);
        });

        it('returns when child operation is also done', async () => {
            const name = randomUUID();
            const nestedName = randomUUID();
            const depends = { name: nestedName, done: false };
            const op = { name, done: false, depends };

            client.fetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ ...op, done: false }), {
                    status: 200,
                })
            );

            client.fetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        ...op,
                        depends: { ...depends, done: true },
                    }),
                    {
                        status: 200,
                    }
                )
            );

            client.fetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        ...op,
                        done: true,
                        depends: { ...depends, done: true },
                    }),
                    {
                        status: 200,
                    }
                )
            );

            await client.operations().wait(op, { maxSleep: 10 });
            assert.equal(client.fetch.mock.calls.length, 3);
        });
    });
});
