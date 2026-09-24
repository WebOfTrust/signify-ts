/**
 * Runs every case of the shared KERI-profile RFC 9421 vectors in
 * test/vectors/keri-rfc9421/ (bakobo/fiki 530cd8c, keri_vectors_format 1).
 * The vectors are verbatim copies; see the README beside them.
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
import { desiginput } from '../../src/keri/core/httping.ts';
import { legacySignatureBase } from '../../src/keri/core/httping.ts';
import { MtrDex } from '../../src/keri/core/matter.ts';
import { Signer } from '../../src/keri/core/signer.ts';
import { Verfer } from '../../src/keri/core/verfer.ts';
import { contentDigest, signatureBase } from '../../src/keri/core/httpsig.ts';
import {
    HTTPSIG_REFUSAL_CODES,
    HttpSigKeyResolver,
    HttpSigRefusal,
    detectMode,
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

function hex(s: string): Uint8Array {
    return Uint8Array.from(s.match(/../g)!.map((h) => parseInt(h, 16)));
}

function signerFromSeed(seedHex: string): Signer {
    return new Signer({ raw: hex(seedHex), code: MtrDex.Ed25519_Seed });
}

/**
 * The keys table stands in for the KEL a verifier holds (vector header).
 * Only transferable keyids are resolvable; a non-transferable keyid must
 * yield its key from the prefix alone, so it is deliberately absent here.
 */
function keyTableResolver(keys: Json[]): HttpSigKeyResolver {
    const table = new Map<string, Verfer>();
    for (const k of keys) {
        if (k.kind !== 'transferable') continue;
        table.set(
            k.keyid,
            new Verfer({
                raw: decodeBase64Url(k.public_key),
                code: MtrDex.Ed25519,
            })
        );
    }
    return (keyid) => table.get(keyid) ?? null;
}

function seedFor(keys: Json[], keyid: string): string {
    return keys.find((k: Json) => k.keyid === keyid).seed_hex;
}

const agentKeyid: string = responses.keys.find((k: Json) =>
    k.note.includes('agent')
).keyid;

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
    it('are the frozen format 1 set', () => {
        for (const file of [rfc9421, requests, responses, refusals, legacy]) {
            assert.equal(file.keri_vectors_format, 1);
        }
    });

    it('name refusals with exactly the codes this implementation raises', () => {
        assert.deepEqual(refusals.codes, [...HTTPSIG_REFUSAL_CODES]);
    });
});

describe('rfc9421.json', () => {
    it.each(rfc9421.cases.map((c: Json) => [c.id, c]))(
        '%s',
        (_id: string, c: Json) => {
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
            assert.equal(
                Buffer.from(sig).toString('base64'),
                c.expected.signature
            );
        }
    );
});

describe('requests.json', () => {
    const resolver = keyTableResolver(requests.keys);

    it.each(requests.cases.map((c: Json) => [c.id, c]))(
        '%s verifies',
        async (_id: string, c: Json) => {
            const v = await verifyRequest({
                method: c.request.method,
                url: c.request.url,
                headers: c.request.headers,
                body: c.request.body,
                resolver,
                now: c.now,
            });
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
        }
    );

    it.each(requests.cases.map((c: Json) => [c.id, c]))(
        '%s is reproduced by the signer',
        (_id: string, c: Json) => {
            const headers = c.request.headers;
            const body = c.request.body ?? '';
            const digest = headers['Content-Digest'];
            // The signer always emits sha-256 alone; cases pinning another
            // Content-Digest test the verifier, not the signer.
            if (digest !== undefined && digest !== contentDigest(body)) return;
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
        }
    );
});

describe('responses.json', () => {
    const resolver = keyTableResolver(responses.keys);

    it.each(responses.cases.map((c: Json) => [c.id, c]))(
        '%s verifies',
        async (_id: string, c: Json) => {
            const v = await verifyResponse({
                status: c.response.status,
                headers: c.response.headers,
                body: c.response.body,
                request: c.request,
                keyid: agentKeyid,
                resolver,
                now: c.now,
            });
            assert.equal(v.mode, 'canonical');
            assert.equal(v.keyid, c.expected.keyid);
            assert.deepEqual(v.components, c.expected.covered);
            assert.equal(v.base, c.expected.base);
        }
    );

    it.each(responses.cases.map((c: Json) => [c.id, c]))(
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
            const signed = signResponse({
                status: c.response.status,
                body: c.response.body,
                request: c.request,
                signer: signerFromSeed(seedFor(responses.keys, agentKeyid)),
                keyid: agentKeyid,
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

    it('has a case for every code except those listed below', () => {
        const used = new Set(refusals.cases.map((c: Json) => c.error));
        // Covered by unit tests in httpsigning.test.ts instead.
        assert.deepEqual(
            refusals.codes.filter((c: string) => !used.has(c)),
            ['mode-mismatch', 'unsupported-signer']
        );
    });

    it.each(refusals.cases.map((c: Json) => [c.id, c.error, c]))(
        '%s is refused as %s',
        async (_id: string, error: string, c: Json) => {
            let outcome: Promise<unknown>;
            if (c.kind === 'request') {
                outcome = verifyRequest({
                    method: c.request.method,
                    url: c.request.url,
                    headers: c.request.headers,
                    body: c.request.body,
                    resolver,
                    now: c.now,
                });
            } else if (c.kind === 'response') {
                outcome = verifyResponse({
                    status: c.response.status,
                    headers: c.response.headers,
                    body: c.response.body,
                    request: c.request,
                    keyid: agentKeyid,
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
        }
    );
});

describe('legacy.json', () => {
    it.each(legacy.cases.map((c: Json) => [c.id, c]))(
        '%s',
        async (_id: string, c: Json) => {
            const headers = new Headers(c.headers);
            assert.equal(detectMode(headers.get('Signature')!), 'legacy');

            const [input] = desiginput(headers.get('Signature-Input')!).filter(
                (i) => i.name === 'signify'
            );
            assert.equal(
                legacySignatureBase(input, headers, c.method, c.path),
                c.base
            );

            const verfer = new Verfer({ qb64: c.key });
            const v = verifyLegacy({
                method: c.method,
                path: c.path,
                headers,
                verfer,
            });
            assert.equal(v.mode, 'legacy');
            assert.equal(v.base, c.base);

            // Legacy verification resolves Signify-Resource (the case's own
            // keyid may be the signer's verfer rather than an AID).
            const resource = headers.get('Signify-Resource');
            const resolver = (k: string) => (k === resource ? verfer : null);
            const url = c.url ?? `http://127.0.0.1${c.path}`;
            if (c.kind === 'request') {
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
                const r = await verifyResponse({
                    status: c.status,
                    headers,
                    body: null,
                    request: { method: c.method, url, headers: {} },
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
                            request: { method: c.method, url, headers: {} },
                            keyid: c.keyid,
                            resolver,
                        })
                    )
                ).toBe('mode-mismatch');
            }
        }
    );
});
