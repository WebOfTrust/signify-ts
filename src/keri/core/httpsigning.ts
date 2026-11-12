/**
 * The KERI profile of RFC 9421 HTTP Message Signatures, version 1.2
 * (https://github.com/bakobo/fiki/blob/keri-profile-v1.2/docs/keri-profile.md):
 * signing and verifying requests and responses between Signify and KERIA, and
 * between a Signify AID and any third party. "Profile §N" below cites a
 * section of that version.
 *
 * {@link ./httpsig.ts} builds the RFC 9421 signature base; this module adds
 * what the profile decides on top of it: the covered components a signature
 * must include, `keyid` as the signer's AID, Ed25519 only, freshness, and one
 * neutral refusal code per failure, checked in a fixed order so every
 * implementation of the profile refuses a given message with the same code.
 *
 * The profile keeps the legacy Signify scheme alive beside it. A verifier
 * tells the two apart from the Signature header ({@link detectMode}); legacy
 * messages are verified exactly as {@link SignedHeaderAuthenticator} does.
 */
import libsodium from 'libsodium-wrappers-sumo';
import { ed25519 } from '@noble/curves/ed25519';
import {
    ByteSequence,
    Dictionary,
    Item,
    Parameters,
    isByteSequence,
    isInnerList,
    parseDictionary,
    serializeDictionary,
    serializeItem,
} from 'structured-headers';
import { fromByteArray } from 'base64-js';
import { Signer } from './signer.ts';
import { Verfer } from './verfer.ts';
import { MtrDex } from './matter.ts';
import { b } from './core.ts';
import { decodeBase64Url, encodeBase64Url } from './base64.ts';
import { desiginput, Inputage, legacySignatureBase } from './httping.ts';
import { designature } from '../end/ending.ts';
import { Cigar } from './cigar.ts';
import { Siger } from './siger.ts';
import { Tholder } from './tholder.ts';
import type { KeyState } from './keyState.ts';
import {
    ComponentIdentifier,
    HTTPSIG_REQUEST_DERIVED,
    HttpSigError,
    HttpSigHeaders,
    HttpSigRequest,
    HttpSigResponse,
    byteSequenceBytes,
    componentIdentifier,
    componentIdentity,
    contentDigest,
    hostAuthority,
    isAbsoluteUrl,
    isHeadersLike,
    matchContentDigest,
    parseContentDigest,
    requestAuthority,
    signatureBase,
    signatureParameters,
} from './httpsig.ts';

/**
 * The refusal codes of profile §9, in the order §9 first lists them. A
 * canonical message with several defects is refused with the first check of
 * §9 that fails; `malformed-key` and `insufficient-coverage` each have a
 * second place in that order. `uncovered-body` is the one signer-side code.
 */
export const HTTPSIG_REFUSAL_CODES = [
    'unauthenticated',
    'missing-signature',
    'missing-signature-input',
    'malformed-signature',
    'mode-mismatch',
    'malformed-signature-input',
    'malformed-signature-label',
    'missing-signature-label',
    'malformed-signature-value',
    'duplicate-component',
    'unsupported-component',
    'insufficient-coverage',
    'malformed-key',
    'unknown-key',
    'unsupported-signer',
    'unsupported-algorithm',
    'missing-component',
    'signature-mismatch',
    'signature-stale',
    'signature-expired',
    'malformed-digest',
    'digest-mismatch',
    'uncovered-body',
] as const;

/**
 * A neutral refusal code of profile §9. `unauthenticated` reports an unsigned
 * 401 answering a canonical request (profile §8): the caller learns that
 * authentication failed, and the response body is not trusted.
 */
export type HttpSigCode = (typeof HTTPSIG_REFUSAL_CODES)[number];

/**
 * A message refused under the profile. `code` is the neutral code, which is
 * what the shared vectors and every other implementation name refusals by.
 */
export class HttpSigRefusal extends HttpSigError {
    declare readonly code: HttpSigCode;

    constructor(code: HttpSigCode, message: string) {
        super(`${code}: ${message}`, code);
        this.name = 'HttpSigRefusal';
    }
}

function refuse(code: HttpSigCode, message: string): never {
    throw new HttpSigRefusal(code, message);
}

/** Canonical mode is this profile; legacy is the scheme deployed before it. */
export type HttpSigMode = 'canonical' | 'legacy';

/** The minimum covered set of a request (profile §3). */
export const HTTPSIG_REQUEST_MINIMUM: readonly string[] = [
    '@method',
    '@path',
    '@query',
];

/**
 * What a signer covers by default: the minimum set plus `@authority`
 * (profile §3), and `content-digest` when there is a body.
 */
export const HTTPSIG_REQUEST_DEFAULT: readonly string[] = [
    '@method',
    '@authority',
    '@path',
    '@query',
];

/**
 * Verifier policy. Every field is optional; defaults are profile §3 and §6.
 * A policy may add to the minimum set but never go below it, and a policy
 * that tries is a caller error (`Error`), not a refusal ({@link checkPolicy}).
 */
export interface HttpSigPolicy {
    /**
     * Components every request must cover. Default
     * {@link HTTPSIG_REQUEST_MINIMUM}; must include all of it. `@authority`
     * does not belong here: `requireAuthority` adds it together with the
     * comparison against `authorities`, and a request set that lists it
     * without `requireAuthority` is refused ({@link checkPolicy}).
     */
    request?: readonly string[];
    /**
     * Require `@authority` in requests, and compare it with `authorities`.
     * KERIA's default is not to (profile §3); a verifier that is not the
     * signer's own agent should.
     */
    requireAuthority?: boolean;
    /**
     * The authorities this verifier serves; required, and non-empty, when
     * `requireAuthority` is set. Each is `host` or `host:port`, compared
     * lowercased with the covered `@authority`, which drops only the default
     * port of the scheme the request was sent with (profile §2). A verifier
     * that sees only `Host` keeps whatever port it carries, so list
     * `host:443` as well if clients may send it.
     */
    authorities?: readonly string[];
    /** Seconds a signature stays fresh after `created`. Default 300; positive. */
    maxAge?: number;
    /** Tolerated clock skew in seconds. Default 60; positive. */
    skew?: number;
}

/**
 * Seconds since the epoch, or a clock that returns them. It must be a finite
 * number; a fractional part is rounded down (profile §6).
 */
export type HttpSigClock = number | (() => number);

/** A key lookup result: a key, or nothing when the verifier holds no KEL. */
export type HttpSigKeyLookup =
    | Verfer
    | null
    | undefined
    | Promise<Verfer | null | undefined>;

/**
 * A legacy-mode lookup result: every current key that alone satisfies the
 * signing threshold, a single key, or nothing when the verifier holds no
 * key state. An empty list is a key state with no such key.
 */
export type HttpSigLegacyLookup =
    | Verfer
    | readonly Verfer[]
    | null
    | undefined
    | Promise<Verfer | readonly Verfer[] | null | undefined>;

