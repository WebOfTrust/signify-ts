// CESR stream parser (v1): message framing + attachment-group decomposition.
//
// signify-ts already has the primitive classes (Matter, Counter, Indexer) and
// emits framed streams (eventing.messagize), but has no parser that CONSUMES a
// stream. This module fills that gap: it frames a byte stream deterministically
// — by the version-string size and the attachment counters, never by sniffing a
// leading `{` — delegating all primitive/counter/indexer SIZING to the existing
// classes. It is resilient: on a code it cannot frame it stops and reports,
// returning everything parsed so far, so a single bad byte never loses the
// stream prefix that did parse.

import { Counter } from './counter.ts';
import { Indexer } from './indexer.ts';
import { Matter } from './matter.ts';

// Lazily-created shared decoder — constructing it at module load would be a
// side effect that stops bundlers tree-shaking this module away for consumers
// who never use the parser. Building it on first use keeps the module pure.
let decoder: TextDecoder | undefined;
const td = (): TextDecoder => (decoder ??= new TextDecoder());
const DASH = 0x2d; // '-'

/** A half-open byte range [start, end) into the original stream. */
export interface ByteSpan {
    start: number;
    end: number;
}

/** Framing outcome for a node. */
export type NodeState =
    | 'known' // recognized code, fully framed
    | 'unknown' // well-formed but code not recognized; may be framable by size
    | 'invalid'; // cannot be framed

/** A single CESR primitive (key, digest, signature, sequence number, …). */
export interface Primitive {
    kind: 'primitive';
    code: string;
    /** Which code table framed it — disambiguates `code`, since the Matter and
     * Indexer tables collide (e.g. 'A' is a seed as Matter, an Ed25519 indexed
     * signature as Indexer). */
    class: 'matter' | 'indexer';
    span: ByteSpan;
}

/** A counter-framed attachment group (e.g. controller sigs `-A`, quadlets `-V`). */
export interface AttachmentGroup {
    kind: 'group';
    code: string;
    count: number;
    /** CESR genus major (1 or 2). The same code denotes different groups by
     * genus (e.g. v1 -C is NonTransReceiptCouples, v2 -C is the AttachmentGroup
     * wrapper), so a consumer must know the genus to interpret `code`. */
    genus: number;
    span: ByteSpan;
    state: NodeState;
    /** Typed children; empty for opaque quadlet frames and unknown codes. */
    items: AttachmentNode[];
}

/** A node in the attachment tree. */
export type AttachmentNode = AttachmentGroup | Primitive;

/** A parsed message (KEL/TEL event or ACDC) with its attachments. */
export interface CesrMessage {
    proto: string; // e.g. 'KERI', 'ACDC'
    version: string; // e.g. '1.0'
    kind: string; // serialization, e.g. 'JSON'
    ilk: string | null; // the `t` field, null for ACDCs
    /** The sequence number — a hex-encoded integer — from the `s` field of a
     * KERI event, where present. Null under any other protocol: an ACDC also
     * carries an `s` field, but it holds the schema SAID, which is not a
     * sequence number and must not be read as one. Take that from `sad.s`. */
    sn: string | null;
    said: string | null; // the `d` field
    /** The deserialized body, or null when framed but not decoded. */
    sad: Record<string, unknown> | null;
    span: ByteSpan; // the message body bytes (attachments excluded)
    attachments: AttachmentGroup[];
}

/** Decodes a serialized message body (the bytes between the version string and
 * the attachments) into its field map. JSON is built in; other serializations
 * (CBOR/MGPK) are injected via {@link ParseOptions}. */
export type BodyDecoder = (body: Uint8Array) => Record<string, unknown>;

/** Options for {@link parse}. */
export interface ParseOptions {
    /** Body decoders keyed by serialization kind (e.g. 'CBOR', 'MGPK'); JSON is
     * always built in. */
    decoders?: Record<string, BodyDecoder>;
}

/** A stable symbolic code for a framing failure — branch on this, not the prose. */
export type ParseErrorCode =
    | 'no-version-string' // no CESR version string — not a recognizable message
    | 'invalid-version-size' // a size too small to contain the version string itself
    | 'malformed-body' // the version size is claimed but the body does not decode
    | 'unparseable-counter' // a '-' counter code that could not be parsed
    | 'unframable-group' // a recognized counter whose group could not be framed
    | 'incomplete'; // the stream ends inside an element — RECOVERABLE, more bytes may complete it

