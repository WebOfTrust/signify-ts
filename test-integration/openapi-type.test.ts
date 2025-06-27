import { assert, describe, test } from 'vitest';
import { EventResult, SignifyClient } from 'signify-ts';
import {
    getOrCreateClients,
    waitOperation,
} from './utils/test-util.ts';
import { resolveEnvironment } from './utils/resolve-env.ts';
import { components } from '../src/types/keria-api-schema.ts';


type IdentifierCreateResponse = components["schemas"]["IdentifierCreateResponse"];
type ResponseUnion = components["schemas"]["ResponseUnion"];
type OpMetadata = components["schemas"]["OpMetadata"];
type OpResponseKel = components["schemas"]["OpResponseKel"];


function isOpResponseKel(obj: any): obj is OpResponseKel {
    return (
        typeof obj === "object" &&
        obj !== null &&
        (obj.a === undefined || Array.isArray(obj.a)) &&
        Array.isArray(obj.b) &&
        typeof obj.bt === "string" &&
        (obj.c === undefined || Array.isArray(obj.c)) &&
        typeof obj.d === "string" &&
        typeof obj.i === "string" &&
        Array.isArray(obj.k) &&
        typeof obj.kt === "string" &&
        Array.isArray(obj.n) &&
        typeof obj.nt === "string" &&
        typeof obj.s === "string" &&
        typeof obj.t === "string" &&
        typeof obj.v === "string"
    );
}

function isResponseUnion(obj: any): obj is ResponseUnion {
    if (obj === null) return true;
    if (typeof obj === "object") {
        if (isOpResponseKel(obj)) return true;
        if (Object.keys(obj).length === 0) return true; // empty object
    }
    return false;
}

function isIdentifierCreateResponse(obj: any): obj is IdentifierCreateResponse {
    if (
        typeof obj !== "object" ||
        obj === null ||
        typeof obj.done !== "boolean" ||
        typeof obj.name !== "string"
    ) {
        return false;
    }
    // Check optional metadata
    if ("metadata" in obj && obj.metadata !== undefined && typeof obj.metadata !== "object") {
        return false;
    }
    // Check optional response
    if ("response" in obj && obj.response !== undefined && !isResponseUnion(obj.response)) {
        return false;
    }
    // Only allow expected keys
    const allowedKeys = ["done", "metadata", "name", "response"];
    for (const key of Object.keys(obj)) {
        if (!allowedKeys.includes(key)) {
            return false;
        }
    }
    return true;
}

let client: SignifyClient;

describe('test-setup-clients', async () => {
    [client] = await getOrCreateClients(1);

    const env = resolveEnvironment();
    const kargs = {
        toad: env.witnessIds.length,
        wits: env.witnessIds,
    };

    test('should return IdentifierCreateResponse from waitOperation', async () => {
        const result: EventResult = await client
            .identifiers()
            .create("name", kargs);
        let op = await result.op();
        op = await waitOperation(client, op);

        console.log('Operation result:', op);

        if (!isIdentifierCreateResponse(op)) {
            let errors: string[] = [];
            if (typeof op !== "object" || op === null) {
                errors.push(`op is not an object: ${JSON.stringify(op)}`);
            } else {
                if (typeof op.done !== "boolean") {
                    errors.push(`op.done is not boolean: ${JSON.stringify(op.done)}`);
                }
                if (typeof op.name !== "string") {
                    errors.push(`op.name is not string: ${JSON.stringify(op.name)}`);
                }
                if ("metadata" in op && op.metadata !== undefined && typeof op.metadata !== "object") {
                    errors.push(`op.metadata is not object or undefined: ${JSON.stringify(op.metadata)}`);
                }
                if ("response" in op && op.response !== undefined && !isResponseUnion(op.response)) {
                    errors.push(`op.response is not ResponseUnion: ${JSON.stringify(op.response)}`);
                }
                const allowedKeys = ["done", "metadata", "name", "response"];
                for (const key of Object.keys(op)) {
                    if (!allowedKeys.includes(key)) {
                        errors.push(`Unexpected key in op: ${key}`);
                    }
                }
            }
            throw new Error("IdentifierCreateResponse check failed:\n" + errors.join("\n"));
        }

        assert.equal(isIdentifierCreateResponse(op), true);
        assert.typeOf(op.done, 'boolean');
        assert.typeOf(op.name, 'string');

    });
});
