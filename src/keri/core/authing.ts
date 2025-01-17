import libsodium from 'libsodium-wrappers-sumo';
import { Signer } from './signer';
import { Verfer } from './verfer';
import {
    desiginput,
    HEADER_SIG,
    HEADER_SIG_DESTINATION,
    HEADER_SIG_INPUT,
    HEADER_SIG_SENDER,
    HEADER_SIG_TIME,
    normalize,
    siginput,
} from './httping';
import { Signage, signature, designature } from '../end/ending';
import { Cigar } from './cigar';
import { Siger } from './siger';
import { Diger } from './diger';
import { MtrDex } from './matter';
import { b, d } from './core';

export class Authenticator {
    static DefaultFields = [
        '@method',
        '@path',
        'signify-resource',
        HEADER_SIG_TIME.toLowerCase(),
    ];
    private readonly _csig: Signer;
    private readonly _cx25519Pub: Uint8Array;
    private readonly _cx25519Priv: Uint8Array;

    private readonly _verfer: Verfer;
    private readonly _vx25519Pub: Uint8Array;

    constructor(csig: Signer, verfer: Verfer) {
        this._csig = csig;
        const sigkey = new Uint8Array(
            this._csig.raw.length + this._csig.verfer.raw.length
        );
        sigkey.set(this._csig.raw);
        sigkey.set(this._csig.verfer.raw, this._csig.raw.length);
        this._cx25519Priv =
            libsodium.crypto_sign_ed25519_sk_to_curve25519(sigkey);
        this._cx25519Pub = libsodium.crypto_scalarmult_base(this._cx25519Priv);

        this._verfer = verfer;
        this._vx25519Pub = libsodium.crypto_sign_ed25519_pk_to_curve25519(
            this._verfer.raw
        );
    }

    verify(headers: Headers, method: string, path: string): boolean {
        const siginput = headers.get(HEADER_SIG_INPUT);
        if (siginput == null) {
            return false;
        }
        const signature = headers.get(HEADER_SIG);
        if (signature == null) {
            return false;
        }
        let inputs = desiginput(siginput);
        inputs = inputs.filter((input) => input.name == 'signify');
        if (inputs.length == 0) {
            return false;
        }
        inputs.forEach((input) => {
            const items = new Array<string>();
            input.fields!.forEach((field: string) => {
                if (field.startsWith('@')) {
                    if (field == '@method') {
                        items.push(`"${field}": ${method}`);
                    } else if (field == '@path') {
                        items.push(`"${field}": ${path}`);
                    }
                } else {
                    if (headers.has(field)) {
                        const value = normalize(headers.get(field) as string);
                        items.push(`"${field}": ${value}`);
                    }
                }
            });
            const values = new Array<string>();
            values.push(`(${input.fields!.join(' ')})`);
            values.push(`created=${input.created}`);
            if (input.expires != undefined) {
                values.push(`expires=${input.expires}`);
            }
            if (input.nonce != undefined) {
                values.push(`nonce=${input.nonce}`);
            }
            if (input.keyid != undefined) {
                values.push(`keyid=${input.keyid}`);
            }
            if (input.context != undefined) {
                values.push(`context=${input.context}`);
            }
            if (input.alg != undefined) {
                values.push(`alg=${input.alg}`);
            }
            const params = values.join(';');
            items.push(`"@signature-params: ${params}"`);
            const ser = items.join('\n');
            const signage = designature(signature!);
            const markers = signage[0].markers as Map<string, Siger | Cigar>;
            const cig = markers.get(input.name);
            if (!cig || !this._verfer.verify(cig.raw, ser)) {
                throw new Error(`Signature for ${input.keyid} invalid.`);
            }
        });

        return true;
    }

    sign(
        headers: Headers,
        method: string,
        path: string,
        fields?: Array<string>
    ): Headers {
        if (fields == undefined) {
            fields = Authenticator.DefaultFields;
        }

        const [header, sig] = siginput(this._csig, {
            name: 'signify',
            method,
            path,
            headers,
            fields,
            alg: 'ed25519',
            keyid: this._csig.verfer.qb64,
        });

        header.forEach((value, key) => {
            headers.append(key, value);
        });

        const markers = new Map<string, Siger | Cigar>();
        markers.set('signify', sig);
        const signage = new Signage(markers, false);
        const signed = signature([signage]);
        signed.forEach((value, key) => {
            headers.append(key, value);
        });

        return headers;
    }

