import { strict as assert } from 'assert';
import libsodium from 'libsodium-wrappers-sumo';

import { Signer } from '../../src';
import { Matter, MtrDex } from '../../src';
import { b } from '../../src';
import Base64 from 'urlsafe-base64';

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
        assert.equal(cigar.code, MtrDex.Ed25519_Sig);
        assert.equal(cigar.raw.length, Matter._rawSize(cigar.code));
        const result = signer.verfer.verify(cigar.raw, ser);
        assert.equal(result, true);
    });
    it('signs following RFC https://datatracker.ietf.org/doc/html/rfc9421#appendix-B.2.6', async () => {
        await libsodium.ready;

        const content =
            '"date": Tue, 20 Apr 2021 02:07:55 GMT\n' +
            '"@method": POST\n' +
            '"@path": /foo\n' +
            '"@authority": example.com\n' +
            '"content-type": application/json\n' +
            '"content-length": 18\n' +
            '"@signature-params": ("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"';
        const privateKey = new Uint8Array([
            159, 131, 98, 248, 122, 72, 74, 149, 78, 110, 116, 12, 91, 76, 14,
            132, 34, 145, 57, 162, 10, 168, 171, 86, 255, 102, 88, 111, 106,
            125, 41, 197,
        ]);
        const expectedSignature =
            'wqcAqbmYJ2ji2glfAMaRy4gruYYnx2nEFN2HN6jrnDnQCK1u02Gb04v9EDgwUPiu4A0w6vuQv5lIp5WPpBKRCw==';

        const signer = new Signer({ raw: privateKey });
        const result = signer.sign(b(content));
        const expectedSignatureBytes = new Uint8Array(
            Base64.decode(expectedSignature)
        );
        assert.deepStrictEqual(result.raw, expectedSignatureBytes);
    });
});