/**
 * Resolves a transferable AID to its single effective signing key (profile
 * §7, R1 and R4). Return `null` or `undefined` for an AID the verifier holds
 * no KEL for. To refuse a key state, throw an {@link HttpSigRefusal}, such as
 * `unsupported-signer` for a state without a single effective signer. A
 * non-transferable `B` keyid is never passed to it: its key is the prefix.
 *
 * `legacy`, when present, is the legacy-mode lookup of profile §8: every
 * current key of the `Signify-Resource` AID's key state that alone satisfies
 * its signing threshold, without §7 R1's derivation-code rules. The
 * signature is accepted under any of them, and an empty list is refused as
 * `unsupported-signer`. A resolver without it is called as is for legacy
 * messages too, and is not refused for lacking it (§8).
 */
export interface HttpSigKeyResolver {
    (keyid: string): HttpSigKeyLookup;
    legacy?: (aid: string) => HttpSigLegacyLookup;
}

/**
 * The request a response answers, with the content that was actually sent.
 * {@link signResponse}, {@link verifyResponse} and {@link responseComponents}
 * refuse, as a caller error, a request whose content is not known.
 */
export interface HttpSigMessageRequest extends HttpSigRequest {
    /**
     * The content exactly as sent: empty bytes, `''` or `null` when the
     * request had none. `undefined` means not known, which is an error
     * wherever a response is bound to the request.
     */
    body?: Uint8Array | string | null;
}

/**
 * What a verification established. When `bodyOwed` is true it is NOT yet a
 * completed verification: the signature and headers passed, but the body was
 * not supplied, and {@link checkBody} must run, and its result be used,
 * before the message reaches application code (profile §5).
 */
export interface HttpSigVerified {
    mode: HttpSigMode;
    /** The signer's AID. In legacy mode, the Signify-Resource value. */
    keyid: string;
    label: string;
    /** Signature parameters in wire order. */
    params: Parameters;
    /** Covered components, serialized: `"@path";req`; legacy: raw names. */
    components: string[];
    /** The key that verified the signature. */
    verfer: Verfer;
    /** The signature base that was verified. */
    base: string;
    /**
     * True while the body check is still owed: the body was left `undefined`
     * and {@link checkBody} has not run. Always false in legacy mode.
     */
    bodyOwed: boolean;
}

/** The header fields a signer adds to a message. */
export interface HttpSigSignedFields {
    'Content-Digest'?: string;
    'Signature-Input': string;
    Signature: string;
}

/** Arguments common to {@link signRequest} and {@link signResponse}. */
export interface HttpSigSignArgs {
    /** An Ed25519 signer. */
    signer: Signer;
    /** The signer's AID, qb64 (profile §7, R1). */
    keyid: string;
    /** Signature label. Default `signify`. */
    label?: string;
    /** Covered components. Default: the profile's default set. */
    components?: ComponentIdentifier[];
    /** Seconds since the epoch. Default now. */
    created?: number;
    expires?: number;
    /** Default: 128 random bits, base64url. `null` omits the nonce. */
    nonce?: string | null;
    /** Default `ed25519`. `null` omits the parameter; anything else is refused. */
    alg?: string | null;
    tag?: string;
}

export interface HttpSigSignRequestArgs extends HttpSigSignArgs {
    /** The method exactly as it will go on the wire. */
    method: string;
    /**
     * The absolute target URL, exactly as it will be sent: `@path` and
     * `@query` are taken from it unnormalized (profile §2). `fetch()` sends
     * the WHATWG serialization, so for a request that `fetch()` will send,
     * pass `new URL(url).href` here and to `fetch()`, or a `Request`'s `url`.
     */
    url: string;
    headers?: HttpSigHeaders;
    body?: Uint8Array | string | null;
}

export interface HttpSigSignResponseArgs extends HttpSigSignArgs {
    status: number;
    headers?: HttpSigHeaders;
    body?: Uint8Array | string | null;
    /** The request this response answers, as received. */
    request: HttpSigMessageRequest;
}

export interface HttpSigVerifyRequestArgs {
    /** The method as received. */
    method: string;
    /** The target URL as received, raw path and query included. */
    url: string;
    headers: HttpSigHeaders;
    /**
     * The content. Leave `undefined` to verify the headers before reading
     * the body; the result then has `bodyOwed` set, and {@link checkBody}
     * must run once the body has been read.
     */
    body?: Uint8Array | string | null;
    resolver?: HttpSigKeyResolver;
    policy?: HttpSigPolicy;
    now?: HttpSigClock;
    /** Accept legacy-mode requests (profile §8). Default true. */
    acceptLegacy?: boolean;
}

export interface HttpSigVerifyResponseArgs {
    status: number;
    headers: HttpSigHeaders;
    /**
     * The response content; `null` or empty for none. `undefined` defers
     * the body check: the result has `bodyOwed` set, and {@link checkBody}
     * must follow, as for {@link verifyRequest}.
     */
    body?: Uint8Array | string | null;
    /**
     * The request this response answers, as the client sent it, with
     * `body` the content sent (empty or `null` for none). A `body` left
     * `undefined` is an error.
     */
    request: HttpSigMessageRequest;
    /** The AID the client expects to be talking to (profile §7, R1). */
    keyid: string;
    resolver?: HttpSigKeyResolver;
    /**
     * The mode the request was signed in. Default: the mode of the request's
     * own Signature header, or `canonical` when it carries none.
     */
    requestMode?: HttpSigMode;
    policy?: HttpSigPolicy;
    now?: HttpSigClock;
}

const SIGNATURE = 'signature';
const SIGNATURE_INPUT = 'signature-input';
const CONTENT_DIGEST = 'content-digest';
const SIGNIFY_RESOURCE = 'signify-resource';
const DEFAULT_LABEL = 'signify';
const ED25519 = 'ed25519';
const DEFAULT_MAX_AGE = 300;
const DEFAULT_SKEW = 60;

const CANONICAL_PARAMS = new Set([
    'created',
    'expires',
    'nonce',
    'alg',
    'keyid',
    'tag',
]);
const REQUEST_DIGEST = '"content-digest";req';
const RESPONSE_MINIMUM = [
    '"@status"',
    '"@method";req',
    '"@path";req',
    '"@query";req',
];

/**
 * keripy's `PreDex`, the prefix derivation codes an AID may carry, with the
 * size of the raw value each encodes (profile §7, R1).
 */
const PREFIX_CODES: ReadonlyMap<string, number> = new Map([
    ['B', 32],
    ['D', 32],
    ['E', 32],
    ['F', 32],
    ['G', 32],
    ['H', 32],
    ['I', 32],
    ['0D', 64],
    ['0E', 64],
    ['0F', 64],
    ['0G', 64],
    ['1AAA', 33],
    ['1AAB', 33],
    ['1AAI', 33],
    ['1AAJ', 33],
    ['1AAC', 57],
    ['1AAD', 57],
    ['1AAE', 114],
]);

/** Non-transferable prefix codes: Ed25519, secp256k1, Ed448, secp256r1. */
const NON_TRANSFERABLE = new Set<string>(['B', '1AAA', '1AAC', '1AAI']);
const ED25519_KEYS = new Set<string>([MtrDex.Ed25519, MtrDex.Ed25519N]);

/**
 * The prefix code and raw value of a well-formed AID, or null (profile §7,
 * R1): the canonical qb64 spelling of one of {@link PREFIX_CODES}. The raw
 * value is padded in front with zero bytes to a multiple of three,
 * base64url-encoded, and the code written over the characters the padding
 * became, so re-encoding gives back the keyid exactly.
 */
