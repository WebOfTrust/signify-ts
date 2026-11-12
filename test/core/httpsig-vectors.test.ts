/**
 * Runs every case of the shared KERI-profile RFC 9421 vectors in
 * test/vectors/keri-rfc9421/ (bakobo/fiki 63821f7, tag keri-profile-v1.2,
 * keri_vectors_format 8, profile version 1.2). The vectors are verbatim
 * copies; see the README beside them.
 */
import { readFileSync } from 'node:fs';
import { assert, beforeAll, describe, expect, it } from 'vitest';
import libsodium from 'libsodium-wrappers-sumo';
import {
    ByteSequence,
    Item,
    Parameters,
    parseDictionary,
} from 'structured-headers';
import { decodeBase64Url } from '../../src/keri/core/base64.ts';
import { KeyState } from '../../src/keri/core/keyState.ts';
import { desiginput } from '../../src/keri/core/httping.ts';
import { legacySignatureBase } from '../../src/keri/core/httping.ts';
import { Matter, MtrDex } from '../../src/keri/core/matter.ts';
import { Signer } from '../../src/keri/core/signer.ts';
import { Verfer } from '../../src/keri/core/verfer.ts';
import { signatureBase } from '../../src/keri/core/httpsig.ts';
import {
    HTTPSIG_REFUSAL_CODES,
    HttpSigKeyResolver,
    HttpSigPolicy,
    HttpSigRefusal,
    checkBody,
    detectMode,
    keyStateResolver,
    signRequest,
    signResponse,
    verifyLegacy,
    verifyRequest,
    verifyResponse,
} from '../../src/keri/core/httpsigning.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

function load(name: string): Json {
    return JSON.parse(
        readFileSync(
            new URL(`../vectors/keri-rfc9421/${name}.json`, import.meta.url),
            'utf8'
        )
    );
}

const rfc9421 = load('rfc9421');
const requests = load('requests');
const responses = load('responses');
const refusals = load('refusals');
const legacy = load('legacy');

/** Cases as [id, case] tuples, typed for it.each. */
function cases(file: Json): [string, Json][] {
    return file.cases.map((c: Json): [string, Json] => [c.id, c]);
}

function hex(s: string): Uint8Array {
    return Uint8Array.from(s.match(/../g)!.map((h) => parseInt(h, 16)));
}

function signerFromSeed(seedHex: string): Signer {
    return new Signer({ raw: hex(seedHex), code: MtrDex.Ed25519_Seed });
}

/**
 * The keys table stands in for the KEL a verifier holds (vector header).
 * Each transferable entry's key_state becomes a key state record, and
 * {@link keyStateResolver} reduces it to the single effective signer (R4),
 * so the table's effective_key is checked, not trusted. A non-transferable
 * keyid must yield its key from the prefix alone, so it has no key state,
 * and a B keyid the table does not list still verifies.
 */
function keyTableResolver(keys: Json[]): HttpSigKeyResolver {
    const table = new Map<string, KeyState>();
    for (const k of keys) {
        if (k.kind !== 'transferable') continue;
        table.set(k.keyid, {
            i: k.keyid,
            k: k.key_state.keys,
            kt: k.key_state.threshold,
        } as unknown as KeyState);
    }
    return keyStateResolver((keyid) => table.get(keyid));
}

/** A case's policy object, in this implementation's terms. */
function policyOf(c: Json): HttpSigPolicy | undefined {
    const authorities = c.policy?.authorities;
    return authorities === undefined
        ? undefined
        : { requireAuthority: true, authorities };
}

/** A null body is one not handed to the verifier: the check is deferred. */
function bodyOf(body: string | null): string | undefined {
    return body ?? undefined;
}

/** The body the verifier later reads, for a deferred check. */
function readBody(body: string | null): string {
    return body ?? '';
}

function seedFor(keys: Json[], keyid: string): string {
    return keys.find((k: Json) => k.keyid === keyid).seed_hex;
}

/** Signature-Input parsed into the pieces a signer is given. */
function inputOf(headers: Record<string, string>) {
    const [[label, member]] = Array.from(
        parseDictionary(headers['Signature-Input']).entries()
    );
    const [items, params] = member as [Item[], Parameters];
    return {
        label,
        components: items
            .map((i) => i[0] as string)
            .map((n, i) => {
                const p = items[i][1];
                return p.size === 0 ? n : `"${n}"${p.has('req') ? ';req' : ''}`;
            }),
        created: params.get('created') as number,
        expires: params.get('expires') as number | undefined,
        nonce: (params.get('nonce') as string | undefined) ?? null,
        alg: (params.get('alg') as string | undefined) ?? null,
        keyid: params.get('keyid') as string,
    };
}

