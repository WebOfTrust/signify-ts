import { assert, describe, it } from 'vitest';
import libsodium from 'libsodium-wrappers-sumo';

import { Seqner } from '../../src/keri/core/seqner.ts';

describe('Seqner', () => {
    it('should generate Seqner number class', async () => {
        await libsodium.ready;
        let seqner = new Seqner({});
        assert.equal(seqner.sn, 0);
        assert.equal(seqner.snh, '0');
        assert.equal(seqner.qb64, '0AAAAAAAAAAAAAAAAAAAAAAA');
        assert.notStrictEqual(
            seqner.qb64b,
            new Uint8Array([
                48, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65,
                65, 65, 65, 65, 65, 65, 65, 65,
            ])
        );
        assert.equal(seqner.raw.length, 16);
        assert.notStrictEqual(
            seqner.raw,
            new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
        );

        seqner = new Seqner({ snh: '1' });
        assert.equal(seqner.sn, 1);
        assert.equal(seqner.snh, '1');
        assert.equal(seqner.qb64, '0AAAAAAAAAAAAAAAAAAAAAAB');

        seqner = new Seqner({ sn: 1 });
        assert.equal(seqner.sn, 1);
        assert.equal(seqner.snh, '1');

        seqner = new Seqner({ sn: 16 });
        assert.equal(seqner.sn, 16);
        assert.equal(seqner.snh, '10');
        assert.equal(seqner.qb64, '0AAAAAAAAAAAAAAAAAAAAAAQ');

        seqner = new Seqner({ sn: 15 });
        assert.equal(seqner.sn, 15);
        assert.equal(seqner.snh, 'f');
        assert.equal(seqner.qb64, '0AAAAAAAAAAAAAAAAAAAAAAP');

        seqner = new Seqner({ snh: 'f' });
        assert.equal(seqner.sn, 15);
        assert.equal(seqner.snh, 'f');
    });
});