/** A framing failure, with a stable code, the byte position, and its permanence. */
export interface ParseError {
    code: ParseErrorCode;
    message: string;
    span: ByteSpan;
    /** False only for `incomplete`, the one failure more bytes can cure. Every
     * other code is a verdict on bytes that are all present, and the parser is
     * pure, so re-parsing them fails identically. A caller feeding a growing
     * buffer must branch on this: wait, or give up. */
    permanent: boolean;
}

/** The result of parsing a stream: what parsed, what failed, and how far we got. */
export interface ParseResult {
    messages: CesrMessage[];
    errors: ParseError[];
    consumed: number; // bytes contiguously framed from the start
}

/** A CESR version string as a BARE token, e.g. `KERI10JSON00012b_` -> proto
 * KERI, ver 1.0, kind JSON, size 0x12b. Matched WITHOUT the JSON `"v":"..."`
 * framing so it is found inside binary CBOR/MGPK bodies too, where it still
 * appears as ASCII. */
const VERSION_RE = /([A-Z]{4})(\d)(\d)([A-Z]{4})([0-9a-f]{6})_/;

/** A CESR v2 (CESR 2.0) version string as a BARE token, e.g. `KERICAACAAJSONAAD_.`
 * -> proto KERI, protocol version 2.0, CESR genus version 2.0, kind JSON, size
 * 255. Its layout is proto(4) + protocol-major(1) + protocol-minor(2) +
 * genus-major(1) + genus-minor(2) + kind(4) + size(4) + '.' terminator, every
 * field after the proto in base64url. The embedded GENUS version selects the v2
 * counter table. */
const VERSION_RE_2 =
    /([A-Z]{4})([A-Za-z0-9_-])([A-Za-z0-9_-]{2})([A-Za-z0-9_-])([A-Za-z0-9_-]{2})([A-Z]{4})([A-Za-z0-9_-]{4})\./;

/** The CESR base64url alphabet, index = value (A=0 … _=63). */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** Decode a base64url token to its integer value (v2 sizes and counts are
 * base64, not hex). */
function b64ToInt(s: string): number {
    let n = 0;
    for (const c of s) n = n * 64 + B64.indexOf(c);
    return n;
}

/** The built-in JSON body decoder (a language builtin — no dependency). */
const jsonDecoder: BodyDecoder = (body) => JSON.parse(td().decode(body));

interface Version {
    proto: string;
    version: string; // the PROTOCOL version, e.g. '1.0' or '2.0'
    kind: string;
    size: number;
    genus: number; // the CESR GENUS major version (1 or 2) — selects the counter table
    /** The version-string TOKEN's own length; a message cannot be shorter. */
    length: number;
}

/** Parse the version string at `at`, or null if none is present in the leading
 * window. Tries the v2 layout first (its terminator and base64 fields cannot
 * cross-match a v1 string, and vice versa), then falls back to v1. The returned
 * `genus` drives v1-vs-v2 counter framing. */
export function parseVersion(bytes: Uint8Array, at: number): Version | null {
    const window = td().decode(bytes.subarray(at, at + 128));
    const m2 = window.match(VERSION_RE_2);
    if (m2) {
        return {
            proto: m2[1],
            version: `${b64ToInt(m2[2])}.${b64ToInt(m2[3])}`,
            kind: m2[6],
            size: b64ToInt(m2[7]),
            genus: b64ToInt(m2[4]),
            length: m2[0].length,
        };
    }
    const m1 = window.match(VERSION_RE);
    if (!m1) return null;
    return {
        proto: m1[1],
        version: `${m1[2]}.${m1[3]}`,
        kind: m1[4],
        size: parseInt(m1[5], 16),
        genus: 1,
        length: m1[0].length,
    };
}

/** One element of a group item: a primitive (`p` = Matter, `sig` = indexed
 * Indexer) or `grp` = one nested attachment group (e.g. the -A ControllerIdxSigs
 * inside a -F/-H). */
type PrimitivePart = 'p' | 'sig';
type Part = PrimitivePart | 'grp';