function withoutSignature(headers: Record<string, string>) {
    return Object.fromEntries(
        Object.entries(headers).filter(
            ([k]) =>
                !['signature', 'signature-input', 'content-digest'].includes(
                    k.toLowerCase()
                )
        )
    );
}

async function refusalOf(p: Promise<unknown>): Promise<string> {
    try {
        await p;
    } catch (e) {
        if (e instanceof HttpSigRefusal) return e.code;
        throw e;
    }
    return 'accepted';
}

beforeAll(async () => {
    await libsodium.ready;
});

describe('vector files', () => {
    it('are the frozen format 8 set, for profile version 1.2', () => {
        for (const file of [rfc9421, requests, responses, refusals, legacy]) {
            assert.equal(file.keri_vectors_format, 8);
            assert.equal(file.profile.version, '1.2');
            assert.equal(
                file.profile.where,
                'https://github.com/bakobo/fiki/blob/keri-profile-v1.2/docs/keri-profile.md'
            );
        }
    });

    it('name refusals with exactly the codes this implementation raises', () => {
        assert.deepEqual(refusals.codes, [...HTTPSIG_REFUSAL_CODES]);
    });

    it('reduce each key state to the effective key the table names (R4)', async () => {
        for (const k of requests.keys as Json[]) {
            if (k.kind !== 'transferable') continue;
            const resolver = keyTableResolver([k]);
            if (k.effective_key === null) {
                expect(
                    await refusalOf(Promise.resolve(resolver(k.keyid)))
                ).toBe('unsupported-signer');
                continue;
            }
            const verfer = (await resolver(k.keyid)) as Verfer;
            assert.equal(
                Buffer.from(verfer.raw).toString('base64url'),
                k.effective_key
            );
            assert.equal(
                new Verfer({
                    raw: decodeBase64Url(k.effective_key),
                    code: MtrDex.Ed25519,
                }).qb64,
                verfer.qb64
            );
        }
    });
});

describe('rfc9421.json', () => {
    it.each(cases(rfc9421))('%s', (_id: string, c: Json) => {
        const base = signatureBase({
            components: c.covered,
            params: { created: c.created, keyid: c.keyid },
            request: c.request,
        });
        assert.equal(base, c.expected.base);
        const signer = signerFromSeed(c.seed_hex);
        assert.equal(
            Buffer.from(signer.verfer.raw).toString('base64url'),
            c.public_key
        );
        const sig = signer.sign(new TextEncoder().encode(base)).raw;
        assert.equal(Buffer.from(sig).toString('base64'), c.expected.signature);
    });
});

describe('requests.json', () => {
    const resolver = keyTableResolver(requests.keys);

    it.each(cases(requests))('%s verifies', async (_id: string, c: Json) => {
        const deferred = await verifyRequest({
            method: c.request.method,
            url: c.request.url,
            headers: c.request.headers,
            body: bodyOf(c.request.body),
            resolver,
            policy: policyOf(c),
            now: c.now,
        });
        // A body not handed over leaves the check visibly owed (§5).
        assert.equal(deferred.bodyOwed, c.request.body === null);
        const v = checkBody(
            deferred,
            c.request.headers,
            readBody(c.request.body)
        );
        assert.isFalse(v.bodyOwed);
        assert.equal(v.mode, 'canonical');
        assert.equal(v.keyid, c.expected.keyid);
        assert.deepEqual(v.components, c.expected.covered);
        assert.equal(v.base, c.expected.base);
        const [member] = Array.from(
            parseDictionary(c.request.headers.Signature).values()
        );
        assert.equal(
            ((member as Item)[0] as ByteSequence).toBase64(),
            c.expected.signature
        );
    });

    // The verify_only cases carry a digest member a sha-256-only signer
    // does not emit, or a byte sequence without the padding a signer emits;
    // they test the verifier alone. The two unpadded cases are ones fiki
    // carries as data (verified_by_fiki false); signify-ts verifies them.
    it.each(
        // A B keyid the keys table does not list has no seed to sign with.
        cases(requests).filter(
            ([id, c]) =>
                !requests.verify_only.includes(id) &&
                requests.keys.some(
                    (k: Json) => k.keyid === inputOf(c.request.headers).keyid
                )
        )
    )('%s is reproduced by the signer', (_id: string, c: Json) => {
        const headers = c.request.headers;
        const digest = headers['Content-Digest'];
        const input = inputOf(headers);
        const signed = signRequest({
            method: c.request.method,
            url: c.request.url,
            headers: withoutSignature(headers),
            body: c.request.body,
            signer: signerFromSeed(seedFor(requests.keys, input.keyid)),
            ...input,
        });
        assert.equal(signed['Signature-Input'], headers['Signature-Input']);
        assert.equal(signed.Signature, headers.Signature);
        assert.equal(signed['Content-Digest'], digest);
    });
});

