import { assert, describe, it } from 'vitest';
import {
    parse,
    parseVersion,
    type AttachmentGroup,
    type AttachmentNode,
    type Primitive,
} from '../../src/keri/core/parsing.ts';

/** Narrow an attachment node to a group for nested-item assertions. */
const asGroup = (n: AttachmentNode) => n as AttachmentGroup;
/** Read the Matter/Indexer class off a primitive node. */
const primClass = (n: AttachmentNode) => (n as Primitive).class;

/** Recursive PARTIAL deep-match: every key present in `expected` must match
 * `actual`; keys absent from `expected` are ignored (the equivalent of jest's
 * toMatchObject, expressed with vitest's assert). */
function assertLike(actual: unknown, expected: unknown, path = 'value'): void {
    if (Array.isArray(expected)) {
        assert.ok(Array.isArray(actual), `${path}: expected an array`);
        expected.forEach((e, i) =>
            assertLike((actual as unknown[])[i], e, `${path}[${i}]`)
        );
        return;
    }
    if (expected !== null && typeof expected === 'object') {
        assert.ok(
            actual !== null && typeof actual === 'object',
            `${path}: expected an object`
        );
        for (const k of Object.keys(expected as Record<string, unknown>)) {
            assertLike(
                (actual as Record<string, unknown>)[k],
                (expected as Record<string, unknown>)[k],
                `${path}.${k}`
            );
        }
        return;
    }
    assert.strictEqual(actual, expected, path);
}

// Throwaway primitives from keripy, for the compound trans-sig/receipt groups.
const SAID = 'ELXXiPwoaWOVOTLMOAmg4IKkjFHFs3q2hsL9tHvuuC2D'; // 44-char Blake3 digest (Matter 'E')
const SEQNER = '0A' + 'A'.repeat(22); // 24-char Number/Seqner primitive (sn 0)
const G_GROUP = '-GAB' + SEQNER + SAID; // one -G seal-source-couple = 72 bytes (18 quadlets)
const SIG =
    'AACMeIMNXpYbryJsyq2VCJsFl1trtbhBMUetIKvC9aft4uI_bMFz0YvTNA2w-PAgkzMfXeV8tzeyWVr7SBlkmZoC'; // 88-char indexed Siger
const DAT = '1AAG2020-08-22T17c50c09d988921p00c00'; // 36-char Dater (datetime)
const VER = 'DDVHH3ix0_aawmzCf-IBLdRe2UiFGCxEdXFuiecqyLEy'; // 44-char Verfer (Ed25519 public key)
const CIG =
    '0BCMeIMNXpYbryJsyq2VCJsFl1trtbhBMUetIKvC9aft4uI_bMFz0YvTNA2w-PAgkzMfXeV8tzeyWVr7SBlkmZoC'; // 88-char non-indexed Cigar
const A_GROUP = '-AAB' + SIG; // one -A ControllerIdxSigs group (count 1)

/** Build a self-framed v1 message with a correct version-string size. */
function mkMessage(fields: Record<string, unknown>, proto = 'KERI'): string {
    const enc = new TextEncoder();
    const placeholder = JSON.stringify({
        v: `${proto}10JSON000000_`,
        ...fields,
    });
    const size = enc.encode(placeholder).length;
    return placeholder.replace(
        `${proto}10JSON000000_`,
        `${proto}10JSON${size.toString(16).padStart(6, '0')}_`
    );
}
const bytesOf = (s: string) => new TextEncoder().encode(s);

describe('parseVersion', () => {
    it('reads proto, version, kind and size from a v1 version string', () => {
        const v = parseVersion(bytesOf(mkMessage({ t: 'ixn' })), 0);
        assert.ok(v);
        assert.equal(v.proto, 'KERI');
        assert.equal(v.version, '1.0');
        assert.equal(v.kind, 'JSON');
        assert.equal(typeof v.size, 'number');
    });

    it('returns null when there is no version string', () => {
        assert.equal(parseVersion(bytesOf('{"x":1}'), 0), null);
    });
});

