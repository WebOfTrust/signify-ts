import { assert, beforeAll, describe, expect, it } from 'vitest';
import libsodium from 'libsodium-wrappers-sumo';
import {
    parseDictionary,
    Item,
    Parameters as SfParameters,
} from 'structured-headers';
import { decodeBase64Url } from '../../src/keri/core/base64.ts';
import { Matter, MtrDex } from '../../src/keri/core/matter.ts';
import { Signer } from '../../src/keri/core/signer.ts';
import { Verfer } from '../../src/keri/core/verfer.ts';
import { KeyState } from '../../src/keri/core/keyState.ts';
import { Siger } from '../../src/keri/core/siger.ts';
import { IdrDex } from '../../src/keri/core/indexer.ts';
import { SignedHeaderAuthenticator } from '../../src/keri/core/authing.ts';
import {
    HttpSigKeyResolver,
    HttpSigRefusal,
    checkBody,
    checkPolicy,
    effectiveKeyIndex,
    keyStateResolver,
    resolveKeyid,
    responseComponents,
    signRequest,
    signResponse,
    verifyRequest,
    verifyResponse,
} from '../../src/keri/core/httpsigning.ts';

// Synthetic AIDs: well-formed E codes, as in the shared vectors.
const CONTROLLER = 'ELLKuZrOw7_eNOyM2TXu5j2YHnEyHnpM1iTUKf4Dxgtx';
const AGENT = 'EIhwv8kMnCY92GevqHtBlMT8cQD96m3XkNav--Ti-4Q6';
const NOW = 1700000030;
const URL_ = 'https://keria.example.com/identifiers?type=rot';
const BODY = '{"name": "alice"}';

let controller: Signer;
let agent: Signer;

function seed(n: number): Uint8Array {
    return Uint8Array.from({ length: 32 }, (_, i) => (i + n) % 256);
}

function resolver(keyid: string): Verfer | null {
    if (keyid === CONTROLLER) return controller.verfer;
    if (keyid === AGENT) return agent.verfer;
    return null;
}

async function code(p: Promise<unknown> | (() => unknown)): Promise<string> {
    try {
        await (typeof p === 'function' ? p() : p);
    } catch (e) {
        if (e instanceof HttpSigRefusal) return e.code;
        throw e;
    }
    return 'accepted';
}

function signed(extra: Partial<Parameters<typeof signRequest>[0]> = {}) {
    const fields = signRequest({
        method: 'POST',
        url: URL_,
        body: BODY,
        signer: controller,
        keyid: CONTROLLER,
        created: NOW,
        ...extra,
    });
    return { ...fields } as Record<string, string>;
}

function paramsOf(input: string): { items: Item[]; params: SfParameters } {
    const [member] = Array.from(parseDictionary(input).values());
    const [items, params] = member as [Item[], SfParameters];
    return { items, params };
}

beforeAll(async () => {
    await libsodium.ready;
    controller = new Signer({ raw: seed(2), code: MtrDex.Ed25519_Seed });
    agent = new Signer({ raw: seed(3), code: MtrDex.Ed25519_Seed });
});