function parsePrefix(keyid: string): { code: string; raw: Uint8Array } | null {
    const size = /^[A-Za-z]/.test(keyid) ? 1 : keyid[0] === '0' ? 2 : 4;
    const code = keyid.slice(0, size);
    const length = PREFIX_CODES.get(code);
    if (length === undefined) return null;
    const pad = (3 - (length % 3)) % 3;
    if (keyid.length !== ((pad + length) * 4) / 3 + size - pad) return null;
    const body = keyid.slice(size);
    if (!/^[A-Za-z0-9_-]*$/.test(body)) return null;
    const decoded = decodeBase64Url('A'.repeat(pad) + body);
    const raw = decoded.slice(pad);
    const spelled = encodeBase64Url(
        Uint8Array.from([...new Uint8Array(pad), ...raw])
    ).slice(pad);
    return code + spelled === keyid ? { code, raw } : null;
}

/**
 * Whether 32 bytes are the canonical encoding of a point of Ed25519's
 * prime-order subgroup other than the identity (profile §7, R1): what
 * libsodium's `crypto_core_ed25519_is_valid_point` accepts. A point of small
 * order, or of mixed order (a subgroup point plus a torsion component), is
 * not, and no seed yields one.
 */
function primeOrderKey(raw: Uint8Array): boolean {
    try {
        const point = ed25519.ExtendedPoint.fromHex(raw);
        return !point.isSmallOrder() && point.isTorsionFree();
    } catch {
        return false;
    }
}

type Target = 'request' | 'response';

function toHeaders(headers: HttpSigHeaders | undefined): Headers {
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
        return headers;
    }
    const out = new Headers();
    if (isHeadersLike(headers)) {
        // A Headers from another realm or a polyfill.
        headers.forEach((value, name) => out.append(name, value));
        return out;
    }
    for (const [name, value] of Object.entries(headers ?? {})) {
        for (const v of Array.isArray(value) ? value : [value]) {
            out.append(name, v);
        }
    }
    return out;
}

function bytesOf(body: Uint8Array | string | null | undefined): Uint8Array {
    if (body === null || body === undefined) return new Uint8Array();
    return typeof body === 'string' ? b(body) : body;
}

/**
 * Whether a request's headers announce a body, for the covered-list check of
 * the request minimum set (profile §3, §9 step 12): any Transfer-Encoding,
 * or a Content-Length other than a plain zero. A Content-Length that is not
 * a plain decimal once SP and HTAB are trimmed is no evidence of an empty
 * body, so it counts as one. Content no header announced is refused at the
 * body stage instead ({@link bodyStage}), after the signature and freshness
 * checks, whether or not the verifier already holds it. The response minimum
 * looks at content alone ({@link responseMinimum}).
 */
function announcesBody(headers: Headers): boolean {
    if (headers.has('transfer-encoding')) return true;
    const length = headers.get('content-length');
    if (length === null) return false;
    // RFC 9421 §2.1 strips SP and HTAB only. String.prototype.trim would
    // also strip a no-break space and read "0\u00a0" as no body.
    const value = length.replace(/^[ \t]+|[ \t]+$/g, '');
    return !/^[0-9]+$/.test(value) || Number(value) > 0;
}

/**
 * Refuse, as a caller error, a policy below the profile's floor (profile §3,
 * §6): a request minimum set lacking any of {@link HTTPSIG_REQUEST_MINIMUM},
 * one that lists `@authority` without `requireAuthority`, a `maxAge` or
 * `skew` that is not a positive integer, or `requireAuthority` without the
 * authorities to compare with.
 */
export function checkPolicy(policy: HttpSigPolicy): void {
    if (policy.request !== undefined) {
        const covered = identities(policy.request.map(componentIdentifier));
        for (const component of HTTPSIG_REQUEST_MINIMUM) {
            if (
                !covered.has(componentIdentity(componentIdentifier(component)))
            ) {
                throw new Error(
                    `Policy request set must include ${component}; a policy may not go below the profile's minimum set.`
                );
            }
        }
        // A verifier that requires @authority must compare it with the
        // authorities it serves (profile §3), or a request signed for one
        // service replays to another. Covering it alone compares nothing.
        if (
            covered.has(componentIdentity(componentIdentifier('@authority'))) &&
            !policy.requireAuthority
        ) {
            throw new Error(
                'Require @authority with requireAuthority and authorities, not in the policy request set.'
            );
        }
    }
    for (const key of ['maxAge', 'skew'] as const) {
        const value = policy[key];
        if (value !== undefined && !(Number.isInteger(value) && value > 0)) {
            throw new Error(`Policy ${key} must be a positive integer.`);
        }
    }
    if (policy.authorities !== undefined) {
        if (
            typeof policy.authorities === 'string' ||
            !Array.isArray(policy.authorities)
        ) {
            throw new Error('Policy authorities must be an array.');
        }
        if (policy.authorities.some((a) => typeof a !== 'string')) {
            throw new Error('Policy authorities must be strings.');
        }
    }
    if (policy.requireAuthority && !policy.authorities?.length) {
        throw new Error(
            'Policy requireAuthority needs the authorities this verifier serves.'
        );
    }
}

/**
 * Refuse, as a caller error, a clock that is neither a number nor a function,
 * or a number that is not finite. A NaN or infinite `now` would make every
 * freshness comparison false and so pass every message.
 */
function checkClock(now: unknown): void {
    if (now === undefined || typeof now === 'function') return;
    if (typeof now !== 'number' || !Number.isFinite(now)) {
        throw new Error(
            `now must be a finite number of seconds since the epoch, or a function returning one; got ${String(now)}.`
        );
    }
}

/** The verifier's clock in whole seconds, rounded down (profile §6). */
function nowSeconds(now: HttpSigClock | undefined): number {
    const t = typeof now === 'function' ? now() : (now ?? Date.now() / 1000);
    if (typeof t !== 'number' || !Number.isFinite(t)) {
        throw new Error(
            `The clock must return a finite number of seconds since the epoch; it returned ${String(t)}.`
        );
    }
    return Math.floor(t);
}

function identities(items: Item[]): Set<string> {
    return new Set(items.map(componentIdentity));
}

function identifierOf(component: ComponentIdentifier): Item {
    try {
        return componentIdentifier(component);
    } catch (e) {
        if (e instanceof HttpSigError && e.code !== undefined) {
            refuse(e.code as HttpSigCode, e.message);
        }
        throw e;
    }
}

/**
 * The legacy signature members of a Signature value, by label. The legacy
 * parser accepts any kind and leaves the members of a kind other than CESR
 * as strings, which carry no signature to verify, so such a header is not
 * the legacy form of profile §8 and this throws.
 */
function legacyMarkers(signature: string): Map<string, Siger | Cigar> {
    const [signage] = designature(signature);
    const markers = signage.markers as Map<string, unknown>;
    for (const [label, marker] of markers) {
        if (!(marker instanceof Siger || marker instanceof Cigar)) {
            throw new Error(
                `Signature member ${label} is not a CESR signature (kind ${signage.kind}).`
            );
        }
    }
    return markers as Map<string, Siger | Cigar>;
}

/**
 * Tell canonical from legacy by the Signature header (profile §8): an RFC
 * 8941 Dictionary whose every member is a Byte Sequence is canonical; a
 * header the legacy parser accepts is legacy; anything else is refused as
 * `malformed-signature`.
 */
