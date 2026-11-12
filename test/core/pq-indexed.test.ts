import { assert, describe, it } from 'vitest';
import {
    IdrDex,
    IdxBthSigDex,
    IdxCrtSigDex,
    IdxSigDex,
    Indexer,
} from '../../src/keri/core/indexer.ts';
import { Matter } from '../../src/keri/core/matter.ts';
import { parse, type Primitive } from '../../src/keri/core/parsing.ts';

/* Indexed post-quantum signature codes, following
 * trustoverip/kswg-cesr-specification #186.
 *
 * #186 adds eight-character indexed codes with three-character index and
 * ondex for every ML-DSA and SLH-DSA signature. The raw size mod 3 picks the
 * selector: 3 for no lead bytes, 8 for one, 9 for two. Each scheme has a
 * dual-indexed code and a current-only code, as Ed448's 3A and 3B do. */

const bytesOf = (s: string) => new TextEncoder().encode(s);

/** Every indexed post-quantum code: its name in IdrDex, full size, lead size,
 * and the signature size FIPS 204 or FIPS 205 gives for its parameter set. */
const PQX: Array<[string, string, number, number, number]> = [
    ['3C', 'ML_DSA_65_Big_Sig', 4420, 0, 3309],
    ['3D', 'ML_DSA_65_Big_Crt_Sig', 4420, 0, 3309],
    ['3E', 'SLH_DSA_SHA2_192s_Big_Sig', 21640, 0, 16224],
    ['3F', 'SLH_DSA_SHA2_192s_Big_Crt_Sig', 21640, 0, 16224],
    ['3G', 'SLH_DSA_SHAKE_192s_Big_Sig', 21640, 0, 16224],
    ['3H', 'SLH_DSA_SHAKE_192s_Big_Crt_Sig', 21640, 0, 16224],
    ['8A', 'ML_DSA_44_Big_Sig', 3236, 1, 2420],
    ['8B', 'ML_DSA_44_Big_Crt_Sig', 3236, 1, 2420],
    ['8C', 'SLH_DSA_SHA2_128s_Big_Sig', 10484, 1, 7856],
    ['8D', 'SLH_DSA_SHA2_128s_Big_Crt_Sig', 10484, 1, 7856],
    ['8E', 'SLH_DSA_SHAKE_128s_Big_Sig', 10484, 1, 7856],
    ['8F', 'SLH_DSA_SHAKE_128s_Big_Crt_Sig', 10484, 1, 7856],
    ['8G', 'SLH_DSA_SHA2_256s_Big_Sig', 39732, 1, 29792],
    ['8H', 'SLH_DSA_SHA2_256s_Big_Crt_Sig', 39732, 1, 29792],
    ['8I', 'SLH_DSA_SHAKE_256s_Big_Sig', 39732, 1, 29792],
    ['8J', 'SLH_DSA_SHAKE_256s_Big_Crt_Sig', 39732, 1, 29792],
    ['9A', 'ML_DSA_87_Big_Sig', 6180, 2, 4627],
    ['9B', 'ML_DSA_87_Big_Crt_Sig', 6180, 2, 4627],
];

const isCurrentOnly = (name: string) => name.includes('_Crt_');

/** A self-addressing inception whose one signing key is an ML-DSA-44 public
 * key (3AAA), followed by a -A controller signature group holding that key's
 * 8A indexed signature at index 0. The keypair is real and the signature is
 * over the event's exact bytes, generated with @noble/post-quantum 0.7.1's
 * ml_dsa44, so it verifies; signify-ts ships no ML-DSA implementation and
 * cannot check that here, but it can frame it. The prefix is a digest of the
 * event rather than of the key, since no post-quantum key code may be a basic
 * prefix. */
