import libsodium from 'libsodium-wrappers-sumo';

import { Matter, MatterArgs, MtrDex } from './matter.ts';
import { Signer } from './signer.ts';
import { Cipher } from './cipher.ts';
import { EmptyMaterialError } from './kering.ts';
import { Salter } from './salter.ts';

export class Decrypter extends Matter {
    private readonly _decrypt: typeof this._x25519;
    constructor(
        { raw, code = MtrDex.X25519_Private, qb64, qb64b, qb2 }: MatterArgs,
        seed: Uint8Array | undefined = undefined
    ) {
        try {
            super({ raw, code, qb64, qb64b, qb2 });
        } catch (e) {
            if (e instanceof EmptyMaterialError) {
                if (seed != undefined) {
                    const signer = new Signer({ qb64b: seed });
                    if (signer.code != MtrDex.Ed25519_Seed) {
                        throw new Error(
                            `Unsupported signing seed derivation code ${signer.code}`
                        );
                    }
                    const sigkey = new Uint8Array(
                        signer.raw.length + signer.verfer.raw.length
                    );
                    sigkey.set(signer.raw);
                    sigkey.set(signer.verfer.raw, signer.raw.length);
                    raw =
                        libsodium.crypto_sign_ed25519_sk_to_curve25519(sigkey);
                    super({ raw, code, qb64, qb64b, qb2 });
                } else {
                    throw e;
                }
            } else {
                throw e;
            }
        }

        if (this.code == MtrDex.X25519_Private) {
            this._decrypt = this._x25519;
        } else {
            throw new Error(`Unsupported decrypter code = ${this.code}.`);
        }
    }

    decrypt(
        ser: Uint8Array | null = null,
        cipher: Cipher | null = null,
        transferable: boolean = false
    ) {
        if (ser == null && cipher == null) {
            throw new EmptyMaterialError('Neither ser or cipher were provided');
        }

        if (ser != null) {
            cipher = new Cipher({ qb64b: ser });
        }

        return this._decrypt(cipher!, this.raw, transferable);
    }

    _x25519(cipher: Cipher, prikey: Uint8Array, transferable: boolean = false) {
        const pubkey = libsodium.crypto_scalarmult_base(prikey);
        const plain = libsodium.crypto_box_seal_open(
            cipher.raw,
            pubkey,
            prikey
        );
        if (cipher.code == MtrDex.X25519_Cipher_Salt) {
            return new Salter({ qb64b: plain });
        } else if (cipher.code == MtrDex.X25519_Cipher_Seed) {
            return new Signer({ qb64b: plain, transferable: transferable });
        } else {
            throw new Error(`Unsupported cipher text code == ${cipher.code}`);
        }
    }
}
