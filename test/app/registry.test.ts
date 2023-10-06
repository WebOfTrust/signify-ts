import { SignifyClient } from '../../src/keri/app/clienting';
import { anyOfClass, anything, instance, mock, when } from 'ts-mockito';
import libsodium from 'libsodium-wrappers-sumo';
import 'whatwg-fetch';
import { Registries } from '../../src/keri/app/credentialing';
import { Identifier, KeyManager, SaltyKeeper } from '../../src';
import { strict as assert } from 'assert';

describe('registry', () => {
    it('should create a registry', async () => {
        await libsodium.ready;
        let mockedClient = mock(SignifyClient);
        let mockedIdentifiers = mock(Identifier);
        let mockedKeyManager = mock(KeyManager);
        let mockedKeeper = mock(SaltyKeeper);

        let hab = { prefix: 'hab prefix', state: { s: 0, d: 'a digest' } };

        when(mockedClient.manager).thenReturn(instance(mockedKeyManager));
        when(mockedKeyManager.get(hab)).thenReturn(instance(mockedKeeper));

        when(mockedKeeper.sign(anyOfClass(Uint8Array))).thenReturn([
            'a signature',
        ]);

        when(mockedIdentifiers.get('a name')).thenResolve(hab);
        when(mockedClient.identifiers()).thenReturn(
            instance(mockedIdentifiers)
        );

        let mockedResponse = mock(Response);
        when(
            mockedClient.fetch(
                '/identifiers/a name/registries',
                'POST',
                anything()
            )
        ).thenResolve(instance(mockedResponse));

        let registries = new Registries(instance(mockedClient));

        let actual = await registries.create({
            name: 'a name',
            registryName: 'a registry name',
            nonce: '',
        });

        assert.equal(
            actual.regser.raw,
            '{"v":"KERI10JSON0000c5_","t":"vcp","d":"EMppKX_JxXBuL_xE3A_a6lOcseYwaB7jAvZ0YFdgecXX","i":"EMppKX_JxXBuL_xE3A_a6lOcseYwaB7jAvZ0YFdgecXX","ii":"hab prefix","s":"0","c":["NB"],"bt":"0","b":[],"n":""}'
        );
        assert.equal(
            actual.serder.raw,
            '{"v":"KERI10JSON0000f4_","t":"ixn","d":"EE5R61289Xnpxc2M-euPtsAkp849tUdNJ7DuyBeSiRtm","i":"hab prefix","s":"1","p":"a digest","a":[{"i":"EMppKX_JxXBuL_xE3A_a6lOcseYwaB7jAvZ0YFdgecXX","s":"0","d":"EMppKX_JxXBuL_xE3A_a6lOcseYwaB7jAvZ0YFdgecXX"}]}'
        );
    });

    it('should fail on estanblishmnet only for now', async () => {
        await libsodium.ready;
        let mockedClient = mock(SignifyClient);
        let mockedIdentifiers = mock(Identifier);

        let hab = {
            prefix: 'hab prefix',
            state: { s: 0, d: 'a digest', c: ['EO'] },
        };

        when(mockedIdentifiers.get('a name')).thenResolve(hab);
        when(mockedClient.identifiers()).thenReturn(
            instance(mockedIdentifiers)
        );

        let registries = new Registries(instance(mockedClient));

        assert.rejects(
            async () => {
                await registries.create({
                    name: 'a name',
                    registryName: 'a registry name',
                    nonce: '',
                });
            },
            {
                name: 'Error',
                message: 'establishment only not implemented',
            }
        );
    });
});
