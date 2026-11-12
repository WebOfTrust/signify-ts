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
    legacySignatureBase,
    siginput,
} from './httping.ts';
import { Signage, signature, designature } from '../end/ending.ts';
import { Cigar } from './cigar.ts';
import { Siger } from './siger.ts';
import { Diger } from './diger.ts';
import { MtrDex } from './matter.ts';
import { b, d } from './core.ts';
import { HttpSigPolicy, signRequest, verifyResponse } from './httpsigning.ts';

export abstract class Authenticator {
    protected verfer: Verfer;
    protected readonly csig: Signer;

    constructor(csig: Signer, verfer: Verfer) {
        this.csig = csig;
        this.verfer = verfer;
    }

    abstract prepare(
        request: Request,
        local: string,
        remote: string
    ): Promise<Request>;
    abstract verify(
        request: Request,
        response: Response,
        local: string,
        remote: string
    ): Promise<Response>;
}

export class SignedHeaderAuthenticator extends Authenticator {
    static DefaultFields = [
        '@method',
        '@path',
        'signify-resource',
        HEADER_SIG_TIME.toLowerCase(),
    ];

    async prepare(
        request: Request,
        _local: string,
        _remote: string
    ): Promise<Request> {
        const headers = request.headers;
        const signedHeaders = this.sign(
            request.headers,
            request.method,
            new URL(request.url).pathname
        );

        signedHeaders.forEach((value, key) => {
            headers.set(key, value);
        });

        return request;
    }

    async verify(
        request: Request,
        response: Response,
        _local: string,
        remote: string
    ): Promise<Response> {
        if (response.status === 401) {
            throw new Error(
                `HTTP ${request.method} ${new URL(request.url).pathname} - ${response.status} ${response.statusText}`
            );
        }

        if (remote !== response.headers.get(HEADER_SIG_SENDER)) {
            throw new Error('message from a different remote agent');
        }

        if (
            !this.verifyHeaders(
                response.headers,
                request.method,
                new URL(request.url).pathname
            )
        ) {
            throw new Error('response verification failed');
        }

        return response;
    }

