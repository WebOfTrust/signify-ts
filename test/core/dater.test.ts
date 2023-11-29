import { strict as assert } from 'assert';

import { Dater } from 'cesride-wasm';

import { DTS_BASE_0, DTS_BASE_1 } from '../../src/keri/core/helping';
import { MtrDex } from '../../src/keri/core/matter';

describe('Dater Tests', () => {
  test('Test Dater date time subclass of Matter', () => {
    let dater = new Dater();  // defaults to now
    // TODO(CAL): Figure out change to use cesride MatterCodex instead of signify-ts MtrDex 
    expect(dater.code).toBe(MtrDex.DateTime);
    expect(dater.raw).toHaveLength(24);
    expect(dater.qb64).toHaveLength(36);
    expect(dater.qb2).toHaveLength(27);
    expect(dater.dts).toHaveLength(32);

    const dts1: string = '2020-08-22T17:50:09.988921+00:00';
    const dts1b = new Uint8Array(Buffer.from(dts1));
    const dt1raw = new Uint8Array(Buffer.from('\xdbM\xb4\xfbO>\xdbd\xf5\xed\xcetsO]\xf7\xcf=\xdbZt\xd1\xcd4', 'binary'));
    const dt1qb64 = '1AAG2020-08-22T17c50c09d988921p00c00';
    const dt1qb64b = new Uint8Array(Buffer.from(dt1qb64));
    const dt1qb2 = new Uint8Array(Buffer.from('\xd4\x00\x06\xdbM\xb4\xfbO>\xdbd\xf5\xed\xcetsO]\xf7\xcf=\xdbZt\xd1\xcd4', 'binary'));

    dater = new Dater(dts1, undefined, undefined, undefined, undefined, undefined);
    expect(dater.raw).toEqual(dt1raw);
    expect(dater.code).toBe(MtrDex.DateTime);
    expect(dater.dts).toBe(dts1);
    expect(dater.dtsb).toEqual(dts1b);
    expect(dater.qb64).toBe(dt1qb64);
    expect(dater.qb64b).toEqual(dt1qb64b);
    expect(dater.qb2).toEqual(dt1qb2);

    // TODO(CAL): Adjust dater in cesride to accept bytes for dts instead of
    // just string like in keripy Will create issue.
    //dater = new Dater(dts1b, undefined, undefined, undefined, undefined, undefined);
    //expect(dater.raw).toEqual(dt1raw);
    //expect(dater.code).toBe(MtrDex.DateTime);
    ////expect(dater.code).toBe(MatterCodex.DateTime);
    //expect(dater.dts).toBe(dts1);
    //expect(dater.dtsb).toEqual(dts1b);
    //expect(dater.qb64).toBe(dt1qb64);
    //expect(dater.qb64b).toEqual(dt1qb64b);
    //expect(dater.qb2).toEqual(dt1qb2);

    const dts2 = '2020-08-22T17:50:09.988921-01:00';
    const dts2b = new Uint8Array(Buffer.from(dts2));
    const dt2raw = new Uint8Array(Buffer.from('\xdbM\xb4\xfbO>\xdbd\xf5\xed\xcetsO]\xf7\xcf=\xdb_\xb4\xd5\xcd4', 'binary'));
    const dt2qb64 = '1AAG2020-08-22T17c50c09d988921-01c00';
    const dt2qb64b = new Uint8Array(Buffer.from(dt2qb64));
    const dt2qb2 = new Uint8Array(Buffer.from('\xd4\x00\x06\xdbM\xb4\xfbO>\xdbd\xf5\xed\xcetsO]\xf7\xcf=\xdb_\xb4\xd5\xcd4', 'binary'));

    dater = new Dater(dts2, undefined, undefined, undefined, undefined, undefined);
    expect(dater.code).toBe(MtrDex.DateTime);
    expect(dater.dts).toBe(dts2);
    expect(dater.dtsb).toEqual(dts2b);
    expect(dater.raw).toEqual(dt2raw);
    expect(dater.qb64).toBe(dt2qb64);
    expect(dater.qb64b).toEqual(dt2qb64b);
    expect(dater.qb2).toEqual(dt2qb2);

    // TODO(CAL): Adjust dater in cesride to accept bytes instead of just string like in keripy
    // Will create issue.
    //dater = new Dater(dts2b, undefined, undefined, undefined, undefined, undefined);
    //expect(dater.code).toBe(MtrDex.DateTime);
    ////expect(dater.code).toBe(MatterCodex.DateTime);
    //expect(dater.dts).toBe(dts2);
    //expect(dater.dtsb).toEqual(dts2b);
    //expect(dater.raw).toEqual(dt2raw);
    //expect(dater.qb64).toBe(dt2qb64);
    //expect(dater.qb64b).toEqual(dt2qb64b);
    //expect(dater.qb2).toEqual(dt2qb2);

    dater = new Dater(undefined, MtrDex.DateTime, dt1raw, undefined, undefined, undefined);
    //dater = new Dater(undefined, MatterCodex.DateTime, dt1raw, undefined, undefined, undefined);
    expect(dater.raw).toEqual(dt1raw);
    expect(dater.code).toBe(MtrDex.DateTime);
    expect(dater.dts).toBe(dts1);
    expect(dater.dtsb).toEqual(dts1b);
    expect(dater.qb64).toBe(dt1qb64);
    expect(dater.qb64b).toEqual(dt1qb64b);
    expect(dater.qb2).toEqual(dt1qb2);

    //TODO(CAL): Adjust dater in cesride to accept bytes for dt1qb64 instead of just string
    //dater = new Dater(undefined, undefined, undefined, dt1qb64, undefined, undefined);
    //expect(dater.raw).toEqual(dt1raw);
    //expect(dater.code).toBe(MtrDex.DateTime);
    //expect(dater.dts).toBe(dts1);
    //expect(dater.dtsb).toEqual(dts1b);
    //expect(dater.qb64).toBe(dt1qb64);
    //expect(dater.qb64b).toEqual(dt1qb64b);
    //expect(dater.qb2).toEqual(dt1qb2);

    // TODO(CAL): Adjust Dater in cesride to accept bytes instead of just string like in keripy
    //dater = new Dater(undefined, undefined, undefined, undefined, dt1qb64b, undefined);
    //expect(dater.raw).toEqual(dt1raw);
    //expect(dater.code).toBe(MtrDex.DateTime);
    //expect(dater.dts).toBe(dts1);
    //expect(dater.dtsb).toEqual(dts1b);
    //expect(dater.qb64).toBe(dt1qb64);
    //expect(dater.qb64b).toEqual(dt1qb64b);
    //expect(dater.qb2).toEqual(dt1qb2);

    dater = new Dater(undefined, undefined, undefined, undefined, undefined, dt1qb2);
    expect(dater.raw).toEqual(dt1raw);
    expect(dater.code).toBe(MtrDex.DateTime);
    expect(dater.dts).toBe(dts1);
    expect(dater.dtsb).toEqual(dts1b);
    expect(dater.qb64).toBe(dt1qb64);
    expect(dater.qb64b).toEqual(dt1qb64b);
    expect(dater.qb2).toEqual(dt1qb2);

    // Testing datetime properties and comparisons
    const dater1 = new Dater(dts1, undefined, undefined, undefined, undefined, undefined);
    const dater2 = new Dater(dts2, undefined, undefined, undefined, undefined, undefined);
    const dater3 = new Dater(DTS_BASE_0, undefined, undefined, undefined, undefined, undefined);
    const dater4 = new Dater(DTS_BASE_1, undefined, undefined, undefined, undefined, undefined);

    // TODO(CAL) implement datetime property in wrapper
    //expect(dater1.datetime).toBeLessThan(dater2.datetime);
    //expect(dater4.datetime).toBeGreaterThan(dater3.datetime);
  });
});

