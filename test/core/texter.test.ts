import {EmptyMaterialError, MtrDex} from "../../src";
import {Texter} from "../../src/keri/core/texter";

describe('Texter', () => {

    test('throws EmptyMaterialError when no input is provided', () => {
        expect(() => {
            new Texter({});
        }).toThrow(EmptyMaterialError);
    });

    test('handles empty text correctly', () => {
        const texter = new Texter({ text: "" });
        expect(texter.code).toBe(MtrDex.Bytes_L0);
        expect(texter.both).toBe('4BAA');
        expect(texter.raw).toEqual(new Uint8Array([]));
        expect(texter.qb64).toBe('4BAA');
        expect(texter.text).toBe("");
    });

    test('handles empty byte text correctly', () => {
        const texter = new Texter({ text: new Uint8Array([]) });
        expect(texter.both).toBe('4BAA');
        expect(texter.raw).toEqual(new Uint8Array([]));
    });

    test('handles non-empty text correctly', () => {
        const text = "$";
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_L2);
        expect(texter.both).toBe('6BAB');
        expect(texter.raw).toEqual(new TextEncoder().encode(text));
        expect(texter.qb64).toBe('6BABAAAk');
        expect(texter.text).toBe(text);
    });

    test('handles single character text correctly', () => {
        const text = "$";
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_L2);
        expect(texter.both).toBe('6BAB');
        expect(texter.raw).toEqual(new TextEncoder().encode(text));
        expect(texter.qb64).toBe('6BABAAAk');
        expect(texter.text).toBe(text);
    });

    test('handles control character \\n correctly', () => {
        const text = "\n";
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_L2);
        expect(texter.both).toBe('6BAB');
        expect(texter.qb64).toBe('6BABAAAK');
        expect(texter.text).toBe(text);
    });

    test('handles text with special characters correctly', () => {
        const text = "@!";
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_L1);
        expect(texter.both).toBe('5BAB');
        expect(texter.raw).toEqual(new TextEncoder().encode(text));
        expect(texter.qb64).toBe('5BABAEAh');
        expect(texter.text).toBe(text);
    });

    test('handles multi-character text correctly', () => {
        const text = "^*#";
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_L0);
        expect(texter.both).toBe('4BAB');
        expect(texter.raw).toEqual(new TextEncoder().encode(text));
        expect(texter.qb64).toBe('4BABXioj');
        expect(texter.text).toBe(text);
    });

    test('handles large text symbols correctly', () => {
        const text = "&~?%";
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_L2);
        expect(texter.both).toBe('6BAC');
        expect(texter.raw).toEqual(new TextEncoder().encode(text));
        expect(texter.qb64).toBe('6BACAAAmfj8l');
        expect(texter.text).toBe(text);
    });

    test('ensures encoding and decoding for complex strings', () => {
        const complexText = "😊🚀👍🏽🌟";
        const texter = new Texter({ text: complexText });
        expect(texter.text).toBe(complexText);
        expect(new TextDecoder().decode(texter.raw)).toBe(complexText);
    });

    test('handles long text correctly', () => {
        const text = "Did the lazy fox jumped over the big dog? But it's not its dog!\n";
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_L2);
        expect(texter.both).toBe('6BAW');
        expect(texter.text).toBe(text);
    });

    // Edge case for text exactly at the size limit
    test('handles text at maximum size limit without error', () => {
        const maxText = "a".repeat(64 ** 4 - 1);
        expect(() => new Texter({ text: maxText })).not.toThrow();
    });

    test('handles very large text sizes correctly', () => {
        const text = "a".repeat((64 ** 2) * 3);
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_Big_L0);
        expect(texter.both).toBe('7AABABAA');
        expect(texter.text).toBe(text);
    });

    test('handles edge cases for big variable size texts', () => {
        const text = "b".repeat((64 ** 2) * 3 + 1);
        const texter = new Texter({ text });
        expect(texter.code).toBe(MtrDex.Bytes_Big_L2);
        expect(texter.both).toBe('9AABABAB');
        expect(texter.raw).toEqual(new TextEncoder().encode(text));
        expect(texter.text).toBe(text);
    });

    test('throws error with unsupported very large text', () => {
        const text = "c".repeat((64 ** 4) * 3); // Excessive size
        expect(() => {
            new Texter({ text });
        }).toThrow(Error);
    });
});