describe('parse — -V/-0V inner decomposition', () => {
    const attach = (payload: string) =>
        bytesOf(mkMessage({ t: 'ixn' }) + payload);

    it('decomposes a -V wrapper into its typed inner group and primitives', () => {
        const stream = attach('-VAS' + G_GROUP); // 72 inner bytes = 18 quadlets
        const { messages, errors, consumed } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assert.equal(consumed, stream.length);
        const v = messages[0].attachments[0];
        assertLike(v, {
            kind: 'group',
            code: '-V',
            count: 18,
            state: 'known',
            span: { start: messages[0].span.end, end: stream.length },
            items: [
                {
                    kind: 'group',
                    code: '-G',
                    count: 1,
                    state: 'known',
                    items: [{ kind: 'primitive' }, { kind: 'primitive' }],
                },
            ],
        });
        // the inner group is byte-exact: it begins right after the 4-byte -V header
        assert.deepStrictEqual(asGroup(v.items[0]).span, {
            start: messages[0].span.end + 4,
            end: stream.length,
        });
    });

    it('decomposes a -V wrapper carrying two inner groups', () => {
        const stream = attach('-VAk' + G_GROUP + G_GROUP); // 144 inner bytes = 36 quadlets
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        const v = messages[0].attachments[0];
        assert.equal(v.state, 'known');
        assert.deepStrictEqual(
            v.items.map((it) => asGroup(it).code),
            ['-G', '-G']
        );
    });

    it('decomposes a -0V big wrapper the same way as -V', () => {
        const stream = attach('-0VAAAAS' + G_GROUP); // 8-byte header, 18 quadlets
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        const v = messages[0].attachments[0];
        assertLike(v, { code: '-0V', count: 18, state: 'known' });
        assertLike(asGroup(v.items[0]), { code: '-G', state: 'known' });
    });

    it('recurses nested -V wrappers', () => {
        const inner = '-VAS' + G_GROUP; // 76 bytes = 19 quadlets
        const stream = attach('-VAT' + inner);
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        const outer = messages[0].attachments[0];
        assertLike(outer, { code: '-V', state: 'known' });
        const mid = asGroup(outer.items[0]);
        assertLike(mid, { code: '-V', state: 'known' });
        assert.equal(asGroup(mid.items[0]).code, '-G');
    });

    it('leaves -L (pathed material) opaque, not recursed', () => {
        const stream = attach('-LAB' + 'AAAA'); // count 1 -> 4 opaque bytes
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assertLike(messages[0].attachments[0], {
            code: '-L',
            state: 'known',
            items: [],
        });
    });

    it('treats a -V as a resilience boundary: an unparseable inner counter does not halt the walk', () => {
        const msg2 = mkMessage({ t: 'ixn', s: '2' });
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-VAB' + '-ZAB' + msg2
        ); // -Z unsupported, inside -V
        const { messages, errors, consumed } = parse(stream);
        assert.deepStrictEqual(errors, []); // the wrapper's known size absorbs the undecodable content
        assert.equal(messages.length, 2); // the walk resumes past the wrapper and reaches msg2
        assertLike(messages[0].attachments[0], {
            code: '-V',
            state: 'known',
            items: [],
        });
        assert.equal(consumed, stream.length);
    });

    it('leaves a recognized-but-unmodelled inner counter as an unknown child, without halting', () => {
        const msg2 = mkMessage({ t: 'ixn', s: '2' });
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-VAB' + '-JAB' + msg2
        ); // -J: known counter, unframed
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assert.equal(messages.length, 2);
        const v = messages[0].attachments[0];
        assertLike(v, { code: '-V', state: 'known' });
        assertLike(asGroup(v.items[0]), { code: '-J', state: 'unknown' });
    });

    it('stops decomposing a -V when inner content underfills it, keeping the wrapper and continuing', () => {
        const msg2 = mkMessage({ t: 'ixn', s: '2' });
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-VAT' + G_GROUP + 'AAAA' + msg2
        ); // group + 4 filler
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assert.equal(messages.length, 2);
        const v = messages[0].attachments[0];
        assertLike(v, { code: '-V', state: 'known' });
        assert.equal(asGroup(v.items[0]).code, '-G'); // decoded up to the filler, then stopped
    });
});