export function detectMode(signature: string): HttpSigMode {
    try {
        const dict = parseDictionary(signature);
        if (
            dict.size > 0 &&
            Array.from(dict.values()).every(
                (member) => !isInnerList(member) && isByteSequence(member[0])
            )
        ) {
            return 'canonical';
        }
    } catch {
        // Not a Dictionary; try the legacy form.
    }
    try {
        legacyMarkers(signature);
        return 'legacy';
    } catch {
        // Neither form.
    }
    refuse(
        'malformed-signature',
        'The Signature header is neither an RFC 8941 Dictionary of Byte Sequences nor the legacy form.'
    );
}

interface Parsed {
    label: string;
    items: Item[];
    params: Parameters;
    signature: Uint8Array;
}

/**
 * The name of a `created` or `expires` signature parameter written as an RFC
 * 8941 Decimal, or null. The parser reads `1700000000.0` as the number it
 * equals, so the raw text is the only place the difference shows; a Decimal
 * is not an Integer (profile §4). Strings are blanked first, so that a
 * parameter spelled inside one is not read, and only the parameters after an
 * Inner List's closing parenthesis are signature parameters.
 */
function decimalParameter(input: string): string | null {
    const text = input.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const [, params] of text.matchAll(
        /\)((?:;[ ]*[a-z*][a-z0-9_.*-]*(?:=[^;,]*)?)*)/g
    )) {
        const decimal = /;[ ]*(created|expires)=[ ]*-?[0-9]+\./.exec(params);
        if (decimal !== null) return decimal[1];
    }
    return null;
}

/** The header checks of §9, steps 6 to 9, for a canonical message. */
function parseCanonical(signature: string, input: string): Parsed {
    if (input.replace(/^[ \t]+|[ \t]+$/g, '') === '') {
        refuse(
            'malformed-signature-input',
            'Signature-Input is empty, which is malformed rather than absent.'
        );
    }
    let inputs: Dictionary;
    try {
        inputs = parseDictionary(input);
    } catch (e) {
        refuse(
            'malformed-signature-input',
            `Signature-Input is not an RFC 8941 Dictionary: ${(e as Error).message}`
        );
    }
    for (const [label, member] of inputs) {
        if (!isInnerList(member)) {
            refuse(
                'malformed-signature-input',
                `Signature-Input member "${label}" is not an Inner List.`
            );
        }
        const [items, params] = member;
        for (const [name] of items) {
            if (typeof name !== 'string') {
                refuse(
                    'malformed-signature-input',
                    `A component identifier in "${label}" is not a String.`
                );
            }
            if (name === '' || name !== name.toLowerCase()) {
                refuse(
                    'malformed-signature-input',
                    `Component name "${name}" must be non-empty and lowercase.`
                );
            }
        }
        for (const [key, value] of params) {
            if (!CANONICAL_PARAMS.has(key)) {
                refuse(
                    'malformed-signature-input',
                    `"${key}" is not a signature parameter of the profile.`
                );
            }
            const integer = key === 'created' || key === 'expires';
            if (
                integer
                    ? typeof value !== 'number' || !Number.isInteger(value)
                    : typeof value !== 'string'
            ) {
                refuse(
                    'malformed-signature-input',
                    `Signature parameter "${key}" must be ${integer ? 'an Integer' : 'a String'}.`
                );
            }
        }
        for (const required of ['created', 'keyid']) {
            if (!params.has(required)) {
                refuse(
                    'malformed-signature-input',
                    `Signature parameter "${required}" is required.`
                );
            }
        }
    }
    const decimal = decimalParameter(input);
    if (decimal !== null) {
        refuse(
            'malformed-signature-input',
            `Signature parameter "${decimal}" is a Decimal; it must be an Integer.`
        );
    }
    const signatures = parseDictionary(signature);
    if (inputs.size !== 1 || signatures.size !== 1) {
        refuse(
            'malformed-signature-label',
            `Canonical mode carries exactly one signature; Signature-Input has ${inputs.size} and Signature ${signatures.size}.`
        );
    }
    const [label, member] = inputs.entries().next().value as [
        string,
        [Item[], Parameters],
    ];
    const sigMember = signatures.get(label);
    if (sigMember === undefined) {
        refuse(
            'missing-signature-label',
            `Signature has no member for the label "${label}".`
        );
    }
    const value = (sigMember as Item)[0] as ByteSequence;
    const raw = byteSequenceBytes(value);
    if (raw === null) {
        refuse(
            'malformed-signature-value',
            `The signature for "${label}" is not valid base64.`
        );
    }
    if (raw.length !== 64) {
        refuse(
            'malformed-signature-value',
            `An Ed25519 signature is 64 bytes, not ${raw.length}.`
        );
    }
    return { label, items: member[0], params: member[1], signature: raw };
}

/** Duplicate and unsupported components (§9), each over the whole list. */
function checkComponents(items: Item[], target: Target): void {
    const seen = new Set<string>();
    for (const item of items) {
        const id = componentIdentity(item);
        if (seen.has(id)) {
            refuse(
                'duplicate-component',
                `${serializeItem(item)} is covered more than once.`
            );
        }
        seen.add(id);
    }
    for (const item of items) {
        const [name, params] = item as [string, Parameters];
        const shown = serializeItem(item);
        for (const [key, value] of params) {
            if (key !== 'req' || value !== true) {
                refuse(
                    'unsupported-component',
                    `${shown}: the only component parameter supported is req.`
                );
            }
        }
        const req = params.has('req');
        if (req && target === 'request') {
            refuse(
                'unsupported-component',
                `${shown}: req is valid only in a response.`
            );
        }
        if (!name.startsWith('@')) continue;
        if (name === '@status') {
            if (target === 'request' || req) {
                refuse(
                    'unsupported-component',
                    `${shown}: @status is valid only for the response itself.`
                );
            }
        } else if (HTTPSIG_REQUEST_DERIVED.has(name)) {
            if (target === 'response' && !req) {
                refuse(
                    'unsupported-component',
                    `${shown}: in a response a request component must carry req.`
                );
            }
        } else {
            refuse(
                'unsupported-component',
                `${shown}: the derived component ${name} is not supported by the profile.`
            );
        }
    }
}

function checkCoverage(
    items: Item[],
    required: readonly ComponentIdentifier[]
): void {
    const covered = identities(items);
    for (const component of required) {
        const item = componentIdentifier(component);
        if (!covered.has(componentIdentity(item))) {
            refuse(
                'insufficient-coverage',
                `${serializeItem(item)} is in the minimum covered set and is not covered.`
            );
        }
    }
}

function requestMinimum(policy: HttpSigPolicy, headers: Headers): string[] {
    const required = [...(policy.request ?? HTTPSIG_REQUEST_MINIMUM)];
    if (policy.requireAuthority) required.push('@authority');
    if (announcesBody(headers)) required.push(CONTENT_DIGEST);
    return required;
}

/**
 * The content of the request a response answers, which the caller must
 * supply as sent (profile §3): without it, neither the response minimum nor
 * the request's `Content-Digest` can be checked. A caller error, not a
 * refusal.
 */