interface GroupSpec {
    quadlet?: boolean;
    /** The element sequence of ONE item; repeated `count` times. */
    parts?: Part[];
}

const GROUP_SPEC: Record<string, GroupSpec> = {
    '-V': { quadlet: true }, // AttachedMaterialQuadlets (universal wrapper)
    '-0V': { quadlet: true }, // BigAttachedMaterialQuadlets
    '-L': { quadlet: true }, // PathedMaterialQuadlets
    '-A': { parts: ['sig'] }, // ControllerIdxSigs
    '-B': { parts: ['sig'] }, // WitnessIdxSigs
    '-C': { parts: ['p', 'p'] }, // NonTransReceiptCouples (verfer, cigar)
    '-D': { parts: ['p', 'p', 'p', 'sig'] }, // TransReceiptQuadruples
    '-E': { parts: ['p', 'p'] }, // FirstSeenReplayCouples (seqner, dater)
    '-F': { parts: ['p', 'p', 'p', 'grp'] }, // TransIdxSigGroups (+ nested -A)
    '-G': { parts: ['p', 'p'] }, // SealSourceCouples (seqner, saider)
    '-H': { parts: ['p', 'grp'] }, // TransLastIdxSigGroups (prefixer, nested -A)
    '-I': { parts: ['p', 'p', 'p'] }, // SealSourceTriples (prefixer, seqner, saider)
};

interface FramedGroup {
    group: AttachmentGroup;
    /** Byte offset just past the group (only meaningful when state === 'known'). */
    end: number;
}

/** Why an element could not be framed: `short` = the stream ends inside it, so
 * more bytes would complete it; `bad` = the bytes that ARE present cannot be
 * framed. Nothing but the size tables can tell these apart, which is why sizing
 * is probed before construction. */
type Shortfall = 'short' | 'bad';
/** A framing attempt: the framed node, or why it failed. */
type Attempt<T> = { node: T } | { fail: Shortfall };
const failed = <T>(a: Attempt<T>): a is { fail: Shortfall } => 'fail' in a;

/** The outcome of framing a run of attachment groups over a byte window. */
interface GroupSequence {
    items: AttachmentGroup[];
    end: number; // where framing stopped
    error?: ParseError; // set when framing halted on a group it could not frame
    short?: true; // the window ends inside an element — the caller decides whether that is an error
}

/** The full byte length of the primitive at `at`, read from the Matter/Indexer
 * size tables BEFORE construction. Probing rather than catching is what
 * separates a truncated primitive from a malformed one: the constructor throws
 * for both. */
function probePrimitive(
    bytes: Uint8Array,
    at: number,
    part: PrimitivePart
): Attempt<number> {
    const hards = part === 'sig' ? Indexer.Hards : Matter.Hards;
    const sizes = part === 'sig' ? Indexer.Sizes : Matter.Sizes;
    const avail = bytes.length - at;
    if (avail <= 0) return { fail: 'short' };
    const head = td().decode(bytes.subarray(at, at + 8));
    const hs = hards.get(head[0]);
    if (hs === undefined) return { fail: 'bad' }; // an unrecognized selector is wrong, not short
    if (avail < hs) return { fail: 'short' }; // the hard code itself is cut off
    const sizage = sizes.get(head.slice(0, hs));
    if (!sizage) return { fail: 'bad' };
    // A variable-size code carries no full size — the Sizes tables store that as
    // null, which their own `fs?: number` type does not admit, so this tests the
    // VALUE rather than trusting the type. `fs < 0` alone would let null through
    // (null >= 0 is true) and hand back a null length.
    const fs = sizage.fs;
    if (typeof fs !== 'number' || fs < 0) return { fail: 'bad' }; // variable-size: unsupported
    return avail < fs ? { fail: 'short' } : { node: fs };
}

/** Frame one primitive of the given part kind at `at`, delegating sizing to the
 * Matter/Indexer classes. */
