import { SignifyClient } from './clienting.ts';
import libsodium from 'libsodium-wrappers-sumo';
import { Salter } from '../core/salter.ts';
import { Matter, MtrDex } from '../core/matter.ts';
import { components } from '../../types/keria-api-schema.ts';
import {
    OOBIOperation,
    QueryOperation,
    EndRoleOperation,
    WitnessOperation,
    DelegationOperation,
    RegistryOperation,
    LocSchemeOperation,
    ChallengeOperation,
    ExchangeOperation,
    SubmitOperation,
    DoneOperation,
    CredentialOperation,
    GroupOperation,
    DelegatorOperation,
    CompletedOOBIOperation,
    CompletedQueryOperation,
    CompletedEndRoleOperation,
    CompletedWitnessOperation,
    CompletedDelegationOperation,
    CompletedRegistryOperation,
    CompletedLocSchemeOperation,
    CompletedChallengeOperation,
    CompletedExchangeOperation,
    CompletedSubmitOperation,
    CompletedDoneOperation,
    CompletedCredentialOperation,
    CompletedGroupOperation,
    CompletedDelegatorOperation,
    CompletedOperation,
} from '../core/keyState.ts';

type OOBI = components['schemas']['OOBI'];
type KeyState = components['schemas']['KeyStateRecord'];
type KeyEventRecord = components['schemas']['KeyEventRecord'];
type AgentConfig = components['schemas']['AgentConfig'];

export function randomPasscode(): string {
    const raw = libsodium.randombytes_buf(16);
    const salter = new Salter({ raw: raw });

    // https://github.com/WebOfTrust/signify-ts/issues/242
    return salter.qb64.substring(2, 23);
}

export function randomNonce(): string {
    const seed = libsodium.randombytes_buf(libsodium.crypto_sign_SEEDBYTES);
    const seedqb64 = new Matter({ raw: seed, code: MtrDex.Ed25519_Seed });
    return seedqb64.qb64;
}

export class Oobis {
    public client: SignifyClient;
    /**
     * Oobis
     * @param {SignifyClient} client
     */
    constructor(client: SignifyClient) {
        this.client = client;
    }

    /**
     * Get the OOBI(s) for a managed indentifier for a given role
     * @param {string} name Name or alias of the identifier
     * @param {string} role Authorized role
     * @returns {Promise<OOBI>} A promise to the OOBI(s)
     */
    async get(name: string, role: string = 'agent'): Promise<OOBI> {
        const path = `/identifiers/${name}/oobis?role=${role}`;
        const method = 'GET';
        const res = await this.client.fetch(path, method, null);
        return await res.json();
    }

    /**
     * Resolve an OOBI
     * @async
     * @param {string} oobi The OOBI to be resolver
     * @param {string} [alias] Optional name or alias to link the OOBI resolution to a contact
     * @returns {Promise<OOBIOperation>} A promise to the long-running operation
     */
    async resolve(oobi: string, alias?: string): Promise<OOBIOperation> {
        const path = `/oobis`;
        const data: any = {
            url: oobi,
        };
        if (alias !== undefined) {
            data.oobialias = alias;
        }
        const method = 'POST';
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }
}

export type Operation =
    | OOBIOperation
    | QueryOperation
    | EndRoleOperation
    | WitnessOperation
    | DelegationOperation
    | RegistryOperation
    | LocSchemeOperation
    | ChallengeOperation
    | ExchangeOperation
    | SubmitOperation
    | DoneOperation
    | CredentialOperation
    | GroupOperation
    | DelegatorOperation;

export interface OperationsDeps {
    fetch(
        pathname: string,
        method: string,
        body: unknown,
        headers?: Headers
    ): Promise<Response>;
}

/**
 * Operations
 * @remarks
 * Operations represent the status and result of long running tasks performed by KERIA agent
 */
export class Operations {
    public client: OperationsDeps;
    /**
     * Operations
     * @param {SignifyClient} client
     */
    constructor(client: OperationsDeps) {
        this.client = client;
    }

    private hasDepends(op: Operation): op is (
        | RegistryOperation
        | CredentialOperation
        | DelegatorOperation
    ) & {
        metadata: NonNullable<
            (
                | RegistryOperation
                | CredentialOperation
                | DelegatorOperation
            )['metadata']
        >;
    } {
        return op.metadata !== undefined && 'depends' in op.metadata;
    }

    /**
     * Check if operation failed and throw error with details
     * @throws {Error} If operation has an error
     */
    private throwIfFailed(op: Operation): asserts op is CompletedOperation {
        if ('error' in op && op.error !== null) {
            const details = op.error.details
                ? ` Details: ${JSON.stringify(op.error.details)}`
                : '';
            throw new Error(
                `Operation '${op.name}' failed [Code ${op.error.code}]: ${op.error.message}${details}`
            );
        }
    }