describe('responses.json', () => {
    const resolver = keyTableResolver(responses.keys);

    it.each(cases(responses))('%s verifies', async (_id: string, c: Json) => {
        const deferred = await verifyResponse({
            status: c.response.status,
            headers: c.response.headers,
            body: bodyOf(c.response.body),
            request: c.request,
            keyid: c.policy.expected_keyid,
            resolver,
            now: c.now,
        });
        assert.equal(deferred.bodyOwed, c.response.body === null);
        const v = checkBody(
            deferred,
            c.response.headers,
            readBody(c.response.body)
        );
        assert.isFalse(v.bodyOwed);
        assert.equal(v.mode, 'canonical');
        assert.equal(v.keyid, c.expected.keyid);
        assert.deepEqual(v.components, c.expected.covered);
        assert.equal(v.base, c.expected.base);
    });

    it.each(cases(responses))(
        '%s is reproduced by the signer',
        (_id: string, c: Json) => {
            const headers = c.response.headers;
            const input = inputOf(headers);
            const signed = signResponse({
                status: c.response.status,
                headers: withoutSignature(headers),
                body: c.response.body,
                request: c.request,
                signer: signerFromSeed(seedFor(responses.keys, input.keyid)),
                ...input,
            });
            assert.equal(signed['Signature-Input'], headers['Signature-Input']);
            assert.equal(signed.Signature, headers.Signature);
            assert.equal(signed['Content-Digest'], headers['Content-Digest']);
        }
    );

    it('the default response covered set is the vectors’ set', () => {
        for (const c of responses.cases) {
            const keyid = c.policy.expected_keyid;
            const signed = signResponse({
                status: c.response.status,
                body: c.response.body,
                request: c.request,
                signer: signerFromSeed(seedFor(responses.keys, keyid)),
                keyid,
                created: 1700000000,
            });
            assert.deepEqual(
                inputOf(signed as unknown as Record<string, string>).components,
                inputOf(c.response.headers).components
            );
        }
    });
});

describe('refusals.json', () => {
    const resolver = keyTableResolver(refusals.keys);

    it('has a case for every code', () => {
        const used = new Set(refusals.cases.map((c: Json) => c.error));
        assert.deepEqual(
            refusals.codes.filter((c: string) => !used.has(c)),
            []
        );
    });

    it.each(
        (refusals.cases as Json[]).map((c: Json): [string, string, Json] => [
            c.id,
            c.error,
            c,
        ])
    )('%s is refused as %s', async (_id: string, error: string, c: Json) => {
        let outcome: Promise<unknown>;
        if (c.kind === 'request') {
            outcome = verifyRequest({
                method: c.request.method,
                url: c.request.url,
                headers: c.request.headers,
                body: bodyOf(c.request.body),
                resolver,
                policy: policyOf(c),
                now: c.now,
            });
        } else if (c.kind === 'response') {
            // The request's own Signature header tells the client which
            // mode it asked in; the two mode-mismatch cases rely on that.
            outcome = verifyResponse({
                status: c.response.status,
                headers: c.response.headers,
                body: bodyOf(c.response.body),
                request: c.request,
                keyid: c.policy.expected_keyid,
                resolver,
                now: c.now,
            });
        } else if (c.kind === 'sign-request') {
            outcome = (async () =>
                signRequest({
                    method: c.request.method,
                    url: c.request.url,
                    headers: c.request.headers,
                    body: c.request.body,
                    components: c.covered,
                    keyid: c.keyid,
                    signer: signerFromSeed(c.seed_hex),
                }))();
        } else {
            throw new Error(`unknown case kind ${c.kind}`);
        }
        expect(await refusalOf(outcome)).toBe(error);
    });
});

