import { Matter, MatterArgs, MtrDex } from './matter';
import { Decrypter } from "./decrypter";

export class Cipher extends Matter {
    constructor({ raw, code, qb64, qb64b, qb2 }: MatterArgs) {
        if (!code && raw) {
            const length = raw.length;
            if (raw.length == Matter._rawSize(MtrDex.X25519_Cipher_Salt)) {
                code = MtrDex.X25519_Cipher_Salt;
            } else if (
                raw.length == Matter._rawSize(MtrDex.X25519_Cipher_Seed)
            ) {
                code = MtrDex.X25519_Cipher_Salt;
            } else if (qb64b || qb64) {
                if (length <= Matter._rawSize(MtrDex.X25519_Cipher_QB64_L2)) {
                    code = (length % 3 === 0) ? MtrDex.X25519_Cipher_QB64_L0 :
                        (length % 3 === 1) ? MtrDex.X25519_Cipher_QB64_L1 :
                            MtrDex.X25519_Cipher_QB64_L2;
                } else {
                    code = (length % 3 === 0) ? MtrDex.X25519_Cipher_QB64_Big_L0 :
                        (length % 3 === 1) ? MtrDex.X25519_Cipher_QB64_Big_L1 :
                            MtrDex.X25519_Cipher_QB64_Big_L2;
                }
            } else if (qb2) {
                code = (length % 3 === 0) ? MtrDex.X25519_Cipher_QB2_L0 :
                    (length % 3 === 1) ? MtrDex.X25519_Cipher_QB2_L1 :
                        MtrDex.X25519_Cipher_QB2_L2;
            } else {
                if (length <= Matter._rawSize(MtrDex.X25519_Cipher_L2)) {
                    code = (length % 3 === 0) ? MtrDex.X25519_Cipher_L0 :
                        (length % 3 === 1) ? MtrDex.X25519_Cipher_L1 :
                            MtrDex.X25519_Cipher_L2;
                } else {
                    code = (length % 3 === 0) ? MtrDex.X25519_Cipher_Big_L0 :
                        (length % 3 === 1) ? MtrDex.X25519_Cipher_Big_L1 :
                            MtrDex.X25519_Cipher_Big_L2;
                }
            }
        }

        if (!code || ![
            MtrDex.X25519_Cipher_Salt, MtrDex.X25519_Cipher_Seed,
            MtrDex.X25519_Cipher_L0, MtrDex.X25519_Cipher_L1, MtrDex.X25519_Cipher_L2,
            MtrDex.X25519_Cipher_Big_L0, MtrDex.X25519_Cipher_Big_L1, MtrDex.X25519_Cipher_Big_L2,
            MtrDex.X25519_Cipher_QB64_L0, MtrDex.X25519_Cipher_QB64_L1, MtrDex.X25519_Cipher_QB64_L2,
            MtrDex.X25519_Cipher_QB64_Big_L0, MtrDex.X25519_Cipher_QB64_Big_L1, MtrDex.X25519_Cipher_QB64_Big_L2,
            MtrDex.X25519_Cipher_QB2_L0, MtrDex.X25519_Cipher_QB2_L1, MtrDex.X25519_Cipher_QB2_L2,
            MtrDex.X25519_Cipher_QB2_Big_L0, MtrDex.X25519_Cipher_QB2_Big_L1, MtrDex.X25519_Cipher_QB2_Big_L2
        ].includes(code)) {
            throw new Error(`Unsupported Cipher code == ${code}`);
        }

        super({ raw, code, qb64b, qb64, qb2 });
    }

    decrypt(prikey: Uint8Array | undefined = undefined, seed: Uint8Array | undefined = undefined) {
        const decrypter = new Decrypter({ qb64b: prikey }, seed);
        return decrypter.decrypt(this.qb64b);
    }
}
