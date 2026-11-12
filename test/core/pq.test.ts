import { assert, describe, it } from 'vitest';
import { Matter } from '../../src/keri/core/matter.ts';
import {
    parse,
    type AttachmentNode,
    type Primitive,
} from '../../src/keri/core/parsing.ts';

/* Post-quantum codes, following trustoverip/kswg-cesr-specification #185.
 *
 * #185 places all 27 ML-DSA and SLH-DSA primitives in the four-character fixed
 * tables, because they are large: the smallest public key in them is 1,312 B
 * and the largest signature 29,792 B, so a four-character code costs under a
 * quarter of a percent of the encoding. These tests check the table against
 * arithmetic the spec makes checkable, against the FIPS 204 and 205 parameter
 * sets, and then against real cryptography. */

const bytesOf = (s: string) => new TextEncoder().encode(s);

/** Every post-quantum code, with its full size, its lead size, and the raw
 * size FIPS 204 or FIPS 205 gives for that primitive. */
const PQ: Array<[string, number, number, number]> = [
    ['1AAQ', 4416, 0, 3309], // ML-DSA-65 signature
    ['1AAR', 3460, 0, 2592], // ML-DSA-87 public verification key
    ['1AAS', 68, 0, 48], // Seed of SLH-DSA-SHA2-128s private key
    ['1AAT', 68, 0, 48], // Seed of SLH-DSA-SHAKE-128s private key
    ['1AAU', 68, 0, 48], // SLH-DSA-SHA2-192s public verification key
    ['1AAV', 21636, 0, 16224], // SLH-DSA-SHA2-192s signature
    ['1AAW', 100, 0, 72], // Seed of SLH-DSA-SHA2-192s private key
    ['1AAX', 68, 0, 48], // SLH-DSA-SHAKE-192s public verification key
    ['1AAY', 21636, 0, 16224], // SLH-DSA-SHAKE-192s signature
    ['1AAZ', 100, 0, 72], // Seed of SLH-DSA-SHAKE-192s private key
    ['1AAa', 132, 0, 96], // Seed of SLH-DSA-SHA2-256s private key
    ['1AAb', 132, 0, 96], // Seed of SLH-DSA-SHAKE-256s private key
    ['2AAA', 3232, 1, 2420], // ML-DSA-44 signature
    ['2AAB', 48, 1, 32], // Seed of ML-DSA-44 private key
    ['2AAC', 2608, 1, 1952], // ML-DSA-65 public verification key
    ['2AAD', 48, 1, 32], // Seed of ML-DSA-65 private key
    ['2AAE', 48, 1, 32], // Seed of ML-DSA-87 private key
    ['2AAF', 48, 1, 32], // SLH-DSA-SHA2-128s public verification key
    ['2AAG', 10480, 1, 7856], // SLH-DSA-SHA2-128s signature
    ['2AAH', 48, 1, 32], // SLH-DSA-SHAKE-128s public verification key
    ['2AAI', 10480, 1, 7856], // SLH-DSA-SHAKE-128s signature
    ['2AAJ', 39728, 1, 29792], // SLH-DSA-SHA2-256s signature
    ['2AAK', 39728, 1, 29792], // SLH-DSA-SHAKE-256s signature
    ['3AAA', 1756, 2, 1312], // ML-DSA-44 public verification key
    ['3AAB', 6176, 2, 4627], // ML-DSA-87 signature
    ['3AAC', 92, 2, 64], // SLH-DSA-SHA2-256s public verification key
    ['3AAD', 92, 2, 64], // SLH-DSA-SHAKE-256s public verification key
];

/** Every node in an attachment forest, groups and primitives alike. */
const nodes = (n: AttachmentNode): AttachmentNode[] =>
    n.kind === 'group' ? [n, ...n.items.flatMap(nodes)] : [n];

