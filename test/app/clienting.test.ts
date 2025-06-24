import libsodium from 'libsodium-wrappers-sumo';
import { assert, describe, test, expect, vi } from 'vitest';
import { AuthMode, SignifyClient } from '../../src/keri/app/clienting.ts';
import { Identifier } from '../../src/keri/app/aiding.ts';
import {
    Operations,
    KeyEvents,
    KeyStates,
    Oobis,
} from '../../src/keri/app/coring.ts';
import { Contacts, Challenges } from '../../src/keri/app/contacting.ts';
import {
    Credentials,
    Schemas,
    Registries,
} from '../../src/keri/app/credentialing.ts';
import { Escrows } from '../../src/keri/app/escrowing.ts';
import { Exchanges } from '../../src/keri/app/exchanging.ts';
import { Groups } from '../../src/keri/app/grouping.ts';
import { Notifications } from '../../src/keri/app/notifying.ts';
import {
    HEADER_SIG,
    HEADER_SIG_INPUT,
    HEADER_SIG_TIME,
    HEADER_SIG_DESTINATION,
    HEADER_SIG_SENDER
} from '../../src/keri/core/httping.ts';
import { Salter, Tier } from '../../src/keri/core/salter.ts';
import { createMockFetch } from './test-utils.ts';
import { Cigar } from '../../src/keri/core/cigar.ts';
import { Siger } from '../../src/keri/core/siger.ts';
import { Signage, signature } from '../../src/keri/end/ending.ts';
import { EssrAuthenticator, SignedHeaderAuthenticator } from '../../src/keri/core/authing.ts';

const fetchMock = createMockFetch();

const url = 'http://127.0.0.1:3901';
const boot_url = 'http://127.0.0.1:3903';
const bran = '0123456789abcdefghijk';

// prettier-ignore
const essrPayload = new Uint8Array([117,25,216,177,230,114,125,73,6,221,25,123,124,67,78,188,248,165,196,158,243,206,130,147,102,156,228,138,222,39,133,63,171,67,121,182,77,211,170,157,244,131,48,73,202,165,117,156,16,157,70,102,201,62,231,10,246,138,114,58,207,154,91,112,110,246,233,72,55,254,87,77,203,235,159,142,158,25,3,178,52,30,235,96,136,193,163,209,239,98,213,94,6,255,249,103,110,237,215,10,181,35,158,70,204,16,99,238,176,156,237,64,154,141,94,207,139,176,240,63,91,198,105,49,126,234,140,54,155,145,33,120,222,27,232,87,13,208,232,11,15,119,179,36,87,93,11,69,67,198,18,18,51,66,115,39,193,180,92,169,26,161,214,44,4,149,50,209,5,234,186,74,248,194,55,76,168,169,235,207,250,34,8,198,206,13,142,210,27,112,48,235,63,94,49,45,93,194,68,25,171,117,5,4,150,93,210,236,86,81,9,189,226,94,5,34,202,74,64,219,246,101,52,177,211,194,71,20,86,108,138,62,5,240,213,17,162,247,27,236,106,70,127,58,78,251,205,141,233,168,120,248,206,49,158,78,2,47,74,41,83,170,209,163,84,148,177,95,48,57,139,218,39,73,32,14,11,120,23,114,74,100,81,237,68,54,197,49,186,249,22,156,68,8,201,101,217,80,180,78,95,226,127,213,68,235,75,139,141,30,146,107,135,69,195,161,37,131,145,233,180,162,204,217,225,133,237,34,242,52,112,140,11,39,33,128,244,24,107,39,232,43,238,59,173,61,129,56,47,123,47,88,148,167,181,2,93,76,148,235,188,208,136,164,27,199,210,203,43,111,70,229,64,227,183,34,31,143,200,97,255,145,211,116,200,197,137,78,5,180,39,226,212,218,253,192,19,180,154,32,87,207,162,52,247,141,69,85,33,118,9,90,143,152,149,135,255,231,34,52,175,88,193,148,238,135,225,132,51,101,16,15,187,30,86,15,255,65,26,93,110,90,135,123,35,200,47,184,244,73,50,160,41,203,202,105,70,10,158,243,245,113,65,64,147,113,141,75,84,174,53,150,222,208,176,133,10,74,102,253,57,216,123,7,241,180,59,210,18,44,200,232,1,218,204,128,131,166,3,121,207,105,164,55,253,155,56,143,129,171,181,53,249,14,178,27,109,224,21,180,128,66,232,49,56,116,210,102,191,49,82,124,49,193,128,103,127,44,16,50,164,227,231,142,51,62,184,199,155,77,219,68,59,234,164,143,182,187,255,68,135,224,254,162,70,91,184,219,36,82,233,50,63,92,231,125,209,44,111,214,249,230,112,127,225,34,138,246,194,221,248,154,252,15,62,168,121,164,26,5,239,11,159,79,37,100,77,237,239,147,149,25,55,254,191,198,105,91,235,72,19,103,153,200,140,63,158,21,253,116,120,83,100,85,55,246,172,193,106,127,151,16,22,212,124,175,253,5,147,108,33,229,47,129,9,23,83,235,248,21,9,108,70,3,60,112,254,152,185,153,222,80,184,43,8,65,96,29,115,58,87,35,212,0,231,190,170,163,137,182,165,254,122,212,185,145,174,111,122,85,238,61,253,222,230,152,51,247,29,5,165,46,70,16,161,200,197,200,206,208,52,235,70,214,5,225,70,233,152,55,77,23,235,142,97,234,32,224,52,69,9,226,137,134,225,65,175,30,255,125,166,182,250,140,121,169,57,145,118,245,76,64,154,51,25,78,164,234,101,8]);

