# Changelog

## [0.4.0] - 2026-05-11

### Breaking Changes

- Drop Node 18 support - Node 18 reached EOL; webcrypto loader workaround removed ([#ba89286](https://github.com/WebOfTrust/signify-ts/commit/ba89286))

### Added

- `rotated=true` flag on signing, matching KERIpy `BaseHab.sign` behaviour ([#d006201](https://github.com/WebOfTrust/signify-ts/commit/d006201))
- `getEndroles` function on `Oobi` class ([#0dbc57e](https://github.com/WebOfTrust/signify-ts/commit/0dbc57e))
- `Ondex` tiny type on `Salty` manager and interface for cleaner index typing ([#f9b223d](https://github.com/WebOfTrust/signify-ts/commit/f9b223d))

### Fixed

- Calculate `ondex` from prior establishment event, not proposed one - resolves [#378](https://github.com/WebOfTrust/signify-ts/issues/378) ([#1e093b3](https://github.com/WebOfTrust/signify-ts/commit/1e093b3))
- `ondex` was `undefined` for `icp` and `ixn` events ([#668bce4](https://github.com/WebOfTrust/signify-ts/commit/668bce4))

### Changed

- Use `this.gdigs` for prior next digest computation (`gpndigs`) ([#1eb29a7](https://github.com/WebOfTrust/signify-ts/commit/1eb29a7))
- Clean up number type checks ([#0520c8e](https://github.com/WebOfTrust/signify-ts/commit/0520c8e))
- Improve test suite execution speed ([#90a8701](https://github.com/WebOfTrust/signify-ts/commit/90a8701))
- Move multisig-join tests to dedicated test file ([#2eecd8c](https://github.com/WebOfTrust/signify-ts/commit/2eecd8c))
- Unpin transitive dependencies to allow upstream upgrades ([#668360e](https://github.com/WebOfTrust/signify-ts/commit/668360e))

### Dependencies

- Bump `vitest` and `@vitest/coverage-v8` ([#386](https://github.com/WebOfTrust/signify-ts/pull/386))
- Bump `postcss` 8.5.6 → 8.5.14
- Bump `glob` 10.4.5 → 10.5.0
- Bump `js-yaml` 4.1.0 → 4.1.1 ([#374](https://github.com/WebOfTrust/signify-ts/pull/374))
- Bump `minimatch`, `picomatch`

---

## [0.3.0] - 2026-04-21

### Added

- Stronger typing for long-running operations ([#363](https://github.com/WebOfTrust/signify-ts/pull/363))
- `loc` scheme support ([#305](https://github.com/WebOfTrust/signify-ts/pull/305))
- Auto-generate credential types from KERIA OpenAPI spec ([#337](https://github.com/WebOfTrust/signify-ts/pull/337))
- Type hints for `agenting`, `aiding`, `delegating`, `grouping`, `ipexing`, `notifying`, `exchanging` modules ([#350](https://github.com/WebOfTrust/signify-ts/pull/350), [#351](https://github.com/WebOfTrust/signify-ts/pull/351), [#355](https://github.com/WebOfTrust/signify-ts/pull/355))
- npm publish script for easier releases ([#c04f9a0](https://github.com/WebOfTrust/signify-ts/commit/c04f9a0))
- `MAINTAINERS.md`

### Fixed

- `rotate` must use proper `adds` and `cuts` ([#359](https://github.com/WebOfTrust/signify-ts/pull/359))
- `serder`: correctly parse string/hex sequence number ([#6eca061](https://github.com/WebOfTrust/signify-ts/commit/6eca061))
- Types for grouping and challenges ([#7332dad](https://github.com/WebOfTrust/signify-ts/commit/7332dad))
- `'true'`/`'false'` string literal types in function overloads ([#358](https://github.com/WebOfTrust/signify-ts/pull/358))
- npm audit fixes ([#325](https://github.com/WebOfTrust/signify-ts/pull/325))

### Performance

- Avoid re-initializing client resources on every request ([#342](https://github.com/WebOfTrust/signify-ts/pull/342))

### Changed

- Remove `buffer` dependency ([#321](https://github.com/WebOfTrust/signify-ts/pull/321))
- Remove outdated `secp256r1` dependency ([#320](https://github.com/WebOfTrust/signify-ts/pull/320))
- Remove redundant test helpers and consolidate usage ([#336](https://github.com/WebOfTrust/signify-ts/pull/336))

### Dependencies

- Bump `libsodium`
- Bump `mathjs` 12.4.3 → 15.2.0 ([#369](https://github.com/WebOfTrust/signify-ts/pull/369))
- Bump `vite` 6.x → 7.x series
- Bump `lodash` 4.17.21 → 4.17.23 → 4.18.1
- Bump `flatted`, `rollup`, `minimatch`, `picomatch`, `js-yaml`

### CI

- Remove npm audit step, add Node 24 to test matrix ([#360](https://github.com/WebOfTrust/signify-ts/pull/360))

---

## [0.2.0] - 2024-02-13

### Added

- Multisig inception utility and `members` endpoint test ([#212](https://github.com/WebOfTrust/signify-ts/pull/212))
- `waitOperation` utility for reliable async operation polling ([#210](https://github.com/WebOfTrust/signify-ts/pull/210))
- Delegated rotation for single-sig AID integration test
- End role support (`d5d4f7`, [#120](https://github.com/WebOfTrust/signify-ts/pull/120))
- IPEX `admit` endpoint support ([#a05b58a](https://github.com/WebOfTrust/signify-ts/commit/a05b58a))
- IPEX `grant` functionality with multisig support ([#f17f5f1](https://github.com/WebOfTrust/signify-ts/commit/f17f5f1))
- Challenge support for multisig ([#113](https://github.com/WebOfTrust/signify-ts/pull/113))
- Credential registry creation ([#0a3fa10](https://github.com/WebOfTrust/signify-ts/commit/0a3fa10))
- Credential query endpoint ([#135](https://github.com/WebOfTrust/signify-ts/pull/135))
- ACDC attachment serialization functions ([#48c6b7d](https://github.com/WebOfTrust/signify-ts/commit/48c6b7d))
- secp256r1 key type support ([#109](https://github.com/WebOfTrust/signify-ts/pull/109))
- BIP39 shim for key derivation ([#113](https://github.com/WebOfTrust/signify-ts/pull/113))
- Notifications support ([#100](https://github.com/WebOfTrust/signify-ts/pull/100))
- `Bexter` (CESR variable-length) and `Pather` (SAD Path) encoding
- HTTP status info included in error messages ([#203](https://github.com/WebOfTrust/signify-ts/pull/203))
- Integration tests for multisig, credentials, witnesses, delegation, vLEI issuance
- Single-issuer and single-holder IPEX integration test script

### Fixed

- `rotate` must default to the next threshold, not current ([#208](https://github.com/WebOfTrust/signify-ts/pull/208))
- Remove hardcoded `toad`; use function parameter ([#206](https://github.com/WebOfTrust/signify-ts/pull/206))
- `KeyStates.query` signature and anchor handling ([#199](https://github.com/WebOfTrust/signify-ts/pull/199))
- Credential rules type now supports value as string ([#198](https://github.com/WebOfTrust/signify-ts/pull/198))
- Use `Response.ok` to check HTTP response status ([#108](https://github.com/WebOfTrust/signify-ts/pull/108))
- `contacts.list` uses `filter_field` / `filter_value` params correctly
- `serializeACDCAttachment` works with correct anchor per type ([#156](https://github.com/WebOfTrust/signify-ts/pull/156))
- Remove `TextEncoder` import from `node:util`

### Changed

- Replace `tsdx` with `esbuild` + `tsc` + `eslint` build toolchain ([#134](https://github.com/WebOfTrust/signify-ts/pull/134))
- Replace custom hash utils with `@noble/hashes` ([#174](https://github.com/WebOfTrust/signify-ts/pull/174))
- Remove unused dependencies; move dev dependencies to `devDependencies` ([#128](https://github.com/WebOfTrust/signify-ts/pull/128))
- Move example app to separate repo (`WebOfTrust/signify-integration`)
- Convert integration scripts to Vitest integration tests
- Add `npm ci`, linting, and format checks to CI workflow ([#153](https://github.com/WebOfTrust/signify-ts/pull/153))

### CI

- Upgrade GitHub Actions, add Node 20 to test matrix ([#211](https://github.com/WebOfTrust/signify-ts/pull/211))
- Add Prettier formatting

---

[Unreleased]: https://github.com/WebOfTrust/signify-ts/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/WebOfTrust/signify-ts/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/WebOfTrust/signify-ts/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/WebOfTrust/signify-ts/releases/tag/v0.2.0
