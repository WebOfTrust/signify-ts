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
    sn: string | null; // the `s` field (hex sequence number), where present
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

/** The built-in JSON body decoder (a language builtin — no dependency). */
const jsonDecoder: BodyDecoder = (body) => JSON.parse(td().decode(body));

interface Version {
    proto: string;
    version: string;
    kind: string;
    size: number;
    /** The version-string TOKEN's own length; a message cannot be shorter. */
    length: number;
}

/** Parse the version string at `at`, or null if none is present in the leading
 * window. */
export function parseVersion(bytes: Uint8Array, at: number): Version | null {
    const window = td().decode(bytes.subarray(at, at + 128));
    const m = window.match(VERSION_RE);
    if (!m) return null;
    return {
        proto: m[1],
        version: `${m[2]}.${m[3]}`,
        kind: m[4],
        size: parseInt(m[5], 16),
        length: m[0].length,
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
    const fs = sizage.fs;
    if (fs === undefined || fs < 0) return { fail: 'bad' }; // variable-size codes are unsupported
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

/** Frame one attachment group at `at`. */
function frameGroup(bytes: Uint8Array, at: number): Attempt<FramedGroup> {
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
    const base = { kind: 'group' as const, code, count };
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
        const seq = frameGroupSequence(bytes, innerStart, innerEnd);
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
                const nested = frameGroup(bytes, p);
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
    limit: number
): GroupSequence {
    const items: AttachmentGroup[] = [];
    let pos = start;
    while (pos < limit && bytes[pos] === DASH) {
        const framed = frameGroup(bytes, pos);
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
        if (framed.node.group.state !== 'known') {
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

        const seq = frameGroupSequence(bytes, bodyEnd, n);
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
            sn: sad && typeof sad.s === 'string' ? sad.s : null,
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
