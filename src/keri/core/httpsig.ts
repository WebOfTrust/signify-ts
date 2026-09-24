/**
 * RFC 9421 (HTTP Message Signatures) signature base, and RFC 9530
 * Content-Digest helpers.
 *
 * This module builds the canonical signature base of RFC 9421 §2.5 exactly as
 * the RFC specifies it, so that a signature produced here can be checked by
 * any conformant RFC 9421 implementation and vice versa. It is independent of
 * the legacy Signify header scheme in `httping.ts` and `authing.ts`, which it
 * does not change.
 *
 * Anything this module cannot represent exactly is refused with an
 * {@link HttpSigError} rather than skipped: a component silently left out of
 * the base is a component the caller believes is covered and is not.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9421.html
 * @see https://www.rfc-editor.org/rfc/rfc9530.html
 */
import {
    BareItem,
    ByteSequence,
    Item,
    Parameters,
    isByteSequence,
    isInnerList,
    parseDictionary,
    parseItem,
    serializeInnerList,
    serializeItem,
} from 'structured-headers';
import { fromByteArray, toByteArray } from 'base64-js';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';

/**
 * Raised for any input the signature base or digest cannot be built from.
 *
 * `code`, when set, is the neutral refusal code of the KERI profile of
 * RFC 9421 (profile §9) that the failure corresponds to, such as
 * `missing-component` or `unsupported-component`. It is unset for failures
 * the profile has no code for.
 */
export class HttpSigError extends Error {
    readonly code?: string;

    constructor(message: string, code?: string) {
        super(message);
        this.name = 'HttpSigError';
        this.code = code;
    }
}

/** Derived components this module can build (RFC 9421 §2.2). */
export const HTTPSIG_DERIVED_COMPONENTS = [
    '@method',
    '@authority',
    '@path',
    '@query',
    '@status',
] as const;

/** Component parameters this module understands (RFC 9421 §2.1, §2.4). */
export const HTTPSIG_COMPONENT_PARAMS = ['req', 'key'] as const;

/** Derived components that target a request message (RFC 9421 §2.2). */
export const HTTPSIG_REQUEST_DERIVED: ReadonlySet<string> = new Set([
    '@method',
    '@authority',
    '@path',
    '@query',
]);

/**
 * A covered component identifier.
 *
 * - A plain name, such as `'@method'` or `'Content-Type'`. Field names given
 *   this way are lowercased, as RFC 9421 §2.1 requires of component names.
 * - An RFC 8941 serialized String Item with parameters, such as
 *   `'"signature";req;key="sig1"'`. This is the form the identifier takes in
 *   the signature base and in Signature-Input.
 * - A parsed structured-headers `Item`, as produced by parsing a received
 *   Signature-Input header. Its parameter order is preserved.
 *
 * In the last two forms the name is taken as given and must already be
 * lowercase.
 */
export type ComponentIdentifier = string | Item;

/** Header fields of a message. Array values are separate field lines. */
export type HttpSigHeaders = Headers | Record<string, string | string[]>;

/** The request a signature targets, or the request a response answers. */
export interface HttpSigRequest {
    /** The method exactly as sent. RFC 9421 §2.2.1 forbids changing its case. */
    method: string;
    /**
     * The target URI. Absolute is preferred; a relative URL is accepted and
     * then `@authority` is taken from the Host header.
     */
    url: string;
    headers: HttpSigHeaders;
}

/** A response message a signature targets. */
export interface HttpSigResponse {
    status: number;
    headers: HttpSigHeaders;
}

/** Signature parameters of RFC 9421 §2.3. */
export interface HttpSigParams {
    created?: number;
    expires?: number;
    nonce?: string;
    alg?: string;
    keyid?: string;
    tag?: string;
}

/**
 * The order in which {@link signatureParameters} emits parameters. RFC 9421
 * §2.3 leaves the order to the signer; a verifier must reserialize whatever
 * order it received, which is why {@link signatureBase} also accepts a
 * `Parameters` map as-is.
 */
const PARAM_ORDER: Array<keyof HttpSigParams> = [
    'created',
    'expires',
    'nonce',
    'alg',
    'keyid',
    'tag',
];

