import { blake3 } from '@noble/hashes/blake3';
import { deversify, Serials } from './core.ts';
import { EmptyMaterialError } from './kering.ts';
import { DigiDex, Matter, MatterArgs, MtrDex } from './matter.ts';
import { dumps, sizeify } from './serder.ts';

const Dummy = '#';

export enum Ids {
    d = 'd',
}

export interface BaseSAD extends Record<string, unknown> {
    d?: string;
    v?: string;
    t?: string;
}

export class Saider<T extends BaseSAD = BaseSAD> extends Matter {
    constructor(
        { raw, code, qb64b, qb64, qb2 }: MatterArgs,
        sad?: T,
        kind?: Serials,
        label: string = Ids.d
    ) {
        try {
            super({ raw, code, qb64b, qb64, qb2 });
        } catch (e) {
            if (e instanceof EmptyMaterialError) {
                if (sad == undefined || !(label in sad)) {
                    throw e;
                }

                if (code == undefined) {
                    if (sad[label] != '') {
                        super({ qb64: String(sad[label]), code: code });
                        code = this.code;
                    } else {
                        code = MtrDex.Blake3_256;
                    }
                }

                if (!DigiDex.has(code)) {
                    throw new Error(`Unsupported digest code = ${code}`);
                }

                [raw] = Saider._derive({ ...sad }, code, kind, label);
                super({ raw: raw, code: code });
            } else {
                throw e;
            }
        }

        if (!this.digestive) {
            throw new Error(`Unsupported digest code = ${this.code}.`);
        }
    }

    private static _derive(
        sad: BaseSAD,
        code: string,
        kind: Serials | undefined,
        label: string
    ): [Uint8Array, BaseSAD] {
        if (!DigiDex.has(code)) {
            throw new Error(`Unsupported digest code = ${code}.`);
        }

        sad = { ...sad };
        sad[label] = ''.padStart(Matter.Sizes.get(code)!.fs!, Dummy);
        if ('v' in sad) {
            [, , kind, sad] = sizeify(sad, kind);
        }

        const ser = { ...sad };

        const cpa = Saider._serialze(ser, kind);

        switch (code) {
            case MtrDex.Blake3_256:
                return [blake3.create({ dkLen: 32 }).update(cpa).digest(), sad];
            default:
                throw new Error(`Unsupported digest code = ${code}.`);
        }
    }

    public derive(
        sad: BaseSAD,
        code: string,
        kind: Serials | undefined,
        label: string
    ): [Uint8Array, BaseSAD] {
        code = code != undefined ? code : this.code;
        return Saider._derive(sad, code, kind, label);
    }

    public verify(
        sad: BaseSAD,
        prefixed: boolean = false,
        versioned: boolean = false,
        kind?: Serials,
        label: string = Ids.d
    ): boolean {
        try {
            const [raw, dsad] = Saider._derive(sad, this.code, kind, label);
            const saider = new Saider({ raw: raw, code: this.code });
            if (this.qb64 != saider.qb64) {
                return false;
            }

            if ('v' in sad && versioned) {
                if (sad['v'] != dsad['v']) {
                    return false;
                }
            }

            if (prefixed && sad[label] != this.qb64) {
                return false;
            }
        } catch (e) {
            return false;
        }

        return true;
    }

    private static _serialze(sad: BaseSAD, kind?: Serials): string {
        let knd = Serials.JSON;
        if ('v' in sad) {
            [, knd] = deversify(sad['v']!);
        }

        if (kind == undefined) {
            kind = knd;
        }

        return dumps(sad, kind);
    }

    public static saidify<T extends BaseSAD>(
        sad: T,
        code: string = MtrDex.Blake3_256,
        kind: Serials = Serials.JSON,
        label: string = Ids.d
    ): [Saider, T] {
        if (!(label in sad)) {
            throw new Error(`Missing id field labeled=${label} in sad.`);
        }

        const [raw, derivedSad] = Saider._derive(sad, code, kind, label);
        const saider = new Saider(
            { raw: raw, code: code },
            undefined,
            kind,
            label
        );
        derivedSad[label] = saider.qb64;
        return [saider, derivedSad as T];
    }
}
