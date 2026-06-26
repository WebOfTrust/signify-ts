import { assert, describe, it } from 'vitest';
import libsodium from 'libsodium-wrappers-sumo';

import { Cigar, IdrDex, Siger, Signer } from '../../src/index.ts';
import { Matter, MtrDex } from '../../src/index.ts';
import { b } from '../../src/index.ts';

describe('Signer', () => {
    it('should sign things', async () => {
        await libsodium.ready;

        const signer = new Signer({}); // defaults provide Ed25519 signer Ed25519 verfer
        assert.equal(signer.code, MtrDex.Ed25519_Seed);
        assert.equal(signer.raw.length, Matter._rawSize(signer.code));
        assert.equal(signer.verfer.code, MtrDex.Ed25519);
        assert.equal(
            signer.verfer.raw.length,
            Matter._rawSize(signer.verfer.code)
        );

        const ser = b('abcdefghijklmnopqrstuvwxyz0123456789');

        const cigar = signer.sign(ser);
        assert.equal(cigar instanceof Cigar, true);
        assert.equal(cigar.code, MtrDex.Ed25519_Sig);
        assert.equal(cigar.raw.length, Matter._rawSize(cigar.code));
        const result = signer.verfer.verify(cigar.raw, ser);
        assert.equal(result, true);
    });

    it('creates indexed Ed25519 signatures with the right index code', async () => {
        await libsodium.ready;

        const signer = new Signer({});
        const ser = b('abcdefghijklmnopqrstuvwxyz0123456789');

        const defaultSiger = signer.sign(ser, 5) as Siger;
        assert.equal(defaultSiger instanceof Siger, true);
        assert.equal(defaultSiger.code, IdrDex.Ed25519_Sig);
        assert.equal(defaultSiger.index, 5);
        assert.equal(defaultSiger.ondex, 5);

        const currentOnlySiger = signer.sign(ser, 3, true) as Siger;
        assert.equal(currentOnlySiger instanceof Siger, true);
        assert.equal(currentOnlySiger.code, IdrDex.Ed25519_Crt_Sig);
        assert.equal(currentOnlySiger.index, 3);
        assert.equal(currentOnlySiger.ondex, undefined);

        const bigCurrentOnlySiger = signer.sign(ser, 68, true) as Siger;
        assert.equal(bigCurrentOnlySiger instanceof Siger, true);
        assert.equal(bigCurrentOnlySiger.code, IdrDex.Ed25519_Big_Crt_Sig);
        assert.equal(bigCurrentOnlySiger.index, 68);
        assert.equal(bigCurrentOnlySiger.ondex, undefined);

        const differentOndexSiger = signer.sign(ser, 3, false, 5) as Siger;
        assert.equal(differentOndexSiger instanceof Siger, true);
        assert.equal(differentOndexSiger.code, IdrDex.Ed25519_Big_Sig);
        assert.equal(differentOndexSiger.index, 3);
        assert.equal(differentOndexSiger.ondex, 5);
    });

    it('rejects invalid indexed signature indexes at runtime', async () => {
        await libsodium.ready;

        const signer = new Signer({});
        const ser = b('abcdefghijklmnopqrstuvwxyz0123456789');

        for (const index of [-1, 1.5, '1']) {
            assert.throws(
                () => signer.sign(ser, index as unknown as number),
                /Invalid signing index/
            );
        }
    });

    it('rejects invalid indexed signature ondices at runtime', async () => {
        await libsodium.ready;

        const signer = new Signer({});
        const ser = b('abcdefghijklmnopqrstuvwxyz0123456789');

        for (const ondex of [-1, 1.5, '1', null]) {
            assert.throws(
                () =>
                    signer.sign(ser, 0, false, ondex as unknown as number),
                /Invalid ondex/
            );
        }
    });
});