describe('parse — compound trans-sig and receipt groups', () => {
    const attach = (payload: string) =>
        bytesOf(mkMessage({ t: 'ixn' }) + payload);

    it('frames a -F TransIdxSigGroups: prefixer, seqner, saider, then a nested -A group', () => {
        const stream = attach('-FAB' + SAID + SEQNER + SAID + A_GROUP);
        const { messages, errors, consumed } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assert.equal(consumed, stream.length);
        const f = messages[0].attachments[0];
        assertLike(f, { code: '-F', count: 1, state: 'known' });
        assert.deepStrictEqual(
            f.items.map((it) => it.kind),
            ['primitive', 'primitive', 'primitive', 'group']
        );
        const nested = asGroup(f.items[3]);
        assertLike(nested, { code: '-A', state: 'known' });
        assert.equal(nested.items.length, 1); // one indexed sig
    });

    it('frames a -H TransLastIdxSigGroups: prefixer, then a nested -A group', () => {
        const stream = attach('-HAB' + SAID + A_GROUP);
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        const h = messages[0].attachments[0];
        assertLike(h, { code: '-H', count: 1, state: 'known' });
        assert.deepStrictEqual(
            h.items.map((it) => it.kind),
            ['primitive', 'group']
        );
        assertLike(asGroup(h.items[1]), { code: '-A', state: 'known' });
    });

    it('frames a -D TransReceiptQuadruples of (prefixer, seqner, saider, siger)', () => {
        const stream = attach('-DAB' + SAID + SEQNER + SAID + SIG);
        const { messages, errors, consumed } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assert.equal(consumed, stream.length);
        const d = messages[0].attachments[0];
        assertLike(d, { code: '-D', count: 1, state: 'known' });
        assert.equal(d.items.length, 4);
        assert.ok(d.items.every((it) => it.kind === 'primitive'));
    });

    it('frames a -E FirstSeenReplayCouples of (seqner, dater)', () => {
        const stream = attach('-EAB' + SEQNER + DAT);
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        const e = messages[0].attachments[0];
        assertLike(e, { code: '-E', count: 1, state: 'known' });
        assert.equal(e.items.length, 2);
    });

    it('frames a -C NonTransReceiptCouples of (verfer, cigar)', () => {
        const stream = attach('-CAB' + VER + CIG);
        const { messages, errors, consumed } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assert.equal(consumed, stream.length);
        const c = messages[0].attachments[0];
        assertLike(c, { code: '-C', count: 1, state: 'known' });
        assert.equal(c.items.length, 2);
    });

    it('marks a -F invalid when its nested -A group is malformed', () => {
        const stream = attach('-FAB' + SAID + SEQNER + SAID + '-AAB' + '####'); // bad sig in nested -A
        const { messages, errors } = parse(stream);
        assertLike(messages[0].attachments[0], {
            code: '-F',
            state: 'invalid',
        });
        assertLike(errors[0], { code: 'unframable-group', permanent: true });
    });
});

