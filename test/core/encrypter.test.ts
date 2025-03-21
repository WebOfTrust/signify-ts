import { Matter } from '../../src/keri/core/matter.ts';

import { assert, describe, it } from 'vitest';
import { MtrDex } from '../../src/keri/core/matter.ts';
import libsodium from 'libsodium-wrappers-sumo';
import { Signer } from '../../src/keri/core/signer.ts';
import { Encrypter } from '../../src/keri/core/encrypter.ts';
import { Verfer } from '../../src/keri/core/verfer.ts';
import { d } from '../../src/keri/core/core.ts';

describe('Encrypter', () => {
    it('should encrypt stuff', async () => {
        await libsodium.ready;

        // (b'\x18;0\xc4\x0f*vF\xfa\xe3\xa2Eee\x1f\x96o\xce)G\x85\xe3X\x86\xda\x04\xf0\xdc\xde\x06\xc0+')
        const seed = new Uint8Array([
            24, 59, 48, 196, 15, 42, 118, 70, 250, 227, 162, 69, 101, 101, 31,
            150, 111, 206, 41, 71, 133, 227, 88, 134, 218, 4, 240, 220, 222, 6,
            192, 43,
        ]);
        const seedqb64b = new Matter({ raw: seed, code: MtrDex.Ed25519_Seed })
            .qb64b;

        assert.equal(
            d(seedqb64b),
            'ABg7MMQPKnZG-uOiRWVlH5ZvzilHheNYhtoE8NzeBsAr'
        );

        // b'6\x08d\r\xa1\xbb9\x8dp\x8d\xa0\xc0\x13J\x87r'
        const salt = new Uint8Array([
            54, 8, 100, 13, 161, 187, 57, 141, 112, 141, 160, 192, 19, 74, 135,
            114,
        ]);
        const saltqb64 = new Matter({ raw: salt, code: MtrDex.Salt_128 }).qb64;
        const saltqb64b = new Matter({ raw: salt, code: MtrDex.Salt_128 })
            .qb64b;
        assert.equal(saltqb64, '0AA2CGQNobs5jXCNoMATSody');

        // b'h,#|\x8ap"\x12\xc43t2\xa6\xe1\x18\x19\xf0f2,y\xc4\xc21@\xf5@\x15.\xa2\x1a\xcf'
        const cryptseed = new Uint8Array([
            104, 44, 35, 124, 138, 112, 34, 18, 196, 51, 116, 50, 166, 225, 24,
            25, 240, 102, 50, 44, 121, 196, 194, 49, 64, 245, 64, 21, 46, 162,
            26, 207,
        ]);
        const cryptsigner = new Signer({
            raw: cryptseed,
            code: MtrDex.Ed25519_Seed,
            transferable: true,
        });
        const keypair = libsodium.crypto_sign_seed_keypair(cryptseed); // raw
        const pubkey = libsodium.crypto_sign_ed25519_pk_to_curve25519(
            keypair.publicKey
        );
        const prikey = libsodium.crypto_sign_ed25519_sk_to_curve25519(
            keypair.privateKey
        );

        assert.throws(function () {
            new Encrypter({});
        });

        let encrypter = new Encrypter({ raw: pubkey });
        assert.equal(encrypter.code, MtrDex.X25519);
        assert.equal(
            encrypter.qb64,
            'CAF7Wr3XNq5hArcOuBJzaY6Nd23jgtUVI6KDfb3VngkR'
        );
        assert.deepStrictEqual(encrypter.raw, pubkey);
        assert.equal(encrypter.verifySeed(cryptsigner.qb64b), true);

        let cipher = encrypter.encrypt(seedqb64b);
        assert.equal(cipher.code, MtrDex.X25519_Cipher_Seed);
        let uncb = libsodium.crypto_box_seal_open(
            cipher.raw,
            encrypter.raw,
            prikey
        );
        assert.deepStrictEqual(uncb, seedqb64b);

        cipher = encrypter.encrypt(saltqb64b);
        assert.equal(cipher.code, MtrDex.X25519_Cipher_Salt);
        uncb = libsodium.crypto_box_seal_open(
            cipher.raw,
            encrypter.raw,
            prikey
        );
        assert.deepStrictEqual(uncb, saltqb64b);

        const verfer = new Verfer({
            raw: keypair.publicKey,
            code: MtrDex.Ed25519,
        });

        encrypter = new Encrypter({}, verfer.qb64b);
        assert.equal(encrypter.code, MtrDex.X25519);
        assert.equal(
            encrypter.qb64,
            'CAF7Wr3XNq5hArcOuBJzaY6Nd23jgtUVI6KDfb3VngkR'
        );
        assert.deepStrictEqual(encrypter.raw, pubkey);
    });
});