    private verifyHeaders(
        headers: Headers,
        method: string,
        path: string
    ): boolean {
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
            const ser = legacySignatureBase(input, headers, method, path);
            const signage = designature(signature!);
            const markers = signage[0].markers as Map<string, Siger | Cigar>;
            const cig = markers.get(input.name);
            if (!cig || !this.verfer.verify(cig.raw, ser)) {
                throw new Error(`Signature for ${input.keyid} invalid.`);
            }
        });

        return true;
    }

    private sign(headers: Headers, method: string, path: string): Headers {
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

/** Options for {@link HttpSigAuthenticator}. */
export interface HttpSigAuthenticatorOptions {
    /** Freshness and coverage policy for responses. Default profile §3, §6. */
    policy?: HttpSigPolicy;
    /**
     * The current time in seconds since the epoch (not milliseconds), used
     * for `created` and for response freshness. It must return a finite
     * number; a fractional value is rounded down to whole seconds for both
     * (profile §6). Default: the system clock.
     */
    clock?: () => number;
}

/**
 * Canonical mode: signs requests and verifies responses under the KERI
 * profile of RFC 9421 (see `httpsigning.ts`).
 *
 * `prepare` signs with `keyid` = `local`, the signer's AID, covering
 * `@method @authority @path @query` and, for a non-empty body,
 * `content-digest`. It does not use `Signify-Resource` or
 * `Signify-Timestamp`. `verify` requires the response to be signed in
 * canonical mode by `remote`, whose key is `verfer`; an unsigned 401 is
 * refused as `unauthenticated`, and every other failure is an
 * {@link HttpSigRefusal} carrying the profile's neutral code. Nothing here
 * retries in legacy mode after a refusal (profile §8).
 */
export class HttpSigAuthenticator extends Authenticator {
    private readonly options: HttpSigAuthenticatorOptions;
    // The content each prepared request was signed over, so that verify can
    // bind the response to exactly what was sent.
    private readonly bodies = new WeakMap<Request, Uint8Array>();

    constructor(
        csig: Signer,
        verfer: Verfer,
        options: HttpSigAuthenticatorOptions = {}
    ) {
        super(csig, verfer);
        this.options = options;
    }

    async prepare(
        request: Request,
        local: string,
        _remote: string
    ): Promise<Request> {
        const body = new Uint8Array(await request.clone().arrayBuffer());
        const fields = signRequest({
            method: request.method,
            url: request.url,
            headers: request.headers,
            body,
            signer: this.csig,
            keyid: local,
            created: this.created(),
        });
        for (const [name, value] of Object.entries(fields)) {
            request.headers.set(name, value);
        }
        this.bodies.set(request, body);
        return request;
    }

    /** `created` from the clock, in whole seconds; undefined for now. */
    private created(): number | undefined {
        const clock = this.options.clock;
        return clock === undefined ? undefined : Math.floor(clock());
    }

    async verify(
        request: Request,
        response: Response,
        _local: string,
        remote: string
    ): Promise<Response> {
        // The exact content prepare signed over: the response is bound to it
        // (profile §3), so a request this authenticator did not prepare is an
        // error rather than a request assumed to have had no body.
        const sent = this.bodies.get(request);
        if (sent === undefined) {
            throw new Error(
                'HttpSigAuthenticator.verify needs the Request that prepare signed; its content is not known.'
            );
        }
        // Read the body once and hand back a response rebuilt over the same
        // bytes, rather than teeing it with clone().
        const bytes = await response.arrayBuffer();
        const body = new Uint8Array(bytes);
        await verifyResponse({
            status: response.status,
            headers: response.headers,
            body,
            request: {
                method: request.method,
                url: request.url,
                headers: request.headers,
                body: sent,
            },
            keyid: remote,
            resolver: (keyid) => (keyid === remote ? this.verfer : null),
            policy: this.options.policy,
            now: this.options.clock,
        });
        // A null-body status (204, 205, 304) cannot be constructed with a
        // body, even an empty one.
        const nullBody = [204, 205, 304].includes(response.status);
        return new Response(nullBody ? null : bytes, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
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

    async prepare(
        request: Request,
        local: string,
        remote: string
    ): Promise<Request> {
        const dt = new Date().toISOString().replace('Z', '000+00:00');

        const headers = new Headers();
        headers.set(HEADER_SIG_SENDER, local);
        headers.set(HEADER_SIG_DESTINATION, remote);
        headers.set(HEADER_SIG_TIME, dt);
        headers.set('Content-Type', 'application/octet-stream');

        const requestStr = await EssrAuthenticator.serializeRequest(request);
        const raw = libsodium.crypto_box_seal(
            requestStr,
            this.vx25519Pub
        ) as Uint8Array<ArrayBuffer>;

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

    async verify(
        request: Request,
        response: Response,
        local: string,
        remote: string
    ): Promise<Response> {
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
            const bytes = await this.streamToBytes(request.body);
            try {
                body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            } catch (e) {
                throw new Error(
                    'Failed to serialize ESSR request - body is not valid UTF-8',
                    { cause: e }
                );
            }
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
            throw new Error(
                'Invalid signature format - missing "signify" marker'
            );
        }

        const verified = this.verfer.verify(
            cig.raw,
            b(JSON.stringify(payload))
        );
        if (!verified) {
            throw new Error('Invalid signature');
        }

        const response = EssrAuthenticator.deserializeResponse(
            d(this.decrypt(ciphertext))
        );

        if (response.headers.get(HEADER_SIG_SENDER) !== sender) {
            throw new Error(
                'Invalid ESSR payload, missing or incorrect encrypted sender'
            );
        }

        return response;
    }

    // KERIA seals the response to the client key it has in the controller's KEL
    private decrypt(ciphertext: Uint8Array): Uint8Array {
        try {
            return libsodium.crypto_box_seal_open(
                ciphertext,
                this.cx25519Pub,
                this.cx25519Priv
            );
        } catch (e) {
            throw new Error(
                'Failed to decrypt ESSR response - sealed to a different client key',
                { cause: e }
            );
        }
    }

    static deserializeResponse(httpString: string): Response {
        const sep = httpString.indexOf('\r\n\r\n');
        const head =
            sep === -1 ? httpString.trimEnd() : httpString.slice(0, sep);

        const [statusLine, ...headerLines] = head.split('\r\n');
        const [, statusCode, ...statusTextArr] = statusLine.split(' ');

        const body = sep === -1 ? '' : httpString.slice(sep + 4);

        const headers = new Headers();
        for (const line of headerLines) {
            const i = line.indexOf(':');
            if (i !== -1) {
                headers.append(
                    line.slice(0, i).trim(),
                    line.slice(i + 1).trim()
                );
            }
        }

        return new Response(body.length ? body : null, {
            status: Number(statusCode),
            statusText: statusTextArr.join(' '),
            headers,
        });
    }
}
