import libsodium from 'libsodium-wrappers-sumo';
import { Matter, MatterArgs, MtrDex } from './matter.ts';
import secp256r1 from 'ecdsa-secp256r1';

/**
 * @description  Verfer :sublclass of Matter,helps to verify signature of serialization
 *  using .raw as verifier key and .code as signature cypher suite
 */
export class Verfer extends Matter {
    constructor({ raw, code, qb64, qb64b, qb2 }: MatterArgs) {
        super({ raw, code, qb64, qb64b, qb2 });

        if (
            ![
                MtrDex.Ed25519N,
                MtrDex.Ed25519,
                MtrDex.ECDSA_256r1N,
                MtrDex.ECDSA_256r1,
            ].includes(this.code)
        ) {
            throw new Error(`Unsupported code = ${this.code} for verifier.`);
        }
    }

    verify(sig: Uint8Array, ser: Uint8Array) {
        switch (this.code) {
            case MtrDex.Ed25519:
            case MtrDex.Ed25519N: {
                return libsodium.crypto_sign_verify_detached(
                    sig,
                    ser,
                    this.raw
                );
            }
            case MtrDex.ECDSA_256r1:
            case MtrDex.ECDSA_256r1N: {
                const publicKey = secp256r1.fromCompressedPublicKey(this.raw);
                return publicKey.verify(ser, sig);
            }
            default:
                throw new Error(
                    `Unsupported code = ${this.code} for verifier.`
                );
        }
    }
}
