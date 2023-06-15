import { MatterCodex, matter_codex_code } from "../../pkg/cesride_wasm";
// import { createHash } from "blake3"
// import { strict as assert } from "assert";
// import { Matter as Tables } from "../../src/keri/core/matter";
// import { Buffer } from 'buffer';

describe('Diger', () => {
  it('should generate digests', () => {
    console.log(MatterCodex.Blake2b_256);
    console.log(matter_codex_code(MatterCodex.Blake2b_256));

    // let diger = Diger.new_with_qb64("ELC5L3iBVD77d_MYbYGGCUQgqQBju1o4x1Ud");
    // console.log(diger);
    // // Create something to digest and verify
    // const ser = Buffer.from('abcdefghijklmnopqrstuvwxyz0123456789', 'binary');
    // const hasher = createHash();
    // const digest = hasher.update(ser).digest('');

    // let diger = Diger.new_with_raw(new Uint8Array(digest.buffer));
    // assert.deepStrictEqual(diger.code, matter_codex_code(MatterCodex.Blake3_256));

    // let sizage = Tables.Sizes.get(diger.code())
    // assert.deepStrictEqual(
    //   diger.qb64.length,
    //   sizage!.fs,
    // );
    // let result = diger.verify(ser);
    // assert.equal(result, true);

    // result = diger.verify(
    //   Buffer.concat([ser, Buffer.from('2j2idjpwjfepjtgi', 'binary')]),
    // );
    // assert.equal(result, false);

    // diger = Diger.new_with_raw(new Uint8Array(digest.buffer), matter_codex_code(MatterCodex.Blake3_256));
    // assert.deepStrictEqual(diger.code, matter_codex_code(MatterCodex.Blake3_256));

    // assert.equal(diger.qb64, "ELC5L3iBVD77d_MYbYGGCUQgqQBju1o4x1Ud-z2sL-ux");
    // sizage = Tables.Sizes.get(diger.code())
    // assert.deepStrictEqual(
    //   diger.qb64.length,
    //   sizage!.fs,
    // );

    // result = diger.verify(ser);
    // assert.equal(result, true);

    // diger = Diger.new_with_ser(ser);
    // assert.equal(diger.qb64, "ELC5L3iBVD77d_MYbYGGCUQgqQBju1o4x1Ud-z2sL-ux");
    // sizage = Tables.Sizes.get(diger.code())
    // assert.deepStrictEqual(
    //   diger.qb64.length,
    //   sizage!.fs,
    // );
    // result = diger.verify(ser);
    // assert.equal(result, true);
  });
});
