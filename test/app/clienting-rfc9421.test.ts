import libsodium from 'libsodium-wrappers-sumo';
import {
    afterEach,
    assert,
    beforeAll,
    describe,
    expect,
    test,
    vi,
} from 'vitest';
import { AuthMode, SignifyClient } from '../../src/keri/app/clienting.ts';
import { Controller } from '../../src/keri/app/controller.ts';
import {
    HttpSigAuthenticator,
    SignedHeaderAuthenticator,
} from '../../src/keri/core/authing.ts';
import {
    HEADER_SIG_INPUT,
    HEADER_SIG_SENDER,
    HEADER_SIG_TIME,
} from '../../src/keri/core/httping.ts';
import {
    HttpSigRefusal,
    HttpSigVerified,
    signResponse,
    verifyRequest,
} from '../../src/keri/core/httpsigning.ts';
import { Salter, Tier } from '../../src/keri/core/salter.ts';
import { Signer } from '../../src/keri/core/signer.ts';
import { Verfer } from '../../src/keri/core/verfer.ts';
import { mockConnect, mockGetAID } from './test-utils.ts';

const url = 'http://127.0.0.1:3901';
const boot_url = 'http://127.0.0.1:3903';
const bran = '0123456789abcdefghijk';
const CONTROLLER = 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose';
const AGENT = 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei';
const AID1 = mockGetAID.prefix;

type Reply = 'canonical' | 'legacy' | 'unsigned' | 'tampered';

let agentSigner: Signer;
let controllerVerfer: Verfer;

/**
 * A stand-in for a KERIA that speaks canonical mode. It verifies each
 * request as KERIA would, records the result, and answers with a response
 * signed in the mode `reply.mode` asks for.
 */
function mockKeria(reply: { mode: Reply; status?: number }) {
    const verified: Array<HttpSigVerified | Error> = [];
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockImplementation(async (input, init) => {
        const request =
            input instanceof Request ? input : new Request(input, init);
        const target = new URL(request.url);
        if (target.pathname.startsWith('/agent')) {
            return Response.json(mockConnect, { status: 202 });
        }
        const body = new Uint8Array(await request.clone().arrayBuffer());
        verified.push(
            await verifyRequest({
                method: request.method,
                url: request.url,
                headers: request.headers,
                body,
                resolver: (keyid) =>
                    keyid === CONTROLLER ? controllerVerfer : null,
            }).catch((e: Error) => e)
        );

        const payload = target.pathname.startsWith('/identifiers/aid1')
            ? mockGetAID
            : { done: true };
        const text = JSON.stringify(payload);
        const status = reply.status ?? 200;
        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (reply.mode === 'legacy') {
            headers.set(HEADER_SIG_SENDER, AGENT);
            headers.set(
                HEADER_SIG_TIME,
                new Date().toISOString().replace('Z', '000+00:00')
            );
            const signed = await new SignedHeaderAuthenticator(
                agentSigner,
                agentSigner.verfer
            ).prepare(
                new Request(request.url, { headers, method: request.method }),
                AGENT,
                AGENT
            );
            return new Response(text, { status, headers: signed.headers });
        }
        if (reply.mode !== 'unsigned') {
            const fields = signResponse({
                status,
                headers,
                body: text,
                request: {
                    method: request.method,
                    url: request.url,
                    headers: request.headers,
                    body,
                },
                signer: agentSigner,
                keyid: AGENT,
            });
            for (const [k, v] of Object.entries(fields)) headers.set(k, v);
        }
        return new Response(
            reply.mode === 'tampered' ? '{"done": false}' : text,
            { status, headers }
        );
    });
    const calls = () =>
        spy.mock.calls.filter(
            ([input]) =>
                !String((input as Request).url ?? input).includes('/agent')
        ).length;
    return { spy, verified, calls };
}

beforeAll(async () => {
    await libsodium.ready;
    // The agent key mockConnect's agent state commits to; test-utils.ts
    // signs its legacy responses with the same one.
    const salter = new Salter({ qb64: '0AAwMTIzNDU2Nzg5YWJjZGVm' });
    agentSigner = salter.signer(
        'A',
        true,
        'agentagent-ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose00',
        Tier.low
    );
    controllerVerfer = new Controller(bran, Tier.low).signer.verfer;
});

afterEach(() => {
    vi.restoreAllMocks();
});

async function client(
    mode: AuthMode = AuthMode.RFC9421
): Promise<SignifyClient> {
    const c = new SignifyClient(url, bran, Tier.low, boot_url, [], mode);
    await c.connect();
    return c;
}

async function refusal(p: Promise<unknown>): Promise<string> {
    try {
        await p;
    } catch (e) {
        if (e instanceof HttpSigRefusal) return e.code;
        throw e;
    }
    return 'accepted';
}

