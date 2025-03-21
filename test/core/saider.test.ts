import {
    Protocols,
    Serials,
    versify,
    Vrsn_1_0,
} from '../../src/keri/core/core.ts';
import { strict as assert } from 'assert';
import { MtrDex } from '../../src/keri/core/matter.ts';
import libsodium from 'libsodium-wrappers-sumo';
import { Saider } from '../../src/keri/core/saider.ts';

describe('Saider', () => {
    it('should create Saidified dicts', async () => {
        await libsodium.ready;

        const kind = Serials.JSON;
        const code = MtrDex.Blake3_256;

        const vs = versify(Protocols.KERI, Vrsn_1_0, kind, 0); // vaccuous size == 0
        assert.equal(vs, 'KERI10JSON000000_');
        const sad4 = {
            v: vs,
            t: 'rep',
            d: '', // vacuous said
            dt: '2020-08-22T17:50:12.988921+00:00',
            r: 'logs/processor',
            a: {
                d: 'EBabiu_JCkE0GbiglDXNB5C4NQq-hiGgxhHKXBxkiojg',
                i: 'EB0_D51cTh_q6uOQ-byFiv5oNXZ-cxdqCqBAa4JmBLtb',
                name: 'John Jones',
                role: 'Founder',
            },
        };
        const saider = new Saider({}, sad4); // default version string code, kind, and label
        assert.equal(saider.code, code);
        assert.equal(
            saider.qb64,
            'ELzewBpZHSENRP-sL_G_2Ji4YDdNkns9AzFzufleJqdw'
        );
    });
});
