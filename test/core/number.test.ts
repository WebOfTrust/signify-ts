import { assert, describe, it } from 'vitest';
import { CesrNumber } from '../../src/keri/core/number.ts';

describe('CesrNumber', () => {
    it('should create CesrNumber from various inputs', async () => {
        let n = new CesrNumber({}, '0');
        assert.equal(n.num, 0);
        assert.equal(n.numh, '0');

        n = new CesrNumber({}, 0);
        assert.equal(n.num, 0);
        assert.equal(n.numh, '0');

        n = new CesrNumber({}, 1);
        assert.equal(n.num, 1);
        assert.equal(n.numh, '1');

        n = new CesrNumber({}, 15);
        assert.equal(n.num, 15);
        assert.equal(n.numh, 'f');

        n = new CesrNumber({}, 'f');
        assert.equal(n.num, 15);
        assert.equal(n.numh, 'f');

        n = new CesrNumber({}, '15');
        assert.equal(n.num, 21);
        assert.equal(n.numh, '15');
    });
});
