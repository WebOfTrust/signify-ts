import { Habery } from '../../src/keri/app/habery';
import { strict as assert } from 'assert';
import libsodium from 'libsodium-wrappers-sumo';
import { Salter } from '../../src/keri/core/salter';
import { b } from '../../src/keri/core/core';
import { MtrDex } from '../../src/keri/core/matter';

describe('Habery', () => {
    it('should manage AID creation and rotation', async () => {
        await libsodium.ready;
        let salt = new Salter({ raw: b('0123456789abcdef') }).qb64;
        let hby = new Habery({
            name: 'signify',
            salt: salt,
            passcode: '0123456789abcdefghijk',
        });

        assert.equal(
            hby.mgr.aeid,
            'BMbZTXzB7LmWPT2TXLGV88PQz5vDEM2L2flUs2yxn3U9'
        );

        let hab = hby.makeHab('test', {});

        assert.deepStrictEqual(hab.serder.ked['k'], [
            'DAQVURvW74OJH1Q0C6YLim_tdBYoXABwg6GsAlPaUJXE',
        ]);
        assert.deepStrictEqual(hab.serder.ked['n'], [
            'ENBWnU8wNHqq9oqJIimWhxUtNDHReUXtiCwwtjg9zKY0',
        ]);
    });

    it('should use passcode as salt', async () => {
        await libsodium.ready;
        let passcode = '0123456789abcdefghijk';
        if (passcode.length < 21) {
            throw new Error('Bran (passcode seed material) too short.');
        }

        let bran = MtrDex.Salt_128 + 'A' + passcode.substring(0, 21); // qb64 salt for seed
        let salter = new Salter({ qb64: bran });
        let signer = salter.signer(MtrDex.Ed25519_Seed, true);
        assert.equal(
            signer.qb64,
            'AKeXgiAUIN7OHGXO6rbw_IzWeaQTr1LF7jWD6YEdrpa6'
        );
        assert.equal(
            signer.verfer.qb64,
            'DMbZTXzB7LmWPT2TXLGV88PQz5vDEM2L2flUs2yxn3U9'
        );

        let hby = new Habery({ name: 'test', salt: salter.qb64 });
        let hab = hby.makeHab('test', { transferable: true });

        assert.equal(hab.pre, 'EMRbh7mWJTijcWiQKT3uxozncpa9_gEX1IU0fM1wnKxi');
    });
});