export interface SignatureBaseArgs {
    /** Covered components, in signature order. */
    components: ComponentIdentifier[];
    /**
     * Signature parameters. An object is emitted in a fixed order (created,
     * expires, nonce, alg, keyid, tag); a `Parameters` map, such as one parsed
     * from a received Signature-Input, is emitted exactly in its own order.
     */
    params: HttpSigParams | Parameters;
    /**
     * The target request, or, when `response` is given, the request that the
     * response answers (used by components carrying `req`).
     */
    request?: HttpSigRequest;
    /** The target response. When present, the signature targets it. */
    response?: HttpSigResponse;
}

const MALFORMED_INPUT = 'malformed-signature-input';
const UNSUPPORTED = 'unsupported-component';
const MISSING = 'missing-component';

function fail(message: string, code?: string): never {
    throw new HttpSigError(message, code);
}

/**
 * Normalize a component identifier to a structured-headers `Item` whose bare
 * item is the lowercase component name, and check that every parameter is
 * one this module understands.
 */
export function componentIdentifier(component: ComponentIdentifier): Item {
    let item: Item;
    if (typeof component === 'string') {
        if (component.startsWith('"')) {
            try {
                item = parseItem(component);
            } catch (e) {
                fail(
                    `Component identifier ${component} is not a valid structured field item: ${(e as Error).message}`,
                    MALFORMED_INPUT
                );
            }
        } else {
            item = [component.toLowerCase(), new Map()];
        }
    } else {
        item = [component[0], new Map(component[1])];
    }

    const [name, params] = item;
    if (typeof name !== 'string') {
        fail(
            'A component name must be a structured field String.',
            MALFORMED_INPUT
        );
    }
    if (name === '' || name !== name.toLowerCase()) {
        fail(
            `Component name "${name}" must be non-empty and lowercase.`,
            MALFORMED_INPUT
        );
    }
    if (name === '@signature-params') {
        fail(
            '"@signature-params" cannot be listed as a covered component.',
            UNSUPPORTED
        );
    }
    for (const [key, value] of params) {
        if (key === 'req') {
            if (value !== true) {
                fail(
                    `Component "${name}" has a req parameter that is not ?1.`,
                    UNSUPPORTED
                );
            }
        } else if (key === 'key') {
            if (typeof value !== 'string') {
                fail(
                    `Component "${name}" has a key parameter that is not a String.`,
                    UNSUPPORTED
                );
            }
            if (name.startsWith('@')) {
                fail(
                    `The key parameter applies only to fields, not "${name}".`,
                    UNSUPPORTED
                );
            }
        } else {
            fail(
                `Component "${name}" has the parameter "${key}", which is not supported; supported: ${HTTPSIG_COMPONENT_PARAMS.join(', ')}.`,
                UNSUPPORTED
            );
        }
    }
    return item;
}

/**
 * Order-insensitive identity of a component, for duplicate detection: two
 * identifiers with the same name and the same parameters in any order have
 * the same identity.
 */
export function componentIdentity([name, params]: Item): string {
    const keys = Array.from(params.entries())
        .map(([k, v]) => `${k}=${String(v)}`)
        .sort();
    return JSON.stringify([name, keys]);
}

/** Put the signature parameters in the fixed order this module emits. */
export function signatureParameters(params: HttpSigParams): Parameters {
    const out: Parameters = new Map();
    for (const name of PARAM_ORDER) {
        const value = params[name];
        if (value !== undefined && value !== null) {
            out.set(name, value);
        }
    }
    return out;
}

function checkParameters(params: Parameters): void {
    for (const name of ['created', 'expires']) {
        const value = params.get(name);
        if (value !== undefined && !Number.isInteger(value)) {
            fail(`Signature parameter "${name}" must be an Integer.`);
        }
    }
    for (const name of ['nonce', 'alg', 'keyid', 'tag']) {
        const value = params.get(name);
        if (value !== undefined && typeof value !== 'string') {
            fail(`Signature parameter "${name}" must be a String.`);
        }
    }
}

/**
 * Serialize the `@signature-params` value (RFC 9421 §2.3): the covered
 * components as an Inner List of Strings, followed by the signature
 * parameters. The same string is the member value of Signature-Input.
 */
export function signatureParamsValue(
    components: ComponentIdentifier[],
    params: HttpSigParams | Parameters
): string {
    const items = components.map(componentIdentifier);
    const ordered =
        params instanceof Map ? new Map(params) : signatureParameters(params);
    checkParameters(ordered);
    return serializeInnerList([items, ordered]);
}

