import { strict as assert } from 'assert';
import libsodium from 'libsodium-wrappers-sumo';
import {
    Authenticater,
    b,
    Inputage,
    Matter,
    MtrDex,
    Salter,
    Signer,
    Verfer,
} from '../../src';
import * as utilApi from '../../src/keri/core/utils';
import * as httping from '../../src/keri/core/httping';
import { mock } from 'ts-mockito';
import Base64 from 'urlsafe-base64';

describe('Authenticater.verify', () => {
    it('verify signature on Response', async () => {
        await libsodium.ready;
        const salt = '0123456789abcdef';
        const salter = new Salter({ raw: b(salt) });
        const signer = salter.signer();
        const aaid = 'DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt';
        const verfer = new Verfer({ qb64: aaid });

        const headers = new Headers([
            ['Content-Length', '898'],
            ['Content-Type', 'application/json'],
            [
                'Signature',
                'indexed="?0";signify="0BBRr2GjhqbkjEUSYHLNyu0w4ORZw2IU9AOYikZfIBKESdrY_O1E_ePGYzzK_4I7LLkqZOiulq7P527t2zU5vKoH"',
            ],
            [
                'Signature-Input',
                'signify=("signify-resource" "@method" "@path" "signify-timestamp");created=1684715820;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"',
            ],
            [
                'Signify-Resource',
                'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
            ],
            ['Signify-Timestamp', '2023-05-22T00:37:00.248708+00:00'],
        ]);
        const desiginputMock = jest.fn();
        const input = {
            fields: [
                'signify-resource',
                '@method',
                '@path',
                'signify-timestamp',
            ],
            created: 1684715820,
            keyid: 'DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt',
            alg: 'ed25519',
        } as Inputage;
        desiginputMock.mockReturnValue(new Map([['signify', input]]));
        const sigbaseMock = jest.fn();
        sigbaseMock.mockReturnValue(
            '"signify-resource": EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei\n' +
                '"@method": GET\n' +
                '"@path": /identifiers/aid1\n' +
                '"signify-timestamp": 2023-05-22T00:37:00.248708+00:00\n' +
                '"@signature-params": ("signify-resource" "@method" "@path" "signify-timestamp");created=1684715820;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"'
        );
        const siginputMock = jest.fn();
        siginputMock.mockReturnValue(
            '("signify-resource" "@method" "@path" "signify-timestamp");created=1684715820;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"'
        );
        jest.spyOn(httping, 'sigbase').mockImplementation(sigbaseMock);
        jest.spyOn(httping, 'siginput').mockImplementation(siginputMock);
        jest.spyOn(httping, 'desiginput').mockImplementation(desiginputMock);

        const authn = new Authenticater(signer, verfer);
        assert.notEqual(authn, undefined);
        assert.equal(authn.verify(headers, 'GET', '/identifiers/aid1'), true);
        expect(desiginputMock).toHaveBeenCalledTimes(1);
        expect(desiginputMock).toHaveBeenCalledWith(
            'signify=("signify-resource" "@method" "@path" "signify-timestamp");created=1684715820;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"'
        );
        expect(siginputMock).toHaveBeenCalledTimes(1);
        expect(siginputMock).toHaveBeenCalledWith(input);
        expect(sigbaseMock).toHaveBeenCalledTimes(1);
        expect(sigbaseMock).toHaveBeenCalledWith(
            input.fields,
            '("signify-resource" "@method" "@path" "signify-timestamp");created=1684715820;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"',
            headers,
            'GET',
            '/identifiers/aid1',
            undefined
        );
    });
    it('verify test request https://datatracker.ietf.org/doc/html/rfc9421#appendix-B.2.6', async () => {
        await libsodium.ready;

        const publicKey = new Uint8Array([
            38, 180, 11, 143, 147, 255, 243, 216, 151, 17, 47, 126, 188, 88, 43,
            35, 45, 189, 114, 81, 125, 8, 47, 232, 60, 251, 48, 221, 206, 67,
            209, 187,
        ]);
        const signerMock = mock(Signer);
        const verfer = new Verfer({ raw: publicKey });
        const expectedSignatureB64 =
            'wqcAqbmYJ2ji2glfAMaRy4gruYYnx2nEFN2HN6jrnDnQCK1u02Gb04v9EDgwUPiu4A0w6vuQv5lIp5WPpBKRCw==';
        const expectedSignatureRaw = new Uint8Array(
            Base64.decode(expectedSignatureB64)
        );
        const expectedSignatureCESR = new Matter({
            raw: expectedSignatureRaw,
            code: MtrDex.Ed25519_Sig,
        });

        const headers = new Headers([
            [
                'content-digest',
                'sha-512=:WZDPaVn/7XgHaAy8pmojAkGWoRx2UFChF41A2svX+TaPm+AbwAgBWnrIiYllu7BNNyealdVLvRwEmTHWXvJwew==:',
            ],
            ['content-length', '18'],
            ['content-type', 'application/json'],
            ['date', 'Tue, 20 Apr 2021 02:07:55 GMT'],
            [
                'Signature',
                `indexed="?0";signify="${expectedSignatureCESR.qb64}"`,
            ],
            [
                'Signature-Input',
                'signify=("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"',
            ],
        ]);
        const desiginputMock = jest.fn();
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
        desiginputMock.mockReturnValue(new Map([['signify', input]]));
        const sigbaseMock = jest.fn();
        sigbaseMock.mockReturnValue(
            '"date": Tue, 20 Apr 2021 02:07:55 GMT\n' +
                '"@method": POST\n' +
                '"@path": /foo\n' +
                '"@authority": example.com\n' +
                '"content-type": application/json\n' +
                '"content-length": 18\n' +
                '"@signature-params": ("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"'
        );
        const siginputMock = jest.fn();
        siginputMock.mockReturnValue(
            '("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"'
        );
        jest.spyOn(httping, 'sigbase').mockImplementation(sigbaseMock);
        jest.spyOn(httping, 'siginput').mockImplementation(siginputMock);
        jest.spyOn(httping, 'desiginput').mockImplementation(desiginputMock);

        const authn = new Authenticater(signerMock, verfer);
        assert.notEqual(authn, undefined);

        assert.equal(
            authn.verify(new Headers(headers), 'POST', '/foo', 'example.com'),
            true
        );
        expect(desiginputMock).toHaveBeenCalledTimes(1);
        expect(desiginputMock).toHaveBeenCalledWith(
            'signify=("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"'
        );
        expect(siginputMock).toHaveBeenCalledTimes(1);
        expect(siginputMock).toHaveBeenCalledWith(input);
        expect(sigbaseMock).toHaveBeenCalledTimes(1);
        expect(sigbaseMock).toHaveBeenCalledWith(
            input.fields,
            '("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"',
            headers,
            'POST',
            '/foo',
            'example.com'
        );
    });
});