function sentContent(request: HttpSigMessageRequest): Uint8Array {
    if (request.body === undefined) {
        throw new Error(
            'request.body must be the request content as sent (empty bytes or null for none); a response cannot be bound to a request whose content is not known.'
        );
    }
    return bytesOf(request.body);
}

/**
 * A response's body is its content: its Content-Length is no evidence, since
 * a HEAD or 304 response announces a length it does not send. A deferred
 * body adds nothing here; {@link checkBody} catches uncovered content.
 *
 * "The request had a body" is likewise the request's content, never its
 * headers (profile §3): both sides hold the whole request by the time a
 * response is signed or verified.
 */
function responseMinimum(
    body: Uint8Array | string | null | undefined,
    request: HttpSigMessageRequest
): string[] {
    const required = [...RESPONSE_MINIMUM];
    if (bytesOf(body).length > 0) required.push(`"${CONTENT_DIGEST}"`);
    if (sentContent(request).length > 0) required.push(REQUEST_DIGEST);
    return required;
}

/**
 * The components a response covers by default: `@status`, its own
 * `content-digest` when it has a body, and the request's `@method`, `@path`
 * and `@query` marked `req`, plus `"content-digest";req` when the request's
 * content was non-empty (profile §3). `request.body` must be the content
 * sent.
 */
export function responseComponents(
    request: HttpSigMessageRequest,
    body?: Uint8Array | string | null
): string[] {
    return responseMinimum(body, request);
}

function checkAlgorithm(verfer: Verfer, params: Parameters): void {
    const alg = params.get('alg');
    if (alg !== undefined && alg !== ED25519) {
        refuse(
            'unsupported-algorithm',
            `alg "${String(alg)}" is not supported; only ${ED25519}.`
        );
    }
    if (!ED25519_KEYS.has(verfer.code)) {
        refuse(
            'unsupported-algorithm',
            `The key's code ${verfer.code} is not Ed25519.`
        );
    }
}

/**
 * Resolve a `keyid` to a key under profile §7, R1, running §9's steps 13 to
 * 17 in order. The derivation code decides: a non-transferable Ed25519
 * prefix (`B`) is the key itself, and no resolver is asked about it; every
 * transferable code, including a basic `D` prefix, goes through `resolver`
 * to the current key state, and is never decoded as a key.
 *
 * Refuses `malformed-key` for anything that is not a well-formed AID under
 * keripy's `PreDex` codes, or a `B` keyid whose key is not a point of the
 * prime-order subgroup; then `unknown-key` when `expected` is given and
 * differs, or for a transferable AID the resolver does not know; the
 * resolver's own refusal, such as `unsupported-signer`; `malformed-key` for
 * a resolved Ed25519 key outside the prime-order subgroup; and
 * `unsupported-algorithm` for a non-transferable prefix other than `B`.
 */
export async function resolveKeyid(
    keyid: string,
    resolver?: HttpSigKeyResolver,
    expected?: string
): Promise<Verfer> {
    const prefix = parsePrefix(keyid);
    if (prefix === null) {
        refuse(
            'malformed-key',
            `keyid "${keyid}" is not a well-formed AID under keripy's PreDex codes.`
        );
    }
    if (prefix.code === MtrDex.Ed25519N && !primeOrderKey(prefix.raw)) {
        refuse(
            'malformed-key',
            `keyid "${keyid}" carries a key outside Ed25519's prime-order subgroup, which no seed yields.`
        );
    }
    if (expected !== undefined && keyid !== expected) {
        refuse(
            'unknown-key',
            `Signed by ${keyid}, not by the expected ${expected}.`
        );
    }
    if (NON_TRANSFERABLE.has(prefix.code)) {
        if (prefix.code !== MtrDex.Ed25519N) {
            refuse(
                'unsupported-algorithm',
                `Non-transferable prefix code ${prefix.code} is not Ed25519.`
            );
        }
        return new Verfer({ qb64: keyid });
    }
    const verfer = resolver === undefined ? null : await resolver(keyid);
    if (verfer === null || verfer === undefined) {
        refuse(
            'unknown-key',
            `No key state is known for the transferable AID ${keyid}.`
        );
    }
    if (ED25519_KEYS.has(verfer.code) && !primeOrderKey(verfer.raw)) {
        refuse(
            'malformed-key',
            `The key resolved for ${keyid} is outside Ed25519's prime-order subgroup, which no seed yields.`
        );
    }
    return verfer;
}

/**
 * The indices of the current signing keys that each satisfy the signing
 * threshold on their own, in key-state order. A threshold that cannot be read
 * is refused as `unsupported-signer`.
 */
export function sufficientKeyIndices(
    keys: readonly string[],
    threshold: KeyState['kt']
): number[] {
    let tholder: Tholder;
    try {
        tholder = new Tholder({ sith: threshold });
    } catch (e) {
        refuse(
            'unsupported-signer',
            `Signing threshold ${JSON.stringify(threshold)} is not usable: ${(e as Error).message}`
        );
    }
    return keys
        .map((_, index) => index)
        .filter((index) => tholder.satisfy([index]));
}

/**
 * The index of a key state's single effective signer (profile §7, R4), which
 * canonical mode requires: the one current signing key that satisfies the
 * signing threshold on its own. A plain single-key state qualifies, and so
 * does a Signify controller after its passcode is rotated (keys
 * `[new, prior-next]`, threshold `['1','0']`), where only the first key does.
 * Any other state, such as a 2-of-3 group or `1` over two keys, is refused as
 * `unsupported-signer`.
 */
export function effectiveKeyIndex(
    keys: readonly string[],
    threshold: KeyState['kt']
): number {
    const alone = sufficientKeyIndices(keys, threshold);
    if (alone.length !== 1) {
        refuse(
            'unsupported-signer',
            `Threshold ${JSON.stringify(threshold)} over ${keys.length} keys has ${alone.length === 0 ? 'no' : 'more than one'} key that satisfies it alone; canonical mode needs a single effective signer.`
        );
    }
    return alone[0];
}

function verferOf(qb64: string): Verfer {
    try {
        return new Verfer({ qb64 });
    } catch (e) {
        refuse('unsupported-algorithm', (e as Error).message);
    }
}

/**
 * A resolver over KERIA-style key state records. `lookup` returns the
 * current key state for an AID, or nothing when it holds none.
 *
 * Canonical mode (profile §7, R1 and R4) yields the single effective signer
 * ({@link effectiveKeyIndex}). The `legacy` lookup (profile §8) yields, for
 * the `Signify-Resource` AID, every current key that alone satisfies the
 * signing threshold ({@link sufficientKeyIndices}), and the legacy verifier
 * accepts a signature under any of them. For a Signify controller, including
 * after a passcode rotation, that is its first key; for an AID made with two
 * keys under threshold `1`, which `createSignedRequest` signs with its first
 * key, it is both. A state with no such key, such as a 2-of-3 group, is
 * refused as `unsupported-signer`, and a key with no weight is never tried.
 */
export function keyStateResolver(
    lookup: (
        aid: string
    ) => KeyState | null | undefined | Promise<KeyState | null | undefined>
): HttpSigKeyResolver {
    const resolver: HttpSigKeyResolver = async (keyid: string) => {
        const state = await lookup(keyid);
        if (state === null || state === undefined) return null;
        const keys = state.k ?? [];
        return verferOf(keys[effectiveKeyIndex(keys, state.kt)]);
    };
    resolver.legacy = async (aid: string) => {
        const state = await lookup(aid);
        if (state === null || state === undefined) return null;
        const keys = state.k ?? [];
        return sufficientKeyIndices(keys, state.kt).map((index) =>
            verferOf(keys[index])
        );
    };
    return resolver;
}