function framePrimitive(
    bytes: Uint8Array,
    at: number,
    part: PrimitivePart
): Attempt<Primitive> {
    const probe = probePrimitive(bytes, at, part);
    if (failed(probe)) return probe;
    const q = td().decode(bytes.subarray(at, at + probe.node));
    try {
        const prim =
            part === 'sig' ? new Indexer({ qb64: q }) : new Matter({ qb64: q });
        const cls = part === 'sig' ? 'indexer' : 'matter';
        return {
            node: {
                kind: 'primitive',
                code: prim.code,
                class: cls,
                span: { start: at, end: at + prim.qb64.length },
            },
        };
    } catch {
        return { fail: 'bad' };
    }
}

/* --- CESR 2.0 (genus 2) counter framing. -------------------------------------
 * signify-ts's Counter carries only the v1 table and SILENTLY MISFRAMES v2 codes
 * (they collide with v1 strings but denote different groups), so v2 counters are
 * framed natively here, from keripy 2.0's CtrDex_2_0. Two facts make v2 framing
 * uniform: every v2 group counts its body in QUADLETS (so it self-frames as
 * count*4 bytes, like the v1 -V wrapper), and a counter always begins with '-'
 * while a primitive never does. */
const V2_GENUS_CODE = '-_AAA'; // genus-version counter (a bodyless declaration)
const V2_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabc'; // the defined CtrDex_2_0 letters
const V2_KNOWN = new Set<string>([V2_GENUS_CODE]);
for (const c of V2_LETTERS) {
    V2_KNOWN.add(`-${c}`); // regular (hard 2, soft 2)
    V2_KNOWN.add(`--${c}`); // big (hard 3, soft 5)
}
/** Codes whose DIRECT bare primitives are indexed signatures (Indexer), not
 * Matter: ControllerIdxSigs / WitnessIdxSigs and their big forms. */
const V2_SIG_CODES = new Set(['-K', '-L', '--K', '--L']);

/** Parse a v2 counter header at `at`: its code (hard) and quadlet count (soft).
 * Both callers guarantee `bytes[at]` is '-' (they test DASH first). The hard/soft
 * split is fixed by the first two chars — `--` big (3/5), `-_` genus (5/3), else
 * regular (2/2) — per keripy's v2 Sizes table. */
function parseV2Counter(
    bytes: Uint8Array,
    at: number
): Attempt<{ code: string; count: number; headerLen: number }> {
    const b = td().decode(bytes.subarray(at, at + 8));
    const [hs, ss] = b[1] === '-' ? [3, 5] : b[1] === '_' ? [5, 3] : [2, 2];
    const code = b.slice(0, hs);
    const soft = b.slice(hs, hs + ss);
    // A header cut off by the end of the stream is short, not malformed; a
    // full-length soft that is not base64 is malformed.
    if (bytes.length - at < hs + ss) return { fail: 'short' };
    // The bytes are there, so a decode that yields fewer CHARS than the header
    // needs means they are not the ASCII a counter header is made of.
    if (soft.length < ss || !/^[A-Za-z0-9_-]+$/.test(soft)) {
        return { fail: 'bad' };
    }
    return { node: { code, count: b64ToInt(soft), headerLen: hs + ss } };
}

/** Frame the enclosed material of a v2 group over [start, limit): a run of nested
 * counters and/or primitives (Indexer when `sigCtx`, else Matter). Stops at the
 * first element it cannot frame within the bound — the enclosing group's size is
 * already known (count*4), so this is a RESILIENCE BOUNDARY: a partial decode
 * never condemns the self-framed wrapper. */
function frameEnclosedV2(
    bytes: Uint8Array,
    start: number,
    limit: number,
    sigCtx: boolean
): AttachmentNode[] {
    const items: AttachmentNode[] = [];
    let p = start;
    while (p < limit) {
        if (bytes[p] === DASH) {
            const nested = frameGroupV2(bytes, p);
            if (failed(nested) || nested.node.end > limit) break;
            items.push(nested.node.group);
            p = nested.node.end;
        } else {
            const prim = framePrimitive(bytes, p, sigCtx ? 'sig' : 'p');
            if (failed(prim) || prim.node.span.end > limit) break;
            items.push(prim.node);
            p = prim.node.span.end;
        }
    }
    return items;
}

/** Frame one v2 (genus 2) attachment group at `at`. Every v2 group self-frames as
 * count*4 bytes, so even an unrecognized code is UNKNOWN-BUT-FRAMED with a known
 * span; only a genus-version counter (`-_…`) is bodyless. */
