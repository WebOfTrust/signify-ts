import { MtrDex } from './matter';
import {
    deversify,
    Dict,
    Ident,
    Serials,
    versify,
    Version,
    Versionage,
} from './core';
import { Verfer } from './verfer';
import { Diger } from './diger';

export class Serder {
    private _kind: Serials;
    private _raw: string = '';
    private _ked: Dict<any> = {};
    private _ident: Ident = Ident.KERI;
    private _size: number = 0;
    private _version: Version = Versionage;
    private readonly _code: string;

    constructor(
        ked: Dict<any>,
        kind: Serials = Serials.JSON,
        code: string = MtrDex.Blake3_256
    ) {
        this._code = code;
        this._kind = kind;
        this.ked = ked;
    }

    set ked(ked: Dict<any>) {
        let [raw, ident, kind, kd, version] = this._exhale(ked, this._kind);
        let size = raw.length;
        this._raw = raw;
        this._ident = ident;
        this._ked = kd;
        this._kind = kind;
        this._size = size;
        this._version = version;
    }

    get pre(): string {
        return this._ked['i'];
    }

    get ked(): Dict<any> {
        return this._ked;
    }

    get code(): string {
        return this._code;
    }

    get raw(): string {
        return this._raw;
    }

    get kind(): Serials {
        return this._kind;
    }

    private _exhale(
        ked: Dict<any>,
        kind: Serials
    ): [string, Ident, Serials, Dict<any>, Version] {
        return sizeify(ked, kind);
    }

    get ident(): Ident {
        return this._ident;
    }

    get size(): number {
        return this._size;
    }

    get version(): Version {
        return this._version;
    }
    get verfers(): Verfer[] {
        let keys: any = [];
        if ('k' in this._ked) {
            // establishment event
            keys = this._ked['k'];
        } else {
            // non-establishment event
            keys = [];
        }
        // create a new Verfer for each key
        let verfers = [];
        for (let key of keys) {
            verfers.push(new Verfer({ qb64: key }));
        }
        return verfers;
    }

    get digers(): Diger[] {
        let keys: any = [];
        if ('n' in this._ked) {
            // establishment event
            keys = this._ked['n'];
        } else {
            // non-establishment event
            keys = [];
        }
        // create a new Verfer for each key
        let digers = [];
        for (let key of keys) {
            digers.push(new Diger({ qb64: key }));
        }
        return digers;
    }

    pretty() {
        return JSON.stringify(this._ked, undefined, 2);
    }
}

export function dumps(ked: Object, kind: Serials.JSON): string {
    if (kind == Serials.JSON) {
        return JSON.stringify(ked);
    } else {
        throw new Error('unsupported event encoding');
    }
}

export function sizeify(
    ked: Dict<any>,
    kind?: Serials
): [string, Ident, Serials, Dict<any>, Version] {
    if (!('v' in ked)) {
        throw new Error('Missing or empty version string');
    }

    let [ident, knd, version] = deversify(ked['v'] as string);
    if (version != Versionage) {
        throw new Error(`unsupported version ${version.toString()}`);
    }

    if (kind == undefined) {
        kind = knd;
    }

    let raw = dumps(ked, kind);
    let size = raw.length;

    ked['v'] = versify(ident, version, kind, size);

    raw = dumps(ked, kind);

    return [raw, ident, kind, ked, version];
}