function buildBase(
    items: Item[],
    params: Parameters,
    request: HttpSigRequest,
    response?: HttpSigResponse
): string {
    try {
        return signatureBase({
            components: items,
            params,
            request,
            response,
        });
    } catch (e) {
        if (e instanceof HttpSigRefusal) throw e;
        if (e instanceof HttpSigError) {
            // Uncoded failures are values that cannot be represented in a
            // base (a newline, non-ASCII), so the message cannot verify.
            refuse(
                (e.code as HttpSigCode | undefined) ?? 'signature-mismatch',
                e.message
            );
        }
        throw e;
    }
}

/** The served authorities as compared: lowercased, SP and HTAB trimmed. */
function servedAuthorities(policy: HttpSigPolicy): string[] {
    return (policy.authorities ?? []).map((a) =>
        a.replace(/^[ \t]+|[ \t]+$/g, '').toLowerCase()
    );
}

function checkFreshness(
    params: Parameters,
    policy: HttpSigPolicy,
    now: HttpSigClock | undefined,
    hint: string
): void {
    const t = nowSeconds(now);
    const maxAge = policy.maxAge ?? DEFAULT_MAX_AGE;
    const skew = policy.skew ?? DEFAULT_SKEW;
    const created = params.get('created') as number;
    if (created < t - maxAge - skew || created > t + skew) {
        refuse(
            'signature-stale',
            `created ${created} is outside [${t - maxAge - skew}, ${t + skew}] at ${t}.${hint}`
        );
    }
    const expires = params.get('expires') as number | undefined;
    if (expires !== undefined && expires < t - skew) {
        refuse(
            'signature-expired',
            `expires ${expires} is before ${t - skew} at ${t}.${hint}`
        );
    }
}

function parseDigest(
    headers: Headers,
    whose = 'Content-Digest'
): Map<string, Uint8Array> {
    const header = headers.get(CONTENT_DIGEST);
    if (header === null) {
        refuse('missing-component', `${whose} is covered and absent.`);
    }
    try {
        return parseContentDigest(header);
    } catch (e) {
        refuse('malformed-digest', `${whose}: ${(e as Error).message}`);
    }
}

function compareDigest(
    digests: Map<string, Uint8Array>,
    body: Uint8Array | string | null | undefined,
    whose = 'The content'
): void {
    if (!matchContentDigest(digests, bytesOf(body))) {
        refuse('digest-mismatch', `${whose} does not match its digest.`);
    }
}

function covers(verified: HttpSigVerified, component: string): boolean {
    return verified.components.includes(component);
}

/**
 * The body stage of profile §9, steps 22 to 24, for a message verified
 * before its body was read (profile §3 and §5): a non-empty body without a
 * covered `content-digest` is `insufficient-coverage`, and a covered digest
 * is recomputed over the body. A verifier that already holds a request body
 * runs the same stage after the freshness checks, so both report the same
 * code. Checks nothing for a legacy message.
 *
 * Returns the verification with `bodyOwed` cleared. Use the returned value;
 * the one passed in still says the body check is owed.
 */
export function checkBody(
    verified: HttpSigVerified,
    headers: HttpSigHeaders,
    body: Uint8Array | string | null
): HttpSigVerified {
    return bodyStage(verified, toHeaders(headers), body);
}

/**
 * {@link checkBody}, taking the message's own digests when the caller has
 * already parsed them, so that the field is not parsed twice.
 */
function bodyStage(
    verified: HttpSigVerified,
    headers: Headers,
    body: Uint8Array | string | null,
    digests?: Map<string, Uint8Array>
): HttpSigVerified {
    if (verified.mode === 'canonical') {
        const covered = covers(verified, `"${CONTENT_DIGEST}"`);
        if (!covered && bytesOf(body).length > 0) {
            refuse(
                'insufficient-coverage',
                'A body arrived and its content-digest is not covered.'
            );
        }
        if (covered) compareDigest(digests ?? parseDigest(headers), body);
    }
    return { ...verified, bodyOwed: false };
}

async function verifyCanonical(
    target: Target,
    parsed: Parsed,
    required: string[],
    request: HttpSigRequest,
    response: HttpSigResponse | undefined,
    resolver: HttpSigKeyResolver | undefined,
    expected: string | undefined,
    policy: HttpSigPolicy,
    now: HttpSigClock | undefined
): Promise<HttpSigVerified> {
    const { label, items, params, signature } = parsed;
    checkComponents(items, target);
    checkCoverage(items, required);

    const keyid = params.get('keyid') as string;
    const verfer = await resolveKeyid(keyid, resolver, expected);
    checkAlgorithm(verfer, params);

    const base = buildBase(items, params, request, response);
    // checkPolicy refuses @authority in the request set without
    // requireAuthority, so a required @authority is always compared.
    if (target === 'request' && policy.requireAuthority) {
        // The base was built above, so the authority is readable.
        const authority = requestAuthority(request.url, request.headers);
        if (
            authority === null ||
            !servedAuthorities(policy).includes(authority)
        ) {
            refuse(
                'signature-mismatch',
                `@authority ${authority} is not an authority this verifier serves.`
            );
        }
    }
    if (!verfer.verify(signature, b(base))) {
        refuse('signature-mismatch', `The signature by ${keyid} is invalid.`);
    }
    checkFreshness(
        params,
        policy,
        now,
        target === 'response'
            ? ' A client whose clock is wrong refuses every response; check the local clock.'
            : ''
    );
    return {
        mode: 'canonical',
        keyid,
        label,
        params,
        components: items.map(serializeItem),
        verfer,
        base,
        bodyOwed: false,
    };
}

/**
 * Verify a legacy-mode message as {@link SignedHeaderAuthenticator} does: the
 * legacy base over `method`, `path` and the covered headers, and the CESR
 * signature under `label`. No freshness and no body coverage.
 *
 * `verfers` are the keys the signature may verify under, which for a key
 * state are every current key that alone satisfies its signing threshold
 * (profile §8); `verfer` is shorthand for one. The signature is accepted
 * under the first that verifies it, which the result names. Refusals follow
 * profile §9's legacy order from `malformed-signature-input` on.
 */
