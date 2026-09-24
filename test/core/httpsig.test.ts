import { assert, describe, it } from 'vitest';
import libsodium from 'libsodium-wrappers-sumo';
import { fromByteArray } from 'base64-js';
import { parseDictionary } from 'structured-headers';
import { decodeBase64Url } from '../../src/keri/core/base64.ts';
import {
    HttpSigError,
    HttpSigRequest,
    HttpSigResponse,
    componentIdentifier,
    contentDigest,
    signatureBase,
    signatureParamsValue,
    verifyContentDigest,
} from '../../src/keri/core/httpsig.ts';

// Every literal in this block was checked against the RFC text itself,
// https://www.rfc-editor.org/rfc/rfc9421.txt, not against a summary of it.
// RFC 8792 '\' line wrapping in the RFC has been undone.

// RFC 9421 Appendix B.1.4, test-key-ed25519, JWK form.
const RFC_ED25519_D = 'n4Ni-HpISpVObnQMW0wOhCKROaIKqKtW_2ZYb2p9KcU';
const RFC_ED25519_X = 'JrQLj5P_89iXES9-vFgrIy29clF9CC_oPPsw3c5D0bs';

// RFC 9421 Appendix B.2, test-request.
const RFC_REQUEST: HttpSigRequest = {
    method: 'POST',
    url: 'https://example.com/foo?param=Value&Pet=dog',
    headers: {
        Host: 'example.com',
        Date: 'Tue, 20 Apr 2021 02:07:55 GMT',
        'Content-Type': 'application/json',
        'Content-Digest':
            'sha-512=:WZDPaVn/7XgHaAy8pmojAkGWoRx2UFChF41A2svX+TaPm+AbwAgBWnrIiYllu7BNNyealdVLvRwEmTHWXvJwew==:',
        'Content-Length': '18',
    },
};
const RFC_REQUEST_BODY = '{"hello": "world"}';

// RFC 9421 Appendix B.2.6, signing test-request with ed25519.
const B26_COMPONENTS = [
    'date',
    '@method',
    '@path',
    '@authority',
    'content-type',
    'content-length',
];
const B26_PARAMS = { created: 1618884473, keyid: 'test-key-ed25519' };
const B26_BASE =
    '"date": Tue, 20 Apr 2021 02:07:55 GMT\n' +
    '"@method": POST\n' +
    '"@path": /foo\n' +
    '"@authority": example.com\n' +
    '"content-type": application/json\n' +
    '"content-length": 18\n' +
    '"@signature-params": ("date" "@method" "@path" "@authority" ' +
    '"content-type" "content-length");created=1618884473' +
    ';keyid="test-key-ed25519"';
const B26_SIGNATURE_INPUT =
    'sig-b26=("date" "@method" "@path" "@authority" "content-type" ' +
    '"content-length");created=1618884473;keyid="test-key-ed25519"';
const B26_SIGNATURE =
    'wqcAqbmYJ2ji2glfAMaRy4gruYYnx2nEFN2HN6jrnDnQCK1u02Gb04v9EDgwUPiu4A0w6vuQv5lIp5WPpBKRCw==';

// RFC 9421 §2.4, the 503 response to test-request.
const RFC_RESPONSE: HttpSigResponse = {
    status: 503,
    headers: {
        Date: 'Tue, 20 Apr 2021 02:07:56 GMT',
        'Content-Type': 'application/json',
        'Content-Length': '62',
        'Content-Digest':
            'sha-512=:0Y6iCBzGg5rZtoXS95Ijz03mslf6KAMCloESHObfwnHJDbkkWWQz6PhhU9kxsTbARtY2PTBOzq24uJFpHsMuAg==:',
    },
};
const RFC_RESPONSE_BODY =
    '{"busy": true, "message": "Your call is very important to us"}';

function assertRefused(fn: () => unknown, pattern: RegExp) {
    assert.throws(fn, HttpSigError, pattern);
}

