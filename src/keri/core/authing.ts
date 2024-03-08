import { Signer } from './signer';
import { Verfer } from './verfer';
import { desiginput, sigbase, siginput } from './httping';
import { designature, Signage, signature } from '../end/ending';
import { Cigar } from './cigar';
import { Siger } from './siger';
import { nowUTC } from './utils';
import { b } from './core.ts';

export class Authenticater {
    static readonly DefaultFields = [
        '@method',
        '@path',
        'signify-resource',
        'signify-timestamp',
    ];
    private _verfer: Verfer;
    private readonly _csig: Signer;

    constructor(csig: Signer, verfer: Verfer) {
        this._csig = csig;
        this._verfer = verfer;
    }

    verify(
        headers: Headers,
        method: string,
        path: string,
        authority?: string,
    ): boolean {
        const siginputHeader = headers.get('Signature-Input');
        if (siginputHeader == null) {
            return false;
        }
        const signature = headers.get('Signature');
        if (signature == null) {
            return false;
        }
        const inputs = desiginput(siginputHeader);
        const input = inputs.get('signify');
        if (!input) {
            return false;
        }
        const ser = sigbase(
            input.fields,
            siginput(input),
            headers,
            method,
            path,
            authority,
        );
        const signage = designature(signature);
        const cig = signage[0].markers.get('signify');
        if (!this._verfer.verify(cig.raw, ser)) {
            throw new Error(`Signature for ${input.keyid} invalid.`);
        }
        return true;
    }

    sign(
        headers: Headers,
        method: string,
        path: string,
        authority?: string,
        fields?: Array<string>
    ): Headers {
        if (fields == undefined) {
            fields = Authenticater.DefaultFields;
        }
        const input = {
            fields,
            created: Math.floor(nowUTC().getTime() / 1000),
            alg: 'ed25519',
            keyid: this._csig.verfer.qb64,
        };
        const signatureParams = siginput(input);
        const signatureBase = sigbase(fields, signatureParams, headers, method, path, authority);
        const sid = `signify=${ signatureParams }`;
        headers.append('Signature-Input', sid);

        const sig = this._csig.sign(b(signatureBase));
        const markers = new Map<string, Siger | Cigar>();
        markers.set('signify', sig);
        const signage = new Signage(markers, false);
        const signed = signature([signage]);
        signed.forEach((value, key) => {
            headers.append(key, value);
        });

        return headers;
    }
}
