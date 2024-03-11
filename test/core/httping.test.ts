import { strict as assert } from 'assert';
import { desiginput, Inputage, sigbase, siginput } from '../../src';

describe('siginput', () => {
    it('create valid signature parameters string from Inputage', async () => {
        const input = {
            fields: [
                'signify-resource',
                '@method',
                '@path',
                'signify-timestamp',
            ],
            created: 1609459200,
            alg: 'ed25519',
            keyid: 'DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt',
        } as Inputage;
        const signiputString = siginput(input);
        assert.equal(
            signiputString,
            '("signify-resource" "@method" "@path" "signify-timestamp");created=1609459200;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"'
        );
    });
    it('RFC Test https://datatracker.ietf.org/doc/html/rfc9421#section-2.5', async () => {
        const expectedParameters =
            '("@method" "@authority" "@path" "content-digest" "content-length" "content-type");created=1618884473;keyid="test-key-rsa-pss"';
        const input = {
            fields: [
                '@method',
                '@authority',
                '@path',
                'content-digest',
                'content-length',
                'content-type',
            ],
            created: 1618884473,
            keyid: 'test-key-rsa-pss',
        } as Inputage;
        const result = siginput(input);
        assert.equal(result, expectedParameters);
    });
    it('RFC Test https://datatracker.ietf.org/doc/html/rfc9421#appendix-B.2.6', async () => {
        const expectedParameters =
            '("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"';
        const input = {
            fields: [
                'date',
                '@method',
                '@path',
                '@authority',
                'content-type',
                'content-length',
            ],
            created: 1618884473,
            keyid: 'test-key-ed25519',
        } as Inputage;
        const result = siginput(input);
        assert.equal(result, expectedParameters);
    });
});

describe('desiginput', () => {
    it('parse signature input to a map of Inputage object by label', async () => {
        const siginput =
            'sig0=("signify-resource" "@method" "@path" "signify-timestamp");created=1609459200;keyid="EIaGMMWJFPmtXznY1IIiKDIrg-vIyge6mBl2QV8dDjI3";alg="ed25519", ' +
            'sig1=("@method" "@path" "signify-resource" "signify-timestamp");created=1609459201;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";expires=1609459210;alg="ed25519"';

        const inputs = desiginput(siginput);
        assert.equal(inputs.size, 2);
        const sig0Input = inputs.get('sig0')!;
        assert.deepStrictEqual(sig0Input.fields, [
            'signify-resource',
            '@method',
            '@path',
            'signify-timestamp',
        ]);
        assert.equal(sig0Input.created, 1609459200);
        assert.equal(sig0Input.alg, 'ed25519');
        assert.equal(
            sig0Input.keyid,
            'EIaGMMWJFPmtXznY1IIiKDIrg-vIyge6mBl2QV8dDjI3'
        );
        assert.equal(sig0Input.expires, undefined);
        assert.equal(sig0Input.nonce, undefined);
        assert.equal(sig0Input.context, undefined);
        const sig1Input = inputs.get('sig1')!;
        assert.deepStrictEqual(sig1Input.fields, [
            '@method',
            '@path',
            'signify-resource',
            'signify-timestamp',
        ]);
        assert.equal(sig1Input.created, 1609459201);
        assert.equal(sig1Input.alg, 'ed25519');
        assert.equal(
            sig1Input.keyid,
            'DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt'
        );
        assert.equal(sig1Input.expires, 1609459210);
        assert.equal(sig1Input.nonce, undefined);
        assert.equal(sig1Input.context, undefined);
    });
    it('RFC Test https://datatracker.ietf.org/doc/html/rfc9421#appendix-B.2.6', async () => {
        const siginputString =
            'sig-b26=("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"';
        const inputs = desiginput(siginputString);
        assert.equal(inputs.size, 1);
        const input = inputs.get('sig-b26')!;
        assert.deepStrictEqual(input.fields, [
            'date',
            '@method',
            '@path',
            '@authority',
            'content-type',
            'content-length',
        ]);
        assert.equal(input.created, 1618884473);
        assert.equal(input.alg, undefined);
        assert.equal(input.keyid, 'test-key-ed25519');
        assert.equal(input.expires, undefined);
        assert.equal(input.nonce, undefined);
        assert.equal(input.context, undefined);
    });
});

