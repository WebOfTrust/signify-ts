import libsodium from 'libsodium-wrappers-sumo';

import {Matter, MatterArgs, MtrDex} from './matter';
import { Verfer } from './verfer';
import { Signer } from './signer';
import { Cipher } from './cipher';
import { arrayEquals } from './utils';

// TODO: move to Matter
export const ciXAllQB64Dex = [
    MtrDex.X25519_Cipher_Seed,
    MtrDex.X25519_Cipher_Salt,
    MtrDex.X25519_Cipher_QB64_L0,
    MtrDex.X25519_Cipher_QB64_L1,
    MtrDex.X25519_Cipher_QB64_L2,
    MtrDex.X25519_Cipher_QB64_Big_L0,
    MtrDex.X25519_Cipher_QB64_Big_L1,
    MtrDex.X25519_Cipher_QB64_Big_L2
]

// TODO: move to Matter
export const ciXVarQB2Dex = [
    MtrDex.X25519_Cipher_QB2_L0,
    MtrDex.X25519_Cipher_QB2_L1,
    MtrDex.X25519_Cipher_QB2_L2,
    MtrDex.X25519_Cipher_QB2_Big_L0,
    MtrDex.X25519_Cipher_QB2_Big_L1,
    MtrDex.X25519_Cipher_QB2_Big_L2
]

// TODO: move to Matter
export const ciXVarStrmDex = [
    MtrDex.X25519_Cipher_L0,
    MtrDex.X25519_Cipher_L1,
    MtrDex.X25519_Cipher_L2,
    MtrDex.X25519_Cipher_Big_L0,
    MtrDex.X25519_Cipher_Big_L1,
    MtrDex.X25519_Cipher_Big_L2
]

export class Encrypter extends Matter {
    private _encrypt: any;
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

        let code;
        if (!ser) {

            if (!matter) {
                throw new Error('primitive is not provided');
            }

            if (matter!.code == MtrDex.Salt_128) {
                code = MtrDex.X25519_Cipher_Salt;
            } else if ( matter!.raw.length == Matter._rawSize(MtrDex.X25519_Cipher_Seed)){
                code = MtrDex.X25519_Cipher_Seed;
            } else {
                code = Matter.determineMatterCode(matter!.raw.length, matter!.qb64b ? 'qb64' : 'qb2');
            }

            if (ciXAllQB64Dex.includes(code)) {
                ser = matter.qb64b;
            } else if (ciXVarQB2Dex.includes(code)){
                // TODO: QB2 not supported in Signify
            } else if (ciXVarStrmDex.includes(code)){
                // TODO
            }
        }

        if (!code) {
            code = MtrDex.X25519_Cipher_L0;
        }

        if (ser != null) {
            matter = new Matter({ qb64b: ser });
        }

        return this._encrypt(matter!.qb64, this.raw, code);
    }

    _x25519(ser: Uint8Array, pubkey: Uint8Array, code: string) {
        const raw = libsodium.crypto_box_seal(ser, pubkey);
        return new Cipher({ raw, code: code });
    }
}
