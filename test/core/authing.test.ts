import { assert, describe, expect, it, vitest } from 'vitest';
import libsodium from 'libsodium-wrappers-sumo';
import { Salter } from '../../src/keri/core/salter.ts';
import { b } from '../../src/keri/core/core.ts';
import { SignedHeaderAuthenticator } from '../../src/keri/core/authing.ts';
import * as utilApi from '../../src/keri/core/utils.ts';
import { Verfer } from '../../src/keri/core/verfer.ts';

describe('SignedHeaderAuthenticator.verify', () => {
    it('verify signature on Response', async () => {
        await libsodium.ready;
        const salt = '0123456789abcdef';
        const salter = new Salter({ raw: b(salt) });
        const signer = salter.signer();
        const aaid = 'DMZh_y-H5C3cSbZZST-fqnsmdNTReZxIh0t2xSTOJQ8a';
        const verfer = new Verfer({ qb64: aaid });

        const headers = new Headers([
            ['Content-Length', '898'],
            ['Content-Type', 'application/json'],
            [
                'Signature',
                [
                    'indexed="?0"',
                    'signify="0BDLh8QCytVBx1YMam4Vt8s4b9HAW1dwfE4yU5H_w1V6gUvPBoVGWQlIMdC16T3WFWHDHCbMcuceQzrr6n9OULsK"',
                ].join(';'),
            ],
            [
                'Signature-Input',
                [
                    'signify=("signify-resource" "@method" "@path" "signify-timestamp")',
                    'created=1684715820',
                    'keyid="EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei"',
                    'alg="ed25519"',
                ].join(';'),
            ],
            [
                'Signify-Resource',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
            ],
            ['Signify-Timestamp', '2023-05-22T00:37:00.248708+00:00'],
        ]);

        const authn = new SignedHeaderAuthenticator(signer, verfer);
        const request = new Request('http://127.0.0.1:3901/identifiers/aid1');
        const response = new Response(null, {
            headers
        });

        await expect(authn.verify(request, response, "notrelevant", "EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei")).resolves.toBe(response);
        await expect(authn.verify(request, response, "notrelevant", "EWJkQCFvKuyxZi582yJPb0wcwuW3VXmFNuvbQuBpgmIs")).rejects.toThrowError('message from a different remote agent');

        // @TODO - foconnor: missing tests... missing headers, wrong signature etc
    });
});

describe('SignedHeaderAuthenticator.prepare', () => {
    it('Create signed headers for a request', async () => {
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
        const request = await authn.prepare(new Request('http://127.0.0.1:3903/boot', {
            method: 'POST',
            headers,
        }), "notrelevant", "notrelevant");

        const expectedSignatureInput = [
            'signify=("@method" "@path" "signify-resource" "signify-timestamp")',
            'created=1609459200',
            'keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt"',
            'alg="ed25519"',
        ].join(';');
        assert.equal(request.headers.get('Signature-Input'), expectedSignatureInput);

        const expectedSignature = [
            'indexed="?0"',
            'signify="0BChvN_BWAf-mgEuTnWfNnktgHdWOuOh9cWc4o0GFWuZOwra3DyJT5dJ_6BX7AANDOTnIlAKh5Sg_9qGQXHjj5oJ"',
        ].join(';');
        assert.equal(request.headers.get('Signature'), expectedSignature);
    });
});