const MLDSA_ICP =
    '{"v":"KERI10JSON0007ad_","t":"icp","d":"ENu8rbtEWGV2gEbf2AJ_4ZT-GzFDEQSSUwOnfd7LN-Cy","i":"ENu8rbtEWGV2gEbf2AJ_4ZT-GzFDEQSSUwOnfd7LN-Cy","s":"0","kt":"1","k":["3AAAAAAQmJUN5rJ0uAAheTMKRPKkxwkm92LQMyhdYpRRVZXuulZ01aGAPV2Otm5uCQZPOQvO3poZfP_95VlZ_dLRHzaJDXSXb70RA_qyUbW1IRZc2TpPdW9POL6zYt2jXOkeywCt-Gy3KWrh4nJgoVcAa8y913H3uHcCQbB3pABX5Pi5lE9VD1gjKhcDVgkle0u0dEfIuNOvxEObYLGgDDW1JB1Q64lf5g6ZRJ5_dmN8NyoTEisNHUOH4sUOXYE298ZpIbA4OILfxSCV3fhj5orvc-3lkIV2sC-u8lnjODTLijvaAWUANa0L6O2u6biZRmC41jvdqTXbU4IOmSDuiMpg0uqRFSkGT9RIX6XRJ7ynFaWlvfKK57uTG1lIv9wBli9gKeU-EF9YNZ3HBHPO0kBjaDpzKWURcMkklOXM84yNELMDXUPscdLlUWUlk9ZlfHpxu7xbWWTNnQUrtQ2vd1IRBDSXoapEMnYQppxzuMgW0JiU3be_HwnBw7E2MoarMMhZxQ8EX3s5eWAfAd7VCkkCh50Ef3T7X8PnIj5rlA8AS9QPcH0XOuf8pjSPCkIfT-b1-aQ6aomjz3kePtCKhfkfuP4g6Kct-4LxqOqlz5jOnkIDWe-tQGBkkVsYG_P21WTNfK33cITVF1kiBDjd7CnnW0AzfPznyNvo3NDSFLh0rAK3kqRZry884DyU1ubzop25G_Up3FKUpUJvOBVsReieHVoeix7l1X4XgNP9sdhgAu31LOYZ7PDI2nSlA9xsqgaloZF0VA5LiLmVSBa8P10A0C8YnM8pxVzbz7fJyKhXFaZhUDrqh7smCoKDwFBBFx5ChK1o89_RFLSKcjwolrFAnyZUG_0Ui6L2Y3mKFSj1NS0iN_iqdImR9k1Dao0I-xv03rLMxxmWA0whSg_UTwnOlbM9Honm8WayIIjdLef2_4QG8U15qjuedNXK3_rLxfshrINb6FcY9Ts_9VaNgOYM9HaI_xCS3_lhMjn6aWdP7M66SNFPmQbIJviZvZoitkGoszIlynMHmcaz6E9DTdbAwpx3Tfiv6pM0WPwdOxnM3uAc6Pf1TEnYln0iQZwrJXY0k_tBcJICmP9vYbn3swKr8RgJnrdAAVQS-zsprUJPFaUZVv0kylENCtQQyMO4ehy_QX4toCn6nhgwwY06bIqJpAOFtrEaiIdsH1SD-Rq_aJOjYI021Qeeeab6J6HUT3tGFkweRxG7u1JoTzyIX4uLd7Z7kFoCUi3y3KT4lNDj3Azp-lovTGHtRB3KfnHGw19Dbw7lppoRv-Bfiu9_SB_zfWScoDeil0ymex8RzgB0UCeJmZL91dA0C22ymAJIZADAdCo0GrVyI9IGMVMLZEXwgKgSbcOAa6jqAFwgkWJ1xxgtE-WMzQpqFx0zLkbKpVXCpF8d6K0F5WZPtwPbIhM-IwJkM8ACzITneu34hncHw4vphQTu76qcC19LUzBayTX5FjnBmoBKN4sW5uPvDJDpDpge1CWWuTUN8dJiJ1Jpy3MR127flm5avcHP_abyCMS1i_UIErVXfHM1Ecohhbq1TcoXD4yUhU1V4dsHyv5t0p7rfpjtA5WLcitD-J_KHzpFK_v9BOHoDjz_QMxlOaHEyxfPz9mQ5eZpODfPJEV9MKLQNSTKaiDIy0UsfskNK8l7oH_dCxHay-iERaTGt4jprWP4BKt5DcJBSdWnUQlbohCFPbb1dcL8vnEYoPeCGkyWZ_xPns7KCecmdVrqGOirwar3"],"nt":"0","n":[],"bt":"0","b":[],"c":[],"a":[]}-AAB8AAAAAAAAHDaY2MrJj1yKqlBu8VLb4YCzHmwzUCHuSuynAUK3PlgGPZK22Se8-NWg1ouwdCFehB_YKj7xxRz2TSJzjT57dNOMVtXg_stYgU5qHXJM3eN2DgV7GDBSaKJiSQ8xjoG4S1wdjC4fVsBVUKBDgOFSPp9hsEVKgSZlI9Wxiu2AGgPfFbU2LYEFKHVj7Oin3sMtJBCqhW9L1MwctAa1S4r2Ptan24RWWf1p-BF4GSafSwe4Y4MCG7rNSnl4bRrVvjRQ0iYVMV_D5f0ULUaBjWBv_wwdzXjoO5y8RcgtEOQlPm3K6FnyLj6uBKTMZWy5kqBjObF5is3ilp2lJ1v4M6mKWxuyhOjHsTz2xwi4ncJJiVFq8LUYVHRQcztMt-JgEUnqqO7JaCpn85W1YP-7vRWaLX74Vo0W9BKFlR9Klqu47HprJXXQY28qqaGGSPB6dECx1AbZpUwoN_ySTcWPCaifx3H90T3zg24-qeotxDW90gft0U8v541l2rSt17aQzbg3ar2owJZJ1dJYyKnFJ0wAjn_eb4G0t_kZE1OoQrHosrGw7Pi0j7cuK0URYNvomGQ1c_tpZz6If-HHVTwe43HxZ-p0ZyAY8lmaj1pqdGvLgantR1gm75i13RdECkJharbuSfdZD4irUs2zGG1soSvJI8CYeszCwLd4bdiPnW84n9cRypUdBuZ-o15Vq_u6dJyZ7GFPaFjTvfKI_DdzSnjnCYx4ONpLucnnZZQ06Vm83RCaxCJxy_8jhvaVVXGvRGGZoYzxnmZDXP23JknwXL6tBERW3UYA_73DUYMiWtTzhF9yiCIs2SyqiYoZgOQG-77nnt_HlfRd-lzaTaSUsBfSDmQheYMwplfcP_cS1iazgJ9HJbV_k8ZmWg_XmAqy4aU3mu4MDCh25bGJuUII1x_GJoRieTd6_rgagaZfdJmwRZ_EUWWWQPLZ0uYykKdI9y9Ng1IY2B32RYiqGS0sciTV09XYsdoHcUCklSKzbsXFNO68G6S8QsgDi0_uCoI92qrmC32p456uP7eJ_VgFVkxgUE6dInK3jUa8aGMn0zoYTQzeFLqYLPqpR31VOPnZnBWBnFB1Nu_nSQXltKRviIwtebbLFhX-bXi2sQOXnfybSs8PVW81KITKzpXDwKBT91aFF2_GujjEDcgpBdkssrJF_v7S1IFICcBrBPZygD5rr6fOUfdIE9MEkJWA5tEKqnX7fPyY6HqbrwUrUPEJEBXibllZd6gcs1-_qSN-pVMi4mPfrIm-G2tNUQXvxJd4OfTyrR0baHOD6Jb-8iYq6t9zOZceTXY-shD1ZYfMEQgkou80tBuEvDcvXIvbv161tWJJAgfxf0WswdVbfvcHUZt0nWDPOoKa7R2IqalDebefoWdwelVsom9C1ghQBK5VtwF9qtUadN3dqw4xFcYjSzoryg1mgVjhHFD83JVUJ_1m2-_47SJNbN8GSRz4fEr8IxfovKPZV8pV0opsVt-1e3nGodX3uKHdWp-TlGemMrDU6zOBuLBjx7w9hY8emRQyq5XIbtiOCEbxDG7Ydua9xhFky-rwYls2hRrMhvOWjx9DxB7DWvOZ_v01b7lOYCtAV4Nt-DTyQuC2BSdSdXTJl3xZUlU_RHSks7PlcuvSVR4yBnUeZ4KaXzwy-OIJzHErV3VNRWaasLEBLsgAgVq2glA8UUi6n-w0xB3kQtCvuGfNAUwv-2ADxZeUuvoVPvilv30wHPIhrr0N8q-YXX0V_zhapzufEitiMhJWD05cfyRd-5UMJZfL6XDJvKrN0WBWXacn0cHSXCAoGXWuw-ShKCBc6dXYr55qShseVLQGIDnbx8FG5d3rN9Fz0K9hH946ETnYkLsQ00P4_sme0oXgbJ54QaRgqRbEx7zVHTo3PvN_xCvpsV0PrcJWaZHm0kXHLKox_GmMAbSzGsqU7TauO5QC0b6FJ-ABpw13gGUcnMx004258m3Ri49RIVi37yAWBMQb0Gy1cpQ4gOgsZ_EkyJYPc6A--XV_UtU4US1ynlsYupKIwO56C_EKs7BR2lSDnzD7WoxtlsktuTMZOgMzUxLETvfRZeuP3EAw66UgVDniGOhrxbX8w8DrJnoLpR4aTcEt9CgSPkGCHiyOZJ-yDFwi8EIjUzVGc_gdV4IoZwbzYZPCatAZmE9ZymOvxRsr0hPW-r_VZWP9y5Pil9EgZGAo8TFEDPuBW4u1PfDt5AYzg8wwLXabZVB5ttN5lEdFRC6AJ9qglg7PHnLuYqxUL76as_gGQGucSbi1tErXHgPczcNEiQSaaxHFTsNCiYf_Clfh9_nKIXMu7R8AD_Pkqc9kqxqR_kufIyr0ez1lGioML7LrM77osBV5VYDlmDheE6K0dlesk2E3g5HoGCfZe3HmEqp2OKU6d9kmWizSVB4xSFWDwobEciSzfhXB0g18Y8uuTJZ7A6Ep4m0b7fxGoPs35SDBVeokdQS0iSSyUBl0o0-jKdz6Zmsy8bhX9RuXshuoq4mx7l2BZIBagEBzcuwuGD7GLdxuz5BpPRpzZZhuhcf833P3gjcEhOpsBC2-VYWFEL0B6FN2ZHSlIobLnwSAwcRDqmVry-fG43MH2u0m00iVj4tp3kJpECD7MPNHHwpYVTdRre1XObaKISmbk9i5OaCfs8uaL6X3ZdBf-OUpU6OiRT8fd_nRkxdKvSZZBb5j4LiurszgrcgH6Pl4M6rxaJLTZYL2xXsnUeF7vdYfsXrESK89sH6ItrODy4Tf5usGqcqbpcaBYjR80wudnrArXpdtRAI_X1IwG9qALPGfXEsWMHskWtXyYyx1bGtINsPmOuNlYgaDoir_u4zVDK2UYFABYGR_ysrjyorHNcihxHZs_CfMkd2g-50to3w0v0FoS0GxCmlKNlIZBvg8fA68F4CD4rRQ7_631Tj3rVXz_2qX19eYKO7F6kgQyCJaFkCvzEiVI1ciwb7WRahrO3-yzht_EwMUaW1L6UcGii5wKhQAthMjjjHwju__o4Qz0xqi7a37VbJIGVWSu_WEm0v-TEteusaotzffm84oZhVcY2GmbD3egHXWyNSp3K4SRFD1reAtAqvi22vC0J9WTcpoXVXUfeeKvetXUahyuh_FZjxAydATVBaYX2AgZWXmLS6xNn9HR5BTHB-kM7h9vgHCxYbKTpCSlJUV16Bk6-3CBkfOFSCl66vx-r6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASHS05';