describe('opt-in', () => {
    test('legacy stays the default', async () => {
        mockKeria({ mode: 'legacy' });
        const c = new SignifyClient(url, bran, Tier.low, boot_url);
        assert.equal(c.authMode, AuthMode.SignedHeaders);
        await c.connect();
        assert.instanceOf(c.authn, SignedHeaderAuthenticator);
    });

    test('AuthMode.RFC9421 selects the canonical authenticator', async () => {
        mockKeria({ mode: 'canonical' });
        const c = await client();
        assert.instanceOf(c.authn, HttpSigAuthenticator);
    });
});

describe('SignifyClient.fetch in canonical mode', () => {
    test('signs a GET that KERIA verifies, and accepts the signed reply', async () => {
        const keria = mockKeria({ mode: 'canonical' });
        const c = await client();
        const res = await c.fetch('/identifiers?last=5', 'GET', undefined);
        assert.deepEqual(await res.json(), { done: true });

        const request = keria.spy.mock.calls.at(-1)![0] as Request;
        assert.isFalse(request.headers.has(HEADER_SIG_SENDER));
        assert.isFalse(request.headers.has(HEADER_SIG_TIME));
        assert.isFalse(request.headers.has('Content-Digest'));
        assert.match(
            request.headers.get(HEADER_SIG_INPUT)!,
            /^signify=\("@method" "@authority" "@path" "@query"\);created=\d+;nonce="[\w-]{22}";alg="ed25519";keyid="ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose"$/
        );
        const v = keria.verified.at(-1) as HttpSigVerified;
        assert.equal(v.mode, 'canonical');
        assert.equal(v.keyid, CONTROLLER);
        assert.include(v.base, '"@query": ?last=5');
    });

    test('covers a body with Content-Digest', async () => {
        const keria = mockKeria({ mode: 'canonical' });
        const c = await client();
        await c.fetch('/oobis', 'POST', { alias: 'wit' });
        const request = keria.spy.mock.calls.at(-1)![0] as Request;
        assert.match(request.headers.get('Content-Digest')!, /^sha-256=:/);
        const v = keria.verified.at(-1) as HttpSigVerified;
        assert.include(v.components, '"content-digest"');
        assert.equal(await request.text(), '{"alias":"wit"}');
    });

    test('refuses a legacy reply and does not fall back', async () => {
        const keria = mockKeria({ mode: 'legacy' });
        const c = await client();
        expect(await refusal(c.fetch('/identifiers', 'GET', undefined))).toBe(
            'mode-mismatch'
        );
        assert.equal(keria.calls(), 1);
    });

    test('an unsigned 401 is an authentication failure', async () => {
        const keria = mockKeria({ mode: 'unsigned', status: 401 });
        const c = await client();
        expect(await refusal(c.fetch('/identifiers', 'GET', undefined))).toBe(
            'unauthenticated'
        );
        assert.equal(keria.calls(), 1);
    });

    test('any other unsigned reply is refused', async () => {
        mockKeria({ mode: 'unsigned' });
        const c = await client();
        expect(await refusal(c.fetch('/identifiers', 'GET', undefined))).toBe(
            'missing-signature'
        );
    });

    test('a replaced response body is refused', async () => {
        mockKeria({ mode: 'tampered' });
        const c = await client();
        expect(await refusal(c.fetch('/identifiers', 'GET', undefined))).toBe(
            'digest-mismatch'
        );
    });

    test('a signed error reply still surfaces as an HTTP error', async () => {
        mockKeria({ mode: 'canonical', status: 400 });
        const c = await client();
        await expect(
            c.fetch('/identifiers', 'GET', undefined)
        ).rejects.toThrowError(/^HTTP GET \/identifiers - 400/);
    });
});

describe('HttpSigAuthenticator', () => {
    test('binds the reply to the content it signed, and knows no other request', async () => {
        const authn = new HttpSigAuthenticator(
            new Controller(bran, Tier.low).signer,
            agentSigner.verfer,
            { clock: () => 1700000000 }
        );
        const request = await authn.prepare(
            new Request(url + '/oobis', { method: 'POST', body: '{"a":1}' }),
            CONTROLLER,
            AGENT
        );
        const reply = (req: Request, sent: string) => {
            const headers = new Headers();
            const fields = signResponse({
                status: 200,
                headers,
                body: '{}',
                request: {
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    body: sent,
                },
                signer: agentSigner,
                keyid: AGENT,
                created: 1700000000,
            });
            for (const [k, v] of Object.entries(fields)) headers.set(k, v);
            return new Response('{}', { status: 200, headers });
        };
        const ok = await authn.verify(
            request,
            reply(request, '{"a":1}'),
            CONTROLLER,
            AGENT
        );
        assert.equal(ok.status, 200);

        // A Request that prepare did not sign has no known content, so its
        // reply cannot be bound to it: an error, not a request assumed empty.
        const stranger = new Request(url + '/oobis', { method: 'GET' });
        await expect(
            authn.verify(stranger, reply(request, '{"a":1}'), CONTROLLER, AGENT)
        ).rejects.toThrowError(/needs the Request that prepare signed/);
    });
});