describe('legacy.json', () => {
    it.each(cases(legacy))('%s', async (_id: string, c: Json) => {
        const headers = new Headers(c.headers);
        assert.equal(detectMode(headers.get('Signature')!), 'legacy');

        // A case whose Signature-Input was altered after signing carries
        // the base of the message before that, so only the unaltered cases
        // rebuild it from their headers.
        const altered = c.error === 'malformed-signature-input';
        if (!altered) {
            const [input] = desiginput(headers.get('Signature-Input')!).filter(
                (i) => i.name === 'signify'
            );
            assert.equal(
                legacySignatureBase(input, headers, c.method, c.path),
                c.base
            );
        }

        // Transcription check: the key that made the signature verifies it
        // over the stated base.
        const verfer = new Verfer({ qb64: c.key });
        const [, sig] = /signify="([^"]+)"/.exec(c.headers.Signature)!;
        assert.isTrue(
            verfer.verify(new Matter({ qb64: sig }).raw, c.base),
            'the stated key verifies the stated base'
        );
        if (!altered) {
            const v = verifyLegacy({
                method: c.method,
                path: c.path,
                headers,
                verfer,
            });
            assert.equal(v.mode, 'legacy');
            assert.equal(v.base, c.base);
        }

        // Legacy verification resolves Signify-Resource (the case's own
        // keyid may be the signer's verfer rather than an AID). A pinned
        // case is accepted under its key. A generated case carries the key
        // state held for Signify-Resource, or null when the verifier holds
        // none, and sufficient_keys, every key that alone satisfies the
        // threshold (profile §8); the legacy lookup must yield exactly
        // those, and the case is refused with its error, if it has one.
        const resource = headers.get('Signify-Resource');
        const resolver: HttpSigKeyResolver =
            c.key_state === undefined
                ? (k: string) => (k === resource ? verfer : null)
                : keyStateResolver((aid) =>
                      aid === resource && c.key_state !== null
                          ? ({
                                i: aid,
                                k: c.key_state.keys,
                                kt: c.key_state.threshold,
                            } as unknown as KeyState)
                          : null
                  );
        if (c.key_state === null) {
            assert.isNull(c.sufficient_keys);
            assert.isNull(await resolver.legacy!(resource!));
        } else if (c.key_state !== undefined) {
            const found = (await resolver.legacy!(resource!)) as Verfer[];
            assert.deepEqual(
                found.map((k) => Buffer.from(k.raw).toString('base64url')),
                c.sufficient_keys
            );
        }
        const url = c.url ?? `http://127.0.0.1${c.path}`;
        if (c.kind === 'request' && c.error !== undefined) {
            expect(
                await refusalOf(
                    verifyRequest({ method: c.method, url, headers, resolver })
                )
            ).toBe(c.error);
        } else if (c.kind === 'request') {
            const r = await verifyRequest({
                method: c.method,
                url,
                headers,
                resolver,
            });
            assert.equal(r.mode, 'legacy');
            expect(
                await refusalOf(
                    verifyRequest({
                        method: c.method,
                        url,
                        headers,
                        resolver,
                        acceptLegacy: false,
                    })
                )
            ).toBe('malformed-signature');
        } else {
            // Every generated case is a request; a refused response would
            // need its own branch.
            assert.isUndefined(c.error);
            // The vector does not record the request's content. Legacy mode
            // never uses it, but verifyResponse requires the content sent, so
            // the record says empty.
            const request = {
                method: c.method,
                url,
                headers: {},
                body: new Uint8Array(),
            };
            const r = await verifyResponse({
                status: c.status,
                headers,
                body: null,
                request,
                keyid: c.keyid,
                resolver,
                requestMode: 'legacy',
            });
            assert.equal(r.mode, 'legacy');
            // A client that sent a canonical request refuses it (§8).
            expect(
                await refusalOf(
                    verifyResponse({
                        status: c.status,
                        headers,
                        body: null,
                        request,
                        keyid: c.keyid,
                        resolver,
                    })
                )
            ).toBe('mode-mismatch');
        }
    });
});