describe('signRequest', () => {
    it('covers the default set, a digest, and emits created, nonce, alg, keyid', () => {
        const fields = signed({ created: undefined });
        const { items, params } = paramsOf(fields['Signature-Input']);
        assert.deepEqual(
            items.map((i) => i[0]),
            ['@method', '@authority', '@path', '@query', 'content-digest']
        );
        assert.deepEqual(Array.from(params.keys()), [
            'created',
            'nonce',
            'alg',
            'keyid',
        ]);
        assert.equal(params.get('alg'), 'ed25519');
        assert.equal(params.get('keyid'), CONTROLLER);
        const created = params.get('created') as number;
        assert.approximately(created, Math.floor(Date.now() / 1000), 5);
        assert.isAtLeast(
            decodeBase64Url(params.get('nonce') as string).length,
            16
        );
        assert.match(fields['Content-Digest'], /^sha-256=:.+:$/);
        assert.match(fields.Signature, /^signify=:[A-Za-z0-9+/]+=*:$/);
        assert.notProperty(fields, 'Signify-Resource');
        assert.notProperty(fields, 'Signify-Timestamp');
    });

    it('draws a fresh nonce each time', () => {
        const a = paramsOf(signed()['Signature-Input']).params.get('nonce');
        const b = paramsOf(signed()['Signature-Input']).params.get('nonce');
        assert.notEqual(a, b);
    });

    it('covers no digest when there is no body', () => {
        const fields = signed({ method: 'GET', body: null });
        assert.notProperty(fields, 'Content-Digest');
        assert.deepEqual(
            paramsOf(fields['Signature-Input']).items.map((i) => i[0]),
            ['@method', '@authority', '@path', '@query']
        );
    });

    it('refuses a set below the minimum, an unknown alg, and req', async () => {
        expect(
            await code(() =>
                signed({ components: ['@method', '@path', 'content-digest'] })
            )
        ).toBe('insufficient-coverage');
        expect(await code(() => signed({ alg: 'hmac-sha256' }))).toBe(
            'unsupported-algorithm'
        );
        expect(
            await code(() =>
                signed({
                    components: [
                        '@method',
                        '"@path";req',
                        '@query',
                        'content-digest',
                    ],
                })
            )
        ).toBe('unsupported-component');
        expect(
            await code(() =>
                signed({
                    components: [
                        '@method',
                        '@path',
                        '@query',
                        'content-digest',
                        'x-absent',
                    ],
                })
            )
        ).toBe('missing-component');
    });
});