describe('createSignedRequest', () => {
    const init = () => ({
        headers: new Headers({ 'Content-Type': 'application/json' }),
        method: 'POST',
        body: JSON.stringify({ foo: true }),
    });
    const aid1Verfer = () => new Verfer({ qb64: mockGetAID.state.k[0] });

    async function verifyThirdParty(request: Request) {
        return await verifyRequest({
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: new Uint8Array(await request.clone().arrayBuffer()),
            resolver: (keyid) => (keyid === AID1 ? aid1Verfer() : null),
            policy: { requireAuthority: true, authorities: ['example.com'] },
        });
    }

    test('signs canonically when asked, covering @authority and the body', async () => {
        mockKeria({ mode: 'legacy' });
        const c = await client(AuthMode.SignedHeaders);
        const request = await c.createSignedRequest(
            'aid1',
            'http://example.com/test?x=1',
            init(),
            { authMode: AuthMode.RFC9421 }
        );
        assert.isFalse(request.headers.has(HEADER_SIG_SENDER));
        const v = await verifyThirdParty(request);
        assert.equal(v.keyid, AID1);
        assert.deepEqual(v.components, [
            '"@method"',
            '"@authority"',
            '"@path"',
            '"@query"',
            '"content-digest"',
        ]);
        assert.equal(await request.text(), '{"foo":true}');
    });

    test('signs the target exactly as fetch will send it', async () => {
        // fetch() puts the WHATWG-serialized URL on the wire, dot segments
        // removed and quotes encoded; the signature must cover that form.
        mockKeria({ mode: 'legacy' });
        const c = await client(AuthMode.SignedHeaders);
        const request = await c.createSignedRequest(
            'aid1',
            "http://example.com/a/%2e%2e/test?q='1'",
            init(),
            { authMode: AuthMode.RFC9421 }
        );
        assert.equal(request.url, 'http://example.com/test?q=%271%27');
        const v = await verifyThirdParty(request);
        assert.include(v.base, '"@path": /test\n');
        assert.include(v.base, '"@query": ?q=%271%27\n');
    });

    test('follows the client mode by default', async () => {
        mockKeria({ mode: 'canonical' });
        const c = await client();
        const request = await c.createSignedRequest(
            'aid1',
            'http://example.com/test',
            init()
        );
        assert.equal((await verifyThirdParty(request)).mode, 'canonical');
    });

    test('stays legacy for a legacy client', async () => {
        mockKeria({ mode: 'legacy' });
        const c = await client(AuthMode.SignedHeaders);
        const request = await c.createSignedRequest(
            'aid1',
            'http://example.com/test',
            init()
        );
        assert.equal(request.headers.get(HEADER_SIG_SENDER), AID1);
        assert.match(
            request.headers.get('Signature')!,
            /^indexed="\?0";signify="0B/
        );
    });

    test('signs with the single effective signer (profile R4)', async () => {
        mockKeria({ mode: 'legacy' });
        const c = await client(AuthMode.SignedHeaders);
        const state = mockGetAID.state as { k: string[]; kt: unknown };
        const saved = { k: state.k, kt: state.kt };
        const other = 'DGd-3Zx6b7ql1gnccAXOgBHVTgMUrPicoXIFe8FA7eYq';
        const sign = () =>
            c.createSignedRequest('aid1', 'http://example.com/test', init(), {
                authMode: AuthMode.RFC9421,
            });
        try {
            // A passcode-rotated shape: only key 0 satisfies ['1','0'].
            state.k = [saved.k[0], other];
            state.kt = ['1', '0'];
            const v = await verifyThirdParty(await sign());
            assert.equal(v.verfer.qb64, saved.k[0]);
            // Either of two keys suffices: no single effective signer.
            state.kt = '1';
            expect(await refusal(sign())).toBe('unsupported-signer');
        } finally {
            state.k = saved.k;
            state.kt = saved.kt;
        }
    });

    test('refuses ESSR', async () => {
        mockKeria({ mode: 'legacy' });
        const c = await client(AuthMode.SignedHeaders);
        await expect(
            c.createSignedRequest('aid1', 'http://example.com/test', init(), {
                authMode: AuthMode.ESSR,
            })
        ).rejects.toThrowError('createSignedRequest does not support ESSR.');
    });
});
