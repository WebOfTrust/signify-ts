import libsodium from 'libsodium-wrappers-sumo';
import { assert, describe, expect, it, vitest } from 'vitest';
import {
    Diger,
    GroupIdentifierManager,
    MtrDex,
    RandyIdentifierManager,
    Salter,
    SaltyIdentifierManager,
    Siger,
    Tier,
    b,
} from '../../src/index.ts';

describe('IdentifierManager signing', () => {
    it('uses rotated=true to derive group rotation ondex', async () => {
        await libsodium.ready;

        const { keys, priorNextDigests } = groupSigningFixtures();
        const ser = b('not a keri event');
        const mhab = {
            state: {
                k: [keys[2]],
                n: [priorNextDigests[2]],
            },
        };
        const memberSign = vitest.fn().mockResolvedValue(['signature']);
        const manager = {
            get: vitest.fn().mockReturnValue({ sign: memberSign }),
        };
        const group = new GroupIdentifierManager(
            manager as never,
            mhab as never,
            undefined,
            undefined,
            keys.slice(0, 3),
            priorNextDigests
        );

        // The call-site flag decides whether group signing must expose prior-next ondex for a rotation signature.
        await group.sign(ser, true, undefined, undefined, true);

        expect(memberSign).toHaveBeenCalledWith(ser, true, [2], [2]);
    });

    it('uses rotated=false to keep group signatures current-only', async () => {
        await libsodium.ready;

        const { keys, priorNextDigests } = groupSigningFixtures();
        const ser = b('not a keri event');
        const mhab = {
            state: {
                k: [keys[0]],
                n: [priorNextDigests[0]],
            },
        };
        const memberSign = vitest.fn().mockResolvedValue(['signature']);
        const manager = {
            get: vitest.fn().mockReturnValue({ sign: memberSign }),
        };
        const group = new GroupIdentifierManager(
            manager as never,
            mhab as never,
            undefined,
            undefined,
            keys.slice(0, 3),
            priorNextDigests
        );

        // Non-rotation group signatures satisfy the current signing threshold
        // only, so ondex is intentionally suppressed.
        await group.sign(ser, true, undefined, undefined, false);

        expect(memberSign).toHaveBeenCalledWith(ser, true, [0], [undefined]);
    });

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

function groupSigningFixtures() {
    const salter = new Salter({ raw: b('0123456789abcdef') });
    const signers = [0, 1, 2, 3].map((idx) =>
        salter.signer(
            MtrDex.Ed25519_Seed,
            true,
            `member-${idx}`,
            Tier.low,
            true
        )
    );
    const keys = signers.map((signer) => signer.verfer.qb64);
    const priorNextDigests = signers
        .slice(0, 3)
        .map((signer) => new Diger({}, signer.verfer.qb64b).qb64);

    return { keys, priorNextDigests };
}

/**
 * Pre-rotation publishes a digest of the next key, never the key. A caller that
 * has to commit to it in a form KERI does not publish, a Cardano key hash for
 * one, cannot work from the digest and would otherwise reimplement the index
 * arithmetic incept and rotate use. A copy that drifts commits to a key nobody
 * holds, and that is only discovered at the rotation it blocks.
 *
 * So the property worth pinning is that what nextVerfers returns is exactly what
 * the next rotation reveals.
 */
describe('SaltyIdentifierManager next keys', () => {
    const newManager = () =>
        new SaltyIdentifierManager(
            new Salter({ raw: b('0123456789abcdef') }),
            0,
            0,
            Tier.low,
            true
        );

    it('returns the key the next rotation goes on to reveal', async () => {
        await libsodium.ready;

        const manager = newManager();
        await manager.incept(true);
        const predicted = manager.nextVerfers().map((v) => v.qb64);

        const [revealed] = await manager.rotate([MtrDex.Ed25519_Seed], true);
        assert.deepEqual(revealed, predicted);
    });

    it('still does, one rotation later', async () => {
        await libsodium.ready;

        const manager = newManager();
        await manager.incept(true);
        await manager.rotate([MtrDex.Ed25519_Seed], true);

        const predicted = manager.nextVerfers().map((v) => v.qb64);
        const [revealed] = await manager.rotate([MtrDex.Ed25519_Seed], true);
        assert.deepEqual(revealed, predicted);
    });

    it('agrees with the digest incept published, which is the same derivation', async () => {
        await libsodium.ready;

        const manager = newManager();
        const [, digers] = await manager.incept(true);
        const fromKeys = manager
            .nextVerfers()
            .map((v) => new Diger({ code: MtrDex.Blake3_256 }, v.qb64b).qb64);

        assert.deepEqual(fromKeys, digers);
    });

    it('is not the current key, or pre-rotation would be pointless', async () => {
        await libsodium.ready;

        const manager = newManager();
        const [verfers] = await manager.incept(true);
        const next = manager.nextVerfers().map((v) => v.qb64);

        assert.notDeepEqual(next, verfers);
    });

    it('is stable across calls, since it is derived and not drawn', async () => {
        await libsodium.ready;

        const manager = newManager();
        await manager.incept(true);
        assert.deepEqual(
            manager.nextVerfers().map((v) => v.qb64),
            manager.nextVerfers().map((v) => v.qb64)
        );
    });
});