describe('parse — primitive class discriminator', () => {
    it('tags a -F group: prefixer/seqner/saider as matter, the nested -A sig as indexer', () => {
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-FAB' + SAID + SEQNER + SAID + A_GROUP
        );
        const f = parse(stream).messages[0].attachments[0];
        assert.deepStrictEqual(f.items.slice(0, 3).map(primClass), [
            'matter',
            'matter',
            'matter',
        ]);
        const nestedA = asGroup(f.items[3]);
        assert.equal(primClass(nestedA.items[0]), 'indexer');
    });

    it('tags a -D quadruple as three matter primitives then an indexer siger', () => {
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-DAB' + SAID + SEQNER + SAID + SIG
        );
        const d = parse(stream).messages[0].attachments[0];
        assert.deepStrictEqual(d.items.map(primClass), [
            'matter',
            'matter',
            'matter',
            'indexer',
        ]);
    });

    it('tags a -A controller-sig child as indexer', () => {
        const stream = bytesOf(mkMessage({ t: 'ixn' }) + A_GROUP);
        const a = parse(stream).messages[0].attachments[0];
        assert.equal(primClass(a.items[0]), 'indexer');
    });
});

describe('parse — synthetic structure', () => {
    it('frames a message with no attachments', () => {
        const { messages, errors, consumed } = parse(
            bytesOf(mkMessage({ t: 'ixn', s: '1', d: 'E_' }))
        );
        assert.deepStrictEqual(errors, []);
        assert.equal(messages.length, 1);
        assert.deepStrictEqual(messages[0].attachments, []);
        assert.equal(consumed, messages[0].span.end);
    });

    it('frames an -I seal-source-triple group into typed (i, s, d) primitives', () => {
        const iGroup = '-IAB' + SAID + SEQNER + SAID; // count 1: prefixer, seqner, saider
        const stream = bytesOf(mkMessage({ t: 'ixn' }) + iGroup);
        const { messages, errors, consumed } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assert.equal(consumed, stream.length);
        const group = messages[0].attachments[0];
        assertLike(group, {
            kind: 'group',
            code: '-I',
            count: 1,
            state: 'known',
        });
        assert.deepStrictEqual(
            group.items.map((it) => ({
                code: (it as Primitive).code,
                class: primClass(it),
            })),
            [
                { code: 'E', class: 'matter' },
                { code: '0A', class: 'matter' },
                { code: 'E', class: 'matter' },
            ]
        );
    });

    it('frames a -G seal-source-couple group into (s, d) primitives', () => {
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-GAB' + SEQNER + SAID
        );
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(errors, []);
        assertLike(messages[0].attachments[0], {
            code: '-G',
            count: 1,
            state: 'known',
        });
        assert.equal(messages[0].attachments[0].items.length, 2);
    });

    it('nulls ilk, sn and said when the fields are absent (e.g. an ACDC)', () => {
        const { messages } = parse(
            bytesOf(mkMessage({ i: 'E_holder' }, 'ACDC'))
        );
        assertLike(messages[0], {
            ilk: null,
            sn: null,
            said: null,
            proto: 'ACDC',
        });
    });
});

