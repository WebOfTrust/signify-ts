// AUTO-GENERATED: Only components retained from OpenAPI schema

export interface components {
    schemas: {
        SADAttributes: {
            d: string;
            i: string;
            LEI: string;
            dt: string;
        };
        SADSchema: {
            v: string;
            d: string;
            i: string;
            ri: string;
            s: string;
            a: components["schemas"]["SADAttributes"];
            u?: boolean;
            e?: boolean;
            r?: boolean;
        };
        SADAttributesSchema: {
            d: string;
            i: string;
            LEI: string;
            dt: string;
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
            i: string;
            s: string;
            d: string;
            t?: boolean;
            p?: boolean;
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
            status: components["schemas"]["CredentialStatusSchema"];
            anchor: components["schemas"]["AnchorSchema"];
            anc: components["schemas"]["ANCSchema"];
            ancAttachment: string;
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
        Operation: components["schemas"]["OperationBase"] & {
            metadata?: Record<string, never>;
            response?: Record<string, never>;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