/** Field lines of one name, in message order, each trimmed (RFC 9421 §2.1). */
function fieldValues(headers: HttpSigHeaders, name: string): string[] | null {
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
        // Headers already combines repeated fields with ", " and strips
        // leading and trailing whitespace from each value.
        const value = headers.get(name);
        return value === null ? null : [value];
    }
    const values: string[] = [];
    let found = false;
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== name) continue;
        found = true;
        for (const v of Array.isArray(value) ? value : [value]) {
            values.push(String(v));
        }
    }
    return found ? values : null;
}

/**
 * The canonical value of a field (RFC 9421 §2.1): each field line stripped
 * of leading and trailing whitespace, obsolete line folding replaced with a
 * space, and the lines joined with ", ".
 */
function fieldValue(headers: HttpSigHeaders, name: string): string | null {
    const values = fieldValues(headers, name);
    if (values === null) return null;
    return values.map((v) => v.replace(/\r?\n[ \t]+/g, ' ').trim()).join(', ');
}

/** A URL with a scheme, as opposed to a relative reference. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;

/** Whether a URL is absolute, that is, starts with a scheme. */
export function isAbsoluteUrl(url: string): boolean {
    return ABSOLUTE_URL.test(url);
}

/** The path and query of a target URL, as written. */
export interface RawTarget {
    /** The path exactly as written, `/` when empty. */
    path: string;
    /** The query with its leading `?`, or `?` alone when there is none. */
    query: string;
}

/**
 * Take the path and query from a target URL without normalizing
 * anything (profile §2, RFC 9421 §2.2.6 and §2.2.7). WHATWG `new URL()`
 * removes dot segments, `%2e` included, turns `\` into `/`, and re-encodes
 * characters such as `'` and `{`, so that a signature over one path would
 * verify against another. Here the path runs from the end of the authority
 * to the first `?` or `#`, and the query from that `?` to the first `#`.
 *
 * A signer must derive these from the URL exactly as it will go on the
 * wire. `fetch()` sends the WHATWG serialization, which a `Request`'s `url`
 * already is.
 */
