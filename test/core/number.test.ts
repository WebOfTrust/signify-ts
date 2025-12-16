import { assert, describe, it } from 'vitest';
import { CesrNumber } from '../../src/keri/core/number.ts';

describe('THolder', () => {
    it('should hold thresholds', async () => {
        let n = new CesrNumber({}, undefined, '0');
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

        n = new CesrNumber({}, undefined, '1');
        assert.equal(n.num, 1);
        assert.equal(n.numh, '1');

        n = new CesrNumber({}, undefined, 'f');
        assert.equal(n.num, 15);
        assert.equal(n.numh, 'f');

        n = new CesrNumber({}, undefined, '15');
        assert.equal(n.num, 21);
        assert.equal(n.numh, '15');

        n = new CesrNumber({}, 39);
        assert.equal(n.num, 39);
        assert.equal(n.numh, '27');
    
        n = new CesrNumber({}, '39');
        assert.equal(n.num, 0);
        assert.equal(n.numh, '0');

        n = new CesrNumber({}, undefined, '39');
        assert.equal(n.num, 57);
        assert.equal(n.numh, '39');

        n = new CesrNumber({}, '3a');
        assert.equal(n.num, 0);
        assert.equal(n.numh, '0');

        n = new CesrNumber({}, undefined, '3a');
        assert.equal(n.num, 58);
        assert.equal(n.numh, '3a');
    });
});
