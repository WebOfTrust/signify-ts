/* tslint:disable */
/* eslint-disable */
/**
* @param {number} codex
* @returns {string}
*/
export function matter_codex_code(codex: number): string;
/**
* @param {number} codex
* @returns {string}
*/
export function indexer_codex_code(codex: number): string;
/**
*/
export enum MatterCodex {
  Ed25519Seed = 0,
  Ed25519N = 1,
  X25519 = 2,
  Ed25519 = 3,
  Blake3_256 = 4,
  Blake2b_256 = 5,
  Blake2s_256 = 6,
  SHA3_256 = 7,
  SHA2_256 = 8,
  ECDSA_256k1_Seed = 9,
  Ed448_Seed = 10,
  X448 = 11,
  Short = 12,
  Big = 13,
  X25519_Private = 14,
  X25519_Cipher_Seed = 15,
  Salt_128 = 16,
  Ed25519_Sig = 17,
  ECDSA_256k1_Sig = 18,
  Blake3_512 = 19,
  Blake2b_512 = 20,
  SHA3_512 = 21,
  SHA2_512 = 22,
  Long = 23,
  ECDSA_256k1N = 24,
  ECDSA_256k1 = 25,
  Ed448N = 26,
  Ed448 = 27,
  Ed448_Sig = 28,
  Tern = 29,
  DateTime = 30,
  X25519_Cipher_Salt = 31,
  TBD1 = 32,
  TBD2 = 33,
  StrB64_L0 = 34,
  StrB64_L1 = 35,
  StrB64_L2 = 36,
  StrB64_Big_L0 = 37,
  StrB64_Big_L1 = 38,
  StrB64_Big_L2 = 39,
  Bytes_L0 = 40,
  Bytes_L1 = 41,
  Bytes_L2 = 42,
  Bytes_Big_L0 = 43,
  Bytes_Big_L1 = 44,
  Bytes_Big_L2 = 45,
}
/**
*/
export enum IndexerCodex {
  Ed25519 = 0,
  Ed25519_Crt = 1,
  ECDSA_256k1 = 2,
  ECDSA_256k1_Crt = 3,
  Ed448 = 4,
  Ed448_Crt = 5,
  Ed25519_Big = 6,
  Ed25519_Big_Crt = 7,
  ECDSA_256k1_Big = 8,
  ECDSA_256k1_Big_Crt = 9,
  Ed448_Big = 10,
  Ed448_Big_Crt = 11,
  TBD0 = 12,
  TBD1 = 13,
  TBD4 = 14,
}
/**
*/
export class Bexter {
  free(): void;
/**
* @param {string | undefined} bext
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(bext?: string, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {string} bext
* @returns {Bexter}
*/
  static new_with_bext(bext: string): Bexter;
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @returns {Bexter}
*/
  static new_with_raw(raw: Uint8Array, code?: string): Bexter;
/**
* @param {Uint8Array} qb64b
* @returns {Bexter}
*/
  static new_with_qb64b(qb64b: Uint8Array): Bexter;
/**
* @param {string} qb64
* @returns {Bexter}
*/
  static new_with_qb64(qb64: string): Bexter;
/**
* @param {Uint8Array} qb2
* @returns {Bexter}
*/
  static new_with_qb2(qb2: Uint8Array): Bexter;
/**
* @returns {string}
*/
  bext(): string;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Cigar {
  free(): void;
/**
* @param {Verfer | undefined} verfer
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(verfer?: Verfer, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {Uint8Array} raw
* @param {Verfer | undefined} verfer
* @param {string | undefined} code
* @returns {Cigar}
*/
  static new_with_raw(raw: Uint8Array, verfer?: Verfer, code?: string): Cigar;
/**
* @param {Uint8Array} qb64b
* @param {Verfer | undefined} verfer
* @returns {Cigar}
*/
  static new_with_qb64b(qb64b: Uint8Array, verfer?: Verfer): Cigar;
/**
* @param {string} qb64
* @param {Verfer | undefined} verfer
* @returns {Cigar}
*/
  static new_with_qb64(qb64: string, verfer?: Verfer): Cigar;
/**
* @param {Uint8Array} qb2
* @param {Verfer | undefined} verfer
* @returns {Cigar}
*/
  static new_with_qb2(qb2: Uint8Array, verfer?: Verfer): Cigar;
/**
* @returns {Verfer}
*/
  verfer(): Verfer;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Dater {
  free(): void;
/**
* @param {string | undefined} dts
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(dts?: string, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {string} dts
* @param {string | undefined} code
* @returns {Dater}
*/
  static new_with_dts(dts: string, code?: string): Dater;
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @returns {Dater}
*/
  static new_with_raw(raw: Uint8Array, code?: string): Dater;
/**
* @param {Uint8Array} qb64b
* @returns {Dater}
*/
  static new_with_qb64b(qb64b: Uint8Array): Dater;
/**
* @param {string} qb64
* @returns {Dater}
*/
  static new_with_qb64(qb64: string): Dater;
/**
* @param {Uint8Array} qb2
* @returns {Dater}
*/
  static new_with_qb2(qb2: Uint8Array): Dater;
/**
* @returns {string}
*/
  dts(): string;
/**
* @returns {Uint8Array}
*/
  dtsb(): Uint8Array;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Diger {
  free(): void;
/**
* @param {Uint8Array | undefined} ser
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(ser?: Uint8Array, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {Uint8Array} ser
* @param {string | undefined} code
* @returns {Diger}
*/
  static new_with_ser(ser: Uint8Array, code?: string): Diger;
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @returns {Diger}
*/
  static new_with_raw(raw: Uint8Array, code?: string): Diger;
/**
* @param {Uint8Array} qb64b
* @returns {Diger}
*/
  static new_with_qb64b(qb64b: Uint8Array): Diger;
/**
* @param {string} qb64
* @returns {Diger}
*/
  static new_with_qb64(qb64: string): Diger;
/**
* @param {Uint8Array} qb2
* @returns {Diger}
*/
  static new_with_qb2(qb2: Uint8Array): Diger;
/**
* @param {Uint8Array} ser
* @returns {boolean}
*/
  verify(ser: Uint8Array): boolean;
/**
* @param {Uint8Array} ser
* @param {Uint8Array} dig
* @returns {boolean}
*/
  compare_dig(ser: Uint8Array, dig: Uint8Array): boolean;
/**
* @param {Uint8Array} ser
* @param {Diger} diger
* @returns {boolean}
*/
  compare_diger(ser: Uint8Array, diger: Diger): boolean;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Number {
  free(): void;
/**
* @param {U128 | undefined} num
* @param {string | undefined} numh
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(num?: U128, numh?: string, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {U128} num
* @returns {Number}
*/
  static new_with_num(num: U128): Number;
/**
* @param {string} numh
* @returns {Number}
*/
  static new_with_numh(numh: string): Number;
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @returns {Number}
*/
  static new_with_raw(raw: Uint8Array, code?: string): Number;
/**
* @param {Uint8Array} qb64b
* @returns {Number}
*/
  static new_with_qb64b(qb64b: Uint8Array): Number;
/**
* @param {string} qb64
* @returns {Number}
*/
  static new_with_qb64(qb64: string): Number;
/**
* @param {Uint8Array} qb2
* @returns {Number}
*/
  static new_with_qb2(qb2: Uint8Array): Number;
/**
* @returns {U128}
*/
  num(): U128;
/**
* @returns {string}
*/
  numh(): string;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Prefixer {
  free(): void;
/**
* @param {Value | undefined} ked
* @param {Array<any> | undefined} allows
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(ked?: Value, allows?: Array<any>, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {Value} ked
* @param {Array<any> | undefined} allows
* @param {string | undefined} code
* @returns {Prefixer}
*/
  static new_with_ked(ked: Value, allows?: Array<any>, code?: string): Prefixer;
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @returns {Prefixer}
*/
  static new_with_raw(raw: Uint8Array, code?: string): Prefixer;
/**
* @param {Uint8Array} qb64b
* @returns {Prefixer}
*/
  static new_with_qb64b(qb64b: Uint8Array): Prefixer;
/**
* @param {string} qb64
* @returns {Prefixer}
*/
  static new_with_qb64(qb64: string): Prefixer;
/**
* @param {Uint8Array} qb2
* @returns {Prefixer}
*/
  static new_with_qb2(qb2: Uint8Array): Prefixer;
/**
* @param {Value} ked
* @param {boolean | undefined} prefixed
* @returns {boolean}
*/
  verify(ked: Value, prefixed?: boolean): boolean;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Saider {
  free(): void;
/**
* @param {Value | undefined} sad
* @param {string | undefined} label
* @param {string | undefined} kind
* @param {Array<any> | undefined} ignore
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(sad?: Value, label?: string, kind?: string, ignore?: Array<any>, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {Value} sad
* @param {string | undefined} code
* @param {string | undefined} kind
* @param {string | undefined} label
* @param {Array<any> | undefined} ignore
* @returns {SaidifyRet}
*/
  static saidify(sad: Value, code?: string, kind?: string, label?: string, ignore?: Array<any>): SaidifyRet;
/**
* @param {Value} sad
* @param {boolean | undefined} prefixed
* @param {boolean | undefined} versioned
* @param {string | undefined} kind
* @param {string | undefined} label
* @param {Array<any> | undefined} ignore
* @returns {boolean}
*/
  verify(sad: Value, prefixed?: boolean, versioned?: boolean, kind?: string, label?: string, ignore?: Array<any>): boolean;
/**
* @param {Value} sad
* @param {string | undefined} label
* @param {string | undefined} kind
* @param {Array<any> | undefined} ignore
* @param {string | undefined} code
* @returns {Saider}
*/
  static new_with_sad(sad: Value, label?: string, kind?: string, ignore?: Array<any>, code?: string): Saider;
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @returns {Saider}
*/
  static new_with_raw(raw: Uint8Array, code?: string): Saider;
/**
* @param {Uint8Array} qb64b
* @returns {Saider}
*/
  static new_with_qb64b(qb64b: Uint8Array): Saider;
/**
* @param {string} qb64
* @returns {Saider}
*/
  static new_with_qb64(qb64: string): Saider;
/**
* @param {Uint8Array} qb2
* @returns {Saider}
*/
  static new_with_qb2(qb2: Uint8Array): Saider;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class SaidifyRet {
  free(): void;
/**
* @returns {Saider}
*/
  saider(): Saider;
/**
* @returns {string}
*/
  value(): string;
}
/**
*/
export class Salter {
  free(): void;
/**
* @param {string | undefined} tier
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(tier?: string, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {string | undefined} tier
* @returns {Salter}
*/
  static new_with_defaults(tier?: string): Salter;
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @param {string | undefined} tier
* @returns {Salter}
*/
  static new_with_raw(raw: Uint8Array, code?: string, tier?: string): Salter;
/**
* @param {Uint8Array} qb64b
* @param {string | undefined} tier
* @returns {Salter}
*/
  static new_with_qb64b(qb64b: Uint8Array, tier?: string): Salter;
/**
* @param {string} qb64
* @param {string | undefined} tier
* @returns {Salter}
*/
  static new_with_qb64(qb64: string, tier?: string): Salter;
/**
* @param {Uint8Array} qb2
* @param {string | undefined} tier
* @returns {Salter}
*/
  static new_with_qb2(qb2: Uint8Array, tier?: string): Salter;
/**
* @param {number | undefined} size
* @param {string | undefined} path
* @param {string | undefined} tier
* @param {boolean | undefined} temp
* @returns {Uint8Array}
*/
  stretch(size?: number, path?: string, tier?: string, temp?: boolean): Uint8Array;
/**
* @returns {string}
*/
  tier(): string;
/**
* @param {string | undefined} code
* @param {boolean | undefined} transferable
* @param {string | undefined} path
* @param {string | undefined} tier
* @param {boolean | undefined} temp
* @returns {Signer}
*/
  signer(code?: string, transferable?: boolean, path?: string, tier?: string, temp?: boolean): Signer;
/**
* @param {number | undefined} count
* @param {number | undefined} start
* @param {string | undefined} path
* @param {string | undefined} code
* @param {boolean | undefined} transferable
* @param {string | undefined} tier
* @param {boolean | undefined} temp
* @returns {Signers}
*/
  signers(count?: number, start?: number, path?: string, code?: string, transferable?: boolean, tier?: string, temp?: boolean): Signers;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Seqner {
  free(): void;
/**
* @param {U128 | undefined} sn
* @param {string | undefined} snh
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(sn?: U128, snh?: string, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {U128} sn
* @returns {Seqner}
*/
  static new_with_sn(sn: U128): Seqner;
/**
* @param {string} snh
* @returns {Seqner}
*/
  static new_with_snh(snh: string): Seqner;
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @returns {Seqner}
*/
  static new_with_raw(raw: Uint8Array, code?: string): Seqner;
/**
* @param {Uint8Array} qb64b
* @returns {Seqner}
*/
  static new_with_qb64b(qb64b: Uint8Array): Seqner;
/**
* @param {string} qb64
* @returns {Seqner}
*/
  static new_with_qb64(qb64: string): Seqner;
/**
* @param {Uint8Array} qb2
* @returns {Seqner}
*/
  static new_with_qb2(qb2: Uint8Array): Seqner;
/**
* @returns {U128}
*/
  sn(): U128;
/**
* @returns {string}
*/
  snh(): string;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Serder {
  free(): void;
/**
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {string | undefined} kind
* @param {Value | undefined} ked
* @param {Serder | undefined} sad
*/
  constructor(code?: string, raw?: Uint8Array, kind?: string, ked?: Value, sad?: Serder);
/**
* @param {Value} ked
* @param {string | undefined} code
* @param {string | undefined} kind
* @returns {Serder}
*/
  static new_with_ked(ked: Value, code?: string, kind?: string): Serder;
/**
* @returns {Array<any>}
*/
  verfers(): Array<any>;
/**
* @returns {Array<any>}
*/
  digers(): Array<any>;
/**
* @returns {Array<any>}
*/
  werfers(): Array<any>;
/**
* @returns {Tholder | undefined}
*/
  tholder(): Tholder | undefined;
/**
* @returns {Tholder | undefined}
*/
  ntholder(): Tholder | undefined;
/**
* @returns {Number}
*/
  sner(): Number;
/**
* @returns {U128}
*/
  sn(): U128;
/**
* @returns {Number | undefined}
*/
  fner(): Number | undefined;
/**
* @returns {U128}
*/
  _fn(): U128;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {Value}
*/
  ked(): Value;
/**
* @returns {string}
*/
  ident(): string;
/**
* @returns {string}
*/
  kind(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Version}
*/
  version(): Version;
/**
* @returns {Saider}
*/
  saider(): Saider;
}
/**
*/
export class Siger {
  free(): void;
/**
* @param {Verfer | undefined} verfer
* @param {number | undefined} index
* @param {number | undefined} ondex
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(verfer?: Verfer, index?: number, ondex?: number, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {Uint8Array} raw
* @param {Verfer | undefined} verfer
* @param {number | undefined} index
* @param {number | undefined} ondex
* @param {string | undefined} code
* @returns {Siger}
*/
  static new_with_raw(raw: Uint8Array, verfer?: Verfer, index?: number, ondex?: number, code?: string): Siger;
/**
* @param {Uint8Array} qb64b
* @param {Verfer | undefined} verfer
* @returns {Siger}
*/
  static new_with_qb64b(qb64b: Uint8Array, verfer?: Verfer): Siger;
/**
* @param {string} qb64
* @param {Verfer | undefined} verfer
* @returns {Siger}
*/
  static new_with_qb64(qb64: string, verfer?: Verfer): Siger;
/**
* @param {Uint8Array} qb2
* @param {Verfer | undefined} verfer
* @returns {Siger}
*/
  static new_with_qb2(qb2: Uint8Array, verfer?: Verfer): Siger;
/**
* @returns {Verfer}
*/
  verfer(): Verfer;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {number}
*/
  index(): number;
/**
* @returns {number}
*/
  ondex(): number;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Signer {
  free(): void;
/**
* @param {boolean | undefined} transferable
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(transferable?: boolean, code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {Uint8Array} raw
* @param {boolean | undefined} transferable
* @param {string | undefined} code
* @returns {Signer}
*/
  static new_with_raw(raw: Uint8Array, transferable?: boolean, code?: string): Signer;
/**
* @param {Uint8Array} qb64b
* @param {boolean | undefined} transferable
* @returns {Signer}
*/
  static new_with_qb64b(qb64b: Uint8Array, transferable?: boolean): Signer;
/**
* @param {string} qb64
* @param {boolean | undefined} transferable
* @returns {Signer}
*/
  static new_with_qb64(qb64: string, transferable?: boolean): Signer;
/**
* @param {Uint8Array} qb2
* @param {boolean | undefined} transferable
* @returns {Signer}
*/
  static new_with_qb2(qb2: Uint8Array, transferable?: boolean): Signer;
/**
* @param {Uint8Array} ser
* @returns {Cigar}
*/
  sign_unindexed(ser: Uint8Array): Cigar;
/**
* @param {Uint8Array} ser
* @param {boolean} only
* @param {number} index
* @param {number | undefined} ondex
* @returns {Siger}
*/
  sign_indexed(ser: Uint8Array, only: boolean, index: number, ondex?: number): Siger;
/**
* @returns {Verfer}
*/
  verfer(): Verfer;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Signers {
  free(): void;
/**
* @returns {number}
*/
  len(): number;
/**
* @returns {boolean}
*/
  is_empty(): boolean;
/**
* @param {number} index
* @returns {Signer | undefined}
*/
  get(index: number): Signer | undefined;
}
/**
*/
export class Tholder {
  free(): void;
/**
* @param {Value | undefined} thold
* @param {Uint8Array | undefined} limen
* @param {Value | undefined} sith
*/
  constructor(thold?: Value, limen?: Uint8Array, sith?: Value);
/**
* @param {Value} thold
* @returns {Tholder}
*/
  static new_with_thold(thold: Value): Tholder;
/**
* @param {Uint8Array} limen
* @returns {Tholder}
*/
  static new_with_limen(limen: Uint8Array): Tholder;
/**
* @param {Value} sith
* @returns {Tholder}
*/
  static new_with_sith(sith: Value): Tholder;
/**
* @returns {Value}
*/
  thold(): Value;
/**
* @returns {boolean}
*/
  weighted(): boolean;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {number | undefined}
*/
  num(): number | undefined;
/**
* @returns {Number | undefined}
*/
  number(): Number | undefined;
/**
* @returns {Bexter | undefined}
*/
  bexter(): Bexter | undefined;
/**
* @returns {Uint8Array}
*/
  limen(): Uint8Array;
/**
* @returns {Value}
*/
  sith(): Value;
/**
* @returns {string}
*/
  to_json(): string;
/**
* @param {Uint32Array} indices
* @returns {boolean}
*/
  satisfy(indices: Uint32Array): boolean;
}
/**
*/
export class U128 {
  free(): void;
}
/**
*/
export class Value {
  free(): void;
/**
* @param {string} value
*/
  constructor(value: string);
/**
* @returns {string}
*/
  value(): string;
}
/**
*/
export class Verfer {
  free(): void;
/**
* @param {string | undefined} code
* @param {Uint8Array | undefined} raw
* @param {Uint8Array | undefined} qb64b
* @param {string | undefined} qb64
* @param {Uint8Array | undefined} qb2
*/
  constructor(code?: string, raw?: Uint8Array, qb64b?: Uint8Array, qb64?: string, qb2?: Uint8Array);
/**
* @param {Uint8Array} raw
* @param {string | undefined} code
* @returns {Verfer}
*/
  static new_with_raw(raw: Uint8Array, code?: string): Verfer;
/**
* @param {Uint8Array} qb64b
* @returns {Verfer}
*/
  static new_with_qb64b(qb64b: Uint8Array): Verfer;
/**
* @param {string} qb64
* @returns {Verfer}
*/
  static new_with_qb64(qb64: string): Verfer;
/**
* @param {Uint8Array} qb2
* @returns {Verfer}
*/
  static new_with_qb2(qb2: Uint8Array): Verfer;
/**
* @param {Uint8Array} sig
* @param {Uint8Array} ser
* @returns {boolean}
*/
  verify(sig: Uint8Array, ser: Uint8Array): boolean;
/**
* @returns {string}
*/
  code(): string;
/**
* @returns {number}
*/
  size(): number;
/**
* @returns {Uint8Array}
*/
  raw(): Uint8Array;
/**
* @returns {string}
*/
  qb64(): string;
/**
* @returns {Uint8Array}
*/
  qb64b(): Uint8Array;
/**
* @returns {Uint8Array}
*/
  qb2(): Uint8Array;
}
/**
*/
export class Version {
  free(): void;
}
