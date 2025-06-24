import { assert, describe, expect, test, vitest } from 'vitest';
import libsodium from 'libsodium-wrappers-sumo';
import { Salter, Tier } from '../../src/keri/core/salter.ts';
import { b, d } from '../../src/keri/core/core.ts';
import {
    EssrAuthenticator,
    SignedHeaderAuthenticator,
} from '../../src/keri/core/authing.ts';
import * as utilApi from '../../src/keri/core/utils.ts';
import { Verfer } from '../../src/keri/core/verfer.ts';
import {
    HEADER_SIG,
    HEADER_SIG_DESTINATION,
    HEADER_SIG_INPUT,
    HEADER_SIG_SENDER,
    HEADER_SIG_TIME,
} from '../../src/keri/core/httping.ts';
import { designature } from '../../src/keri/end/ending.ts';
import { Diger } from '../../src/keri/core/diger.ts';
import { Cigar } from '../../src/keri/core/cigar.ts';
import { MtrDex } from '../../src/keri/core/matter.ts';

// prettier-ignore
const essrPayload = new Uint8Array([134,89,250,128,50,135,60,33,214,52,216,194,200,42,118,33,91,130,129,141,158,102,96,66,95,163,32,235,6,239,150,82,59,67,100,70,116,25,10,180,189,26,104,114,166,121,247,185,12,105,147,232,68,248,238,58,53,200,129,173,34,216,228,153,190,240,53,53,134,194,69,152,21,209,3,225,5,221,57,220,159,249,90,85,73,197,64,155,168,217,24,111,211,100,129,18,21,57,70,152,77,65,156,71,84,186,222,81,82,204,120,176,67,173,207,149,39,180,129,192,22,194,84,57,226,15,4,48,240,133,54,170,34,211,204,141,15,204,78]);
// prettier-ignore
const essrPayloadWrongSender = new Uint8Array([226,12,182,1,251,73,45,83,28,139,226,10,38,143,81,108,254,153,187,150,224,12,78,189,13,202,196,57,112,107,169,10,254,92,196,213,107,81,206,11,140,157,195,207,55,32,26,203,6,131,80,156,192,249,122,254,58,126,184,87,134,17,40,55,147,76,74,17,222,50,38,154,22,81,157,74,239,179,251,103,180,95,236,122,143,94,215,233,179,227,239,95,156,220,248,230,219,243,220,247,132,181,159,210,138,132,185,96,58,155,41,189,71,233,28,171,149,25,58,42,13,13,13,109,60,39,224,39,112,145,58,220,0,239,224,10,23]);
// prettier-ignore
const essrPayloadNoSender = new Uint8Array([211,17,77,180,175,67,71,163,82,144,48,142,91,91,10,103,94,105,147,205,199,227,247,67,90,111,35,140,32,123,217,84,18,58,68,206,7,132,222,70,220,110,73,116,30,5,40,45,108,247,129,190,211,112,159,123,207,246,231,0,1,27,188,210,135,4,238,102,130,218,20,5,60]);