const ICP_LENGTH = 1965;

describe('indexed post-quantum codes — the table', () => {
    it('reads 8 and 9 as two-character hard codes', () => {
        assert.equal(Indexer.Hards.get('8'), 2);
        assert.equal(Indexer.Hards.get('9'), 2);
    });

    it('sizes every code consistently with its selector and its FIPS signature', () => {
        for (const [code, , fs, ls, sigSize] of PQX) {
            const x = Indexer.Sizes.get(code);
            assert.ok(x, `${code}: missing from Indexer.Sizes`);
            assert.equal(x.hs, 2, `${code}: hard size`);
            assert.equal(x.ss, 6, `${code}: soft size`);
            assert.equal(x.os, 3, `${code}: ondex size`);
            assert.equal(x.fs, fs, `${code}: full size`);
            assert.equal(x.ls, ls, `${code}: lead size`);
            // The selector fixes the lead size: 3 -> 0, 8 -> 1, 9 -> 2.
            assert.equal(ls, { '3': 0, '8': 1, '9': 2 }[code[0]], code);
            assert.equal(Indexer._rawSize(code), sigSize, `${code}: raw size`);
            // Signature plus lead bytes must fill whole 24-bit groups.
            assert.equal((sigSize + ls) % 3, 0, `${code}: not 24-bit aligned`);
        }
    });

    it('names every code and sorts it into the right signature sets', () => {
        for (const [code, name] of PQX) {
            assert.equal(
                (IdrDex as unknown as Record<string, string>)[name],
                code,
                name
            );
            assert.ok(IdxSigDex.has(code), `${code}: not an indexed sig code`);
            assert.equal(IdxCrtSigDex.has(code), isCurrentOnly(name), code);
            assert.equal(IdxBthSigDex.has(code), !isCurrentOnly(name), code);
        }
    });
});

