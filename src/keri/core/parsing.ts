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
    | 'malformed-body' // the version size is claimed but the body does not decode
    | 'unparseable-counter' // a '-' counter code that could not be parsed
    | 'unframable-group'; // a recognized counter whose group could not be framed

/** A framing failure, with a stable code, the byte position, and its permanence. */
export interface ParseError {
    code: ParseErrorCode;
    message: string;
    span: ByteSpan;
    /** The parser is pure and deterministic — the same bytes always fail the
     * same way. */
    permanent: true;
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

/** The outcome of framing a run of attachment groups over a byte window. */
interface GroupSequence {
    items: AttachmentGroup[];
    end: number; // where framing stopped
    error?: ParseError; // set when framing halted on a group it could not frame
}

/** Frame one primitive of the given part kind at `at`, delegating sizing to the
 * Matter/Indexer classes. */
function framePrimitive(
    bytes: Uint8Array,
    at: number,
    part: PrimitivePart
): Primitive | null {
    const q = td().decode(bytes.subarray(at, at + 128));
    try {
        const prim =
            part === 'sig' ? new Indexer({ qb64: q }) : new Matter({ qb64: q });
        const cls = part === 'sig' ? 'indexer' : 'matter';
        return {
            kind: 'primitive',
            code: prim.code,
            class: cls,
            span: { start: at, end: at + prim.qb64.length },
        };
    } catch {
        return null;
    }
}

/** Frame one attachment group at `at`. Returns null if the counter itself is
 * unparseable. */
function frameGroup(bytes: Uint8Array, at: number): FramedGroup | null {
    let counter: Counter;
    try {
        counter = new Counter({
            qb64: td().decode(bytes.subarray(at, at + 8)),
        });
    } catch {
        return null;
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
            group: {
                ...base,
                span: { start: at, end },
                state: 'unknown',
                items: [],
            },
            end,
        };
    }

    if (spec.quadlet) {
        // A material-quadlet wrapper self-declares its size as count*4, so it is
        // always framed; only its inner content varies in how (or whether) we
        // decompose it.
        const innerStart = at + headerLen;
        const innerEnd = innerStart + count * 4;
        if (code === '-L') {
            // -L (PathedMaterialQuadlets) leads with a path primitive, not a
            // plain group run; its inner decomposition is deferred, so the
            // quadlet body stays opaque for now.
            return {
                group: {
                    ...base,
                    span: { start: at, end: innerEnd },
                    state: 'known',
                    items: [],
                },
                end: innerEnd,
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
            group: {
                ...base,
                span: { start: at, end: innerEnd },
                state: 'known',
                items: seq.items,
            },
            end: innerEnd,
        };
    }

    const parts = spec.parts as Part[];
    const items: AttachmentNode[] = [];
    let p = at + headerLen;
    for (let k = 0; k < count; k++) {
        for (const part of parts) {
            if (part === 'grp') {
                // A nested attachment group (the -A ControllerIdxSigs inside a
                // -F/-H); frame it recursively and require it fully known, else
                // this item — and so this group — cannot be framed.
                const nested = frameGroup(bytes, p);
                if (!nested || nested.group.state !== 'known') {
                    return {
                        group: {
                            ...base,
                            span: { start: at, end: p },
                            state: 'invalid',
                            items,
                        },
                        end: p,
                    };
                }
                items.push(nested.group);
                p = nested.end;
            } else {
                const prim = framePrimitive(bytes, p, part);
                if (!prim) {
                    // A malformed item — we can no longer frame this group.
                    return {
                        group: {
                            ...base,
                            span: { start: at, end: p },
                            state: 'invalid',
                            items,
                        },
                        end: p,
                    };
                }
                items.push(prim);
                p = prim.span.end;
            }
        }
    }
    return {
        group: {
            ...base,
            span: { start: at, end: p },
            state: 'known',
            items,
        },
        end: p,
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
        if (!framed) {
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
        items.push(framed.group);
        if (framed.group.state !== 'known') {
            return {
                items,
                end: pos,
                error: {
                    code: 'unframable-group',
                    message: `The ${framed.group.code} group at byte ${pos} could not be framed.`,
                    span: { start: pos, end: limit },
                    permanent: true,
                },
            };
        }
        pos = framed.end;
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
        const bodyEnd = i + ver.size;
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