    /**
     * Get operation status
     * @async
     * @param {string} name Name of the operation
     * @returns {Promise<Operation>} A promise to the status of the operation
     */
    async get(name: string): Promise<Operation> {
        const path = `/operations/${name}`;
        const data = null;
        const method = 'GET';
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }
    /**
     * List operations
     * @async
     * @param {string} type Select operations by type
     * @returns {Promise<Operation[]>} A list of operations
     */
    async list(type?: string): Promise<Operation[]> {
        const params = new URLSearchParams();
        if (type !== undefined) {
            params.append('type', type);
        }
        const path = `/operations?${params.toString()}`;
        const data = null;
        const method = 'GET';
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }
    /**
     * Delete operation
     * @async
     * @param {string} name Name of the operation
     */
    async delete(name: string): Promise<void> {
        const path = `/operations/${name}`;
        const data = null;
        const method = 'DELETE';
        await this.client.fetch(path, method, data);
    }

    /**
     * Poll for operation to become completed.
     */
    async wait(
        op: OOBIOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedOOBIOperation>;
    async wait(
        op: QueryOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedQueryOperation>;
    async wait(
        op: EndRoleOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedEndRoleOperation>;
    async wait(
        op: WitnessOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedWitnessOperation>;
    async wait(
        op: DelegationOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedDelegationOperation>;
    async wait(
        op: RegistryOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedRegistryOperation>;
    async wait(
        op: LocSchemeOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedLocSchemeOperation>;
    async wait(
        op: ChallengeOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedChallengeOperation>;
    async wait(
        op: ExchangeOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedExchangeOperation>;
    async wait(
        op: SubmitOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedSubmitOperation>;
    async wait(
        op: DoneOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedDoneOperation>;
    async wait(
        op: CredentialOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedCredentialOperation>;
    async wait(
        op: GroupOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedGroupOperation>;
    async wait(
        op: DelegatorOperation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedDelegatorOperation>;
    async wait(
        op: Operation,
        options?: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        }
    ): Promise<CompletedOperation>;
    async wait(
        op: Operation,
        options: {
            signal?: AbortSignal;
            minSleep?: number;
            maxSleep?: number;
            increaseFactor?: number;
        } = {}
    ): Promise<CompletedOperation> {
        const minSleep = options.minSleep ?? 10;
        const maxSleep = options.maxSleep ?? 10000;
        const increaseFactor = options.increaseFactor ?? 50;

        if (
            this.hasDepends(op) &&
            op.metadata.depends &&
            !op.metadata.depends.done
        ) {
            await this.wait(op.metadata.depends, options);
        }

        if (op.done === true) {
            this.throwIfFailed(op);
            return op;
        }

        let retries = 0;
        while (true) {
            op = await this.get(op.name);

            if (op.done === true) {
                this.throwIfFailed(op);
                return op;
            }

            const delay = Math.max(
                minSleep,
                Math.min(maxSleep, 2 ** retries * increaseFactor)
            );
            retries++;

            await new Promise((resolve) => setTimeout(resolve, delay));
            options.signal?.throwIfAborted();
        }
    }
}

/**
 * KeyEvents
 */
export class KeyEvents {
    public client: SignifyClient;
    /**
     * KeyEvents
     * @param {SignifyClient} client
     */
    constructor(client: SignifyClient) {
        this.client = client;
    }

    /**
     * Retrieve key events for an identifier
     * @async
     * @param {string} pre Identifier prefix
     * @returns {Promise<KeyEventRecord[]>} A promise to the key events
     */
    async get(pre: string): Promise<KeyEventRecord[]> {
        const path = `/events?pre=${pre}`;
        const data = null;
        const method = 'GET';
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }
}

/**
 * KeyStates
 */
export class KeyStates {
    public client: SignifyClient;
    /**
     * KeyStates
     * @param {SignifyClient} client
     */
    constructor(client: SignifyClient) {
        this.client = client;
    }

    /**
     * Retriene the key state for an identifier
     * @async
     * @param {string} pre Identifier prefix
     * @returns {Promise<KeyState[]>} A promise to the key states
     */
    async get(pre: string): Promise<KeyState[]> {
        const path = `/states?pre=${pre}`;
        const data = null;
        const method = 'GET';
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }

    /**
     * Retrieve the key state for a list of identifiers
     * @async
     * @param {Array<string>} pres List of identifier prefixes
     * @returns {Promise<any>} A promise to the key states
     */
    async list(pres: string[]): Promise<KeyState[]> {
        const path = `/states?${pres.map((pre) => `pre=${pre}`).join('&')}`;
        const data = null;
        const method = 'GET';
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }

    /**
     * Query the key state of an identifier for a given sequence number or anchor
     * @async
     * @param {string} pre Identifier prefix
     * @param {number} [sn] Optional sequence number
     * @param {any} [anchor] Optional anchor
     * @returns {Promise<QueryOperation>} A promise to the long-running operation
     */
    async query(
        pre: string,
        sn?: string,
        anchor?: any
    ): Promise<QueryOperation> {
        const path = `/queries`;
        const data: any = {
            pre: pre,
        };
        if (sn !== undefined) {
            data.sn = sn;
        }
        if (anchor !== undefined) {
            data.anchor = anchor;
        }

        const method = 'POST';
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }
}

export class Config {
    public client: SignifyClient;

    /**
     * Config
     * @param {SignifyClient} client
     */
    constructor(client: SignifyClient) {
        this.client = client;
    }

    async get(): Promise<AgentConfig> {
        const path = `/config`;
        const method = 'GET';
        const res = await this.client.fetch(path, method, null);
        return await res.json();
    }
}
