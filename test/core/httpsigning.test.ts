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
import {
    HttpSigRefusal,
    checkBody,
    checkPolicy,
    effectiveKeyIndex,
    keyStateResolver,
    resolveKeyid,
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
                request: { method: 'GET', url: URL_, headers: {} },
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

    it('looks legacy Signify-Resource up by its first key, without R4', async () => {
        const multi = keyStateResolver(
            () =>
                ({
                    i: CONTROLLER,
                    k: [controller.verfer.qb64, agent.verfer.qb64],
                    kt: '1',
                }) as unknown as KeyState
        );
        assert.equal(
            (await multi.legacy!(CONTROLLER))!.qb64,
            controller.verfer.qb64
        );
        const none = keyStateResolver(() => undefined);
        assert.isNull(await none.legacy!(CONTROLLER));
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