describe('SignifyClient', () => {
    test('SignifyClient initialization', async () => {
        await libsodium.ready;

        const t = () => {
            new SignifyClient(url, 'short', Tier.low, boot_url);
        };
        expect(t).toThrow('bran must be 21 characters');

        const client = new SignifyClient(url, bran, Tier.low, boot_url);
        assert.equal(client.bran, '0123456789abcdefghijk');
        assert.equal(client.url, url);
        assert.equal(client.bootUrl, boot_url);
        assert.equal(client.tier, Tier.low);
        assert.equal(client.pidx, 0);
        assert.equal(
            client.controller.pre,
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.equal(client.controller.stem, 'signify:controller');
        assert.equal(client.controller.tier, Tier.low);
        assert.equal(
            client.controller.serder.raw,
            '{"v":"KERI10JSON00012b_","t":"icp",' +
                '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose",' +
                '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0",' +
                '"kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],' +
                '"nt":"1","n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],' +
                '"bt":"0","b":[],"c":[],"a":[]}'
        );
        assert.deepEqual(client.controller.serder.sad.s, '0');

        const res = await client.boot();
        assert.equal(fetchMock.mock.calls[0]![0]!, boot_url + '/boot');
        assert.equal(
            fetchMock.mock.calls[0]![1]!.body!.toString(),
            '{"icp":{"v":"KERI10JSON00012b_","t":"icp","d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1","n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"a":[]},"sig":"AACJwsJ0mvb4VgxD87H4jIsiT1QtlzznUy9zrX3lGdd48jjQRTv8FxlJ8ClDsGtkvK4Eekg5p-oPYiPvK_1eTXEG","stem":"signify:controller","pidx":1,"tier":"low"}'
        );
        assert.equal(res.status, 202);

        await client.connect();

        // validate agent
        assert(
            client.agent!.pre,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert(
            client.agent!.anchor,
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert(
            client.agent!.said,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert(client.agent!.state.s, '0');
        assert(
            client.agent!.state.d,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );

        // validate approve delegation
        assert.equal(client.controller.serder.sad.s, '1');
        assert.equal(client.controller.serder.sad.t, 'ixn');
        assert.equal(
            client.controller.serder.sad.a[0].i,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert.equal(
            client.controller.serder.sad.a[0].d,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert.equal(client.controller.serder.sad.a[0].s, '0');

        const data = client.data;
        assert(data[0], url);
        assert(data[0], bran);

        assert(client.identifiers() instanceof Identifier);
        assert(client.operations() instanceof Operations);
        assert(client.keyEvents() instanceof KeyEvents);
        assert(client.keyStates() instanceof KeyStates);
        assert(client.keyStates() instanceof KeyStates);
        assert(client.credentials() instanceof Credentials);
        assert(client.registries() instanceof Registries);
        assert(client.schemas() instanceof Schemas);
        assert(client.challenges() instanceof Challenges);
        assert(client.contacts() instanceof Contacts);
        assert(client.notifications() instanceof Notifications);
        assert(client.escrows() instanceof Escrows);
        assert(client.oobis() instanceof Oobis);
        assert(client.exchanges() instanceof Exchanges);
        assert(client.groups() instanceof Groups);
        assert(client.authn instanceof SignedHeaderAuthenticator);

        const essrClient = new SignifyClient(url, bran, Tier.low, boot_url, undefined, AuthMode.ESSR);
        await essrClient.boot();
        await essrClient.connect();
        assert(essrClient.authn instanceof EssrAuthenticator);
    });

    test('Passcode rotation', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';
        const client = new SignifyClient(url, bran, Tier.low, boot_url);
        await client.connect();

        const resp = await client.rotate('abcdefghijk0123456789', []);
        assert.equal(resp.status, 202);
        const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(
            lastCall[0],
            url + '/agent/ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.equal(lastCall[1]!.method, 'PUT');
        const lastBody = JSON.parse(lastCall[1]!.body! as string);
        assert.equal(lastBody.rot.t, 'rot');
        assert.equal(lastBody.rot.s, '1');
        assert.deepEqual(lastBody.rot.kt, ['1', '0']);
        assert.equal(
            lastBody.rot.d,
            'EGFi9pCcRaLK8dPh5S7JP9Em62fBMiR1l4gW1ZazuuAO'
        );
    });
    
    test('Create signed headers HTTP request', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';
        const client = new SignifyClient(url, bran, Tier.low, boot_url);
        await client.connect();

        const heads = new Headers();
        heads.set('Content-Type', 'application/json');
        const treqInit = {
            headers: heads,
            method: 'POST',
            body: JSON.stringify({ foo: true }),
        };
        const turl = 'http://example.com/test';
        const treq = await client.createSignedRequest('aid1', turl, treqInit);
        await fetch(treq);
        const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        const resReq = lastCall[0] as Request;
        assert.equal(resReq.url, 'http://example.com/test');
        assert.equal(resReq.method, 'POST');
        const lastBody = await resReq.json();
        assert.deepEqual(lastBody.foo, true);
        const lastHeaders = new Headers(resReq.headers);
        assert.equal(
            lastHeaders.get(HEADER_SIG_SENDER),
            'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK'
        );
        assert.equal(
            lastHeaders
                .get(HEADER_SIG_INPUT)
                ?.startsWith(
                    'signify=("@method" "@path" "signify-resource" "signify-timestamp");created='
                ),
            true
        );
        assert.equal(
            lastHeaders
                .get(HEADER_SIG_INPUT)
                ?.endsWith(
                    ';keyid="DPmhSfdhCPxr3EqjxzEtF8TVy0YX7ATo0Uc8oo2cnmY9";alg="ed25519"'
                ),
            true
        );

        const aid = await client.identifiers().get('aid1');
        const keeper = client.manager!.get(aid);
        const signer = keeper.signers[0];
        const created = lastHeaders
            .get(HEADER_SIG_INPUT)
            ?.split(';created=')[1]
            .split(';keyid=')[0];
        const data = `"@method": POST\n"@path": /test\n"signify-resource": ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK\n"signify-timestamp": ${lastHeaders.get(
            HEADER_SIG_TIME
        )}\n"@signature-params: (@method @path signify-resource signify-timestamp);created=${created};keyid=DPmhSfdhCPxr3EqjxzEtF8TVy0YX7ATo0Uc8oo2cnmY9;alg=ed25519"`;

        const raw = new TextEncoder().encode(data);
        const sig = signer.sign(raw);
        assert.equal(
            sig.qb64,
            lastHeaders.get(HEADER_SIG)?.split('signify="')[1].split('"')[0]
        );
    });

    test('Client authenticated fetch', async () => {
        const prepareSpy = vi.spyOn(SignedHeaderAuthenticator.prototype, 'prepare');
        const verifySpy = vi.spyOn(SignedHeaderAuthenticator.prototype, 'verify');

        await libsodium.ready;
        const bran = '0123456789abcdefghijk';
        const client = new SignifyClient(url, bran, Tier.low, boot_url);

        await expect(client.fetch('/identifiers', 'GET', undefined)).rejects.toThrow('Client needs to call connect first');

        await client.connect();

        const getResponse = await client.fetch('/identifiers', 'GET', undefined);
        
        expect(prepareSpy).toHaveBeenCalledWith(expect.any(Request), "ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose", "EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei");
        let request = prepareSpy.mock.calls[0][0];

        expect(request.url).toBe('http://127.0.0.1:3901/identifiers');
        expect(request.method).toBe('GET');
        expect(request.headers.get(HEADER_SIG_SENDER)).toBe('ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose');
        expect(request.headers.has(HEADER_SIG_TIME)).toBe(true);
        expect(request.headers.has('Content-Type')).toBe(false);
        expect(request.headers.has('Content-Length')).toBe(false);
        expect(request.body).toBe(null);
        
        expect(verifySpy).toHaveBeenCalledWith(expect.any(Request), expect.any(Response), expect.any(String), expect.any(String));
        expect(verifySpy.mock.calls[0][0]).toBe(request);  // Pass baseRequest, not wrapped request (for case of ESSR)
        expect(verifySpy.mock.calls[0][1]).toBe(getResponse);

        await client.fetch('/oobis', 'POST', {
            url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            alias: 'wit',
        });
        request = prepareSpy.mock.calls[2][0];  // createFetchMock also calls prepare to get valid signed headers, so skip to 2

        expect(request.url).toBe('http://127.0.0.1:3901/oobis');
        expect(request.method).toBe('POST');
        expect(request.headers.get(HEADER_SIG_SENDER)).toBe('ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose');
        expect(request.headers.has(HEADER_SIG_TIME)).toBe(true);
        expect(request.headers.get('Content-Type')).toBe('application/json');
        expect(request.headers.get('Content-Length')).toBe('95');
        expect(await request.json()).toEqual({
            url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            alias: 'wit',
        });

        const extraHeaders = new Headers([
            ['A', '1'],
            ['B', '2']
        ]);
        await client.fetch('/oobis', 'POST', {
            url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            alias: 'wit',
        }, extraHeaders);
        request = prepareSpy.mock.calls[4][0];

        expect(request.url).toBe('http://127.0.0.1:3901/oobis');
        expect(request.method).toBe('POST');
        expect(request.headers.get(HEADER_SIG_SENDER)).toBe('ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose');
        expect(request.headers.has(HEADER_SIG_TIME)).toBe(true);
        expect(request.headers.get('Content-Type')).toBe('application/json');
        expect(request.headers.get('Content-Length')).toBe('95');
        expect(request.headers.get('A')).toBe('1');
        expect(request.headers.get('B')).toBe('2');
        expect(await request.json()).toEqual({
            url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            alias: 'wit',
        });

        verifySpy.mockResolvedValueOnce(new Response('Error info', {
            status: 400,
            statusText: 'Bad Request',
        }));
        expect(client.fetch('/identifiers', 'GET', undefined)).rejects.toThrowError('HTTP GET /identifiers - 400 Bad Request - Error info');
    });

    test('ESSR protected fetch', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';
        const client = new SignifyClient(url, bran, Tier.low, boot_url, undefined, AuthMode.ESSR);

        await client.connect();

        const headers = new Headers([
            [HEADER_SIG_TIME, '2025-01-16T16:37:10.345000+00:00'],
            [HEADER_SIG_SENDER, 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'],
            [HEADER_SIG_DESTINATION, 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose']
        ]);

        const signed = signWithAgent(
            new Uint8Array(
                Buffer.from(
                    JSON.stringify({
                        src: 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
                        dest: 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                        d: 'EABLUXFJKkV9ey8_-yNnQDhuDkiJ_s5tPZNwYg2g21C5',
                        dt: '2025-01-16T16:37:10.345000+00:00',
                    })
                )
            )
        );
        signed.forEach((value, key) => {
            headers.set(key, value);
        });
        fetchMock.mockResolvedValueOnce(
            new Response(essrPayload, {
                status: 200,
                headers,
            })
        );

        const response = await client.fetch('/oobis', 'POST', {
            url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            alias: 'wit',
        });
        expect(response.status).toBe(202);
        expect(response.headers.get(HEADER_SIG_SENDER)).toBe('EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei');
        expect((await response.text()).replace(/ /g, '')).toBe(
            JSON.stringify({
                name: 'oobi.0ABZPhjVcllT3Sa2u61PRpqd',
                metadata: {
                    oobi: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                },
                done: true,
                error: null,
                response: {
                    vn: [1, 0],
                    i: 'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                    s: '0',
                    p: '',
                    d: 'EIkO4CUmYXukX4auGU9yaFoQaIicfVZkazQ0A3IO5biT',
                    f: '0',
                    dt: '2025-01-16T16:29:47.586818+00:00',
                    et: 'icp',
                    kt: '1',
                    k: ['BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha'],
                    nt: '0',
                    n: [],
                    bt: '0',
                    b: [],
                    c: [],
                    ee: {
                        s: '0',
                        d: 'EIkO4CUmYXukX4auGU9yaFoQaIicfVZkazQ0A3IO5biT',
                        br: [],
                        ba: [],
                    },
                    di: '',
                },
            })
        );
    });
});

function signWithAgent(payload: Uint8Array): Headers {
    const salter = new Salter({ qb64: '0AAwMTIzNDU2Nzg5YWJjZGVm' });
    const signer = salter.signer(
        'A',
        true,
        'agentagent-ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose00',
        Tier.low
    );
    const sig = signer.sign(payload);
    const markers = new Map<string, Siger | Cigar>();
    markers.set('signify', sig);
    const signage = new Signage(markers, false);
    return signature([signage]);
}