/** A CESR-1 stream: an Ed25519 inception, then a receipt of it whose witness
 * signs with ML-DSA-44. The inception and receipt bodies are the ones cesrview's
 * scripts/make-falcon-sample.mjs produced; the couple was generated with
 * @noble/post-quantum 0.7.1's ml_dsa44, so the keypair is real and the
 * signature is over the receipted event's exact bytes and verifies. signify-ts
 * cannot check that here (it ships no ML-DSA implementation), but it can FRAME
 * it, which is what these codes are for. The key and signature also exercise
 * both lead-byte selectors: the key is 3AAA, two lead bytes, and the signature
 * 2AAA, one. */
const MLDSA_RECEIPT =
    '{"v":"KERI10JSON0000fd_","t":"icp","d":"ECkqcQR_6_BzwC89QNM4OJnSwi3FDC62lo9ALKobHDe8","i":"BDVHH3ix0_aawmzCf-IBLdRe2UiFGCxEdXFuiecqyLEy","s":"0","kt":"1","k":["BDVHH3ix0_aawmzCf-IBLdRe2UiFGCxEdXFuiecqyLEy"],"nt":"0","n":[],"bt":"0","b":[],"c":[],"a":[]}{"v":"KERI10JSON000091_","t":"rct","d":"ECkqcQR_6_BzwC89QNM4OJnSwi3FDC62lo9ALKobHDe8","i":"BDVHH3ix0_aawmzCf-IBLdRe2UiFGCxEdXFuiecqyLEy","s":"0"}-CAB3AAAAAD6rq6FUWGB_YG2a-wivDNooA4AfoSlxIrd826C7OaALeuynSuRZz1sBW3pdDw41XfYD5sG-hgI9RlANgY36uDlsvXPcD6E8gbLk9l8OdPkxKkdxNGZ3-hSbK7w04yMsSMbJ25G5qkR4bYjGdl8Dtju3eNbz8HjkhWHNB6Tf0zv8XcYKrszTGGS16opnxh42-XwYjxaYNs8yJ03AILTqexrN2mawiHcBv3BHFxzz5WYqPGmg0-8nj7xoPGcVbt6SKxbo6uxbfon02hZB5YdrpVdkQXWyC_bZegUxL8Cw2ZBqbeY9ahUTL2Z7s57dEtZghpcP43F8WsugPGuQzYT8t6q7ZJiBnLqgW74FOTuHEK13dGy6aCMh0301qN0cHiu_ymzCo9le4_2j0TECRFibNzUI91CSt1-gEOXTGVKHp4I7_6RvkWi90lzT-Uob5KkkbL_LWMbKiym0P3UC2jkxg02eHdDMO2k4N5lQ12-8i0rzX8T-5iICE_wYzTUgUMNJ7K4plDug3T8TCrqivHrEYBJEdkRnBQ28xTVuy0SMANZ5Uqm-JOVqeIlnUHCarMqXKADlXbg7CNYhnRi6gdciAKGBmTi5ZdMtetXIncblOo8z1OxwiaV0mZVNMlocdqVbYz1QzdR6sVqROJyLHIfEMQtEoxaSkCvV3aOLDFiHcQd5WehgbyOOObU5v0090XcD11O31GKDXxMzP4JRG9kZ0huBNfWeZtSGepVVwg5v0U8f6DnxYfzrr6bp16b0tJije2boCJTgs47GNDGveXceNEypVwHRwdmPhFOVyswFtJeNTg9o_3EMfJPhDUZhmz4LYUYLdVT_0SwzXcNtAFaIrS3_CtUrMli0a_Ul7pijSVLEpMyIgFvvorhin38i2YdWthbZUsdGC1hGMd7VSc9XpSk58h-4XnF35UYKnnf9oVAGdPEJWnXUtbrTeQk1ao7BNXD6kIrQ9BEyuKdcpOcZWiS09Q14_5MhQrg3kQig_k1k6TKN0IdrMDkyYFqgMIz2EftGHztZ3sLNK__T2U4Uw1HMbXSNl8IoymWB9F0zu1i3sgzNxw6WQwAh4t2-vQqpH12af1o-cgAA_XA0cm4wdG3r_TdVAKp4-84-LT9oGa4THRVgVl0aAd9o9GZw3Vyr_zuv-gq1SDFJipFl1wPuvWi_nuuHVOhhIs33DZ27I5EWSaLgx6U-MrYb2jO1WWWc7nkRKRThTxUV_sitgV404oHhS518BvBlT7cCbgZxXV-jKps7Rm5Tia8KNFN8A3JV3c4CnZ0JpC8Ul0aMB4WHnBjCS0LWMkTvyEx8Mua94DSXDCjaX6DszZSyZS5mvK4aGj4ap-55iWWSwoGcd-r-g80q3Xo9svkt0jJichKgqLvGkMZu83RWtZPaBFs4BnevO3_mnLQ6IfZ-R6nWAGUudrq1tL_Xl46IK4hRBnmUxsRqWpNv9F9GIiphXZ7CQu-uMqaYP8Y0olu7BEaajM3Bd7qSnR4Vg6zqw6ANxI-m6veLwzstZMnVDS0tAoTOakH2yI0hE2bx0453_25m-qqzN2YC8uPU2hPLONhQHn_ZzqHKE5nShlhOCMoxjRcmuxdLu7hqD55sbcYeuVWzEIlt7wBpc9w4JpnzAO7Z-7DDnQcdG6Z922iQjeO86XsfVgpE7HdhUhH8BYLJY3erPZPKBuu_6T4oxY78p-pIQhgYXTKxKoALiJpcERbuOG8nfVq8znXt9qc7D5_-Qd8-mGBV9Cc2AAAAKUoFzBm3v_TrnrpA2Dh_Ia4lcl-DK0JOT4ueodZykhauJ189eHhsHU0B5C69bgrcdnMXcXtOd8QKIp5CDbsnvu_gcAstRL6fVcwff7vQW5CdclqXrcdFb08X93czEKVj9LAAXXXfH_C1Y7zVGnOeeu0lF1BNhagXP6D1HRQ3BXp-axKDDfTY-xq8ESDzNoslUfcZo2yt0I7vSMCOfx_bWgfzhLG49rTaLjv_edbXB-7BQ1ndBvYrfWehAOlLNXK9cT9N1xbzh3wP7HJWES_gfsifNbPM3ecq4c6VYY6AoPbDy44J4SsxasVXhac4R25BIH5QfmX9Qp2GltxaYXJz1vn0pj4fgPDgShOdFW_2eLf0lDwW_tKVmPCQfgXbCLkWWt_0KvpqWuuIpnTB5tWFnRIGSQJJsHKlYNc7DQBNPHCFUGile61Fux1M57hl6LawBsvRvXtzA4XZ8vaRVxOMI2OzhocoMvkKYXUfNEcN2MIxdxOzw8PeKJ32AZcFxCxO-CIb0_3nHC9VSOGYbeJojnYJmPbAIIzBmbyPmR2gco_48zIAgPH9B_zPuon3pyjbp3oeT92Pmu1oenlcKjPpVF8Mj0epSqprHKH11YdEs5tuzmoO55TuWo9969-kKaJeyoWPI_N7irBQE6LWgkqzQiZkG4dR08Y8Lhw5EGFrkglQdbOIyHdjKRqLlG6AUcl26_hIU5IvTODxPGoENNdix5k7aa0C9xyohjWi_z13_VXjvbsSGu07p93oO8-AVBbe1b7SWK_YKF1AXKbY6Eb70D5_aGd6xIxAhbv8SpZzCXGzLs2QM0NLJ0AQujO1GmSiX7r6OUIv3Z9Legge6VrlHjJ3KUzlAmy0eQ7utO2LuGbPf_OiJx-u8szHt05prj6tmVnaFWGJEUWvj8ycuJoFCuCZY4i3Dpc0pM1cwCgibuBkuIj_d8l-OtRj0Z9IZpCmKZKZ2atVts6E9TVqYZJnRWXWz0KvwoVEBqSNVCua8CVmn9ASgEfEbsomYFqRXPejMZxi7AWlj-fRDnLnuamrXEv0p3vQtj6_Kweem8qWjsRbx3-awVTtu-Rkj-IndwT9ShblWkHYbvsUMDPuNKtw3H_kDwibx2gAd5Zss_FLpdeqc_TtGPQ-hKn_kXyvYCg4PwMlj9L1ayho7NGrAPtJxHPa09sxr0EmjF_2nLZ3qTuWQIUox588m0-41xbuoOBnfmid27XWF7ZZQM5WB5mR4yubrfo85IiN2OcQK918FXhjmXpUHSDuOkI3TdVGaK4zxjzlnWvqJGRDTv5pu_AWdqoOoarqntkj526FB2VRjQBFUWAJCNVmXAN0lRRxaAbMspu8vX9W5-APTdYv83uzY-HDZJlLFyo9Ya9gjGz1Ud2PH46eVciDwXfQxrZPh7D3wTv4-dvvuGg_nQQcPCu902RiAGwCBYLfXLSZF4Oz36UHxXTu2bhfmJHevX1P8uYHEkR-J5HOpKob1ExeFeB7dc1MLwClDn5dw6JxI1zOb9CfldBwVqn8_XGSMYnmP8RzE60sugAFWpnerpYP_yxQpnGw_vDT5JQtPbYsUooXXj9o6EdzwZ1lm04IH5R1XxeKck_pQqoqRdhWd-8xFTAQVraYGXxaU0Qbh4hUq4qic5YQb0LGm0pbeXZu1srg4SVld3o6sL4ZK1eCYmqirS_hEBZTO8o9eJEqsWXbvCTggg4zRQs5olqfG_-uWgrj6QwUTl2bmIeq7O4joZ9BH2aGEK9ojwReQ51-n_-7JVD-bZktKL4n-N7ycp1OgO-8qs4A_qH90ndrHZ3EHc9Zf6IPQhAOZ_aBnCKtY2t5BhTExCEfMxhJqhpjeAL6OiIQu3sMJZjWPAksO0457dq47jK71hwCEMA1bXKTyhF5SBIfy_02Ron0ukaMBue25Bu8OgEnvGjhVK7RDdF7h7lmNfUL07ebIMKivMrFlscLFKJ5YChYXcCd7Nk-USF6JKOPVvF-zHptyxX94La09Zwo4RdVWPpTauByAflzPVIxYestXnyo20Jcb6SZkDylwtSZEgE6xwGvc20risiU1uFlVShV7Q8a2e-6vIXAKeN1uOWTJV90m-mLl4FJm7_GJYQSxbUHPFn3QM2XOX2UmL7lz54JSVU0iUef1ku190x0M2snQvEENBJv8UZD2ZvNpth8_tE3xR8SLqYinarj8PrY7KCm8VxqaT_NaJaI7ZM7lbFaz7qH4AsutbnoQYhU4VSLGirX8AursRDTKYjuhJ_07_PZ19uaEtMV7P3_f2g1g0T2vgdHydDfRb6th4jZfXeeI7_voQs9Fc4eNBPjhgYVtoOOq1K9on935jr2Kr7WfWKL_6f_W4BdzVUAyp1uy6LY_2yjqQI6q5b76PaS-7dpSfHEpJVyxzYprU82TCWiZiB7crK-Xktr0fU_HoNq7jchIrAt2hQOEb_8PWqoRCzw5MLtSbXd0hn2Uj3w41CjAtc0dW2C7bjELeZkt7mcn1uuqk2RZML3NR6phMtzJSxCBdoKEvhSi8N4MdVQI7KwJGOVFcIB11KkbfgpakguvOn5GLOPGYHAJvd_9vqxdGUGmTVSpeytRJjDdkPbWqcrfS_f0hYMkMEZGIUzO_LUyfKqCOex4YF2J442RgZg3VmdhQcDfSV14aKoI1dPjGR2Cl7Mco5N5kCiINGUyFnPrdi3OzRbkQUe0jv3BPe2NR6GopzMV0EADEjalVopeudh-Pd7hii4PAiTyGMFYEpX1JPGm86oXNcn_zHFxnYqMYp9oZIjUaWwk3H7gPX0RoLj0h3aaKS-Vb5TgRC_cwJJHPeWTbdLs5LxBOQmgICUXShtkD2eMOQHtuvmWGIxhH8WlS8rmrq0GmetePEByPPw1CcF_AZqnKjxatSI6gMin5yy-ov0zoTyKR33MJ1uyGy70T5uBHHxL4ldoFH_oHpwzHC9iLqo4sFjkYYjXd6ZelbK2cwNM6JIe5VxVteOgGydbWuwX8MXL3kxY1W8ObFaBX6Wwqym-h5YJPKA57_PdnIpMVdt8LOsiyO5gFGy6FYEIRjrO7kh0FZtpkd7mPpSL8oKj_IJ1F1xNdyqtLb5YbkBBzDdI8EsVI_tz61SQn-tVGN_SNeFR4hJCs3OERzi5-qq8_T7_QPGBxVbW-QmrO5y9fk5fb8BQZBRE1pbneew8nS4ggKQlBmaHqFiImKo7vI0N4AAAAAAAAAAAAAAAAAAAAAAAARIS4-';