describe('RFC 9421 Appendix B.2.6 (ed25519)', () => {
    it('the B.1.4 seed yields the published public key', async () => {
        // Binds the private key to its published public half before either
        // is trusted, so a mistyped seed cannot masquerade as a base bug.
        await libsodium.ready;
        const pair = libsodium.crypto_sign_seed_keypair(
            decodeBase64Url(RFC_ED25519_D)
        );
        assert.deepEqual(pair.publicKey, decodeBase64Url(RFC_ED25519_X));
    });

    it('builds the published signature base byte for byte', () => {
        const base = signatureBase({
            components: B26_COMPONENTS,
            params: B26_PARAMS,
            request: RFC_REQUEST,
        });
        assert.equal(base, B26_BASE);
    });

    it('builds the published Signature-Input member value', () => {
        const value = signatureParamsValue(B26_COMPONENTS, B26_PARAMS);
        assert.equal(`sig-b26=${value}`, B26_SIGNATURE_INPUT);
    });

    it('re-signing with the B.1.4 key reproduces the published Signature', async () => {
        // Ed25519 is deterministic, so this is byte equality, not a
        // verification round trip.
        await libsodium.ready;
        const pair = libsodium.crypto_sign_seed_keypair(
            decodeBase64Url(RFC_ED25519_D)
        );
        const base = signatureBase({
            components: B26_COMPONENTS,
            params: B26_PARAMS,
            request: RFC_REQUEST,
        });
        const sig = libsodium.crypto_sign_detached(
            new TextEncoder().encode(base),
            pair.privateKey
        );
        assert.equal(fromByteArray(sig), B26_SIGNATURE);
        assert.isTrue(
            libsodium.crypto_sign_verify_detached(
                sig,
                new TextEncoder().encode(B26_BASE),
                pair.publicKey
            )
        );
    });

    it('rebuilds the base from the parsed Signature-Input in wire order', () => {
        const parsed = parseDictionary(B26_SIGNATURE_INPUT).get('sig-b26');
        assert.isDefined(parsed);
        const [items, params] = parsed as [
            [string, Map<string, never>][],
            Map<string, string | number>,
        ];
        const base = signatureBase({
            components: items,
            params,
            request: RFC_REQUEST,
        });
        assert.equal(base, B26_BASE);
    });
});

describe('RFC 9421 §2.4 (request components in a response)', () => {
    it('reproduces the published reqres signature base', () => {
        const base = signatureBase({
            components: [
                '@status',
                'content-digest',
                'content-type',
                '"@authority";req',
                '"@method";req',
                '"@path";req',
                '"@query";req',
                '"content-digest";req',
                '"content-type";req',
                '"content-length";req',
            ],
            params: { created: 1618884479, keyid: 'test-key-ecc-p256' },
            request: RFC_REQUEST,
            response: RFC_RESPONSE,
        });
        assert.equal(
            base,
            '"@status": 503\n' +
                '"content-digest": sha-512=:0Y6iCBzGg5rZtoXS95Ijz03mslf6KAMCloESHObfwnHJDbkkWWQz6PhhU9kxsTbARtY2PTBOzq24uJFpHsMuAg==:\n' +
                '"content-type": application/json\n' +
                '"@authority";req: example.com\n' +
                '"@method";req: POST\n' +
                '"@path";req: /foo\n' +
                '"@query";req: ?param=Value&Pet=dog\n' +
                '"content-digest";req: sha-512=:WZDPaVn/7XgHaAy8pmojAkGWoRx2UFChF41A2svX+TaPm+AbwAgBWnrIiYllu7BNNyealdVLvRwEmTHWXvJwew==:\n' +
                '"content-type";req: application/json\n' +
                '"content-length";req: 18\n' +
                '"@signature-params": ("@status" "content-digest" "content-type" ' +
                '"@authority";req "@method";req "@path";req "@query";req ' +
                '"content-digest";req "content-type";req "content-length";req)' +
                ';created=1618884479;keyid="test-key-ecc-p256"'
        );
    });

    it('binds a response to one request signature with "signature";req;key', () => {
        const request: HttpSigRequest = {
            ...RFC_REQUEST,
            headers: {
                ...RFC_REQUEST.headers,
                Signature: `sig-b26=:${B26_SIGNATURE}:, other=:AAAA:`,
            },
        };
        const base = signatureBase({
            components: ['@status', '"signature";req;key="sig-b26"'],
            params: { created: 1618884479, keyid: 'agent' },
            request,
            response: RFC_RESPONSE,
        });
        assert.equal(
            base,
            '"@status": 503\n' +
                `"signature";req;key="sig-b26": :${B26_SIGNATURE}:\n` +
                '"@signature-params": ("@status" "signature";req;key="sig-b26")' +
                ';created=1618884479;keyid="agent"'
        );
    });
});

