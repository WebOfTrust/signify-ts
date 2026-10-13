import { EmptyMaterialError } from './kering.ts';

export {};
import libsodium from 'libsodium-wrappers-sumo';
import { Matter } from './matter.ts';
import { MtrDex } from './matter.ts';
import { Verfer } from './verfer.ts';
import { Cigar } from './cigar.ts';
import { Siger } from './siger.ts';
import { IdrDex } from './indexer.ts';
import { concat } from './core.ts';

interface SignerArgs {
    /** Raw private signing seed bytes. */
    raw?: Uint8Array | undefined;

    /**
     * CESR signer seed derivation code.
     *
     * Defaults to `MtrDex.Ed25519_Seed`.
     */
    code?: string;

    /** Fully qualified seed material as Base64 bytes, interpreted by `Matter`. */
    qb64b?: Uint8Array | undefined;

    /** Fully qualified seed material as a Base64 string, interpreted by `Matter`. */
    qb64?: string;

    /** Fully qualified seed material as binary CESR bytes, interpreted by `Matter`. */
    qb2?: Uint8Array | undefined;

    /**
     * Whether the derived verifier should use a transferable verifier code.
     *
     * This controls `verfer.code`; the signer seed code itself does not encode
     * transferability.
     */
    transferable?: boolean;
}

/*
 * Signing function interface
 */
type SignFn = (
        ser: Uint8Array,
        seed: Uint8Array,
        verfer: Verfer,
        index: number | null,
        only: boolean,
        ondex: number | undefined
    ) => Siger | Cigar;

/**
 * Private signing seed material with suite-specific signing behavior.
 *
 * `Signer` stores the qualified seed material inherited from `Matter`, derives
 * a matching `Verfer`, and signs byte serializations. This implementation
 * currently supports Ed25519 seed material.
 */
export class Signer extends Matter {
    /** Suite-specific signing function selected from the signer seed code. */
    private readonly _sign: SignFn;
    private readonly _verfer: Verfer;

    /**
     * Create a signer from raw or fully qualified seed material.
     *
     * When no seed material is supplied, an Ed25519 seed is generated randomly.
     * The derived verifier uses a transferable or non-transferable verifier code
     * based on `transferable`.
     *
     * @throws Error if `code` or the decoded seed code is unsupported.
     */
    constructor({
        raw,
        code = MtrDex.Ed25519_Seed,
        qb64,
        qb64b,
        qb2,
        transferable = true,
    }: SignerArgs) {
        try {
            super({ raw, code, qb64, qb64b, qb2 });
        } catch (e) {
            if (e instanceof EmptyMaterialError) {
                if (code === MtrDex.Ed25519_Seed) {
                    const raw = libsodium.randombytes_buf(
                        libsodium.crypto_sign_SEEDBYTES
                    );
                    super({ raw, code, qb64, qb64b, qb2 });
                } else {
                    throw new Error(`Unsupported signer code = ${code}.`);
                }
            } else {
                throw e;
            }
        }
        let verfer;
        if (this.code === MtrDex.Ed25519_Seed) {
            this._sign = this._ed25519;
            const keypair = libsodium.crypto_sign_seed_keypair(this.raw);
            verfer = new Verfer({
                raw: keypair.publicKey,
                code: transferable ? MtrDex.Ed25519 : MtrDex.Ed25519N,
            });
        } else {
            throw new Error(`Unsupported signer code = ${this.code}.`);
        }

        this._verfer = verfer;
    }

    /**
     * Public verifier derived from this signer's seed.
     *
     * `verfer.raw` is the public verification key corresponding to the private
     * seed in `raw`.
     */
    get verfer(): Verfer {
        return this._verfer;
    }

    /**
     * Sign a byte serialization.
     *
     * With `index === null` or an omitted `index`, returns an unindexed `Cigar`.
     * With a non-null `index`, returns an indexed `Siger`.
     *
     * @param ser Bytes to sign.
     * @param index Current, or main, signing key index in the event key list.
     * Defaults to `null`, which creates an unindexed signature.
     * @param only When `true`, create a current-list-only indexed signature and
     * omit `ondex`. When `false`, create a dual-index signature.
     * @param ondex Other index for dual-index signatures, commonly the prior-next
     * key digest index. Defaults to `index` when `only` is `false`.
     * @returns `Cigar` for unindexed signatures; `Siger` for indexed signatures.
     * @throws Error if an indexed signature is requested with a non-whole
     * `index` or `ondex`.
     */
    sign(
        ser: Uint8Array,
        index: number | null = null,
        only: boolean = false,
        ondex: number | undefined = undefined
    ): Siger | Cigar {
        return this._sign(ser, this.raw, this.verfer, index, only, ondex);
    }

    /**
     * Ed25519 implementation behind `sign`.
     *
     * Prefer `sign()` for normal use; this method expects the caller to supply
     * the seed and verifier that match this signing suite.
     *
     * @param ser Bytes to sign.
     * @param seed Raw private Ed25519 seed bytes.
     * @param verfer Verifier whose `raw` value is the public verification key.
     * @param index Current, or main, signing key index. `null` returns a `Cigar`;
     * otherwise the result is a `Siger`.
     * @param only When `true`, ignore `ondex` and create a current-list-only
     * signature.
     * @param ondex Other index for dual-index signatures. Defaults to `index`
     * when omitted and `only` is `false`.
     * @returns `Cigar` for unindexed signatures; `Siger` for indexed signatures.
     * @throws Error if `index` or `ondex` is not a non-negative integer.
     * @internal
     */
    _ed25519(
        ser: Uint8Array,
        seed: Uint8Array,
        verfer: Verfer,
        index: number | null,
        only: boolean = false,
        ondex: number | undefined
    ): Siger | Cigar {
        if (
            index !== null &&
            (!Number.isInteger(index) || index < 0)
        ) {
            throw new Error(
                `Invalid signing index = ${index}, not whole number.`
            );
        }

        if (ondex !== undefined && (!Number.isInteger(ondex) || ondex < 0)) {
            throw new Error(
                `Invalid ondex = ${ondex}, not whole number or undefined.`
            );
        }

        const sig = libsodium.crypto_sign_detached(
            ser,
            concat(seed, verfer.raw)
        );

        if (index === null) {
            return new Cigar({ raw: sig, code: MtrDex.Ed25519_Sig }, verfer);
        } else {
            let code: string;
            if (only) {
                ondex = undefined;
                if (index <= 63) {
                    code = IdrDex.Ed25519_Crt_Sig;
                } else {
                    code = IdrDex.Ed25519_Big_Crt_Sig;
                }
            } else {
                if (ondex === undefined) {
                    ondex = index;
                }

                if (ondex === index && index <= 63)
                    // both same and small
                    code = IdrDex.Ed25519_Sig; //  use  small both same
                //  otherwise big or both not same so use big both
                else code = IdrDex.Ed25519_Big_Sig; // use use big both
            }

            return new Siger(
                { raw: sig, code: code, index: index, ondex: ondex },
                verfer
            );
        }
    }
}
