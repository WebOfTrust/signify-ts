import libsodium from 'libsodium-wrappers-sumo';

import { Matter, MatterArgs, MtrDex } from './matter.ts';
import { Verfer } from './verfer.ts';
import { Signer } from './signer.ts';
import { Cipher } from './cipher.ts';
import { arrayEquals } from './utils.ts';

export class Encrypter extends Matter {
    private _encrypt: typeof this._x25519;
    constructor(
        { raw, code = MtrDex.X25519, qb64, qb64b, qb2 }: MatterArgs,
        verkey: Uint8Array | null = null
    ) {
        if (raw == undefined && verkey != null) {
            const verfer = new Verfer({ qb64b: verkey });
            if (
                !Array.from([MtrDex.Ed25519N, MtrDex.Ed25519]).includes(
                    verfer.code
                )
            ) {
                throw new Error(
                    `Unsupported verkey derivation code = ${verfer.code}.`
                );
            }
            raw = libsodium.crypto_sign_ed25519_pk_to_curve25519(verfer.raw);
        }

        super({ raw, code, qb64, qb64b, qb2 });

        if (this.code == MtrDex.X25519) {
            this._encrypt = this._x25519;
        } else {
            throw new Error(`Unsupported encrypter code = ${this.code}.`);
        }
    }

    verifySeed(seed: Uint8Array) {
        const signer = new Signer({ qb64b: seed });
        const keypair = libsodium.crypto_sign_seed_keypair(signer.raw);
        const pubkey = libsodium.crypto_sign_ed25519_pk_to_curve25519(
            keypair.publicKey
        );
        return arrayEquals(pubkey, this.raw);
    }

    encrypt(ser: Uint8Array | null = null, matter: Matter | null = null) {
        if (ser == null && matter == null) {
            throw new Error('Neither ser nor matter are provided.');
        }

        if (ser != null) {
            matter = new Matter({ qb64b: ser });
        }

        let code;
        if (matter!.code == MtrDex.Salt_128) {
            code = MtrDex.X25519_Cipher_Salt;
        } else {
            code = MtrDex.X25519_Cipher_Seed;
        }

        return this._encrypt(matter!.qb64b, this.raw, code);
    }

    _x25519(ser: Uint8Array, pubkey: Uint8Array, code: string) {
        const raw = libsodium.crypto_box_seal(ser, pubkey);
        return new Cipher({ raw: raw, code: code });
    }
}