function frameGroupV2(bytes: Uint8Array, at: number): Attempt<FramedGroup> {
    const hdr = parseV2Counter(bytes, at);
    if (failed(hdr)) return hdr;
    const { code, count, headerLen } = hdr.node;
    const base = { kind: 'group' as const, code, count, genus: 2 };
    if (code[1] === '_') {
        // A genus/version counter declares the CESR genus for the following
        // material; it has no quadlet body.
        const end = at + headerLen;
        const state = code === V2_GENUS_CODE ? 'known' : 'unknown';
        return {
            node: {
                group: { ...base, span: { start: at, end }, state, items: [] },
                end,
            },
        };
    }
    const innerStart = at + headerLen;
    const innerEnd = innerStart + count * 4; // self-framing: count is quadlets
    // Self-framing cuts both ways: a count that runs past the end of the stream
    // means the group is not all here yet, so it is short rather than framed.
    if (innerEnd > bytes.length) return { fail: 'short' };
    if (!V2_KNOWN.has(code)) {
        return {
            node: {
                group: {
                    ...base,
                    span: { start: at, end: innerEnd },
                    state: 'unknown',
                    items: [],
                },
                end: innerEnd,
            },
        };
    }
    const items = frameEnclosedV2(
        bytes,
        innerStart,
        innerEnd,
        V2_SIG_CODES.has(code)
    );
    return {
        node: {
            group: {
                ...base,
                span: { start: at, end: innerEnd },
                state: 'known',
                items,
            },
            end: innerEnd,
        },
    };
}

/** Frame one attachment group at `at`, dispatching by CESR genus: genus 2 uses
 * the native v2 tables above; genus 1 delegates counter sizing to the Counter
 * class. */
function frameGroup(
    bytes: Uint8Array,
    at: number,
    genus: number
): Attempt<FramedGroup> {
    if (genus === 2) return frameGroupV2(bytes, at);
    // A counter header cut off by the end of the stream is short, not
    // unparseable, so the header's own length is checked against the tables
    // before Counter is asked to parse it.
    const avail = bytes.length - at;
    const head = td().decode(bytes.subarray(at, at + 8));
    if (avail < 2) return { fail: 'short' }; // not even the two-character selector is here
    const hs = Counter.Hards.get(head.slice(0, 2));
    if (hs === undefined) return { fail: 'bad' };
    if (avail < hs) return { fail: 'short' };
    const sizage = Counter.Sizes.get(head.slice(0, hs));
    if (!sizage) return { fail: 'bad' };
    if (avail < sizage.hs + sizage.ss) return { fail: 'short' };
    let counter: Counter;
    try {
        counter = new Counter({ qb64: head });
    } catch {
        return { fail: 'bad' };
    }
    const { code, count } = counter;
    const headerLen = counter.qb64.length;
    const base = { kind: 'group' as const, code, count, genus: 1 };
    const spec = GROUP_SPEC[code];

    if (!spec) {
        // A recognized counter (e.g. -J/-K SadPathSig groups) whose inner framing
        // is not yet modeled: framed structurally as far as its header, marked
        // unknown so the walk stays resilient rather than halting.
        const end = at + headerLen;
        return {
            node: {
                group: {
                    ...base,
                    span: { start: at, end },
                    state: 'unknown',
                    items: [],
                },
                end,
            },
        };
    }

    if (spec.quadlet) {
        // A material-quadlet wrapper self-declares its size as count*4, so it is
        // always framed; only its inner content varies in how (or whether) we
        // decompose it.
        const innerStart = at + headerLen;
        const innerEnd = innerStart + count * 4;
        // ...unless the declared quadlets run past the end of the stream, in
        // which case the wrapper is not all here yet: short, not framed.
        if (innerEnd > bytes.length) return { fail: 'short' };
        if (code === '-L') {
            // -L (PathedMaterialQuadlets) leads with a path primitive, not a
            // plain group run; its inner decomposition is deferred, so the
            // quadlet body stays opaque for now.
            return {
                node: {
                    group: {
                        ...base,
                        span: { start: at, end: innerEnd },
                        state: 'known',
                        items: [],
                    },
                    end: innerEnd,
                },
            };
        }
        // -V / -0V universal wrappers: recurse into a typed nested group
        // sequence. The wrapper's size is self-declaring (count*4), so it is a
        // RESILIENCE BOUNDARY: inner decomposition proceeds as far as it can, an
        // inner limit stops decomposing THIS wrapper without condemning it, and
        // framing resumes at innerEnd — so decomposing a wrapper is never less
        // resilient than leaving it opaque.
        const seq = frameGroupSequence(bytes, innerStart, innerEnd, 1);
        return {
            node: {
                group: {
                    ...base,
                    span: { start: at, end: innerEnd },
                    state: 'known',
                    items: seq.items,
                },
                end: innerEnd,
            },
        };
    }

    // A counted group is NOT self-framing: its length is the sum of its items',
    // so running out of bytes partway through is indistinguishable from a bad
    // item unless the shortfall says which. A shortfall propagates; a bad item
    // leaves the group invalid, as before.
    const parts = spec.parts as Part[];
    const items: AttachmentNode[] = [];
    const invalid = (p: number): Attempt<FramedGroup> => ({
        node: {
            group: {
                ...base,
                span: { start: at, end: p },
                state: 'invalid',
                items,
            },
            end: p,
        },
    });
    let p = at + headerLen;
    for (let k = 0; k < count; k++) {
        for (const part of parts) {
            if (part === 'grp') {
                // A nested attachment group (the -A ControllerIdxSigs inside a
                // -F/-H); frame it recursively and require it fully known, else
                // this item — and so this group — cannot be framed.
                const nested = frameGroup(bytes, p, 1);
                if (failed(nested)) {
                    if (nested.fail === 'short') return nested;
                    return invalid(p);
                }
                if (nested.node.group.state !== 'known') return invalid(p);
                items.push(nested.node.group);
                p = nested.node.end;
            } else {
                const prim = framePrimitive(bytes, p, part);
                if (failed(prim)) {
                    if (prim.fail === 'short') return prim;
                    return invalid(p); // a malformed item — this group cannot be framed
                }
                items.push(prim.node);
                p = prim.node.span.end;
            }
        }
    }
    return {
        node: {
            group: {
                ...base,
                span: { start: at, end: p },
                state: 'known',
                items,
            },
            end: p,
        },
    };
}