describe('parse — resilience', () => {
    it('errors and stops when the stream has no version string at its start', () => {
        const { messages, errors, consumed } = parse(bytesOf('garbage'));
        assert.deepStrictEqual(messages, []);
        assert.equal(consumed, 0);
        assertLike(errors[0], { code: 'no-version-string', permanent: true });
    });

    it('errors when a { has no version string', () => {
        const { errors } = parse(bytesOf('{"x":1}'));
        assertLike(errors[0], { code: 'no-version-string', permanent: true });
    });

    it('errors on a malformed message body', () => {
        // version claims 32 bytes but the body is not valid JSON
        const stream = bytesOf('{"v":"KERI10JSON000020_"XXXXXXXX');
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(messages, []);
        assertLike(errors[0], { code: 'malformed-body', permanent: true });
    });

    it('keeps the message but marks an unrecognized (unframable) counter and stops', () => {
        const stream = bytesOf(mkMessage({ t: 'ixn' }) + '-JAB'); // -J: a known code we do not yet frame
        const { messages, errors, consumed } = parse(stream);
        assert.equal(messages.length, 1);
        assertLike(messages[0].attachments[0], {
            code: '-J',
            state: 'unknown',
        });
        assertLike(errors[0], { code: 'unframable-group', permanent: true });
        assert.ok(consumed < stream.length);
    });

    it('reports an unparseable counter code', () => {
        const stream = bytesOf(mkMessage({ t: 'ixn' }) + '-ZAB'); // -Z: unsupported code
        const { errors } = parse(stream);
        assertLike(errors[0], { code: 'unparseable-counter', permanent: true });
    });

    it('marks an indexed-sig group invalid when an item is malformed', () => {
        const stream = bytesOf(mkMessage({ t: 'ixn' }) + '-AAB' + '####'); // count 1, garbage item
        const { messages, errors } = parse(stream);
        assertLike(messages[0].attachments[0], {
            code: '-A',
            state: 'invalid',
        });
        assertLike(errors[0], { code: 'unframable-group', permanent: true });
    });

    it('marks a primitive group invalid when a primitive item is malformed', () => {
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-IAB' + SAID + '####'
        ); // 2nd part unparseable
        const { messages, errors } = parse(stream);
        const group = messages[0].attachments[0];
        assertLike(group, { code: '-I', state: 'invalid' });
        assert.equal(group.items.length, 1); // only the first primitive framed
        assertLike(errors[0], { code: 'unframable-group', permanent: true });
    });

    it('marks a group invalid when a primitive is the right SIZE but the wrong bytes', () => {
        // A well-formed 44-char Matter 'E' digest by the size tables, so it passes
        // the shortage probe and fails inside the constructor on non-zero prepad
        // bits: the probe's blind spot is sizing says yes, decoding says no.
        const badDigest = 'E' + 'Q' + 'A'.repeat(42);
        const stream = bytesOf(mkMessage({ t: 'ixn' }) + '-IAB' + badDigest);
        const { messages, errors } = parse(stream);
        assertLike(messages[0].attachments[0], {
            code: '-I',
            state: 'invalid',
        });
        assertLike(errors[0], { code: 'unframable-group', permanent: true });
    });

    it('reports a counter whose bytes are present but are not ASCII', () => {
        // 5 BYTES ('-A' + a 3-byte '€') but only 3 CHARS, so the byte-length check
        // passes and Counter still cannot read a 4-char header. Bad, not short.
        const { errors } = parse(bytesOf(mkMessage({ t: 'ixn' }) + '-A€'));
        assertLike(errors[0], {
            code: 'unparseable-counter',
            permanent: true,
        });
    });

    it('marks a compound group invalid when its NESTED group is malformed', () => {
        // -F is prefixer, seqner, saider, then a nested -A; '####' is no counter
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-FAB' + SAID + SEQNER + SAID + '####'
        );
        const { messages, errors } = parse(stream);
        assertLike(messages[0].attachments[0], {
            code: '-F',
            state: 'invalid',
        });
        assertLike(errors[0], { code: 'unframable-group', permanent: true });
    });

    it('separates a primitive that is cut off from one whose code is unusable', () => {
        const at = mkMessage({ t: 'ixn' }) + '-IAB' + SAID + SEQNER; // -I wants a 3rd
        // '0' selects a 2-char hard code and one byte is left: short, so the walk waits
        assertLike(parse(bytesOf(at + '0')).errors[0], {
            code: 'incomplete',
            permanent: false,
        });
        // '0Z' is a well-formed selector whose 2-char code is in no size table: bad
        assertLike(parse(bytesOf(at + '0Z' + 'A'.repeat(22))).errors[0], {
            code: 'unframable-group',
            permanent: true,
        });
        // '4A' IS in the table, as a variable-size code with no full size: also bad
        assertLike(parse(bytesOf(at + '4A' + 'A'.repeat(22))).errors[0], {
            code: 'unframable-group',
            permanent: true,
        });
    });

    it('reports a big counter whose 3-character hard code is cut off as incomplete', () => {
        // '-0' selects a 3-char hard code (-0V and friends) and 2 bytes are here
        const { errors } = parse(bytesOf(mkMessage({ t: 'ixn' }) + '-0'));
        assertLike(errors[0], { code: 'incomplete', permanent: false });
    });

    it('keeps a -V known when an inner group is wholly present but OVERFLOWS the wrapper', () => {
        // -V claims 1 quadlet (4 bytes) and encloses a 72-byte -G that is entirely
        // in the stream: not short — it simply belongs to no one — so decomposition
        // stops and the wrapper stands.
        const stream = bytesOf(mkMessage({ t: 'ixn' }) + '-VAB' + G_GROUP);
        const { messages, errors } = parse(stream);
        const v = messages[0].attachments[0];
        assertLike(v, { code: '-V', state: 'known', items: [] });
        assert.equal(v.span.end, v.span.start + 8); // header(4) + count*4(4)
        assert.deepStrictEqual(
            errors.filter((e) => e.code === 'incomplete'),
            []
        );
    });
});

