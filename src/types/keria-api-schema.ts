// AUTO-GENERATED: Only components retained from OpenAPI schema

export interface components {
    schemas: {
        ACDCAttributes: {
            dt?: string;
            i?: string;
            u?: string;
        } & {
            [key: string]: unknown;
        };
        ACDC: {
            v: string;
            d: string;
            i: string;
            s: string;
            ri?: string;
            a?: components['schemas']['ACDCAttributes'];
            u?: string;
            e?: unknown[];
            r?: unknown[];
        };
        IssEvt: {
            v: string;
            /** @enum {unknown} */
            t: 'iss' | 'bis';
            d: string;
            i: string;
            s: string;
            ri: string;
            dt: string;
        };
        Schema: {
            $id: string;
            $schema: string;
            title: string;
            description: string;
            type: string;
            credentialType: string;
            version: string;
            properties: {
                [key: string]: unknown;
            };
            additionalProperties: boolean;
            required: string[];
        };
        Anchor: {
            pre: string;
            sn: number;
            d: string;
        };
        Seal: {
            s: string;
            d: string;
            i?: string;
        };
        ANC: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            di?: string;
            a?: components['schemas']['Seal'][];
        };
        Credential: {
            sad: components['schemas']['ACDC'];
            atc: string;
            iss: components['schemas']['IssEvt'];
            issatc: string;
            pre: string;
            schema: components['schemas']['Schema'];
            chains: {
                [key: string]: unknown;
            }[];
            status: components['schemas']['CredentialState'];
            anchor: components['schemas']['Anchor'];
            anc: components['schemas']['ANC'];
            ancatc: string;
        };
        OperationStatus: {
            code: number;
            message: string;
            details?: {
                [key: string]: unknown;
            } | null;
        };
        OperationBase: {
            name: string;
            error?: components['schemas']['OperationStatus'];
            done?: boolean;
        };
        EmptyDict: Record<string, never>;
        CredentialStateIssOrRev: {
            vn: unknown;
            i: string;
            s: string;
            d: string;
            ri: string;
            a: components['schemas']['Seal'];
            dt: string;
            /** @enum {unknown} */
            et: 'iss' | 'rev';
            ra: components['schemas']['EmptyDict'];
        };
        RaFields: {
            i: string;
            s: string;
            d: string;
        };
        CredentialStateBisOrBrv: {
            vn: unknown;
            i: string;
            s: string;
            d: string;
            ri: string;
            a: components['schemas']['Seal'];
            dt: string;
            /** @enum {unknown} */
            et: 'bis' | 'brv';
            ra: components['schemas']['RaFields'];
        };
        CredentialState:
            | components['schemas']['CredentialStateIssOrRev']
            | components['schemas']['CredentialStateBisOrBrv'];
        Operation: components['schemas']['OperationBase'] & {
            metadata?: Record<string, never>;
            response?: Record<string, never>;
        };
        Registry: {
            name: string;
            regk: string;
            pre: string;
            state: components['schemas']['CredentialState'];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