describe('post-quantum codes — the table is arithmetically self-checking', () => {
    it('carries the 27 codes #185 defines', () => {
        const present = PQ.filter(([code]) => Matter.Sizes.has(code));
        assert.equal(present.length, 27);
    });

    it('drops the codes the reverted #165 table used past the end of #185', () => {
        // #165 assigned FN-DSA codes and so ran to 1AAd and 2AAO; #185 has no
        // FN-DSA and ends at 1AAb and 2AAK. A stale row left behind would
        // accept a code no spec defines.
        for (const code of ['1AAc', '1AAd', '2AAL', '2AAM', '2AAN', '2AAO']) {
            assert.isFalse(Matter.Sizes.has(code), `${code}: still present`);
        }
    });

    it('sizes every code consistently with its selector and CESR encoding', () => {
        for (const [code, fs, ls] of PQ) {
            const sizage = Matter.Sizes.get(code);
            assert.ok(sizage, `${code}: missing from Matter.Sizes`);
            assert.equal(sizage.hs, 4, `${code}: not a four-character code`);
            assert.equal(
                sizage.ss,
                0,
                `${code}: fixed codes carry no soft part`
            );
            assert.equal(sizage.fs, fs, `${code}: wrong full size`);
            // The selector fixes the lead size: '1' -> 0, '2' -> 1, '3' -> 2.
            assert.equal(
                sizage.ls,
                ls,
                `${code}: lead size wrong for selector`
            );
            assert.equal(
                fs % 4,
                0,
                `${code}: full size ${fs} is not a multiple of 4`
            );
            // Raw plus lead must fill whole 24-bit groups, or the value could not
            // be encoded without padding characters, which fixed-length
            // primitives never carry.
            assert.equal(
                (((fs - 4) * 3) / 4) % 3,
                0,
                `${code}: does not align on 24 bits`
            );
        }
    });

    it('round-trips a raw value of the implied length through Matter, at every code', () => {
        for (const [code, fs, ls] of PQ) {
            // Zeros, because a lead byte that is not zero is rejected on decode.
            const raw = new Uint8Array(((fs - 4) * 3) / 4 - ls);
            const m = new Matter({ raw, code });
            assert.equal(
                m.qb64.length,
                fs,
                `${code}: encoded to the wrong length`
            );
            assert.equal(
                m.code,
                code,
                `${code}: round-tripped to a different code`
            );
            assert.equal(
                new Matter({ qb64: m.qb64 }).raw.length,
                raw.length,
                `${code}: decoded to the wrong raw length`
            );
        }
    });

    it('sizes every code to its FIPS 204 or FIPS 205 parameter set exactly', () => {
        // Independent ground truth: the raw sizes in the FIPS standards, not the
        // CESR table this is checking.
        for (const [code, , , bytes] of PQ) {
            const s = Matter.Sizes.get(code)!;
            assert.equal(
                ((s.fs! - 4) * 3) / 4 - s.ls!,
                bytes,
                `${code}: raw size differs from the FIPS parameter set`
            );
        }
    });

    it('gives 2AAA and 3AAA their post-quantum meanings, replacing two dead placeholders', () => {
        // Before the post-quantum codes these rows held Sizage(4, 0, 8, 1) and
        // Sizage(4, 0, 8, 2): vestigial test placeholders from a keripy that no
        // longer exists, referenced nowhere in this codebase. Pinned here
        // because these are the two rows whose meaning changed.
        assert.equal(Matter.Sizes.get('2AAA')!.fs, 3232); // ML-DSA-44 signature
        assert.equal(Matter.Sizes.get('3AAA')!.fs, 1756); // ML-DSA-44 public key
    });
});