describe('parse — truncation is incomplete, not complete and not condemned', () => {
    it('does not frame a body whose declared size runs past the end of the stream', () => {
        // 25 bytes claiming 0x100000: subarray clamps silently and the clamped
        // slice is valid JSON, so this framed as one COMPLETE message.
        const stream = bytesOf('{"v":"KERI10JSON100000_"}');
        const { messages, errors, consumed } = parse(stream);
        assert.deepStrictEqual(messages, []);
        assertLike(errors[0], { code: 'incomplete', permanent: false });
        assert.equal(consumed, 0); // the caller resumes here once more bytes arrive
    });

    it('does not frame a truncated body that is not accidentally valid JSON either', () => {
        const stream = bytesOf('{"v":"KERI10JSON0000f0_","t":"icp"}'); // claims 240, has 35
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(messages, []);
        // NOT malformed-body: the bytes present are fine, there are just too few
        assertLike(errors[0], { code: 'incomplete', permanent: false });
    });

    it('rejects a size too small to hold the version string, rather than looping forever', () => {
        // Size 0 with a serialization that has no decoder: bodyEnd === i, no
        // counter follows, so the cursor never advanced and the loop allocated a
        // message per pass until the heap died.
        const stream = bytesOf('{"v":"KERI10XXXX000000_"}');
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(messages, []);
        assertLike(errors[0], {
            code: 'invalid-version-size',
            permanent: true,
        });
    });

    it('reports a truncated self-framing wrapper as incomplete, not as a framed one', () => {
        // -V claims 19 quadlets (76 bytes) and only 30 are present
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-VAS' + G_GROUP.slice(0, 30)
        );
        const { messages, errors, consumed } = parse(stream);
        assert.deepStrictEqual(messages, []);
        assertLike(errors[0], { code: 'incomplete', permanent: false });
        assert.equal(consumed, 0);
    });

    it('reports a counted group cut off mid-item as incomplete, not unframable', () => {
        // -A count 1 with 40 of the signature's 88 bytes: absent, not wrong
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-AAB' + SIG.slice(0, 40)
        );
        const { errors } = parse(stream);
        assertLike(errors[0], { code: 'incomplete', permanent: false });
    });

    it('reports a counted group short of its own count as incomplete', () => {
        // -A says 2 signatures; one is present
        const stream = bytesOf(mkMessage({ t: 'ixn' }) + '-AAC' + SIG);
        const { errors } = parse(stream);
        assertLike(errors[0], { code: 'incomplete', permanent: false });
    });

    it('reports a compound group whose NESTED group is cut off as incomplete', () => {
        // the same shape as the malformed-nested case above, but the nested counter
        // runs out of bytes rather than being wrong: the shortfall propagates out
        // through the compound group instead of condemning it
        const stream = bytesOf(
            mkMessage({ t: 'ixn' }) + '-FAB' + SAID + SEQNER + SAID + '-A'
        );
        const { messages, errors } = parse(stream);
        assert.deepStrictEqual(messages, []);
        assertLike(errors[0], { code: 'incomplete', permanent: false });
    });

    it('resumes exactly where consumed left off when the missing bytes arrive', () => {
        const whole = bytesOf(mkMessage({ t: 'ixn' }) + A_GROUP);
        const first = parse(whole.slice(0, whole.length - 20));
        assertLike(first.errors[0], { code: 'incomplete', permanent: false });
        assert.equal(first.messages.length, 0);
        // the contract: keep from `consumed`, append the rest, parse again —
        // nothing is emitted twice
        const second = parse(whole.slice(first.consumed));
        assert.deepStrictEqual(second.errors, []);
        assert.equal(second.messages.length, 1);
        assert.equal(second.consumed, whole.length - first.consumed);
    });
});