export function verifyLegacy(args: {
    method: string;
    path: string;
    headers: HttpSigHeaders;
    verfer?: Verfer;
    verfers?: readonly Verfer[];
    label?: string;
}): HttpSigVerified {
    const headers = toHeaders(args.headers);
    const label = args.label ?? DEFAULT_LABEL;
    const verfers =
        args.verfers ?? (args.verfer === undefined ? [] : [args.verfer]);
    if (verfers.length === 0) {
        refuse(
            'unsupported-signer',
            'No current key alone satisfies the signing threshold.'
        );
    }
    const input = headers.get(SIGNATURE_INPUT);
    if (input === null) {
        refuse('missing-signature-input', 'Signature-Input is absent.');
    }
    const signature = headers.get(SIGNATURE);
    if (signature === null) {
        refuse('missing-signature', 'Signature is absent.');
    }
    let inputs: Inputage[];
    try {
        inputs = desiginput(input);
    } catch (e) {
        refuse('malformed-signature-input', (e as Error).message);
    }
    for (const i of inputs) {
        if (i.fields.some((field: unknown) => typeof field !== 'string')) {
            refuse(
                'malformed-signature-input',
                `A covered item of "${i.name}" is not a String.`
            );
        }
    }
    inputs = inputs.filter((i) => i.name === label);
    if (inputs.length === 0) {
        refuse(
            'missing-signature-label',
            `Missing ${label} inputs in signature.`
        );
    }
    let markers: Map<string, Siger | Cigar>;
    try {
        markers = legacyMarkers(signature);
    } catch (e) {
        refuse('malformed-signature', (e as Error).message);
    }
    const bases: string[] = [];
    const sigs: (Siger | Cigar)[] = [];
    for (const i of inputs) {
        bases.push(legacySignatureBase(i, headers, args.method, args.path));
        const cig = markers.get(i.name);
        if (!cig) {
            refuse('missing-signature-label', `No ${i.name} signature.`);
        }
        sigs.push(cig);
    }
    // Verification throws, rather than returning false, for a signature the
    // key cannot check, such as a 114-byte Ed448 signature under an Ed25519
    // key. Legacy carries no alg to refuse it on beforehand, so it is a
    // signature that does not verify under that key (§9).
    const verifies = (verfer: Verfer) =>
        sigs.every((cig, n) => {
            try {
                return verfer.verify(cig.raw, bases[n]);
            } catch {
                return false;
            }
        });
    const verfer = verfers.find(verifies);
    if (verfer === undefined) {
        refuse(
            'signature-mismatch',
            `Signature for ${inputs[0].keyid} verifies under none of the ${verfers.length} key(s) that alone satisfy the threshold.`
        );
    }
    const [first] = inputs;
    const params: Parameters = new Map();
    for (const key of [
        'created',
        'expires',
        'nonce',
        'keyid',
        'context',
        'alg',
    ] as const) {
        if (first[key] !== undefined) params.set(key, first[key]);
    }
    return {
        mode: 'legacy',
        keyid: headers.get(SIGNIFY_RESOURCE) ?? String(first.keyid ?? ''),
        label,
        params,
        components: [...first.fields],
        verfer,
        base: bases[bases.length - 1],
        bodyOwed: false,
    };
}

/**
 * Legacy mode resolves Signify-Resource by lookup (profile §8): the
 * resolver's `legacy` lookup when it has one, which yields every current key
 * that alone satisfies the controller's signing threshold, else the resolver
 * itself as given. §7 R1's derivation-code rules do not apply: the AID is
 * looked up, never decoded as a key, so a `B` prefix with no key state is
 * `unknown-key` too. An empty list is `unsupported-signer`.
 */
async function resolveLegacy(
    resource: string,
    resolver: HttpSigKeyResolver | undefined
): Promise<readonly Verfer[]> {
    const lookup = resolver?.legacy ?? resolver;
    const found = lookup === undefined ? null : await lookup(resource);
    if (found === null || found === undefined) {
        refuse('unknown-key', `No key state is known for ${resource}.`);
    }
    const verfers = found instanceof Verfer ? [found] : found;
    if (verfers.length === 0) {
        refuse(
            'unsupported-signer',
            `No current key of ${resource} alone satisfies its signing threshold.`
        );
    }
    return verfers;
}

/**
 * The WHATWG-normalized path, which is what legacy mode signs: the legacy
 * signer takes `new URL(request.url).pathname`.
 */
function pathOf(url: string): string {
    return new URL(
        url,
        isAbsoluteUrl(url) ? undefined : 'http://relative.invalid'
    ).pathname;
}

/**
 * Verify a signed request under the profile. Canonical requests run the
 * checks of §9 in order; legacy requests are verified as KERIA does today,
 * with the key resolved from `Signify-Resource`, unless `acceptLegacy` is
 * false. Throws {@link HttpSigRefusal}, and `Error` for a policy below the
 * profile's floor ({@link checkPolicy}).
 *
 * Without `body` the result has `bodyOwed` set: pass the body to
 * {@link checkBody} once read, and use what it returns.
 */
export async function verifyRequest(
    args: HttpSigVerifyRequestArgs
): Promise<HttpSigVerified> {
    const headers = toHeaders(args.headers);
    const policy = args.policy ?? {};
    checkPolicy(policy);
    checkClock(args.now);
    const signature = headers.get(SIGNATURE);
    if (signature === null) {
        refuse('missing-signature', 'The request is not signed.');
    }
    const input = headers.get(SIGNATURE_INPUT);
    if (input === null) {
        refuse('missing-signature-input', 'Signature-Input is absent.');
    }
    if (detectMode(signature) === 'legacy') {
        // A legacy request is verified without the canonical policy, so
        // requireAuthority does not refuse it although legacy covers no
        // authority (profile §3, §8): acceptLegacy is the only switch that
        // refuses a request for being legacy. A verifier that must have
        // @authority compared for every request sets it to false as well.
        if (args.acceptLegacy === false) {
            refuse(
                'malformed-signature',
                'Legacy signatures are not accepted by this verifier.'
            );
        }
        const resource = headers.get(SIGNIFY_RESOURCE);
        if (resource === null) {
            refuse('missing-component', 'Signify-Resource is absent.');
        }
        const verfers = await resolveLegacy(resource, args.resolver);
        return verifyLegacy({
            method: args.method,
            path: pathOf(args.url),
            headers,
            verfers,
        });
    }
    const parsed = parseCanonical(signature, input);
    const request: HttpSigRequest = {
        method: args.method,
        url: args.url,
        headers,
    };
    const verified = await verifyCanonical(
        'request',
        parsed,
        requestMinimum(policy, headers),
        request,
        undefined,
        args.resolver,
        undefined,
        policy,
        args.now
    );
    if (args.body === undefined) return { ...verified, bodyOwed: true };
    return bodyStage(verified, headers, args.body);
}

/**
 * The mode a client's request was sent in, from its own Signature header:
 * `canonical` when it carries none or the header is neither form.
 */
function modeOfRequest(request: HttpSigMessageRequest): HttpSigMode {
    const signature = toHeaders(request.headers).get(SIGNATURE);
    if (signature === null) return 'canonical';
    try {
        return detectMode(signature);
    } catch {
        return 'canonical';
    }
}

/**
 * Verify a response under the profile, as a client that sent `request`.
 *
 * After a canonical request an unsigned 401 is refused as `unauthenticated`,
 * before any other check, and any other unsigned response as
 * `missing-signature`. A `Signature` header that is present but empty is
 * unsigned (profile §8, §9). A response in the other mode than the request,
 * in either direction, is `mode-mismatch`, with no fallback (profile §8).
 * A canonical response must be signed by `keyid`, cover the response
 * minimum set, be fresh, and match its digest. When it covers
 * `"content-digest";req`, the request's `Content-Digest` is recomputed over
 * `request.body`, which must be the content the client sent. Every covered
 * digest is parsed before any is compared. After a legacy request, the
 * legacy response is verified as {@link SignedHeaderAuthenticator} does.
 */