export function rawTarget(url: string): RawTarget {
    let rest = url;
    const scheme = ABSOLUTE_URL.exec(rest);
    if (scheme !== null) {
        rest = rest.slice(scheme[0].length);
        if (!rest.startsWith('//')) {
            fail(`The request URL "${url}" has no authority.`);
        }
    }
    if (rest.startsWith('//')) {
        // Skip the authority, which ends at the first "/", "?" or "#".
        const end = rest.slice(2).search(/[/?#]/);
        rest = end === -1 ? '' : rest.slice(2 + end);
    }
    const hash = rest.indexOf('#');
    if (hash !== -1) rest = rest.slice(0, hash);
    const mark = rest.indexOf('?');
    const path = mark === -1 ? rest : rest.slice(0, mark);
    const query = mark === -1 ? '?' : rest.slice(mark);
    if (path !== '' && !path.startsWith('/')) {
        fail(`The request URL "${url}" does not have an absolute path.`);
    }
    return { path: path === '' ? '/' : path, query };
}

/**
 * An authority as the profile compares it: lowercased, with `:80` or `:443`
 * removed whatever the scheme.
 */
export function normalizeAuthority(authority: string): string {
    return authority
        .trim()
        .toLowerCase()
        .replace(/:(80|443)$/, '');
}

/**
 * The `@authority` of a request (RFC 9421 §2.2.3): an absolute URL's host,
 * lowercased with the scheme's default port omitted, else the Host header,
 * lowercased with `:80` or `:443` omitted ({@link normalizeAuthority}),
 * since a Host header carries no scheme; null when neither is there.
 */
export function requestAuthority(
    url: string,
    headers: HttpSigHeaders
): string | null {
    if (isAbsoluteUrl(url)) {
        try {
            // WHATWG parsing lowercases the host, drops userinfo and the
            // scheme's default port, and puts an IDN in ASCII form.
            return new URL(url).host.toLowerCase();
        } catch {
            fail(`Cannot parse the request URL "${url}".`);
        }
    }
    const host = fieldValue(headers, 'host');
    return host === null || host === '' ? null : normalizeAuthority(host);
}

function derivedValue(
    name: string,
    request: HttpSigRequest | undefined,
    response: HttpSigResponse | undefined,
    fromRequest: boolean
): string {
    if (name === '@status') {
        if (fromRequest || response === undefined) {
            fail(
                '"@status" applies only to a response (RFC 9421 §2.2.9).',
                UNSUPPORTED
            );
        }
        const status = response.status;
        if (!Number.isInteger(status) || status < 100 || status > 999) {
            fail(`"${status}" is not a three-digit status code.`);
        }
        return String(status);
    }
    if (!HTTPSIG_REQUEST_DERIVED.has(name)) {
        fail(
            `The derived component "${name}" is not supported; supported: ${HTTPSIG_DERIVED_COMPONENTS.join(', ')}.`,
            UNSUPPORTED
        );
    }
    if (!fromRequest) {
        fail(
            `"${name}" targets a request; in a response it must carry req (RFC 9421 §2.4).`,
            UNSUPPORTED
        );
    }
    if (request === undefined) {
        fail(`"${name}" needs the request, and none was given.`, MISSING);
    }
    if (name === '@method') {
        // RFC 9421 §2.2.1: no transformation of the method's case.
        return request.method;
    }
    if (name === '@authority') {
        const authority = requestAuthority(request.url, request.headers);
        if (authority === null) {
            fail(
                '"@authority" is covered, but the URL is relative and there is no Host header.',
                MISSING
            );
        }
        return authority;
    }
    const target = rawTarget(request.url);
    // RFC 9421 §2.2.6 and §2.2.7, profile §2: as sent, unnormalized.
    return name === '@path' ? target.path : target.query;
}

function memberValue(value: string, name: string, key: string): string {
    let dict;
    try {
        dict = parseDictionary(value);
    } catch (e) {
        fail(
            `Field "${name}" is not a Dictionary structured field: ${(e as Error).message}`
        );
    }
    const member = dict.get(key);
    if (member === undefined) {
        fail(
            `Field "${name}" has no member "${key}" (RFC 9421 §2.1.2).`,
            MISSING
        );
    }
    return isInnerList(member)
        ? serializeInnerList(member)
        : serializeItem(member);
}

/**
 * Build the RFC 9421 §2.5 signature base.
 *
 * Throws {@link HttpSigError} for an unsupported component or parameter, a
 * missing field or dictionary member, a duplicate component, `req` on a
 * request, a request component in a response without `req`, and any
 * non-ASCII output.
 */
export function signatureBase(args: SignatureBaseArgs): string {
    const { components, params, request, response } = args;
    if (request === undefined && response === undefined) {
        fail('A signature base needs a request or a response.');
    }
    const items = components.map(componentIdentifier);
    const lines: string[] = [];
    const seen = new Set<string>();

    for (const item of items) {
        const id = componentIdentity(item);
        if (seen.has(id)) {
            fail(
                `Component ${serializeItem(item)} is covered more than once.`,
                'duplicate-component'
            );
        }
        seen.add(id);

        const [name, cparams] = item as [string, Parameters];
        const req = cparams.get('req') === true;
        if (req && response === undefined) {
            fail(
                `Component ${serializeItem(item)} carries req, but the signature targets a request (RFC 9421 §2.4).`,
                UNSUPPORTED
            );
        }
        const fromRequest = req || response === undefined;

        let value: string;
        if (name.startsWith('@')) {
            value = derivedValue(name, request, response, fromRequest);
        } else {
            const message = fromRequest ? request : response;
            if (message === undefined) {
                fail(
                    `${serializeItem(item)} needs the request, and none was given.`,
                    MISSING
                );
            }
            const raw = fieldValue(message.headers, name);
            if (raw === null) {
                fail(
                    `${serializeItem(item)} is covered, but the ${fromRequest ? 'request' : 'response'} has no "${name}" field.`,
                    MISSING
                );
            }
            const key = cparams.get('key') as string | undefined;
            value = key === undefined ? raw : memberValue(raw, name, key);
        }
        if (value.includes('\n')) {
            fail(`The value of ${serializeItem(item)} contains a newline.`);
        }
        lines.push(`${serializeItem(item)}: ${value}`);
    }

    lines.push(`"@signature-params": ${signatureParamsValue(items, params)}`);
    const base = lines.join('\n');
    // RFC 9421 §2.5 step 4.
    if (Array.from(base).some((ch) => ch.charCodeAt(0) > 0x7f)) {
        fail('The signature base contains non-ASCII characters.');
    }
    return base;
}

// ---- Content-Digest, RFC 9530 ------------------------------------------

type DigestFn = (data: Uint8Array) => Uint8Array;

/** Digest algorithms accepted by {@link verifyContentDigest}. */
const DIGESTS: Record<string, DigestFn> = {
    'sha-256': sha256,
    'sha-512': sha512,
};

function bodyBytes(body: Uint8Array | string): Uint8Array {
    return typeof body === 'string' ? new TextEncoder().encode(body) : body;
}

/**
 * The Content-Digest field value for a body (RFC 9530 §2), e.g.
 * `sha-256=:X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=:`.
 */
export function contentDigest(
    body: Uint8Array | string,
    algorithm: 'sha-256' | 'sha-512' = 'sha-256'
): string {
    const fn = DIGESTS[algorithm];
    if (fn === undefined) {
        fail(`Unsupported Content-Digest algorithm "${algorithm}".`);
    }
    return `${algorithm}=:${fromByteArray(fn(bodyBytes(body)))}:`;
}

/**
 * The bytes of an RFC 8941 Byte Sequence, or null when its content is not
 * valid base64. Missing padding is tolerated, as RFC 8941 §4.2.7 asks.
 */
export function byteSequenceBytes(value: ByteSequence): Uint8Array | null {
    const b64 = value.toBase64();
    try {
        return toByteArray(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    } catch {
        return null;
    }
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

/**
 * Parse a Content-Digest field value into the digests this module can check,
 * keyed by algorithm (RFC 9530). Members of other algorithms are ignored, as
 * RFC 9530 §2 allows. Throws {@link HttpSigError} with code
 * `malformed-digest` when the field cannot be parsed, when a recognized
 * member is not a Byte Sequence, or when no member is recognized, since then
 * nothing could be verified.
 */
export function parseContentDigest(header: string): Map<string, Uint8Array> {
    let dict;
    try {
        dict = parseDictionary(header);
    } catch (e) {
        fail(
            `Content-Digest is not a Dictionary: ${(e as Error).message}`,
            'malformed-digest'
        );
    }
    const digests = new Map<string, Uint8Array>();
    for (const [algorithm, member] of dict) {
        if (DIGESTS[algorithm] === undefined) continue;
        const value: BareItem | undefined = isInnerList(member)
            ? undefined
            : member[0];
        if (value === undefined || !isByteSequence(value)) {
            fail(
                `Content-Digest member "${algorithm}" is not a Byte Sequence.`,
                'malformed-digest'
            );
        }
        const bytes = byteSequenceBytes(value as ByteSequence);
        if (bytes === null) {
            fail(
                `Content-Digest member "${algorithm}" is not valid base64.`,
                'malformed-digest'
            );
        }
        digests.set(algorithm, bytes);
    }
    if (digests.size === 0) {
        fail(
            `Content-Digest carries no supported algorithm; supported: ${Object.keys(DIGESTS).join(', ')}.`,
            'malformed-digest'
        );
    }
    return digests;
}

/**
 * Compare digests from {@link parseContentDigest} with a body: true when
 * every one matches.
 */
export function matchContentDigest(
    digests: Map<string, Uint8Array>,
    body: Uint8Array | string
): boolean {
    const bytes = bodyBytes(body);
    for (const [algorithm, received] of digests) {
        if (!equalBytes(received, DIGESTS[algorithm](bytes))) return false;
    }
    return true;
}

/**
 * Check a Content-Digest field value against a body.
 *
 * Every sha-256 and sha-512 member must match; other algorithms are ignored,
 * as RFC 9530 §2 allows. The whole field is parsed before any member is
 * compared, so a malformed member is reported as such even when another
 * member mismatches. Returns false on a mismatch. Throws
 * {@link HttpSigError} when the field cannot be parsed or carries no
 * algorithm this module can check, since then nothing was verified.
 */
export function verifyContentDigest(
    header: string,
    body: Uint8Array | string
): boolean {
    return matchContentDigest(parseContentDigest(header), body);
}