describe('RFC 9421 §2.1 field canonicalization', () => {
    it('trims values and combines repeated fields', () => {
        const base = signatureBase({
            components: ['cache-control', 'x-ows-header', 'x-empty-header'],
            params: {},
            request: {
                method: 'GET',
                url: 'https://www.example.com/',
                headers: {
                    'X-OWS-Header': '   Leading and trailing whitespace.  ',
                    'Cache-Control': ['max-age=60', '   must-revalidate'],
                    'X-Empty-Header': ' ',
                },
            },
        });
        assert.equal(
            base,
            '"cache-control": max-age=60, must-revalidate\n' +
                '"x-ows-header": Leading and trailing whitespace.\n' +
                '"x-empty-header": \n' +
                '"@signature-params": ("cache-control" "x-ows-header" "x-empty-header")'
        );
    });

    it('reads a Headers object', () => {
        const headers = new Headers();
        headers.append('Cache-Control', 'max-age=60');
        headers.append('Cache-Control', 'must-revalidate');
        const base = signatureBase({
            components: ['Cache-Control'],
            params: {},
            request: { method: 'GET', url: 'https://x.test/', headers },
        });
        assert.equal(
            base.split('\n')[0],
            '"cache-control": max-age=60, must-revalidate'
        );
    });

    it('serializes dictionary members strictly (§2.1.2 examples)', () => {
        const base = signatureBase({
            components: [
                '"example-dict";key="a"',
                '"example-dict";key="d"',
                '"example-dict";key="b"',
                '"example-dict";key="c"',
            ],
            params: {},
            request: {
                method: 'GET',
                url: 'https://x.test/',
                headers: {
                    'Example-Dict': ' a=1, b=2;x=1;y=2, c=(a   b    c), d',
                },
            },
        });
        assert.deepEqual(base.split('\n').slice(0, 4), [
            '"example-dict";key="a": 1',
            '"example-dict";key="d": ?1',
            '"example-dict";key="b": 2;x=1;y=2',
            '"example-dict";key="c": (a b c)',
        ]);
    });
});

describe('RFC 9421 §2.2 derived components', () => {
    const get = (url: string, method = 'GET') => ({
        method,
        url,
        headers: { Host: 'Example.COM:8080' },
    });
    const line = (component: string, request: HttpSigRequest) =>
        signatureBase({ components: [component], params: {}, request }).split(
            '\n'
        )[0];

    it('@query is "?" alone when absent (§2.2.7)', () => {
        assert.equal(line('@query', get('https://x.test/a')), '"@query": ?');
        assert.equal(line('@query', get('https://x.test/a?')), '"@query": ?');
    });

    it('@query keeps percent-encoding (§2.2.7)', () => {
        assert.equal(
            line('@query', get('https://x.test/p?param=value&baz=bat%2Dman')),
            '"@query": ?param=value&baz=bat%2Dman'
        );
    });

    it('@path is "/" for an empty path (§2.2.6)', () => {
        assert.equal(line('@path', get('https://x.test')), '"@path": /');
    });

    it('@authority lowercases and drops the default port (§2.2.3)', () => {
        assert.equal(
            line('@authority', get('HTTPS://WWW.Example.com:443/x')),
            '"@authority": www.example.com'
        );
        assert.equal(
            line('@authority', get('https://x.test:8443/x')),
            '"@authority": x.test:8443'
        );
    });

    it('@authority falls back to Host for a relative URL', () => {
        assert.equal(
            line('@authority', get('/identifiers?last=1')),
            '"@authority": example.com:8080'
        );
    });

    it('@method is not case-normalized (§2.2.1)', () => {
        assert.equal(
            line('@method', get('https://x.test/', 'patch')),
            '"@method": patch'
        );
    });
});