describe('parse — truncation sweep: every vector cut at every byte', () => {
    // The class of bug, not the one example, is what went undetected: a truncated
    // body, a truncated wrapper and a size-0 loop were three faces of one missing
    // bounds check. This sweeps the whole class — every prefix of every vector
    // must terminate, never throw, and never claim bytes the caller did not pass.
    const msg = mkMessage({ t: 'ixn' });
    const VECTORS: Record<string, string> = {
        'bare message': msg,
        'two messages': msg + mkMessage({ t: 'rot' }),
        'controller sigs': msg + A_GROUP,
        '-V wrapper': msg + '-VAS' + G_GROUP,
        'nested -V wrappers': msg + '-VAT' + '-VAS' + G_GROUP,
        '-F with a nested -A': msg + '-FAB' + SAID + SEQNER + SAID + A_GROUP,
        'receipt couple': msg + '-CAB' + VER + CIG,
        'replay couple': msg + '-EAB' + SEQNER + DAT,
        'message then attachments then message':
            msg + A_GROUP + mkMessage({ t: 'rot' }) + A_GROUP,
    };

    /** Every node in an attachment forest, groups and primitives alike. */
    const nodesOf = (n: AttachmentNode): AttachmentNode[] =>
        n.kind === 'group' ? [n, ...n.items.flatMap(nodesOf)] : [n];

    for (const [name, text] of Object.entries(VECTORS)) {
        it(`holds its invariants for every prefix of the ${name} vector`, () => {
            const whole = bytesOf(text);
            for (let cut = 1; cut <= whole.length; cut++) {
                const prefix = whole.slice(0, cut);
                // must not throw, and must terminate
                const { messages, errors, consumed } = parse(prefix);
                assert.ok(consumed <= cut, `consumed ${consumed} > ${cut}`);
                for (const m of messages) {
                    assert.ok(m.span.end <= cut, `message span past ${cut}`);
                    for (const node of m.attachments.flatMap(nodesOf)) {
                        assert.ok(
                            node.span.end <= cut,
                            `${node.kind} span past ${cut}`
                        );
                    }
                }
                // A prefix of a VALID stream can fail only by running out, so
                // every error is `incomplete` — except where the cut lands inside
                // a version string, which is still reported as no-version-string.
                // That one remaining corner is pinned here rather than waved at:
                // it may happen ONLY with the token's own span left in the buffer.
                for (const e of errors) {
                    if (e.code === 'no-version-string') {
                        assert.ok(
                            cut - e.span.start < 32,
                            `no-version-string with ${cut - e.span.start} bytes left`
                        );
                    } else {
                        assertLike(e, {
                            code: 'incomplete',
                            permanent: false,
                        });
                    }
                }
            }
        });
    }

    it('parses each vector whole with no incomplete error', () => {
        for (const text of Object.values(VECTORS)) {
            const { errors, consumed } = parse(bytesOf(text));
            assert.deepStrictEqual(
                errors.filter((e) => e.code === 'incomplete'),
                []
            );
            assert.equal(consumed, bytesOf(text).length);
        }
    });
});