describe('sigbase', () => {
    it('RFC Test https://datatracker.ietf.org/doc/html/rfc9421#section-2.5', async () => {
        const expectedSigbase =
            '"@method": POST\n' +
            '"@authority": example.com\n' +
            '"@path": /foo\n' +
            '"content-digest": sha-512=:WZDPaVn/7XgHaAy8pmojAkGWoRx2UFChF41A2svX+TaPm+AbwAgBWnrIiYllu7BNNyealdVLvRwEmTHWXvJwew==:\n' +
            '"content-length": 18\n' +
            '"content-type": application/json\n' +
            '"@signature-params": ("@method" "@authority" "@path" "content-digest" "content-length" "content-type");created=1618884473;keyid="test-key-rsa-pss"';
        const signatureParams =
            '("@method" "@authority" "@path" "content-digest" "content-length" "content-type");created=1618884473;keyid="test-key-rsa-pss"';
        const fields = [
            '@method',
            '@authority',
            '@path',
            'content-digest',
            'content-length',
            'content-type',
        ];
        const inputHeaders = new Headers([
            [
                'content-digest',
                'sha-512=:WZDPaVn/7XgHaAy8pmojAkGWoRx2UFChF41A2svX+TaPm+AbwAgBWnrIiYllu7BNNyealdVLvRwEmTHWXvJwew==:',
            ],
            ['content-length', '18'],
            ['content-type', 'application/json'],
        ]);
        const result = sigbase(
            fields,
            signatureParams,
            inputHeaders,
            'POST',
            '/foo',
            'example.com'
        );
        assert.equal(result, expectedSigbase);
    });
    it('RFC Test https://datatracker.ietf.org/doc/html/rfc9421#appendix-B.2.6', async () => {
        const expectedSigbase =
            '"date": Tue, 20 Apr 2021 02:07:55 GMT\n' +
            '"@method": POST\n' +
            '"@path": /foo\n' +
            '"@authority": example.com\n' +
            '"content-type": application/json\n' +
            '"content-length": 18\n' +
            '"@signature-params": ("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"';
        const signatureParams =
            '("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"';
        const fields = [
            'date',
            '@method',
            '@path',
            '@authority',
            'content-type',
            'content-length',
        ];
        const inputHeaders = new Headers([
            ['content-length', '18'],
            ['date', 'Tue, 20 Apr 2021 02:07:55 GMT'],
            ['content-type', 'application/json'],
        ]);
        const result = sigbase(
            fields,
            signatureParams,
            inputHeaders,
            'POST',
            '/foo',
            'example.com'
        );
        assert.equal(result, expectedSigbase);
    });
    it('signify valid', async () => {
        const expectedSigbase =
            '"signify-resource": EWJkQCFvKuyxZi582yJPb0wcwuW3VXmFNuvbQuBpgmIs\n' +
            '"@method": POST\n' +
            '"@path": /signify\n' +
            '"signify-timestamp": 2022-09-24T00:05:48.196795+00:00\n' +
            '"@signature-params": ("signify-resource" "@method" "@path" "signify-timestamp");created=1609459200;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"';
        const signatureParams =
            '("signify-resource" "@method" "@path" "signify-timestamp");created=1609459200;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"';
        const fields = [
            'signify-resource',
            '@method',
            '@path',
            'signify-timestamp',
        ];
        const inputHeaders: Headers = new Headers([
            ['Content-Type', 'application/json'],
            ['Content-Length', '256'],
            ['Connection', 'close'],
            [
                'Signify-Resource',
                'EWJkQCFvKuyxZi582yJPb0wcwuW3VXmFNuvbQuBpgmIs',
            ],
            ['Signify-Timestamp', '2022-09-24T00:05:48.196795+00:00'],
        ]);
        const result = sigbase(
            fields,
            signatureParams,
            inputHeaders,
            'POST',
            '/signify'
        );
        assert.equal(result, expectedSigbase);
    });
});