describe('refusals', () => {
    const request = RFC_REQUEST;
    const response = RFC_RESPONSE;

    it('refuses an unsupported derived component', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['@target-uri'],
                    params: {},
                    request,
                }),
            /not supported/
        );
    });

    it('refuses an unsupported component parameter', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['"content-type";sf'],
                    params: {},
                    request,
                }),
            /"sf", which is not supported/
        );
    });

    it('refuses a missing field', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['x-absent'],
                    params: {},
                    request,
                }),
            /no "x-absent" field/
        );
    });

    it('refuses a missing dictionary member', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['"content-digest";key="sha-256"'],
                    params: {},
                    request,
                }),
            /no member "sha-256"/
        );
    });

    it('refuses req on a request', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['"@method";req'],
                    params: {},
                    request,
                }),
            /targets a request/
        );
    });

    it('refuses a request component in a response without req', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['@method'],
                    params: {},
                    request,
                    response,
                }),
            /must carry req/
        );
    });

    it('refuses @status on a request', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['@status'],
                    params: {},
                    request,
                }),
            /only to a response/
        );
    });

    it('refuses req when no request is available', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['"content-type";req'],
                    params: {},
                    response,
                }),
            /needs the request/
        );
    });

    it('refuses a duplicate component regardless of parameter order', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: [
                        '"signature";req;key="a"',
                        '"signature";key="a";req',
                    ],
                    params: {},
                    request: {
                        ...request,
                        headers: { Signature: 'a=:AAAA:' },
                    },
                    response,
                }),
            /more than once/
        );
    });

    it('refuses an uppercase name in serialized form', () => {
        assertRefused(() => componentIdentifier('"Content-Type"'), /lowercase/);
    });

    it('refuses @signature-params as a covered component', () => {
        assertRefused(
            () => componentIdentifier('@signature-params'),
            /cannot be listed/
        );
    });

    it('refuses a non-integer created', () => {
        assertRefused(
            () => signatureParamsValue(['@method'], { created: 1.5 }),
            /Integer/
        );
    });

    it('refuses non-ASCII in the base', () => {
        assertRefused(
            () =>
                signatureBase({
                    components: ['x-name'],
                    params: {},
                    request: { ...request, headers: { 'X-Name': 'café' } },
                }),
            /non-ASCII/
        );
    });
});

describe('Content-Digest (RFC 9530)', () => {
    it('computes sha-256 per RFC 9530 Figure 12', () => {
        assert.equal(
            contentDigest('{"hello": "world"}\n'),
            'sha-256=:RK/0qy18MlBSVnWgjwz6lZEWjP/lF5HF9bvEF8FabDg=:'
        );
    });

    it('computes sha-512 matching the RFC 9421 test messages', () => {
        assert.equal(
            contentDigest(RFC_REQUEST_BODY, 'sha-512'),
            (RFC_REQUEST.headers as Record<string, string>)['Content-Digest']
        );
        assert.equal(
            contentDigest(
                new TextEncoder().encode(RFC_RESPONSE_BODY),
                'sha-512'
            ),
            (RFC_RESPONSE.headers as Record<string, string>)['Content-Digest']
        );
    });

    it('verifies sha-256 and sha-512, and several at once', () => {
        const body = RFC_REQUEST_BODY;
        assert.isTrue(verifyContentDigest(contentDigest(body), body));
        assert.isTrue(
            verifyContentDigest(contentDigest(body, 'sha-512'), body)
        );
        assert.isTrue(
            verifyContentDigest(
                `${contentDigest(body)}, ${contentDigest(body, 'sha-512')}`,
                body
            )
        );
    });

    it('ignores unknown algorithms but fails any known mismatch', () => {
        const body = RFC_REQUEST_BODY;
        assert.isTrue(
            verifyContentDigest(`md5=:AAAA:, ${contentDigest(body)}`, body)
        );
        assert.isFalse(verifyContentDigest(contentDigest(body), `${body} `));
        assert.isFalse(
            verifyContentDigest(
                `${contentDigest(body)}, ${contentDigest('x', 'sha-512')}`,
                body
            )
        );
    });

    it('accepts an unpadded byte sequence', () => {
        const body = RFC_REQUEST_BODY;
        const unpadded = contentDigest(body, 'sha-512').replace(/=+:$/, ':');
        assert.isTrue(verifyContentDigest(unpadded, body));
    });

    it('refuses a field with nothing it can check', () => {
        assertRefused(
            () => verifyContentDigest('md5=:AAAA:', 'x'),
            /no supported algorithm/
        );
        assertRefused(
            () => verifyContentDigest('sha-256="abc"', 'x'),
            /not a Byte Sequence/
        );
        assertRefused(
            () => verifyContentDigest('not a dictionary!', 'x'),
            /not a Dictionary/
        );
    });

    it('parses every member before comparing any', () => {
        // A mismatching sha-256 ahead of a malformed sha-512 is malformed,
        // not a mismatch: the field is parsed whole first.
        assertRefused(
            () =>
                verifyContentDigest(
                    `${contentDigest('x')}, sha-512="abc"`,
                    RFC_REQUEST_BODY
                ),
            /not a Byte Sequence/
        );
    });
});
