import { SignifyClient } from '../../src/keri/app/clienting';
import { anyOfClass, anything, instance, mock, when } from 'ts-mockito';
import libsodium from 'libsodium-wrappers-sumo';
import 'whatwg-fetch';
import { Registries } from '../../src/keri/app/credentialing';
import { Identifier, KeyEvents, KeyManager, SaltyKeeper } from '../../src';
import { strict as assert } from 'assert';
import { HabState, State } from '../../src/keri/core/state';

describe('registry', () => {
    it('should create a registry', async () => {
        await libsodium.ready;
        const mockedClient = mock(SignifyClient);
        const mockedIdentifiers = mock(Identifier);
        const mockedKeyManager = mock(KeyManager);
        const mockedKeeper = mock(SaltyKeeper);
        const mockedKeyEvents = mock(KeyEvents);

        const hab = {
            prefix: 'hab prefix',
            state: { s: '0', d: 'a digest' } as State,
        } as HabState;
        const events: never[] = [];

        when(mockedClient.manager).thenReturn(instance(mockedKeyManager));
        when(mockedKeyManager.get(hab)).thenReturn(instance(mockedKeeper));

        when(mockedKeeper.sign(anyOfClass(Uint8Array))).thenResolve([
            'a signature',
        ]);

        when(mockedIdentifiers.get('a name')).thenResolve(hab);
        when(mockedClient.identifiers()).thenReturn(
            instance(mockedIdentifiers)
        );
        when(mockedKeyEvents.get(hab.prefix)).thenResolve(events);
        when(mockedClient.keyEvents()).thenReturn(instance(mockedKeyEvents));

        const mockedResponse = mock(Response);
        when(
            mockedClient.fetch(
                '/identifiers/a name/registries',
                'POST',
                anything()
            )
        ).thenResolve(instance(mockedResponse));

        const registries = new Registries(instance(mockedClient));

        const actual = await registries.create({
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
        const mockedClient = mock(SignifyClient);
        const mockedIdentifiers = mock(Identifier);
        const mockedKeyEvents = mock(KeyEvents);

        const hab = {
            prefix: 'hab prefix',
            state: { s: 0, d: 'a digest', c: ['EO'] } as unknown as State,
            name: 'a name',
            transferable: true,
            windexes: [],
        } as HabState;

        const events = [
            {
                a: [],
            },
        ];

        when(mockedIdentifiers.get('a name')).thenResolve(hab);
        when(mockedClient.identifiers()).thenReturn(
            instance(mockedIdentifiers)
        );
        when(mockedKeyEvents.get(hab.prefix)).thenResolve(events);
        when(mockedClient.keyEvents()).thenReturn(instance(mockedKeyEvents));

        const registries = new Registries(instance(mockedClient));

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

    it('should create a registry when the anchor is already on the KEL', async () => {
        await libsodium.ready;
        const mockedClient = mock(SignifyClient);
        const mockedIdentifiers = mock(Identifier);
        const mockedKeyManager = mock(KeyManager);
        const mockedKeeper = mock(SaltyKeeper);
        const mockedKeyEvents = mock(KeyEvents);

        const hab = {
            prefix: 'hab prefix',
            state: { i: 'a prefix', s: '1', d: 'a digest', p: 'old digest' } as State,
        } as HabState;
        const events = [
            {
                i: 'a prefix',
                s: '0'
            },
            {
                i: 'a prefix',
                s: '1',
                d: 'a 2nd digest',
                a: [
                    {
                        i: 'EMppKX_JxXBuL_xE3A_a6lOcseYwaB7jAvZ0YFdgecXX',
                        s: '0',
                        d: 'EMppKX_JxXBuL_xE3A_a6lOcseYwaB7jAvZ0YFdgecXX',
                }],
            },
        ];

        when(mockedClient.manager).thenReturn(instance(mockedKeyManager));
        when(mockedKeyManager.get(hab)).thenReturn(instance(mockedKeeper));

        when(mockedKeeper.sign(anyOfClass(Uint8Array))).thenResolve([
            'a signature',
        ]);

        when(mockedIdentifiers.get('a name')).thenResolve(hab);
        when(mockedClient.identifiers()).thenReturn(
            instance(mockedIdentifiers)
        );
        when(mockedKeyEvents.get(hab.prefix)).thenResolve(events);
        when(mockedClient.keyEvents()).thenReturn(instance(mockedKeyEvents));

        const mockedResponse = mock(Response);
        when(
            mockedClient.fetch(
                '/identifiers/a name/registries',
                'POST',
                anything()
            )
        ).thenResolve(instance(mockedResponse));

        const registries = new Registries(instance(mockedClient));

        const actual = await registries.create({
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
            '{"v":"KERI10JSON0000f6_","t":"ixn","d":"EN9qu43BedCpLgKeeb01FfZa5T50mWNnpIdQEHF4k799","i":"hab prefix","s":"1","p":"old digest","a":[{"i":"EMppKX_JxXBuL_xE3A_a6lOcseYwaB7jAvZ0YFdgecXX","s":"0","d":"EMppKX_JxXBuL_xE3A_a6lOcseYwaB7jAvZ0YFdgecXX"}]}'
        );
    });
});