describe('SignedHeaderAuthenticator.verify', () => {
    test('verify signature on Response', async () => {
        await libsodium.ready;
        const salt = '0123456789abcdef';
        const salter = new Salter({ raw: b(salt) });
        const signer = salter.signer();
        const aaid = 'DMZh_y-H5C3cSbZZST-fqnsmdNTReZxIh0t2xSTOJQ8a';
        const verfer = new Verfer({ qb64: aaid });

        const headers = new Headers([
            ['Content-Length', '898'],
            ['Content-Type', 'application/json'],
            [HEADER_SIG_TIME, '2023-05-22T00:37:00.248708+00:00'],
        ]);

        const authn = new SignedHeaderAuthenticator(signer, verfer);
        const request = new Request('http://127.0.0.1:3901/identifiers/aid1');

        // Missing Signify-Resource
        await expect(
            authn.verify(
                request,
                new Response(null, {
                    headers,
                    status: 401,
                    statusText: 'Unauthorized',
                }),
                'notrelevant',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrowError('HTTP GET /identifiers/aid1 - 401 Unauthorized');

        // Missing Signify-Resource
        await expect(
            authn.verify(
                request,
                new Response(null, { headers }),
                'notrelevant',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrowError('message from a different remote agent');

        // Incorrect Signify-Resource
        headers.set(
            HEADER_SIG_SENDER,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        await expect(
            authn.verify(
                request,
                new Response(null, { headers }),
                'notrelevant',
                'EWJkQCFvKuyxZi582yJPb0wcwuW3VXmFNuvbQuBpgmIs'
            )
        ).rejects.toThrowError('message from a different remote agent');

        await expect(
            authn.verify(
                request,
                new Response(null, { headers }),
                'notrelevant',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrowError('response verification failed');

        // Missing signify marker
        headers.set(
            HEADER_SIG_INPUT,
            [
                'signify=("signify-resource" "@method" "@path" "signify-timestamp")',
                'created=1684715820',
                'keyid="EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei"',
                'alg="ed25519"',
            ].join(';')
        );
        await expect(
            authn.verify(
                request,
                new Response(null, { headers }),
                'notrelevant',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrowError('response verification failed');

        // Missing signature
        headers.set(
            HEADER_SIG_INPUT,
            [
                'signify=("signify-resource" "@method" "@path" "signify-timestamp")',
                'created=1684715820',
                'keyid="EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei"',
                'alg="ed25519"',
            ].join(';')
        );
        await expect(
            authn.verify(
                request,
                new Response(null, { headers }),
                'notrelevant',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrowError('response verification failed');

        // Invalid signature
        headers.set(
            HEADER_SIG,
            [
                'indexed="?0"',
                'signify="0BDLh8QCytVBx1YMam4Vt8s4b9HAW1dwfE4yU5H_w1V6gUvPBoVGWQlIMdC16T3WFWHDHCbMcuceQzrr6n9OULXX"',
            ].join(';')
        );
        await expect(
            authn.verify(
                request,
                new Response(null, { headers }),
                'notrelevant',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrowError(
            'Signature for EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei invalid.'
        );

        // Good
        headers.set(
            HEADER_SIG,
            [
                'indexed="?0"',
                'signify="0BDLh8QCytVBx1YMam4Vt8s4b9HAW1dwfE4yU5H_w1V6gUvPBoVGWQlIMdC16T3WFWHDHCbMcuceQzrr6n9OULsK"',
            ].join(';')
        );
        const response = new Response(null, { headers });
        expect(
            await authn.verify(
                request,
                response,
                'notrelevant',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).toBe(response);
    });
});

describe('SignedHeaderAuthenticator.prepare', () => {
    test('Create signed headers for a request', async () => {
        await libsodium.ready;
        const salt = '0123456789abcdef';
        const salter = new Salter({ raw: b(salt) });
        const signer = salter.signer();
        const aaid = 'DDK2N5_fVCWIEO9d8JLhk7hKrkft6MbtkUhaHQsmABHY';
        const verfer = new Verfer({ qb64: aaid });

        const headers = new Headers([
            ['Content-Type', 'application/json'],
            ['Content-Length', '256'],
            ['Connection', 'close'],
            [
                'Signify-Resource',
                'EWJkQCFvKuyxZi582yJPb0wcwuW3VXmFNuvbQuBpgmIs',
            ],
            ['Signify-Timestamp', '2022-09-24T00:05:48.196795+00:00'],
        ]);
        vitest
            .spyOn(utilApi, 'nowUTC')
            .mockReturnValue(new Date('2021-01-01T00:00:00.000000+00:00'));

        const authn = new SignedHeaderAuthenticator(signer, verfer);
        const request = await authn.prepare(
            new Request('http://127.0.0.1:3903/boot', {
                method: 'POST',
                headers,
            }),
            'notrelevant',
            'notrelevant'
        );

        const expectedSignatureInput = [
            'signify=("@method" "@path" "signify-resource" "signify-timestamp")',
            'created=1609459200',
            'keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt"',
            'alg="ed25519"',
        ].join(';');
        assert.equal(
            request.headers.get('Signature-Input'),
            expectedSignatureInput
        );

        const expectedSignature = [
            'indexed="?0"',
            'signify="0BChvN_BWAf-mgEuTnWfNnktgHdWOuOh9cWc4o0GFWuZOwra3DyJT5dJ_6BX7AANDOTnIlAKh5Sg_9qGQXHjj5oJ"',
        ].join(';');
        assert.equal(request.headers.get('Signature'), expectedSignature);
    });
});

describe('ESSR Authenticator', () => {
    test('Can wrap a HTTP request with ESSR', async () => {
        await libsodium.ready;
        const salt = '0123456789abcdef';
        const salter = new Salter({ raw: b(salt) });
        const signer = salter.signer();

        const agentSalter = new Salter({ qb64: '0AAwMTIzNDU2Nzg5YWJjZGVm' });
        const agentSigner = agentSalter.signer(
            'A',
            true,
            'agentagent-ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose00',
            Tier.low
        );

        const sigkey = new Uint8Array(
            agentSigner.raw.length + agentSigner.verfer.raw.length
        );
        sigkey.set(agentSigner.raw);
        sigkey.set(agentSigner.verfer.raw, agentSigner.raw.length);
        const agentPriv =
            libsodium.crypto_sign_ed25519_sk_to_curve25519(sigkey);
        const agentPub = libsodium.crypto_scalarmult_base(agentPriv);

        const authn = new EssrAuthenticator(signer, agentSigner.verfer);

        const getReq = new Request('http://127.0.0.1:3901/oobis', {
            method: 'GET',
        });

        const wrapperGet = await authn.prepare(
            getReq,
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert.equal(wrapperGet.url, 'http://127.0.0.1:3901/');
        assert.equal(wrapperGet.method, 'POST');
        assert.equal(
            wrapperGet.headers.get(HEADER_SIG_SENDER),
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.equal(
            wrapperGet.headers.get(HEADER_SIG_DESTINATION),
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );

        const dt = wrapperGet.headers.get(HEADER_SIG_TIME);
        assert.notEqual(dt, null);
        assert.equal(
            wrapperGet.headers.get('Content-Type'),
            'application/octet-stream'
        );

        const signature = wrapperGet.headers.get('Signature');
        assert.notEqual(signature, null);

        const ciphertextGet = new Uint8Array(await wrapperGet.arrayBuffer());
        const diger = new Diger({ code: MtrDex.Blake3_256 }, ciphertextGet);

        const payload = {
            src: 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
            dest: 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
            d: diger.qb64,
            dt,
        };

        const signages = designature(signature!);
        const markers = signages[0].markers;
        assert.instanceOf(markers, Map);
        const cig = markers.get('signify');
        assert.instanceOf(cig, Cigar);

        assert.equal(
            signer.verfer.verify(cig.raw, JSON.stringify(payload)),
            true
        );

        const plaintextGet = d(
            libsodium.crypto_box_seal_open(ciphertextGet, agentPub, agentPriv)
        );
        assert.equal(
            plaintextGet,
            `GET http://127.0.0.1:3901/oobis HTTP/1.1\r
\r
`
        );

        const postReq = new Request('http://127.0.0.1:3901/oobis', {
            method: 'POST',
            body: JSON.stringify({
                a: 1,
            }),
        });
        const wrapperPost = await authn.prepare(
            postReq,
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        const ciphertextPost = new Uint8Array(await wrapperPost.arrayBuffer());
        const plaintextPost = d(
            libsodium.crypto_box_seal_open(ciphertextPost, agentPub, agentPriv)
        );
        assert.equal(
            plaintextPost,
            `POST http://127.0.0.1:3901/oobis HTTP/1.1\r
content-type: text/plain;charset=UTF-8\r
\r
{"a":1}`
        );
    });

    test('Can unwrap HTTP requests using ESSR', async () => {
        await libsodium.ready;
        const salt = '0123456789abcdef';
        const salter = new Salter({ raw: b(salt) });
        const signer = salter.signer();

        const agentSalter = new Salter({ qb64: '0AAwMTIzNDU2Nzg5YWJjZGVm' });
        const agentSigner = agentSalter.signer(
            'A',
            true,
            'agentagent-ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose00',
            Tier.low
        );

        const authn = new EssrAuthenticator(signer, agentSigner.verfer);

        const headers = new Headers();
        await expect(
            authn.verify(
                new Request('http://test.com/xyz'),
                new Response(null, {
                    headers,
                    status: 401,
                    statusText: 'Unauthorized',
                }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow('HTTP GET /xyz - 401 Unauthorized');

        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(null, { headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow('Signature is missing from ESSR payload');

        headers.set(
            HEADER_SIG,
            'indexed="?0";signify="0BB50Boq4s2xcFNjskRLziD-dmw443Y3ObeKfd1xjmNTLBQEXkT3Vj67xVD9Fv7OKZysD7xN6sQ_SxWLM8DaCyXX'
        );
        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(null, { headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow('Message from a different remote agent');

        // Wrong
        headers.set(
            HEADER_SIG_SENDER,
            'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1'
        );
        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(null, { headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow('Message from a different remote agent');

        // Right
        headers.set(
            HEADER_SIG_SENDER,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(null, { headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow(
            'Invalid ESSR payload, missing or incorrect destination prefix'
        );

        // Wrong
        headers.set(
            HEADER_SIG_DESTINATION,
            'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1'
        );
        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(null, { headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow(
            'Invalid ESSR payload, missing or incorrect destination prefix'
        );

        // Right
        headers.set(
            HEADER_SIG_DESTINATION,
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(null, { headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow('Timestamp is missing from ESSR payload');

        headers.set(HEADER_SIG_TIME, '2025-01-17T11:57:56.415000+00:00');
        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(null, { headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow('Invalid signature');

        headers.set(
            'Signature',
            'indexed="?0";signify="0BBLnK_-YI-sV4pZYe2kUkyPsuEvrnwKID__0t-kHD9p7pVxJEosxsClFUok4qgt1ULjl_irj13zUd-JqQQQx3MN'
        );
        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(essrPayloadNoSender, { status: 200, headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow(
            'Invalid ESSR payload, missing or incorrect encrypted sender'
        );

        headers.set(HEADER_SIG_TIME, '2025-01-17T12:00:18.260000+00:00');
        headers.set(
            HEADER_SIG,
            'indexed="?0";signify="0BC4LCV6ZqPOzAVpyjPpi2v0AJOVwE7o3qnL2PAJ56ReMizfgzbo3DQK3HiKHkIJ2N5G5R0fno6Nhs6QTrB8CMII'
        );
        await expect(
            authn.verify(
                new Request('http://test.com'),
                new Response(essrPayloadWrongSender, { status: 200, headers }),
                'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
            )
        ).rejects.toThrow(
            'Invalid ESSR payload, missing or incorrect encrypted sender'
        );

        headers.set(HEADER_SIG_TIME, '2025-01-17T12:04:16.254000+00:00');
        headers.set(
            HEADER_SIG,
            'indexed="?0";signify="0BBQZQrG5mhWU2w9nSC45Dd-PIOYKjtD3KFY-arNKj0whNrUhdlmW0_m_Y487uOdDBR6_XbR0Ey2TqXNt9gAvEMB'
        );
        const unwrapped = await authn.verify(
            new Request('http://test.com'),
            new Response(essrPayload, { status: 200, headers }),
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert.equal(await unwrapped.text(), JSON.stringify({ a: 1 }));
        assert.equal(unwrapped.status, 200);
    });
});

describe('EssrAuthenticator.serializeRequest', () => {
    test('Can serialise a GET request', async () => {
        const request = new Request('http://127.0.0.1:3901/oobis', {
            method: 'GET',
            headers: {
                [HEADER_SIG_SENDER]:
                    'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
            },
        });
        assert.equal(
            await EssrAuthenticator.serializeRequest(request),
            `GET http://127.0.0.1:3901/oobis HTTP/1.1\r
signify-resource: ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose\r
\r
`
        );
    });

    test('Can serialise a POST request with a JSON body', async () => {
        const request = new Request('http://127.0.0.1:3901/oobis', {
            method: 'POST',
            body: JSON.stringify({
                a: 1,
            }),
            headers: {
                [HEADER_SIG_SENDER]:
                    'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
            },
        });
        assert.equal(
            await EssrAuthenticator.serializeRequest(request),
            `POST http://127.0.0.1:3901/oobis HTTP/1.1\r
content-type: text/plain;charset=UTF-8\r
signify-resource: ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose\r
\r
{"a":1}`
        );
    });

    test('Can serialise a POST request with a text body', async () => {
        const request = new Request('http://127.0.0.1:3901/oobis', {
            method: 'POST',
            body: 'Hi',
            headers: {
                [HEADER_SIG_SENDER]:
                    'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
            },
        });
        assert.equal(
            await EssrAuthenticator.serializeRequest(request),
            `POST http://127.0.0.1:3901/oobis HTTP/1.1\r
content-type: text/plain;charset=UTF-8\r
signify-resource: ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose\r
\r
Hi`
        );
    });
});

describe('EssrAuthenticator.deserializeResponse', () => {
    test('Can deserialise a GET response with no headers', async () => {
        const response =
            EssrAuthenticator.deserializeResponse(`HTTP/1.1 204 No Content\r
\r
`);
        assert.equal(response.status, 204);
        assert.equal(response.statusText, 'No Content');
        assert.equal(response.headers.has('content-type'), false);
        assert.equal(response.headers.has('signify-resource'), false);
        assert.equal(response.body, null);
    });

    test('Can deserialise a GET response with headers', async () => {
        const response =
            EssrAuthenticator.deserializeResponse(`HTTP/1.1 204 No Content\r
content-type: text/plain;charset=UTF-8\r
signify-resource: ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose\r
\r
`);
        assert.equal(response.status, 204);
        assert.equal(response.statusText, 'No Content');
        assert.equal(
            response.headers.get('content-type'),
            'text/plain;charset=UTF-8'
        );
        assert.equal(
            response.headers.get('signify-resource'),
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.equal(response.body, null);
    });

    test('Can deserialise a POST response with a JSON body', async () => {
        const response =
            EssrAuthenticator.deserializeResponse(`HTTP/1.1 200 OK\r
content-type: text/plain;charset=UTF-8\r
signify-resource: ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose\r
\r
{"a":1}`);
        assert.equal(response.status, 200);
        assert.equal(response.statusText, 'OK');
        assert.equal(
            response.headers.get('content-type'),
            'text/plain;charset=UTF-8'
        );
        assert.equal(
            response.headers.get('signify-resource'),
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.deepEqual(await response.json(), { a: 1 });
    });

    test('Can deserialise a POST response with a text body', async () => {
        const response =
            EssrAuthenticator.deserializeResponse(`HTTP/1.1 200 OK\r
content-type: text/plain;charset=UTF-8\r
signify-resource: ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose\r
\r
Hi`);
        assert.equal(response.status, 200);
        assert.equal(response.statusText, 'OK');
        assert.equal(
            response.headers.get('content-type'),
            'text/plain;charset=UTF-8'
        );
        assert.equal(
            response.headers.get('signify-resource'),
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.deepEqual(await response.text(), 'Hi');
    });
});
