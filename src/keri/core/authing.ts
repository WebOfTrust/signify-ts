import libsodium from 'libsodium-wrappers-sumo';
import { Signer } from './signer.ts';
import { Verfer } from './verfer.ts';
import {
    desiginput,
    HEADER_SIG,
    HEADER_SIG_DESTINATION,
    HEADER_SIG_INPUT,
    HEADER_SIG_SENDER,
    HEADER_SIG_TIME,
    normalize,
    siginput,
} from './httping.ts';
import { Signage, signature, designature } from '../end/ending.ts';
import { Cigar } from './cigar.ts';
import { Siger } from './siger.ts';
import { Diger } from './diger.ts';
import { MtrDex } from './matter.ts';
import { b, d } from './core.ts';

export abstract class Authenticator {
    protected verfer: Verfer;
    protected readonly csig: Signer;

    constructor(csig: Signer, verfer: Verfer) {
        this.csig = csig;
        this.verfer = verfer;
    } 

    abstract prepare(request: Request, local: string, remote: string): Promise<Request>;
    abstract verify(request: Request, response: Response, local: string, remote: string): Promise<Response>;
}

export class SignedHeaderAuthenticator extends Authenticator {
    static DefaultFields = [
        '@method',
        '@path',
        'signify-resource',
        HEADER_SIG_TIME.toLowerCase(),
    ];

    async prepare(request: Request, _local: string, _remote: string): Promise<Request> {
        const headers = request.headers;
        const signedHeaders = this.sign(
            request.headers,
            request.method,
            new URL(request.url).pathname
        )

        signedHeaders.forEach((value, key) => {
            headers.set(key, value);
        });

        return request;
    }

    async verify(request: Request, response: Response, _local: string, remote: string): Promise<Response> {
        if (response.status === 401) {
            throw new Error(
                `HTTP ${request.method} ${new URL(request.url).pathname} - ${response.status} ${response.statusText}`
            );
        }

        if (!this.verifyHeaders(
            response.headers,
            request.method,
            new URL(request.url).pathname
        )) {
            throw new Error('response verification failed');
        }
        
        if (remote !== response.headers.get(HEADER_SIG_SENDER)) {
            throw new Error('message from a different remote agent');
        }

        return response;
    }

    private verifyHeaders(headers: Headers, method: string, path: string): boolean {
        const siginput = headers.get(HEADER_SIG_INPUT);
        if (siginput == null) {
            return false;
        }
        const signature = headers.get('Signature');
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
            if (!cig || !this.verfer.verify(cig.raw, ser)) {
                throw new Error(`Signature for ${input.keyid} invalid.`);
            }
        });

        return true;
    }

    private sign(
        headers: Headers,
        method: string,
        path: string,
    ): Headers {
        const [header, sig] = siginput(this.csig, {
            name: 'signify',
            method,
            path,
            headers,
            fields: SignedHeaderAuthenticator.DefaultFields,
            alg: 'ed25519',
            keyid: this.csig.verfer.qb64,
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
}

export class EssrAuthenticator extends Authenticator {
    private readonly cx25519Pub: Uint8Array;
    private readonly cx25519Priv: Uint8Array;

    private readonly vx25519Pub: Uint8Array;

    constructor(csig: Signer, verfer: Verfer) {
        super(csig, verfer);
        const sigkey = new Uint8Array(
            this.csig.raw.length + this.csig.verfer.raw.length
        );
        sigkey.set(this.csig.raw);
        sigkey.set(this.csig.verfer.raw, this.csig.raw.length);
        this.cx25519Priv =
            libsodium.crypto_sign_ed25519_sk_to_curve25519(sigkey);
        this.cx25519Pub = libsodium.crypto_scalarmult_base(this.cx25519Priv);

        this.vx25519Pub = libsodium.crypto_sign_ed25519_pk_to_curve25519(
            this.verfer.raw
        );
    }

    async prepare(request: Request, local: string, remote: string): Promise<Request> {
        const dt = new Date().toISOString().replace('Z', '000+00:00');

        const headers = new Headers();
        headers.set(HEADER_SIG_SENDER, local);
        headers.set(HEADER_SIG_DESTINATION, remote);
        headers.set(HEADER_SIG_TIME, dt);
        headers.set('Content-Type', 'application/octet-stream');

        const requestStr = await EssrAuthenticator.serializeRequest(request);
        const raw = libsodium.crypto_box_seal(requestStr, this.vx25519Pub);

        const diger = new Diger({ code: MtrDex.Blake3_256 }, raw);
        const payload = {
            src: local,
            dest: remote,
            d: diger.qb64,
            dt,
        };

        const sig = this.csig.sign(b(JSON.stringify(payload)));
        const markers = new Map<string, Siger | Cigar>();
        markers.set('signify', sig);
        const signage = new Signage(markers, false);
        const signed = signature([signage]);

        signed.forEach((value, key) => {
            headers.append(key, value);
        });

        return new Request(new URL(request.url).origin + '/', {
            method: 'POST',
            body: raw,
            headers,
        });
    }

    async verify(request: Request, response: Response, local: string, remote: string): Promise<Response> {
        if (response.status === 401) {
            throw new Error(
                `HTTP ${request.method} ${new URL(request.url).pathname} - ${response.status} ${response.statusText}`
            );
        }

        return await this.unwrap(response, remote, local);
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

    static async streamToBytes(stream: ReadableStream): Promise<Uint8Array> {
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

    private async unwrap(
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
        if (!cig) {
            throw new Error('Invalid signature format - missing "signify" marker');
        }

        const verified = this.verfer.verify(
            cig.raw,
            b(JSON.stringify(payload))
        );
        if (!verified) {
            throw new Error('Invalid signature');
        }

        const plaintext = d(
            libsodium.crypto_box_seal_open(
                ciphertext,
                this.cx25519Pub,
                this.cx25519Priv
            )
        );
        const response = EssrAuthenticator.deserializeResponse(plaintext);

        if (response.headers.get(HEADER_SIG_SENDER) !== sender) {
            throw new Error(
                'Invalid ESSR payload, missing or incorrect encrypted sender'
            );
        }

        return response;
    }

    static deserializeResponse(httpString: string): Response {
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
