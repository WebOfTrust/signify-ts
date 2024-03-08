import { Item, Parameters, parseDictionary, serializeInnerList } from 'structured-headers';
import { b } from './core';
import Base64 from 'urlsafe-base64';
import { Buffer } from 'buffer';

export function normalize(header: string) {
    return header.trim();
}

export interface SiginputArgs {
    method: string;
    path: string;
    authority?: string;
    headers: Headers;
}

/**
 * Prepare signature-parameters (https://datatracker.ietf.org/doc/html/rfc9421#section-2.3)
 * and signature-base (https://datatracker.ietf.org/doc/html/rfc9421#section-2.5) strings based on the following input
 * @param fields - signature fields names in a signature order
 * @param signatureParams - signature params string
 * @param headers - request headers to derive signature input components from
 * @param method - request method
 * @param path - request path
 * @param authority - request authority
 */
export function sigbase(
    fields: Array<string>,
    signatureParams: string,
    headers: Headers,
    method: string,
    path: string,
    authority?: string,
): string {
    const items = new Array<string>();
    fields.forEach((field: string) => {
        if (field.startsWith('@')) {
            switch (field) {
                case '@method':
                    items.push(`"${field}": ${method}`);
                    break;
                case '@path':
                    items.push(`"${field}": ${path}`);
                    break;
                case '@authority':
                    items.push(`"${ field }": ${ authority }`);
                    break;
            }
        } else if (headers.has(field)) {
            const value = normalize(headers.get(field) as string);
            items.push(`"${field}": ${value}`);
        }
    });
    items.push(`"@signature-params": ${ signatureParams }`);
    return items.join('\n');
}

/**
 * Build a signature-params string based on the {@link Inputage} values
 * @param input - the input values for signature-params
 */
export function siginput(input: Inputage): string {
    const ifields = new Array<[string, Map<string, string>]>();
    input.fields.forEach((field: string) => {
        ifields.push([field, new Map()]);
    });
    const nameParams = new Map<string, string | number>();
    nameParams.set('created', input.created);
    if (input.expires != undefined) {
        nameParams.set('expires', input.expires);
    }
    if (input.nonce != undefined) {
        nameParams.set('nonce', input.nonce);
    }
    if (input.keyid != undefined) {
        nameParams.set('keyid', input.keyid);
    }
    if (input.context != undefined) {
        nameParams.set('context', input.context);
    }
    if (input.alg != undefined) {
        nameParams.set('alg', input.alg);
    }
    return serializeInnerList([ifields, nameParams]);
}

export class Unqualified {
    private readonly _raw: Uint8Array;

    constructor(raw: Uint8Array) {
        this._raw = raw;
    }

    get qb64(): string {
        return Base64.encode(Buffer.from(this._raw));
    }

    get qb64b(): Uint8Array {
        return b(this.qb64);
    }
}

export class Inputage {
    public fields: any;
    public created: any;
    public expires?: any;
    public nonce?: any;
    public alg?: any;
    public keyid?: any;
    public context?: any;
}


/**
 * Parse a Signature-Input value into an {@link Inputage} by label map
 * @param value - Signature-Input string
 */
export function desiginput(value: string): Map<string, Inputage> {
    const sid = parseDictionary(value);
    const siginputs = new Map<string, Inputage>();

    sid.forEach((value, key) => {
        const siginput = new Inputage();
        let list: Item[];
        let params;
        [list, params] = value as [Item[], Parameters];
        siginput.fields = list.map((item) => item[0]);

        if (!params.has('created')) {
            throw new Error(
                'missing required `created` field from signature input'
            );
        }
        siginput.created = params.get('created');

        if (params.has('expires')) {
            siginput.expires = params.get('expires');
        }

        if (params.has('nonce')) {
            siginput.nonce = params.get('nonce');
        }

        if (params.has('alg')) {
            siginput.alg = params.get('alg');
        }

        if (params.has('keyid')) {
            siginput.keyid = params.get('keyid');
        }

        if (params.has('context')) {
            siginput.context = params.get('context');
        }

        siginputs.set(key, siginput);
    });

    return siginputs;
}

/** Parse start, end and total from HTTP Content-Range header value
 * @param {string|null} header - HTTP Range header value
 * @param {string} typ - type of range, e.g. "aids"
 * @returns {start: number, end: number, total: number} - object with start, end and total properties
 */
export function parseRangeHeaders(
    header: string | null,
    typ: string
): { start: number; end: number; total: number } {
    if (header !== null) {
        const data = header.replace(`${typ} `, '');
        const values = data.split('/');
        const rng = values[0].split('-');

        return {
            start: parseInt(rng[0]),
            end: parseInt(rng[1]),
            total: parseInt(values[1]),
        };
    } else {
        return { start: 0, end: 0, total: 0 };
    }
}
