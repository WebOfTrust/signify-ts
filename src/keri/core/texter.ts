import { Matter, MtrDex } from './matter';
import { EmptyMaterialError } from "./kering";

interface TexterArgs {
    raw?: Uint8Array;
    qb64b?: Uint8Array;
    qb64?: string;
    qb2?: Uint8Array;
    code?: string;
    text?: string | Uint8Array;
}

class Texter extends Matter {
    constructor({
                    raw,
                    qb64b,
                    qb64,
                    qb2,
                    code,
                    text,
                }: TexterArgs) {

        if (text !== undefined) {
            if (typeof text === "string") {
                raw = new TextEncoder().encode(text);
            } else {
                raw = text;
            }
        }

        if (!code && raw) {
            const length = raw.length;
            if (length < 64 ** 2) {
                code = MtrDex.Bytes_L0; // Handle data < 4096 bytes
            } else if (length < 64 ** 3) {
                code = MtrDex.Bytes_L1;
            } else if (length < 64 ** 4) {
                code = MtrDex.Bytes_L2;
            } else if (length < 64 ** 5) {
                code = MtrDex.Bytes_Big_L0;
            } else if (length < 64 ** 6) {
                code = MtrDex.Bytes_Big_L1;
            } else if (length < 64 ** 7) {
                code = MtrDex.Bytes_Big_L2;
            } else {
                throw new Error("Text size exceeds the maximum supported size.");
            }
        }

        if (!raw && !qb64b && !qb64 && !qb2 && text === undefined) {
            throw new EmptyMaterialError("Missing text string.");
        }

        super({ raw, qb64b, qb64, qb2, code });

        if (!code || ![MtrDex.Bytes_L0, MtrDex.Bytes_L1, MtrDex.Bytes_L2, MtrDex.Bytes_Big_L0, MtrDex.Bytes_Big_L1, MtrDex.Bytes_Big_L2].includes(code)) {
            throw new Error(`Invalid code = ${code} for Texter.`);
        }
    }

    get text(): string {
        return new TextDecoder().decode(this.raw);
    }
}

export {Texter}