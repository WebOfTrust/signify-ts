import { Fraction, format, fraction, sum } from 'mathjs';
import { BexDex, Matter, NumDex } from './matter.ts';
import { CesrNumber } from './number.ts';

interface Thold {
    thold?: number | Array<Array<Fraction>>;
    limen?: string;
    sith?: number | string | string[] | (string | string[])[];
}

export class Tholder {
    private _weighted: boolean = false;
    private _thold: number | Array<Array<Fraction>> = 0;
    private _size: number = 0;
    private _number: CesrNumber | undefined = undefined;
    private _satisfy: ((indices: number[]) => boolean) | undefined = undefined;

    // private _bexter: any

    constructor(kargs: Thold) {
        if (kargs.thold !== undefined) {
            this._processThold(kargs.thold);
        } else if (kargs.limen != undefined) {
            this._processLimen(kargs.limen);
        } else if (kargs.sith !== undefined) {
            this._processSith(kargs.sith);
        } else {
            throw new Error('Missing threshold expression');
        }
    }

    get weighted(): boolean {
        return this._weighted;
    }

    get thold(): number | Array<Array<Fraction>> {
        return this._thold;
    }

    get size(): number {
        return this._size;
    }

    get limen() {
        return this._number?.qb64b;
    }

    get sith(): string | string[] | string[][] {
        if (this.weighted && Array.isArray(this.thold)) {
            const sith = this.thold.map((clause: Fraction[]) => {
                return clause.map((c) => {
                    if (0 < Number(c) && Number(c) < 1) {
                        return format(c, { fraction: 'ratio' });
                    } else {
                        return format(c, { fraction: 'decimal' });
                    }
                });
            });

            return sith.length == 1 ? sith[0] : sith;
        } else {
            return this.thold.toString(16);
        }
    }

    get json(): string {
        return JSON.stringify(this.sith);
    }

    get num(): number | undefined {
        return this._weighted ? undefined : (this._thold as number);
    }

    private _processThold(thold: number | Array<Array<Fraction>>) {
        if (typeof thold === 'number') {
            this._processUnweighted(thold);
        } else {
            this._processWeighted(thold);
        }
    }

    private _processLimen(limen: string) {
        const matter = new Matter({ qb64: limen });
        if (NumDex.has(matter.code)) {
            const number = new CesrNumber({
                raw: matter.raw,
                code: matter.code,
            });
            this._processUnweighted(number.num);
        } else if (BexDex.has(matter.code)) {
            // TODO: Implement Bexter
        } else {
            throw new Error('Invalid code for limen=' + matter.code);
        }
    }

    private _processSith(
        sith: string | number | Array<string> | (string | string[])[]
    ) {
        if (typeof sith == 'number') {
            this._processUnweighted(sith);
        } else if (typeof sith == 'string' && sith.indexOf('[') == -1) {
            this._processUnweighted(parseInt(sith, 16));
        } else {
            let _sith: string | string[] | string[][] | (string | string[])[] =
                sith;
            if (typeof sith == 'string') {
                _sith = JSON.parse(sith);
            }

            if (!Array.isArray(_sith) || _sith.length == 0) {
                throw new Error('Empty weight list');
            }

            const mask = _sith.map((x) => {
                return typeof x !== 'string';
            });

            if (mask.length > 0 && !mask.every((x: boolean) => x)) {
                _sith = [_sith] as string[][];
            }

            for (const c of _sith as string[][]) {
                const mask = c.map((x) => {
                    return typeof x === 'string';
                });
                if (mask.length > 0 && !mask.every((x: boolean) => x)) {
                    throw new Error(
                        'Invalid sith, some weights in clause ' +
                            mask +
                            ' are non string'
                    );
                }
            }

            const thold = this._processClauses(_sith as string[][]);
            this._processWeighted(thold);
        }
    }

    private _processClauses(sith: Array<Array<string>>): Fraction[][] {
        const thold = new Array<Array<Fraction>>();
        sith.forEach((clause) => {
            thold.push(
                clause.map((w) => {
                    return this.weight(w);
                })
            );
        });
        return thold;
    }

    private _processUnweighted(thold: number) {
        if (thold < 0) {
            throw new Error('Non-positive int threshold = {thold}.');
        }
        this._thold = thold;
        this._weighted = false;
        this._size = this._thold; // used to verify that keys list size is at least size
        this._satisfy = this._satisfy_numeric;
        this._number = new CesrNumber({}, thold);
        // this._bexter = undefined
    }

    private _processWeighted(thold: Array<Array<Fraction>>) {
        for (const clause of thold) {
            if (Number(sum(clause)) < 1) {
                throw new Error(
                    'Invalid sith clause: ' +
                        thold +
                        'all clause weight sums must be >= 1'
                );
            }
        }

        this._thold = thold;
        this._weighted = true;
        this._size = thold.reduce((acc, currentValue) => {
            return acc + currentValue.length;
        }, 0);
        this._satisfy = this._satisfy_weighted;
        //TODO: created Bexter if needed
    }

    private weight(w: string): Fraction {
        return fraction(w);
    }

    private _satisfy_numeric(indices: number[]) {
        return (
            (this.thold as number) > 0 &&
            indices.length >= (this.thold as number)
        ); // at least one
    }

    private _satisfy_weighted(indices: number[]) {
        if (indices.length === 0) {
            return false;
        }

        const indexes: Set<number> = new Set(indices.sort());
        const sats = new Array(indices.length).fill(false);
        for (const idx of indexes) {
            sats[idx] = true;
        }
        let wio = 0;
        for (const clause of this.thold as Array<Array<Fraction>>) {
            let cw = 0;
            for (const w of clause) {
                if (sats[wio]) {
                    cw += Number(w);
                }
                wio += 1;
            }
            if (cw < 1) {
                return false;
            }
        }

        return true;
    }

    public satisfy(indices: number[]): boolean {
        return !!this._satisfy?.(indices);
    }
}
