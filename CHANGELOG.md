# Changelog

## [0.4.0] - 2026-05-11

### Breaking Changes

- Drop Node 18 support - Node 18 reached EOL; minimum supported version is now Node 20

### Added

- `rotated=true` flag on signing, matching KERIpy `BaseHab.sign` behaviour
- `getEndroles` function on `Oobi` class
- `Ondex` type on `Salty` manager and interface for cleaner index typing

### Fixed

- Calculate `ondex` from prior establishment event, not proposed one - resolves [#378](https://github.com/WebOfTrust/signify-ts/issues/378)
- `ondex` was `undefined` for `icp` and `ixn` events

## [0.3.0] - 2026-04-21

### Added

- Stronger typing for long-running operations ([#363](https://github.com/WebOfTrust/signify-ts/pull/363))
- `loc` scheme support ([#305](https://github.com/WebOfTrust/signify-ts/pull/305))
- Auto-generated credential types from KERIA OpenAPI spec ([#337](https://github.com/WebOfTrust/signify-ts/pull/337))
- Type hints for `agenting`, `aiding`, `delegating`, `grouping`, `ipexing`, `notifying`, `exchanging` ([#350](https://github.com/WebOfTrust/signify-ts/pull/350), [#351](https://github.com/WebOfTrust/signify-ts/pull/351), [#355](https://github.com/WebOfTrust/signify-ts/pull/355))
- Improved client initialization performance - resources no longer re-initialized on every request ([#342](https://github.com/WebOfTrust/signify-ts/pull/342))

### Fixed

- `rotate` must use proper `adds` and `cuts` ([#359](https://github.com/WebOfTrust/signify-ts/pull/359))
- `serder`: correctly parse string/hex sequence number
- Types for grouping and challenges
- `'true'`/`'false'` string literal types in function overloads ([#358](https://github.com/WebOfTrust/signify-ts/pull/358))

## [0.2.0] - 2024-02-13

### Added

- Multisig inception utility and `members` endpoint ([#212](https://github.com/WebOfTrust/signify-ts/pull/212))
- `waitOperation` utility for reliable async operation polling ([#210](https://github.com/WebOfTrust/signify-ts/pull/210))
- Delegated rotation for single-sig AID
- End role support ([#120](https://github.com/WebOfTrust/signify-ts/pull/120))
- IPEX `admit` and `grant` with multisig support
- Challenge support for multisig ([#113](https://github.com/WebOfTrust/signify-ts/pull/113))
- Credential registry creation and query ([#135](https://github.com/WebOfTrust/signify-ts/pull/135))
- ACDC attachment serialization
- secp256r1 key type support ([#109](https://github.com/WebOfTrust/signify-ts/pull/109))
- BIP39 shim for key derivation
- Notifications support ([#100](https://github.com/WebOfTrust/signify-ts/pull/100))
- `Bexter` (CESR variable-length) and `Pather` (SAD Path) encoding
- HTTP status info in error messages ([#203](https://github.com/WebOfTrust/signify-ts/pull/203))

### Fixed

- `rotate` defaults to next threshold, not current ([#208](https://github.com/WebOfTrust/signify-ts/pull/208))
- Remove hardcoded `toad`; use function parameter ([#206](https://github.com/WebOfTrust/signify-ts/pull/206))
- `KeyStates.query` signature and anchor handling ([#199](https://github.com/WebOfTrust/signify-ts/pull/199))
- Credential rules type supports value as string ([#198](https://github.com/WebOfTrust/signify-ts/pull/198))
- `contacts.list` uses `filter_field` / `filter_value` params correctly
- `serializeACDCAttachment` works with correct anchor per type ([#156](https://github.com/WebOfTrust/signify-ts/pull/156))

[Unreleased]: https://github.com/WebOfTrust/signify-ts/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/WebOfTrust/signify-ts/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/WebOfTrust/signify-ts/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/WebOfTrust/signify-ts/releases/tag/v0.2.0