describe('verifyRequest', () => {
    it('accepts its own signer’s request', async () => {
        const v = await verifyRequest({
            method: 'POST',
            url: URL_,
            headers: signed(),
            body: BODY,
            resolver,
            now: NOW,
        });
        assert.equal(v.keyid, CONTROLLER);
        assert.equal(v.verfer.qb64, controller.verfer.qb64);
    });

    it('reads the clock through an injectable source', async () => {
        const args = {
            method: 'POST',
            url: URL_,
            headers: signed(),
            body: BODY,
            resolver,
        };
        expect(await code(verifyRequest({ ...args, now: () => NOW }))).toBe(
            'accepted'
        );
        expect(
            await code(verifyRequest({ ...args, now: () => NOW + 3600 }))
        ).toBe('signature-stale');
        expect(
            await code(
                verifyRequest({
                    ...args,
                    now: NOW + 3600,
                    policy: { maxAge: 3600 },
                })
            )
        ).toBe('accepted');
    });

    it('checks a body read after the headers', async () => {
        const headers = signed();
        const v = await verifyRequest({
            method: 'POST',
            url: URL_,
            headers,
            resolver,
            now: NOW,
        });
        assert.isTrue(v.bodyOwed);
        const done = checkBody(v, headers, BODY);
        assert.isFalse(done.bodyOwed);
        assert.isTrue(v.bodyOwed, 'the deferred result is left as it was');
        expect(await code(() => checkBody(v, headers, '{"x":1}'))).toBe(
            'digest-mismatch'
        );
        const whole = await verifyRequest({
            method: 'POST',
            url: URL_,
            headers,
            body: BODY,
            resolver,
            now: NOW,
        });
        assert.isFalse(whole.bodyOwed);

        const bare = signed({ method: 'GET', body: null });
        const w = await verifyRequest({
            method: 'GET',
            url: URL_,
            headers: bare,
            resolver,
            now: NOW,
        });
        expect(await code(() => checkBody(w, bare, 'smuggled'))).toBe(
            'insufficient-coverage'
        );
    });

    it('trims only SP and HTAB from a Content-Length (profile §3)', async () => {
        const bare = signed({ method: 'POST', body: null });
        const verify = (length: string) =>
            code(
                verifyRequest({
                    method: 'POST',
                    url: URL_,
                    headers: { ...bare, 'Content-Length': length },
                    resolver,
                    now: NOW,
                })
            );
        expect(await verify('0')).toBe('accepted');
        expect(await verify('0\t')).toBe('accepted');
        // A no-break space leaves something other than a plain decimal.
        expect(await verify('0\u00a0')).toBe('insufficient-coverage');
    });

    it('verifies the path and query as received, not normalized (profile §2)', async () => {
        const over = (url: string) =>
            signed({ method: 'GET', body: null, url });
        const verify = (url: string, headers: Record<string, string>) =>
            code(
                verifyRequest({
                    method: 'GET',
                    url,
                    headers,
                    resolver,
                    now: NOW,
                })
            );
        const plain = over('https://x.example/b');
        expect(await verify('https://x.example/b', plain)).toBe('accepted');
        expect(await verify('https://x.example/a/%2e%2e/b', plain)).toBe(
            'signature-mismatch'
        );
        const quoted = over("https://x.example/p?a='b'");
        expect(await verify("https://x.example/p?a='b'", quoted)).toBe(
            'accepted'
        );
        expect(await verify('https://x.example/p?a=%27b%27', quoted)).toBe(
            'signature-mismatch'
        );
    });

    it('verifies a relative URL whose Host carries the default port', async () => {
        const headers = signed({
            method: 'GET',
            body: null,
            url: 'https://api.example/p',
        });
        expect(
            await code(
                verifyRequest({
                    method: 'GET',
                    url: '/p',
                    headers: { ...headers, Host: 'api.example:443' },
                    resolver,
                    now: NOW,
                })
            )
        ).toBe('accepted');
    });

    it('enforces @authority against the authorities served', async () => {
        const policy = {
            requireAuthority: true,
            authorities: ['keria.example.com'],
        };
        const args = {
            method: 'POST',
            headers: signed(),
            body: BODY,
            resolver,
            now: NOW,
            policy,
        };
        expect(await code(verifyRequest({ ...args, url: URL_ }))).toBe(
            'accepted'
        );
        expect(
            await code(
                verifyRequest({
                    ...args,
                    policy: { ...policy, authorities: ['other.example.com'] },
                    url: URL_,
                })
            )
        ).toBe('signature-mismatch');
        const noAuthority = signed({
            components: ['@method', '@path', '@query', 'content-digest'],
        });
        expect(
            await code(
                verifyRequest({ ...args, headers: noAuthority, url: URL_ })
            )
        ).toBe('insufficient-coverage');
    });
});

describe('checkPolicy (profile §3, §6)', () => {
    it('refuses a policy below the minimum set or with a non-positive window', () => {
        checkPolicy({});
        checkPolicy({ request: ['@method', '@path', '@query', '@authority'] });
        assert.throws(() => checkPolicy({ request: ['@method', '@path'] }));
        assert.throws(() => checkPolicy({ maxAge: 0 }));
        assert.throws(() => checkPolicy({ skew: -1 }));
        assert.throws(() => checkPolicy({ maxAge: 1.5 }));
        assert.throws(() => checkPolicy({ requireAuthority: true }));
        assert.throws(() =>
            checkPolicy({ authorities: 'keria.example.com' as never })
        );
    });

    it('is applied by verifyRequest and verifyResponse', async () => {
        await expect(
            verifyRequest({
                method: 'POST',
                url: URL_,
                headers: signed(),
                body: BODY,
                resolver,
                now: NOW,
                policy: { request: ['@method'] },
            })
        ).rejects.toThrow(/minimum set/);
        await expect(
            verifyResponse({
                status: 200,
                headers: {},
                body: null,
                request: { method: 'GET', url: URL_, headers: {}, body: null },
                keyid: AGENT,
                policy: { skew: 0 },
            })
        ).rejects.toThrow(/positive/);
    });
});

