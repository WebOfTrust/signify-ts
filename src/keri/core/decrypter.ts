import libsodium from 'libsodium-wrappers-sumo';

import { Matter, MatterArgs, MtrDex } from './matter';
import { Signer } from './signer';
import { Cipher } from './cipher';
import { EmptyMaterialError } from './kering';
import { Salter } from './salter';
import {ciXAllQB64Dex, ciXVarQB2Dex, ciXVarStrmDex} from "./encrypter";
import {Streamer} from "./streamer";

export class Decrypter extends Matter {
    private readonly _decrypt: any;
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

    /**
     * Returns plain text as klas instance (Matter, Streamer).
     * When klas is undefined, the default klas is based on cipher.code or inferred
     * from qb64 or qb2 code. Default may be Salter, Signer, or Streamer.
     * Cipher's encrypted plain text is fully qualified (qb64)
     * so derivation code of plain text preserved through encryption/decryption
     * round trip.
     *
     * @param ser {Uint8Array} - Instance of Uint8Array. Serialization.
     * @param cipher {Cipher} - Instance of Cipher. One of cipher, qb64, or qb2 is required.
     * @param qb64 {string | Uint8Array | ArrayBuffer | null} - Serialization
     *     of cipher text as fully qualified base64. When string, encodes as utf-8.
     *     When ArrayBuffer and strip in additional keyword arguments is true, then strips.
     * @param qb2 {Uint8Array | ArrayBuffer | null} - Serialization
     *     of cipher text as fully qualified base2. Strips when ArrayBuffer
     *     and strip in additional keyword arguments is true.
     * @param klas {Matter | Streamer | undefined} - Class used to create instance from
     *     decrypted serialization. Default depends on cipher code.
     * @param transferable {boolean} - Modifier of klas instance creation. When klas init
     *     supports transferable parameter; true means verfer of returned signer is transferable.
     *     False means non-transferable.
     * @param bare {boolean} - False (default) means returns instance holding plaintext.
     *     True means returns plaintext itself.
     *
     * @returns {Matter | Streamer | Uint8Array} - When bare is false,
     *     returns an instance of decrypted cipher text of raw which is
     *     encrypted qb64, qb2, or sniffable stream depending on code.
     *     When bare is true, returns decrypted serialization plaintext whatever that may be.
     */
    decrypt(
        ser: Uint8Array | null = null,
        cipher: Cipher | null = null,
        qb64 = undefined,
        qb2 = undefined,
        klas = undefined,
        transferable: boolean = false,
        bare: boolean = false
    ) {
        if (ser == null && cipher == null) {
            throw new EmptyMaterialError('Neither ser or cipher were provided');
        }

        if (ser != null) {
             if (!cipher){
                 if (qb64) {
                     cipher = new Cipher({ qb64b: ser });
                 } else if (qb2){
                     cipher = new Cipher({ qb2: ser });
                 } else {
                     throw new EmptyMaterialError('Need one of cipher, qb64, or qb2.');
                 }
             }
        }

        return this._decrypt(cipher, this.raw, klas, transferable, bare);
    }

    /**
     * Returns plain text as Salter or Signer instance depending on the cipher
     * code and the embedded encrypted plain text derivation code.
     * @param cipher {Cipher} instance of encrypted seed or salt.
     * @param prikey {Uint8Array} raw binary decryption private key derived from signing seed or sigkey
     * @param klas {Matter | Streamer | undefined} Class used to create instance from decrypted serialization.
     * Default depends on cipher.code.
     * @param transferable Modifier of Klas instance creation.
     * @param bare  means CESR instance holding plaintext. True means plaintext
     * @returns {Texter} A Texter primitive of the stream suitable for wrapping.
     */
    _x25519(cipher: Cipher, prikey: Uint8Array, klas = undefined,transferable: boolean = false, bare = false) {
        const pubkey = libsodium.crypto_scalarmult_base(prikey);
        const plain = libsodium.crypto_box_seal_open(
            cipher.raw,
            pubkey,
            prikey
        );

        if (bare) {
            return plain;
        }
        else {
            if (!klas){
                if (cipher.code === MtrDex.X25519_Cipher_Salt){
                    klas = new Salter({ qb64b: plain });
                } else if (cipher.code === MtrDex.X25519_Cipher_Seed) {
                    klas = new Signer({ qb64b: plain, transferable: transferable });
                } else if (ciXVarStrmDex.includes(cipher.code)){
                    klas = new Streamer(plain);
                } else {
                    throw new Error(`Unsupported cipher code = ${cipher.code} when klas missing.`);
                }
            }

            if (ciXAllQB64Dex.includes(cipher.code)) {
                return klas({qb64b: plain, transferable});
            } else if (ciXVarQB2Dex.includes(cipher.code)){
                return klas({qb2: plain})
            } else if (ciXVarStrmDex.includes(cipher.code)){
                return klas(plain)
            } else {
                throw new Error(`Unsupported cipher code = ${cipher.code}.`);
            }
        }
    }
}