/** Frame a run of attachment groups over [start, limit). Stops at `limit`, at
 * the first byte that is not a counter, or at the first group it cannot frame
 * (recording a typed error). Shared by the top-level attachment loop and the
 * -V/-0V wrapper recursion, so both frame identically. */
function frameGroupSequence(
    bytes: Uint8Array,
    start: number,
    limit: number,
    genus: number
): GroupSequence {
    const items: AttachmentGroup[] = [];
    let pos = start;
    while (pos < limit && bytes[pos] === DASH) {
        const framed = frameGroup(bytes, pos, genus);
        if (failed(framed)) {
            // A group the stream ends inside is reported as a shortfall, not an
            // error: only the caller knows whether this window is the live end
            // of the stream (incomplete) or the inside of a sized wrapper,
            // where the wrapper's own bytes are all present.
            if (framed.fail === 'short') {
                return { items, end: pos, short: true };
            }
            return {
                items,
                end: pos,
                error: {
                    code: 'unparseable-counter',
                    message: `The attachment counter at byte ${pos} is not a recognized CESR code.`,
                    span: { start: pos, end: limit },
                    permanent: true,
                },
            };
        }
        // A group that frames past this window belongs to no one: stop, and let
        // the enclosing wrapper's declared size carry the walk forward. At the
        // top level `limit` is the end of the stream, and frameGroup has already
        // reported that case as short.
        if (framed.node.end > limit) break;
        items.push(framed.node.group);
        // Under genus 2 every counter self-frames (count*4), so an UNKNOWN code
        // is framed-and-continued rather than halting; under genus 1 an
        // unframable body halts, since v1 cannot size an unrecognized group.
        if (genus !== 2 && framed.node.group.state !== 'known') {
            return {
                items,
                end: pos,
                error: {
                    code: 'unframable-group',
                    message: `The ${framed.node.group.code} group at byte ${pos} could not be framed.`,
                    span: { start: pos, end: limit },
                    permanent: true,
                },
            };
        }
        pos = framed.node.end;
    }
    return { items, end: pos };
}