    async wrap(
        request: Request,
        baseUrl: string,
        sender: string,
        receiver: string
    ): Promise<Request> {
        const dt = new Date().toISOString().replace('Z', '000+00:00');

        const headers = new Headers();
        headers.set(HEADER_SIG_SENDER, sender);
        headers.set(HEADER_SIG_DESTINATION, receiver);
        headers.set(HEADER_SIG_TIME, dt);
        headers.set('Content-Type', 'application/octet-stream');

        const requestStr = await Authenticator.serializeRequest(request);
        const raw = libsodium.crypto_box_seal(requestStr, this._vx25519Pub);

        const diger = new Diger({ code: MtrDex.Blake3_256 }, raw);
        const payload = {
            src: sender,
            dest: receiver,
            d: diger.qb64,
            dt,
        };

        const sig = this._csig.sign(b(JSON.stringify(payload)));
        const markers = new Map<string, Siger | Cigar>();
        markers.set('signify', sig);
        const signage = new Signage(markers, false);
        const signed = signature([signage]);

        signed.forEach((value, key) => {
            headers.append(key, value);
        });

        return new Request(baseUrl + '/', {
            method: 'POST',
            body: raw,
            headers,
        });
    }

    static async serializeRequest(request: Request) {
        let headers = '';
        request.headers.forEach((value, name) => {
            headers += `${name}: ${value}\r\n`;
        });

        let body = '';
        if (request.method !== 'GET' && request.body) {
            body = Buffer.from(await this.streamToBytes(request.body)).toString(
                'utf-8'
            );
        }

        return `${request.method} ${request.url} HTTP/1.1\r\n${headers}\r\n${body}`;
    }

    private static async streamToBytes(stream: ReadableStream) {
        const reader = stream.getReader();
        const chunks = [];
        let done, value;

        while ((({ done, value } = await reader.read()), !done)) {
            if (value) chunks.push(value);
        }
        reader.releaseLock();

        const totalLength = chunks.reduce(
            (acc, chunk) => acc + chunk.length,
            0
        );
        const result = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result;
    }

    async unwrap(
        wrapper: Response,
        sender: string,
        receiver: string
    ): Promise<Response> {
        const signature = wrapper.headers.get(HEADER_SIG);
        if (!signature) {
            throw new Error('Signature is missing from ESSR payload');
        }

        if (wrapper.headers.get(HEADER_SIG_SENDER) !== sender) {
            throw new Error('Message from a different remote agent');
        }

        if (wrapper.headers.get(HEADER_SIG_DESTINATION) !== receiver) {
            throw new Error(
                'Invalid ESSR payload, missing or incorrect destination prefix'
            );
        }

        const dt = wrapper.headers.get(HEADER_SIG_TIME);
        if (!dt) {
            throw new Error('Timestamp is missing from ESSR payload');
        }

        const ciphertext = new Uint8Array(await wrapper.arrayBuffer());
        const diger = new Diger({ code: MtrDex.Blake3_256 }, ciphertext);

        const payload = {
            src: sender,
            dest: receiver,
            d: diger.qb64,
            dt,
        };

        const signages = designature(signature);
        const markers = signages[0].markers as Map<string, Siger | Cigar>;
        const cig = markers.get('signify');

        const verified = this._verfer.verify(
            cig?.raw,
            Buffer.from(JSON.stringify(payload))
        );
        if (!verified) {
            throw new Error('Invalid signature');
        }

        const plaintext = d(
            libsodium.crypto_box_seal_open(
                ciphertext,
                this._cx25519Pub,
                this._cx25519Priv
            )
        );
        const response = this.deserializeResponse(plaintext);

        if (response.headers.get(HEADER_SIG_SENDER) !== sender) {
            throw new Error(
                'Invalid ESSR payload, missing or incorrect encrypted sender'
            );
        }

        return response;
    }

    private deserializeResponse(httpString: string) {
        const lines = httpString.split('\r\n');

        const [_, statusCode, ...statusTextArr] = lines[0].split(' ');
        const statusText = statusTextArr.join(' ');
        const status = Number(statusCode);

        const headers = new Headers();
        let body = '';
        let bodyStart = false;

        for (let i = 1; i < lines.length; i++) {
            if (lines[i] === '') {
                bodyStart = true;
                continue;
            }

            if (bodyStart) {
                body += lines[i] + '\n';
                continue;
            }

            const [key, value] = lines[i].split(': ');
            headers.append(key, value);
        }

        return new Response(body ? body.trim() : null, {
            status,
            statusText,
            headers,
        });
    }
}