describe('keyid resolution (profile §7)', () => {
    it('derives a non-transferable Ed25519 key without a resolver', async () => {
        const nt = new Signer({
            raw: seed(0),
            code: MtrDex.Ed25519_Seed,
            transferable: false,
        });
        const v = await resolveKeyid(nt.verfer.qb64);
        assert.equal(v.qb64, nt.verfer.qb64);
    });

    it('refuses a non-transferable keyid whose key has small order (§9)', async () => {
        // The identity point: a signature verifies under it over any message.
        const identity = new Uint8Array(32);
        identity[0] = 1;
        const keyid = new Matter({ raw: identity, code: MtrDex.Ed25519N }).qb64;
        assert.equal(keyid, 'BAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        expect(await code(resolveKeyid(keyid))).toBe('malformed-key');
        // The same point with the sign bit set is the same small-order key.
        identity[31] = 0x80;
        const signed = new Matter({ raw: identity, code: MtrDex.Ed25519N })
            .qb64;
        expect(await code(resolveKeyid(signed))).toBe('malformed-key');
    });

    it('never decodes a transferable D keyid as a key', async () => {
        expect(await code(resolveKeyid(controller.verfer.qb64))).toBe(
            'unknown-key'
        );
    });

    it('refuses trailing characters and other key types', async () => {
        expect(await code(resolveKeyid(CONTROLLER + 'A', resolver))).toBe(
            'malformed-key'
        );
        const k1 = new Matter({ raw: new Uint8Array(33), code: '1AAA' }).qb64;
        expect(await code(resolveKeyid(k1))).toBe('unsupported-algorithm');
    });

    it('resolves key state to its single effective signer (R4)', async () => {
        const state = (k: string[], kt: string | string[]) =>
            ({ i: CONTROLLER, k, kt }) as unknown as KeyState;
        const one = keyStateResolver(() =>
            state([controller.verfer.qb64], '1')
        );
        assert.equal(
            (await resolveKeyid(CONTROLLER, one)).qb64,
            controller.verfer.qb64
        );
        const two = keyStateResolver(() =>
            state([controller.verfer.qb64, agent.verfer.qb64], '1')
        );
        expect(await code(resolveKeyid(CONTROLLER, two))).toBe(
            'unsupported-signer'
        );
        const weighted = keyStateResolver(() =>
            state([controller.verfer.qb64], ['1'])
        );
        assert.equal(
            (await resolveKeyid(CONTROLLER, weighted)).qb64,
            controller.verfer.qb64
        );
        // Signify's passcode rotation: [new, prior-next] with ['1','0'].
        const rotated = keyStateResolver(() =>
            state([controller.verfer.qb64, agent.verfer.qb64], ['1', '0'])
        );
        assert.equal(
            (await resolveKeyid(CONTROLLER, rotated)).qb64,
            controller.verfer.qb64
        );
        const group = keyStateResolver(() =>
            state(
                [controller.verfer.qb64, agent.verfer.qb64, agent.verfer.qb64],
                '2'
            )
        );
        expect(await code(resolveKeyid(CONTROLLER, group))).toBe(
            'unsupported-signer'
        );
        const none = keyStateResolver(() => undefined);
        expect(await code(resolveKeyid(CONTROLLER, none))).toBe('unknown-key');
    });

    it('names the effective key index', async () => {
        const keys = ['a', 'b'];
        assert.equal(effectiveKeyIndex(['a'], '1'), 0);
        assert.equal(effectiveKeyIndex(keys, ['1', '0']), 0);
        assert.equal(effectiveKeyIndex(keys, ['0', '1']), 1);
        expect(await code(() => effectiveKeyIndex(keys, '1'))).toBe(
            'unsupported-signer'
        );
        expect(await code(() => effectiveKeyIndex(keys, ['1/2', '1/2']))).toBe(
            'unsupported-signer'
        );
    });

    it('looks legacy Signify-Resource up by its single effective signer (profile 1.1 §8)', async () => {
        const as = (k: string[], kt: string | string[]) =>
            keyStateResolver(
                () => ({ i: CONTROLLER, k, kt }) as unknown as KeyState
            );
        const pair = [controller.verfer.qb64, agent.verfer.qb64];
        // A passcode-rotated Signify controller: its first key.
        assert.equal(
            (await as(pair, ['1', '0']).legacy!(CONTROLLER))!.qb64,
            controller.verfer.qb64
        );
        // Weight 0 on the first key: the second is the one used.
        assert.equal(
            (await as(pair, ['0', '1']).legacy!(CONTROLLER))!.qb64,
            agent.verfer.qb64
        );
        // Either key alone, or neither: no single effective signer.
        expect(await code(() => as(pair, '1').legacy!(CONTROLLER))).toBe(
            'unsupported-signer'
        );
        expect(await code(() => as(pair, '2').legacy!(CONTROLLER))).toBe(
            'unsupported-signer'
        );
        const none = keyStateResolver(() => undefined);
        assert.isNull(await none.legacy!(CONTROLLER));
    });

    it('verifies a legacy request under the effective signer only', async () => {
        const prepare = async (signer: Signer) => {
            const prepared = await new SignedHeaderAuthenticator(
                signer,
                signer.verfer
            ).prepare(
                new Request(URL_, {
                    headers: new Headers({
                        'Signify-Resource': CONTROLLER,
                        'Signify-Timestamp': '2026-01-01T00:00:00.000000+00:00',
                    }),
                }),
                CONTROLLER,
                AGENT
            );
            const headers: Record<string, string> = {};
            prepared.headers.forEach((value, name) => (headers[name] = value));
            return headers;
        };
        const verify = async (
            signer: Signer,
            kt: string | string[]
        ): Promise<string> =>
            code(
                verifyRequest({
                    method: 'GET',
                    url: URL_,
                    headers: await prepare(signer),
                    resolver: keyStateResolver(
                        () =>
                            ({
                                i: CONTROLLER,
                                k: [controller.verfer.qb64, agent.verfer.qb64],
                                kt,
                            }) as unknown as KeyState
                    ),
                })
            );
        expect(await verify(controller, ['1', '0'])).toBe('accepted');
        expect(await verify(agent, ['0', '1'])).toBe('accepted');
        expect(await verify(controller, ['0', '1'])).toBe('signature-mismatch');
        expect(await verify(controller, '2')).toBe('unsupported-signer');
    });

    it('refuses, never throws, a legacy signature the key cannot check', async () => {
        const headers = new Headers({
            'Signify-Resource': CONTROLLER,
            'Signify-Timestamp': '2026-01-01T00:00:00.000000+00:00',
        });
        const prepared = await new SignedHeaderAuthenticator(
            controller,
            controller.verfer
        ).prepare(new Request(URL_, { headers }), CONTROLLER, AGENT);
        const legacy: Record<string, string> = {};
        prepared.headers.forEach((value, name) => (legacy[name] = value));
        const verify = (h: Record<string, string>, r: HttpSigKeyResolver) =>
            code(
                verifyRequest({
                    method: 'GET',
                    url: URL_,
                    headers: h,
                    resolver: r,
                })
            );
        expect(await verify(legacy, resolver)).toBe('accepted');
        // An Ed448 signature is 114 bytes, which Ed25519 verification
        // rejects by throwing rather than by returning false.
        const ed448 = new Siger({
            raw: new Uint8Array(114).fill(1),
            code: IdrDex.Ed448_Sig,
            index: 0,
        });
        expect(
            await verify(
                {
                    ...legacy,
                    signature: `indexed="?1";signify="${ed448.qb64}"`,
                },
                resolver
            )
        ).toBe('signature-mismatch');
        // A secp256k1 key never reaches verification: no Verfer holds one,
        // and the key-state resolver refuses it.
        const k1 = keyStateResolver(
            () =>
                ({
                    i: CONTROLLER,
                    k: [`1AAB${'A'.repeat(44)}`],
                    kt: '1',
                }) as unknown as KeyState
        );
        expect(await verify(legacy, k1)).toBe('unsupported-algorithm');
    });

    it('surfaces unsupported-signer through verifyRequest', async () => {
        const multi = keyStateResolver(
            () =>
                ({
                    i: CONTROLLER,
                    k: [controller.verfer.qb64, agent.verfer.qb64],
                    kt: '1',
                }) as unknown as KeyState
        );
        expect(
            await code(
                verifyRequest({
                    method: 'POST',
                    url: URL_,
                    headers: signed(),
                    body: BODY,
                    resolver: multi,
                    now: NOW,
                })
            )
        ).toBe('unsupported-signer');
    });
});

describe('verifyResponse (profile §8)', () => {
    const request = () => {
        const headers = signed();
        return { method: 'POST', url: URL_, headers, body: BODY };
    };
    const respond = (req: ReturnType<typeof request>, keyid = AGENT) => ({
        ...signResponse({
            status: 200,
            body: '{"done": true}',
            request: req,
            signer: keyid === AGENT ? agent : controller,
            keyid,
            created: NOW,
        }),
    });

    it('accepts a response bound to its request', async () => {
        const req = request();
        const v = await verifyResponse({
            status: 200,
            headers: respond(req),
            body: '{"done": true}',
            request: req,
            keyid: AGENT,
            resolver,
            now: NOW,
        });
        assert.deepEqual(v.components, [
            '"@status"',
            '"@method";req',
            '"@path";req',
            '"@query";req',
            '"content-digest"',
            '"content-digest";req',
        ]);
    });

    it('reads the response Content-Digest once when the body is supplied', async () => {
        const req = request();
        let reads = 0;
        class Counting extends Headers {
            get(name: string) {
                if (name.toLowerCase() === 'content-digest') reads++;
                return super.get(name);
            }
        }
        await verifyResponse({
            status: 200,
            headers: new Counting(respond(req)),
            body: '{"done": true}',
            request: req,
            keyid: AGENT,
            resolver,
            now: NOW,
        });
        // Once for the signature base, once for the digest check.
        expect(reads).toBe(2);
    });

    it('refuses a response signed by another AID', async () => {
        const req = request();
        expect(
            await code(
                verifyResponse({
                    status: 200,
                    headers: respond(req, CONTROLLER),
                    body: '{"done": true}',
                    request: req,
                    keyid: AGENT,
                    resolver,
                    now: NOW,
                })
            )
        ).toBe('unknown-key');
    });

    it('reports an unsigned 401 as unauthenticated, other unsigned as missing', async () => {
        const req = request();
        const base = { body: 'nope', request: req, keyid: AGENT, resolver };
        expect(
            await code(verifyResponse({ ...base, status: 401, headers: {} }))
        ).toBe('unauthenticated');
        expect(
            await code(verifyResponse({ ...base, status: 500, headers: {} }))
        ).toBe('missing-signature');
    });

    it('treats an empty Signature header as unsigned (profile 1.1 §8)', async () => {
        const req = request();
        const base = { body: 'nope', request: req, keyid: AGENT, resolver };
        const headers = { Signature: '' };
        expect(
            await code(verifyResponse({ ...base, status: 401, headers }))
        ).toBe('unauthenticated');
        expect(
            await code(verifyResponse({ ...base, status: 500, headers }))
        ).toBe('missing-signature');
    });

    it('defers a response body check visibly', async () => {
        const req = request();
        const headers = respond(req);
        const v = await verifyResponse({
            status: 200,
            headers,
            request: req,
            keyid: AGENT,
            resolver,
            now: NOW,
        });
        assert.isTrue(v.bodyOwed);
        assert.isFalse(checkBody(v, headers, '{"done": true}').bodyOwed);
        expect(await code(() => checkBody(v, headers, '{"done": 0}'))).toBe(
            'digest-mismatch'
        );
    });

    it('refuses a canonical response to a legacy request', async () => {
        const req = request();
        expect(
            await code(
                verifyResponse({
                    status: 200,
                    headers: respond(req),
                    body: '{"done": true}',
                    request: req,
                    keyid: AGENT,
                    resolver,
                    requestMode: 'legacy',
                    now: NOW,
                })
            )
        ).toBe('mode-mismatch');
    });

    it('adds a hint about the local clock to a stale response', async () => {
        const req = request();
        await expect(
            verifyResponse({
                status: 200,
                headers: respond(req),
                body: '{"done": true}',
                request: req,
                keyid: AGENT,
                resolver,
                now: NOW + 10000,
            })
        ).rejects.toThrow(/check the local clock/);
    });
});

describe('the response minimum reads the request content (profile §3, version 1)', () => {
    // Headers that announce a body the request did not carry: the header-time
    // request rule would count them, and the response minimum must not.
    const announced = {
        'transfer-encoding': 'chunked',
        'content-length': '5',
    };
    const empty = () => ({
        method: 'POST',
        url: URL_,
        headers: announced,
        body: new Uint8Array(),
    });
    const respondTo = (
        req: Parameters<typeof signResponse>[0]['request'],
        components?: string[]
    ): Record<string, string> => ({
        ...signResponse({
            status: 200,
            body: '{"done": true}',
            request: req,
            signer: agent,
            keyid: AGENT,
            created: NOW,
            components,
        }),
    });

    it('leaves "content-digest";req out when the content was empty, whatever the headers say', async () => {
        const req = empty();
        const v = await verifyResponse({
            status: 200,
            headers: respondTo(req),
            body: '{"done": true}',
            request: req,
            keyid: AGENT,
            resolver,
            now: NOW,
        });
        assert.notInclude(v.components, '"content-digest";req');
        assert.deepEqual(responseComponents(req, '{"done": true}'), [
            '"@status"',
            '"@method";req',
            '"@path";req',
            '"@query";req',
            '"content-digest"',
        ]);
    });

    it('requires "content-digest";req when the content was non-empty, whatever the headers say', async () => {
        // No Content-Length and no Transfer-Encoding: only the content.
        const headers = signed();
        assert.notProperty(headers, 'Content-Length');
        const req = { method: 'POST', url: URL_, headers, body: BODY };
        const short = [
            '"@status"',
            '"@method";req',
            '"@path";req',
            '"@query";req',
            'content-digest',
        ];
        expect(await code(() => respondTo(req, short))).toBe(
            'insufficient-coverage'
        );
        const unbound = respondTo({ ...req, body: '' }, short);
        expect(
            await code(
                verifyResponse({
                    status: 200,
                    headers: unbound,
                    body: '{"done": true}',
                    request: req,
                    keyid: AGENT,
                    resolver,
                    now: NOW,
                })
            )
        ).toBe('insufficient-coverage');
    });
});

describe('the request a response answers carries the content sent', () => {
    const request = () => ({
        method: 'POST',
        url: URL_,
        headers: signed(),
        body: BODY as string | undefined,
    });
    const respond = (
        req: ReturnType<typeof request>
    ): Record<string, string> => ({
        ...signResponse({
            status: 200,
            body: '{"done": true}',
            request: req,
            signer: agent,
            keyid: AGENT,
            created: NOW,
        }),
    });

    it('refuses, as a caller error, a request whose content is not known', async () => {
        const req = request();
        const headers = respond(req);
        const unknown = { ...req, body: undefined };
        for (const attempt of [
            () => respond(unknown),
            () => responseComponents(unknown),
            () =>
                verifyResponse({
                    status: 200,
                    headers,
                    body: '{"done": true}',
                    request: unknown,
                    keyid: AGENT,
                    resolver,
                    now: NOW,
                }),
            // Up front: before the unsigned-401 check.
            () =>
                verifyResponse({
                    status: 401,
                    headers: {},
                    body: null,
                    request: unknown,
                    keyid: AGENT,
                    resolver,
                    now: NOW,
                }),
        ]) {
            let thrown: unknown;
            try {
                await attempt();
            } catch (e) {
                thrown = e;
            }
            assert.instanceOf(thrown, Error);
            assert.notInstanceOf(thrown, HttpSigRefusal);
            assert.match(
                (thrown as Error).message,
                /request\.body must be the request content/
            );
        }
    });

    it('recomputes the request digest over the content the client kept', async () => {
        const req = request();
        const headers = respond(req);
        const misbooked = { ...req, body: '{"name": "mallory"}' };
        expect(
            await code(
                verifyResponse({
                    status: 200,
                    headers,
                    body: '{"done": true}',
                    request: misbooked,
                    keyid: AGENT,
                    resolver,
                    now: NOW,
                })
            )
        ).toBe('digest-mismatch');
        // Still at header time when the response body is deferred.
        expect(
            await code(
                verifyResponse({
                    status: 200,
                    headers,
                    request: misbooked,
                    keyid: AGENT,
                    resolver,
                    now: NOW,
                })
            )
        ).toBe('digest-mismatch');
    });

    it('refuses to sign a response bound to a digest the request content contradicts', async () => {
        const req = request();
        expect(
            await code(() => respond({ ...req, body: '{"name": "mallory"}' }))
        ).toBe('digest-mismatch');
        const malformed = {
            ...req,
            headers: { ...req.headers, 'Content-Digest': 'sha-256=?1' },
        };
        expect(await code(() => respond(malformed))).toBe('malformed-digest');
    });
});

describe('the expected-AID check on a response (profile §9)', () => {
    const request = () => ({
        method: 'GET',
        url: URL_,
        headers: signed({ method: 'GET', body: null }),
        body: null,
    });
    const respondAs = (keyid: string): Record<string, string> => ({
        ...signResponse({
            status: 200,
            body: '{"done": true}',
            request: request(),
            signer: agent,
            keyid,
            created: NOW,
        }),
    });

    it('runs after malformed-key and before resolution', async () => {
        const calls: string[] = [];
        const recording = (keyid: string) => {
            calls.push(keyid);
            return resolver(keyid);
        };
        const verify = (keyid: string) =>
            verifyResponse({
                status: 200,
                headers: respondAs(keyid),
                body: '{"done": true}',
                request: request(),
                keyid: AGENT,
                resolver: recording,
                now: NOW,
            });
        // Malformed and unexpected: malformed-key comes first.
        expect(await code(verify('not-an-aid'))).toBe('malformed-key');
        // Well formed and unexpected: unknown-key, and the key state of the
        // unexpected AID is never consulted, even for an AID the resolver
        // knows (CONTROLLER) or would refuse (an R4 failure).
        expect(await code(verify(CONTROLLER))).toBe('unknown-key');
        const multi = keyStateResolver((aid) => {
            calls.push(aid);
            return {
                i: aid,
                k: [controller.verfer.qb64, agent.verfer.qb64],
                kt: '1',
            } as unknown as KeyState;
        });
        expect(
            await code(
                verifyResponse({
                    status: 200,
                    headers: respondAs(CONTROLLER),
                    body: '{"done": true}',
                    request: request(),
                    keyid: AGENT,
                    resolver: multi,
                    now: NOW,
                })
            )
        ).toBe('unknown-key');
        assert.deepEqual(calls, []);
    });
});

describe('HttpSigRefusal', () => {
    it('carries the code and is an Error', async () => {
        try {
            await verifyRequest({
                method: 'GET',
                url: URL_,
                headers: {},
                resolver,
            });
            assert.fail('expected a refusal');
        } catch (e) {
            assert.instanceOf(e, Error);
            assert.instanceOf(e, HttpSigRefusal);
            assert.equal((e as HttpSigRefusal).code, 'missing-signature');
        }
    });

    it('agrees with the Verfer derived from a vector public key', () => {
        // Guard against a base64url slip in the vector key decoding used by
        // httpsig-vectors.test.ts.
        const v = new Verfer({
            raw: decodeBase64Url(
                Buffer.from(controller.verfer.raw).toString('base64url')
            ),
            code: MtrDex.Ed25519,
        });
        assert.equal(v.qb64, controller.verfer.qb64);
    });
});