describe('Authenticater.sign', () => {
    it('Create signed headers for a request', async () => {
        await libsodium.ready;
        const salt = '0123456789abcdef';
        const salter = new Salter({ raw: b(salt) });
        const signer = salter.signer();
        const aaid = 'DDK2N5_fVCWIEO9d8JLhk7hKrkft6MbtkUhaHQsmABHY';
        const verfer = new Verfer({ qb64: aaid });

        let headers = new Headers([
            ['Content-Type', 'application/json'],
            ['Content-Length', '256'],
            ['Connection', 'close'],
            [
                'Signify-Resource',
                'EWJkQCFvKuyxZi582yJPb0wcwuW3VXmFNuvbQuBpgmIs',
            ],
            ['Signify-Timestamp', '2022-09-24T00:05:48.196795+00:00'],
        ]);
        jest.spyOn(utilApi, 'nowUTC').mockReturnValue(
            new Date('2021-01-01T00:00:00.000000+00:00')
        );

        const sigbaseMock = jest.fn();
        sigbaseMock.mockReturnValue(
            '"@method": POST\n' +
                '"@path": /boot\n' +
                '"signify-resource": EWJkQCFvKuyxZi582yJPb0wcwuW3VXmFNuvbQuBpgmIs\n' +
                '"signify-timestamp": 2022-09-24T00:05:48.196795+00:00\n' +
                '"@signature-params": ("@method" "@path" "signify-resource" "signify-timestamp");created=1609459200;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"'
        );
        const siginputMock = jest.fn();
        siginputMock.mockReturnValue(
            '("@method" "@path" "signify-resource" "signify-timestamp");created=1609459200;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"'
        );
        jest.spyOn(httping, 'sigbase').mockImplementation(sigbaseMock);
        jest.spyOn(httping, 'siginput').mockImplementation(siginputMock);

        const authn = new Authenticater(signer, verfer);
        headers = authn.sign(headers, 'POST', '/boot');

        assert.equal(headers.has('Signature-Input'), true);
        assert.equal(headers.has('Signature'), true);
        assert.equal(
            headers.get('Signature-Input'),
            'signify=("@method" "@path" "signify-resource" "signify-timestamp");created=1609459200;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"'
        );
        assert.equal(
            headers.get('Signature'),
            'indexed="?0";signify="0BDcjKTbpvmcF9oIeCI-95enQRd3_PfAgzOWi9vVf811lWGlTTOsKtFzpdkwr90ksvpvB_GhvsbV2l29wFN_QW0K"'
        );

        const expectedInput = {
            fields: [
                '@method',
                '@path',
                'signify-resource',
                'signify-timestamp',
            ],
            created: 1609459200,
            alg: 'ed25519',
            keyid: 'DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt',
        } as Inputage;
        expect(siginputMock).toHaveBeenCalledTimes(1);
        expect(siginputMock).toHaveBeenCalledWith(expectedInput);
        expect(sigbaseMock).toHaveBeenCalledTimes(1);
        expect(sigbaseMock).toHaveBeenCalledWith(
            expectedInput.fields,
            '("@method" "@path" "signify-resource" "signify-timestamp");created=1609459200;keyid="DN54yRad_BTqgZYUSi_NthRBQrxSnqQdJXWI5UHcGOQt";alg="ed25519"',
            headers,
            'POST',
            '/boot',
            undefined
        );
    });
});