export async function verifyResponse(
    args: HttpSigVerifyResponseArgs
): Promise<HttpSigVerified> {
    const sent = sentContent(args.request);
    const headers = toHeaders(args.headers);
    const policy = args.policy ?? {};
    checkPolicy(policy);
    checkClock(args.now);
    const requestMode = args.requestMode ?? modeOfRequest(args.request);
    const signature = headers.get(SIGNATURE);
    // An empty Signature is no signature on a response (profile §8), so a
    // 401 carrying one is the same unsigned 401.
    if (signature === null || signature === '') {
        if (args.status === 401 && requestMode === 'canonical') {
            refuse(
                'unauthenticated',
                `HTTP ${args.request.method} ${pathOf(args.request.url)} - 401 Unauthorized; the response is unsigned and its body is not trusted.`
            );
        }
        refuse('missing-signature', 'The response is not signed.');
    }
    const input = headers.get(SIGNATURE_INPUT);
    if (input === null) {
        refuse('missing-signature-input', 'Signature-Input is absent.');
    }
    const mode = detectMode(signature);
    if (mode !== requestMode) {
        refuse(
            'mode-mismatch',
            `A ${mode} response answered a ${requestMode} request.`
        );
    }
    if (mode === 'legacy') {
        // The profile's legacy order (§9): an absent Signify-Resource is
        // missing-component before it is compared with the expected AID.
        const resource = headers.get(SIGNIFY_RESOURCE);
        if (resource === null) {
            refuse('missing-component', 'Signify-Resource is absent.');
        }
        if (resource !== args.keyid) {
            refuse(
                'unknown-key',
                `Signed for ${resource}, not by the expected ${args.keyid}.`
            );
        }
        const verfers = await resolveLegacy(resource, args.resolver);
        return verifyLegacy({
            method: args.request.method,
            path: pathOf(args.request.url),
            headers,
            verfers,
        });
    }
    const parsed = parseCanonical(signature, input);
    const verified = await verifyCanonical(
        'response',
        parsed,
        responseMinimum(args.body, args.request),
        {
            method: args.request.method,
            url: args.request.url,
            headers: args.request.headers,
        },
        { status: args.status, headers },
        args.resolver,
        args.keyid,
        policy,
        args.now
    );
    // Body stage (§9 steps 22 to 24): parse every covered digest before
    // comparing any. The request's
    // is recomputed over the content the client sent, now, even when the
    // response body is deferred; the response's own is compared by checkBody.
    const digests = covers(verified, `"${CONTENT_DIGEST}"`)
        ? parseDigest(headers)
        : undefined;
    if (covers(verified, REQUEST_DIGEST)) {
        compareDigest(
            parseDigest(
                toHeaders(args.request.headers),
                "The request's Content-Digest"
            ),
            sent,
            'The request content'
        );
    }
    if (args.body === undefined) return { ...verified, bodyOwed: true };
    return bodyStage(verified, headers, args.body, digests);
}

function sign(
    target: Target,
    args: HttpSigSignArgs,
    components: ComponentIdentifier[],
    required: string[],
    headers: Headers,
    body: Uint8Array,
    request: HttpSigRequest,
    response: HttpSigResponse | undefined,
    requestContent?: Uint8Array
): HttpSigSignedFields {
    const items = components.map(identifierOf);
    checkComponents(items, target);
    const covered = identities(items);
    const digestId = componentIdentity(componentIdentifier(CONTENT_DIGEST));
    if (body.length > 0 && !covered.has(digestId)) {
        refuse(
            'uncovered-body',
            'A non-empty body must be covered by content-digest.'
        );
    }
    checkCoverage(items, required);
    if (
        requestContent !== undefined &&
        covered.has(componentIdentity(componentIdentifier(REQUEST_DIGEST)))
    ) {
        // Never bind a request digest that the request content contradicts.
        compareDigest(
            parseDigest(
                toHeaders(request.headers),
                "The request's Content-Digest"
            ),
            requestContent,
            'The request content'
        );
    }

    const alg = args.alg === undefined ? ED25519 : args.alg;
    if (alg !== null && alg !== ED25519) {
        refuse('unsupported-algorithm', `alg "${alg}" is not supported.`);
    }
    if (args.signer.code !== MtrDex.Ed25519_Seed) {
        refuse('unsupported-algorithm', 'The signer is not Ed25519.');
    }
    const nonce =
        args.nonce === undefined
            ? encodeBase64Url(libsodium.randombytes_buf(16))
            : args.nonce;
    const params = signatureParameters({
        created: args.created ?? Math.floor(Date.now() / 1000),
        expires: args.expires,
        nonce: nonce ?? undefined,
        alg: alg ?? undefined,
        keyid: args.keyid,
        tag: args.tag,
    });

    const fields: Partial<HttpSigSignedFields> = {};
    if (covered.has(digestId)) {
        fields['Content-Digest'] = contentDigest(body);
        headers.set(CONTENT_DIGEST, fields['Content-Digest']);
    }
    const base = buildBase(items, params, request, response);
    const raw = args.signer.sign(b(base)).raw;
    const label = args.label ?? DEFAULT_LABEL;
    fields['Signature-Input'] = serializeDictionary(
        new Map([[label, [items, params]]])
    );
    fields.Signature = serializeDictionary(
        new Map([[label, [new ByteSequence(fromByteArray(raw)), new Map()]]])
    );
    return fields as HttpSigSignedFields;
}

/**
 * Sign a request in canonical mode. Returns the fields to add to the
 * request: `Content-Digest` when a body is covered, `Signature-Input` and
 * `Signature`. `Signify-Resource` and `Signify-Timestamp` are not used.
 *
 * The default covered set is `@method @authority @path @query`, plus
 * `content-digest` when the body is non-empty. Refuses `uncovered-body` for
 * a non-empty body without `content-digest`, and `insufficient-coverage`
 * when the profile's request minimum set is not covered.
 */
export function signRequest(args: HttpSigSignRequestArgs): HttpSigSignedFields {
    const headers = new Headers(toHeaders(args.headers));
    const body = bytesOf(args.body);
    const components =
        args.components ??
        (body.length > 0
            ? [...HTTPSIG_REQUEST_DEFAULT, CONTENT_DIGEST]
            : [...HTTPSIG_REQUEST_DEFAULT]);
    const request = { method: args.method, url: args.url, headers };
    return sign(
        'request',
        args,
        components,
        [...HTTPSIG_REQUEST_MINIMUM],
        headers,
        body,
        request,
        undefined
    );
}

/**
 * Sign a response in canonical mode, bound to the request it answers
 * (profile §3). The default covered set is {@link responseComponents}.
 * `request.body` must be the request content as received; when
 * `"content-digest";req` is covered, a request `Content-Digest` that the
 * content contradicts is refused (`malformed-digest`, `digest-mismatch`).
 */
export function signResponse(
    args: HttpSigSignResponseArgs
): HttpSigSignedFields {
    const requestContent = sentContent(args.request);
    const headers = new Headers(toHeaders(args.headers));
    const body = bytesOf(args.body);
    const required = responseMinimum(body, args.request);
    const components = args.components ?? required;
    return sign(
        'response',
        args,
        components,
        required,
        headers,
        body,
        {
            method: args.request.method,
            url: args.request.url,
            headers: args.request.headers,
        },
        { status: args.status, headers },
        requestContent
    );
}