describe('post-quantum codes — parsing a real ML-DSA stream', () => {
    it('frames the exhibit end to end with nothing left over', () => {
        const bytes = bytesOf(MLDSA_RECEIPT);
        const { messages, errors, consumed } = parse(bytes);
        assert.deepStrictEqual(errors, []);
        assert.equal(consumed, bytes.length); // delta 0
        assert.deepStrictEqual(
            messages.map((m) => m.body.ilk),
            ['icp', 'rct']
        );
    });

    it('decomposes the receipt into an ML-DSA-44 key and signature', () => {
        const { messages } = parse(bytesOf(MLDSA_RECEIPT));
        const group = messages[1].attachments[0];
        assert.equal(group.code, '-C');
        assert.equal(group.state, 'known');
        const items = group.items as Primitive[];
        assert.deepStrictEqual(
            items.map((p) => p.code),
            ['3AAA', '2AAA']
        );
        // Byte-exact: the couple tiles the group with no gap and no overhang.
        assert.equal(items[0].span.end - items[0].span.start, 1756);
        assert.equal(items[1].span.end - items[1].span.start, 3232);
        assert.equal(items[0].span.start, group.span.start + 4); // past the -C header
        assert.equal(items[1].span.end, group.span.end);
    });

    it('never frames a post-quantum signature as an INDEXED signature', () => {
        // signify-ts does not yet carry the indexed post-quantum codes that
        // kswg-cesr-specification #186 proposes, so no post-quantum primitive
        // may resolve through the Indexer table. A comment would not fail if
        // someone later added one without the Indexer support it needs.
        const all = parse(bytesOf(MLDSA_RECEIPT)).messages.flatMap((m) =>
            m.attachments.flatMap(nodes)
        );
        assert.deepStrictEqual(
            all.filter((n) => n.kind === 'primitive' && n.class === 'indexer'),
            []
        );
        // The same rule at the framing layer: a -A group's members are Indexer
        // primitives, so a post-quantum code there must not resolve, however
        // well it would resolve as Matter.
        const icp = MLDSA_RECEIPT.slice(0, 253);
        const { errors } = parse(
            bytesOf(icp + '-AAB' + '1AAQ' + 'A'.repeat(4412))
        );
        assert.equal(errors[0].code, 'unframable-group');
    });

    it('reports a truncated post-quantum primitive as incomplete, not malformed', () => {
        const bytes = bytesOf(MLDSA_RECEIPT);
        const { messages, errors } = parse(bytes.slice(0, bytes.length - 40));
        assert.equal(messages.length, 1); // the icp survives; the receipt waits
        assert.equal(errors[0].code, 'incomplete');
        assert.equal(errors[0].permanent, false);
    });
});
