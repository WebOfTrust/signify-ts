# TypeScript implementation of Signify

Project Name: signify-ts

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.png?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![Tests](https://github.com/WebOfTrust/signify-ts/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/WebOfTrust/signify-ts/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/WebOfTrust/signify-ts/branch/main/graph/badge.svg?token=K3GK7MCYVW)](https://codecov.io/gh/WebOfTrust/signify-ts)
[![Documentation](https://img.shields.io/badge/documentation-grey?)](https://weboftrust.github.io/signify-ts/)

## Signify - KERI Signing at the Edge

Of the five functions in a KERI agent, 

1. Key generation
2. Encrypted key storage
3. Event generation
4. Event signing
5. Event Validation

Signify-TS splits off two, key generation and event signing into a TypeScript library to provide "signing at the edge".
It accomplishes this by using [libsodium](https://doc.libsodium.org/) to generate ed25519 key pairs for signing and x25519 key pairs for encrypting the
private keys, next public keys and salts used to generate the private keys.  The encrypted private key and salts are then stored on a
remote cloud agent that never has access to the decryption keys.  New key pair sets (current and next) will be generated 
for inception and rotation events with only the public keys and blake3 hash of the next keys made available to the agent.

The communication protocol between a Signify client and [KERI](https://github.com/WebOfTrust/keri) agent will encode all cryptographic primitives as CESR base64
encoded strings for the initial implementation.  Support for binary CESR can be added in the future.


### Environment Setup

The code is built using Typescript and running code locally requires a Mac or Linux OS.

-   Install [Node.js](https://nodejs.org)    


-   Install dependencies:
    ```bash
    npm install
    ```

Typescript source files needs to be transpiled before running scripts

-   Build:
    ```bash
    npm run build
    ```


Account Creation Workflow

![Account Creation](/diagrams/account-creation-workflow.png)

![Account Creation Webpage](/diagrams/account-creation-webpage-workflow.png)

#### Cesride-WASM (experimental)
If using cesride-wasm you must follow the instructions in the cesride repository in the wasm directory for integrating.  Note that these instructions may change in the near future so always be sure to check that README as to the instructions for integrating cesride-wasm into signify-ts.

Typically the instructions go:
1. Build cesride
2. Build cesride-wasm
3. Add the `/pkg` directory (containing the artifacts of wasm-pack) of cesride-wasm as a dependency to this library
4. Signify-ts should now be able to use cesride-wasm interface.  (For debugging cesride\_wasm.d.ts contains the typed interface for the whole crate)
