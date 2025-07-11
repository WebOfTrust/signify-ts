// AUTO-GENERATED: Only components retained from OpenAPI schema

export interface components {
    schemas: {
        SADSchema: {
            v: string;
            d: string;
            i: string;
            s: string;
            ri?: string;
            a?: {
                [key: string]: unknown;
            };
            u?: string;
            e?: unknown[];
            r?: unknown[];
        };
        SADAttributesSchema: {
            d: string;
            LEI: string;
            dt: string;
            i?: string;
        };
        ISSSchema: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            ri: string;
            dt: string;
        };
        SchemaSchema: {
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
        StatusAnchorSchema: {
            s: number;
            d: string;
        };
        CredentialStatusSchema: {
            vn: number[];
            i: string;
            s: string;
            d: string;
            ri: string;
            ra: {
                [key: string]: unknown;
            };
            a: components["schemas"]["StatusAnchorSchema"];
            dt: string;
            et: string;
        };
        AnchorSchema: {
            pre: string;
            sn: number;
            d: string;
        };
        SealSchema: {
            s: string;
            d: string;
            i?: string;
            t?: string;
            p?: string;
        };
        ANCSchema: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            a: components["schemas"]["SealSchema"][];
        };
        CredentialSchema: {
            sad: components["schemas"]["SADSchema"];
            atc: string;
            iss: components["schemas"]["ISSSchema"];
            issAtc: string;
            pre: string;
            schema: components["schemas"]["SchemaSchema"];
            chains: {
                [key: string]: unknown;
            }[];
            status: components["schemas"]["CredentialStateIssOrRevSchema"] | components["schemas"]["CredentialStateBisOrBrvSchema"];
            anchor: components["schemas"]["AnchorSchema"];
            anc: components["schemas"]["ANCSchema"];
            ancAttachment: string;
        };
        OperationBaseSchema: {
            name: string;
            done?: boolean;
            error?: boolean;
        };
        StatusSchema: {
            code: number;
            message: string;
            /** @default null */
            details: {
                [key: string]: unknown;
            } | null;
        };
        OperationBase: {
            name: string;
            done?: boolean;
            error?: boolean;
        };
        EmptyDict: Record<string, never>;
        CredentialStateIssOrRevSchema: {
            vn: unknown;
            i: string;
            s: string;
            d: string;
            ri: string;
            a: components["schemas"]["SealSchema"];
            dt: string;
            /** @enum {unknown} */
            et: "iss" | "rev";
            ra: components["schemas"]["EmptyDict"];
        };
        RaFields: {
            i: string;
            s: string;
            d: string;
        };
        CredentialStateBisOrBrvSchema: {
            vn: unknown;
            i: string;
            s: string;
            d: string;
            ri: string;
            a: components["schemas"]["SealSchema"];
            dt: string;
            /** @enum {unknown} */
            et: "bis" | "brv";
            ra: components["schemas"]["RaFields"];
        };
        Operation: components["schemas"]["OperationBase"] & {
            metadata?: Record<string, never>;
            response?: Record<string, never>;
        };
        RegistrySchema: {
            name: string;
            regk: string;
            pre: string;
            state: components["schemas"]["CredentialStateIssOrRevSchema"] | components["schemas"]["CredentialStateBisOrBrvSchema"];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
