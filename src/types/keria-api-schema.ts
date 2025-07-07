// AUTO-GENERATED: Only components retained from OpenAPI schema

export interface components {
    schemas: {
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