/** Parse a CESR stream into a provenance-carrying decomposition. Body decoding
 * is pluggable: JSON is built in, and other serializations (CBOR/MGPK) are
 * decoded only when a decoder for their kind is injected via `opts.decoders`;
 * an undecoded body is framed with sad=null. */
export function parse(bytes: Uint8Array, opts: ParseOptions = {}): ParseResult {
    const decoders: Record<string, BodyDecoder> = {
        JSON: jsonDecoder,
        ...opts.decoders,
    };
    const messages: CesrMessage[] = [];
    const errors: ParseError[] = [];
    const n = bytes.length;
    let i = 0;

    while (i < n) {
        // A message is marked by its version string (near the start in every
        // serialization), not by a leading '{' — CBOR/MGPK bodies begin with a
        // map-header byte.
        const ver = parseVersion(bytes, i);
        if (!ver) {
            errors.push({
                code: 'no-version-string',
                message: `No CESR version string was found at byte ${i}; this is not a recognizable message.`,
                span: { start: i, end: n },
                permanent: true,
            });
            break;
        }
        if (ver.size < ver.length) {
            // A message cannot be shorter than the version string inside it.
            // Rejecting this is also what guarantees the loop ADVANCES:
            // bodyEnd > i on every iteration, so a size of 0 can no longer spin
            // here forever, allocating a message per pass.
            errors.push({
                code: 'invalid-version-size',
                message: `The version string at byte ${i} declares a size of ${ver.size} bytes, too small to contain the version string itself.`,
                span: { start: i, end: n },
                permanent: true,
            });
            break;
        }
        const bodyEnd = i + ver.size;
        if (bodyEnd > n) {
            // The declared size runs past the end of the stream. Note that
            // `subarray` would have CLAMPED silently here, so without this check
            // a truncated message decodes as a whole one.
            errors.push({
                code: 'incomplete',
                message: `The message at byte ${i} declares ${ver.size} bytes but only ${n - i} are present.`,
                span: { start: i, end: n },
                permanent: false,
            });
            break; // `i` is left at the message start, so a caller can append bytes and re-parse
        }
        const decoder = decoders[ver.kind]; // undefined if none for this kind
        let sad: Record<string, unknown> | null = null;
        if (decoder) {
            try {
                sad = decoder(bytes.subarray(i, bodyEnd));
            } catch {
                errors.push({
                    code: 'malformed-body',
                    message: `The message body at byte ${i} is not valid ${ver.kind}.`,
                    span: { start: i, end: bodyEnd },
                    permanent: true,
                });
                break;
            }
        }
        // When no decoder handles this serialization, the body is framed but
        // left undecoded (sad = null).

        const seq = frameGroupSequence(bytes, bodyEnd, n, ver.genus);
        if (seq.short) {
            // The stream ends inside this message's attachments. The message
            // body is whole, but emitting it would double-emit when the caller
            // comes back with the rest, so the whole message waits and
            // `consumed` stays at its first byte.
            errors.push({
                code: 'incomplete',
                message: `The attachments of the message at byte ${i} end mid-element at byte ${n}.`,
                span: { start: i, end: n },
                permanent: false,
            });
            break;
        }
        messages.push({
            proto: ver.proto,
            version: ver.version,
            kind: ver.kind,
            ilk: sad && typeof sad.t === 'string' ? sad.t : null,
            // `s` is the sequence number under KERI and the schema SAID under
            // ACDC — same field name, unrelated meanings — so gate on the proto.
            sn:
                ver.proto === 'KERI' && sad && typeof sad.s === 'string'
                    ? sad.s
                    : null,
            said: sad && typeof sad.d === 'string' ? sad.d : null,
            sad,
            span: { start: i, end: bodyEnd },
            attachments: seq.items,
        });

        i = seq.end;
        if (seq.error) {
            // A top-level group we cannot frame has no enclosing wrapper size to
            // resync from, so the walk halts here (only size-known wrappers are
            // resilience boundaries). A wrong wrapper count*4 also surfaces here,
            // by desynchronising the next message boundary.
            errors.push(seq.error);
            break;
        }
    }

    return { messages, errors, consumed: i };
}
