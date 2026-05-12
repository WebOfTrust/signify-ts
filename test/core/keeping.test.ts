import libsodium from 'libsodium-wrappers-sumo';
import { assert, describe, it } from 'vitest';
import {
    MtrDex,
    RandyIdentifierManager,
    Salter,
    SaltyIdentifierManager,
    Siger,
    Tier,
    b,
} from '../../src/index.ts';

describe('IdentifierManager signing', () => {
    it('allows SaltyIdentifierManager to create current-only indexed signatures with ondices=[undefined]', async () => {
        await libsodium.ready;

        const salter = new Salter({ raw: b('0123456789abcdef') });
        const manager = new SaltyIdentifierManager(
            salter,
            0,
            0,
            Tier.low,
            true
        );
        await manager.incept(true);

        // Group non-rotation signing passes ondices=[undefined]; Salty must
        // preserve that as a current-only indexed signature.
        const sigs = await manager.sign(
            b('current-only-salty'),
            true,
            [0],
            [undefined]
        );

        const siger = new Siger({ qb64: sigs[0] });
        assert.equal(siger.index, 0);
        assert.equal(siger.ondex, undefined);
    });

    it('allows RandyIdentifierManager to create current-only indexed signatures with ondices=[undefined]', async () => {
        await libsodium.ready;

        const salter = new Salter({ raw: b('0123456789abcdef') });
        const manager = new RandyIdentifierManager(
            salter,
            MtrDex.Ed25519_Seed,
            1,
            undefined,
            true,
            MtrDex.Ed25519_Seed,
            1,
            [MtrDex.Ed25519_Seed]
        );
        await manager.incept(true);

        // Randy uses encrypted stored keys, so this separately guards the same
        // current-only ondex contract through the Randy keeper path.
        const sigs = await manager.sign(
            b('current-only-randy'),
            true,
            [0],
            [undefined]
        );

        const siger = new Siger({ qb64: sigs[0] });
        assert.equal(siger.index, 0);
        assert.equal(siger.ondex, undefined);
    });
});
