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

class TextCodex {
    static readonly Bytes_L0: string = '4B';   // Byte String lead size 0
    static readonly Bytes_L1: string = '5B';   // Byte String lead size 1
    static readonly Bytes_L2: string = '6B';   // Byte String lead size 2
    static readonly Bytes_Big_L0: string = '7AAB'; // Byte String big lead size 0
    static readonly Bytes_Big_L1: string = '8AAB'; // Byte String big lead size 1
    static readonly Bytes_Big_L2: string = '9AAB'; // Byte String big lead size 2

    static *iterator(): IterableIterator<string> {
        yield TextCodex.Bytes_L0;
        yield TextCodex.Bytes_L1;
        yield TextCodex.Bytes_L2;
        yield TextCodex.Bytes_Big_L0;
        yield TextCodex.Bytes_Big_L1;
        yield TextCodex.Bytes_Big_L2;
    }
}

export class Texter extends Matter {

    constructor({
                    raw = null,
                    qb64b = null,
                    qb64 = null,
                    qb2 = null,
                    code = MtrDex.Bytes_L0,
                    text = null,
                }: TexterArgs) {

        if (!raw && !qb64b && !qb64 && !qb2) {
            if (!text) {
                throw new EmptyMaterialError("Missing text string.");
            }
            if (typeof text === "string") {
                raw = new TextEncoder().encode(text);
            } else {
                raw = text;
            }
        }

        super({ raw, qb64b, qb64, qb2, code });

        if (!code || ![...TextCodex.iterator()].includes(code)) {
            throw new Error(`Invalid code = ${code} for Texter.`);
        }
    }

    get text(): string {
        return new TextDecoder().decode(this.raw);
    }
}