describe('indexed post-quantum codes — encoding', () => {
    it('round-trips a signature through qb64 at every code', () => {
        for (const [code, name, fs, , sigSize] of PQX) {
            const raw = new Uint8Array(sigSize).map(
                (_, i) => (i * 7 + 1) % 256
            );
            const crt = isCurrentOnly(name);
            const indexer = new Indexer({
                raw,
                code,
                index: 70_000, // past what a two-character index could hold
                ondex: crt ? undefined : 3,
            });
            assert.equal(indexer.qb64.length, fs, `${code}: encoded length`);
            const back = new Indexer({ qb64: indexer.qb64 });
            assert.equal(back.code, code);
            assert.equal(back.index, 70_000);
            assert.equal(back.ondex, crt ? undefined : 3, `${code}: ondex`);
            assert.deepStrictEqual(back.raw, raw, `${code}: raw`);
        }
    });

    it('defaults a dual-indexed ondex to the index, and refuses one on a current-only code', () => {
        const raw = new Uint8Array(2420);
        assert.equal(
            new Indexer({ raw, code: IdrDex.ML_DSA_44_Big_Sig, index: 9 })
                .ondex,
            9
        );
        assert.throws(
            () =>
                new Indexer({
                    raw,
                    code: IdrDex.ML_DSA_44_Big_Crt_Sig,
                    index: 9,
                    ondex: 9,
                })
        );
    });

    it('rejects a lead byte that is not zero', () => {
        const qb64 = new Indexer({
            raw: new Uint8Array(4627),
            code: IdrDex.ML_DSA_87_Big_Sig,
            index: 0,
        }).qb64;
        // 9A carries two lead bytes, encoded in the characters after the
        // 8-character code; 'B' sets a bit inside them.
        const bad = qb64.slice(0, 8) + 'B' + qb64.slice(9);
        assert.throws(() => new Indexer({ qb64: bad }), /lead bytes/);
    });
});

describe('indexed post-quantum codes — parsing a real ML-DSA controller signature', () => {
    it('frames the inception and its signature with nothing left over', () => {
        const bytes = bytesOf(MLDSA_ICP);
        const { messages, errors, consumed } = parse(bytes);
        assert.deepStrictEqual(errors, []);
        assert.equal(consumed, bytes.length);
        assert.equal(messages.length, 1);
        assert.equal(messages[0].body.ilk, 'icp');
    });

    it('reads the signature as an 8A indexed signature at index 0 over the ML-DSA-44 key', () => {
        const { messages } = parse(bytesOf(MLDSA_ICP));
        const group = messages[0].attachments[0];
        assert.equal(group.code, '-A');
        assert.equal(group.state, 'known');
        const items = group.items as Primitive[];
        assert.equal(items.length, 1);
        assert.equal(items[0].code, '8A');
        assert.equal(items[0].class, 'indexer');
        assert.equal(items[0].span.start, ICP_LENGTH + 4); // past the -A header
        assert.equal(items[0].span.end - items[0].span.start, 3236);

        const siger = new Indexer({
            qb64: MLDSA_ICP.slice(items[0].span.start, items[0].span.end),
        });
        assert.equal(siger.index, 0);
        assert.equal(siger.ondex, 0);
        assert.equal(siger.raw.length, 2420);

        const icp = JSON.parse(MLDSA_ICP.slice(0, ICP_LENGTH));
        assert.equal(icp.i, icp.d); // self-addressing
        const verfer = new Matter({ qb64: icp.k[0] });
        assert.equal(verfer.code, '3AAA');
        assert.equal(verfer.raw.length, 1312);
    });
});
