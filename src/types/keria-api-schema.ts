// AUTO-GENERATED: Only components and enums retained from OpenAPI schema

export enum IssEvtT {
    iss = "iss",
    bis = "bis"
}

export enum CredentialStateIssOrRevEt {
    iss = "iss",
    rev = "rev"
}

export enum CredentialStateBisOrBrvEt {
    bis = "bis",
    brv = "brv"
}

export enum Tier {
    low = "low",
    med = "med",
    high = "high"
}

export enum OOBIRole {
    controller = "controller",
    witness = "witness",
    registrar = "registrar",
    watcher = "watcher",
    judge = "judge",
    juror = "juror",
    peer = "peer",
    mailbox = "mailbox",
    agent = "agent"
}

export interface components {
    schemas: {
        ACDCAttributes: {
            dt?: string;
            i?: string;
            u?: string;
        } & {
            [key: string]: unknown;
        };
        ACDC_V_1:
            | {
                  v: string;
                  d: string;
                  i: string;
                  s: string;
                  u?: string;
                  ri?: string;
                  e?: string;
                  r?: string;
                  a?: components['schemas']['ACDCAttributes'];
              }
            | {
                  v: string;
                  d: string;
                  i: string;
                  s: string;
                  u?: string;
                  ri?: string;
                  e?: string;
                  r?: string;
                  A?: string | unknown[];
              };
        ACDC_V_2:
            | {
                  v: string;
                  d: string;
                  i: string;
                  s: string;
                  u?: string;
                  rd?: string;
                  e?: string;
                  r?: string;
                  a?: components['schemas']['ACDCAttributes'];
              }
            | {
                  v: string;
                  d: string;
                  i: string;
                  s: string;
                  u?: string;
                  rd?: string;
                  e?: string;
                  r?: string;
                  A?: string | unknown[];
              };
        IssEvent: {
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
        IXN_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            a: components['schemas']['Seal'][];
        };
        IXN_V_2: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            a: components['schemas']['Seal'][];
        };
        ICP_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            kt: string;
            k: string[];
            nt: string;
            n: string[];
            bt: string;
            b: string[];
            c: string[];
            a: unknown;
        };
        ICP_V_2: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            kt: string;
            k: string[];
            nt: string;
            n: string[];
            bt: string;
            b: string[];
            c: string[];
            a: unknown;
        };
        ROT_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            kt: string;
            k: string[];
            nt: string;
            n: string[];
            bt: string;
            br: string[];
            ba: string[];
            a: unknown;
        };
        ROT_V_2: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            kt: string;
            k: string[];
            nt: string;
            n: string[];
            bt: string;
            br: string[];
            ba: string[];
            c: string[];
            a: unknown;
        };
        DIP_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            kt: string;
            k: string[];
            nt: string;
            n: string[];
            bt: string;
            b: string[];
            c: string[];
            a: unknown;
            di: string;
        };
        DIP_V_2: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            kt: string;
            k: string[];
            nt: string;
            n: string[];
            bt: string;
            b: string[];
            c: string[];
            a: unknown;
            di: string;
        };
        DRT_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            kt: string;
            k: string[];
            nt: string;
            n: string[];
            bt: string;
            br: string[];
            ba: string[];
            a: unknown;
        };
        DRT_V_2: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            kt: string;
            k: string[];
            nt: string;
            n: string[];
            bt: string;
            br: string[];
            ba: string[];
            c: string[];
            a: unknown;
        };
        Credential: {
            sad:
                | components['schemas']['ACDC_V_1']
                | components['schemas']['ACDC_V_2'];
            atc: string;
            iss: components['schemas']['IssEvent'];
            issatc: string;
            pre: string;
            schema: components['schemas']['Schema'];
            chains: {
                [key: string]: unknown;
            }[];
            status: components['schemas']['CredentialState'];
            anchor: components['schemas']['Anchor'];
            anc:
                | components['schemas']['IXN_V_1']
                | components['schemas']['IXN_V_2']
                | components['schemas']['ICP_V_1']
                | components['schemas']['ICP_V_2']
                | components['schemas']['ROT_V_1']
                | components['schemas']['ROT_V_2']
                | components['schemas']['DIP_V_1']
                | components['schemas']['DIP_V_2']
                | components['schemas']['DRT_V_1']
                | components['schemas']['DRT_V_2'];
            ancatc: string;
        };
        OperationStatus: {
            code: number;
            message: string;
            details?: {
                [key: string]: unknown;
            } | null;
        };
        Operation: {
            name: string;
            error?: components['schemas']['OperationStatus'];
            done?: boolean;
            metadata?: Record<string, never>;
            response?: Record<string, never>;
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
        Registry: {
            name: string;
            regk: string;
            pre: string;
            state: components['schemas']['CredentialState'];
        };
        Icp: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default 0 */
            s: string;
            /** @default 0 */
            kt: string;
            k?: string[];
            /** @default 0 */
            nt: string;
            n?: string[];
            /** @default 0 */
            bt: string;
            b?: string[];
            c?: string[];
            a?: unknown;
        };
        RotV1: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default 0 */
            s: string;
            /** @default  */
            p: string;
            /** @default 0 */
            kt: string;
            k?: string[];
            /** @default 0 */
            nt: string;
            n?: string[];
            /** @default 0 */
            bt: string;
            br?: string[];
            ba?: string[];
            a?: unknown;
        };
        RotV2: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default 0 */
            s: string;
            /** @default  */
            p: string;
            /** @default 0 */
            kt: string;
            k?: string[];
            /** @default 0 */
            nt: string;
            n?: string[];
            /** @default 0 */
            bt: string;
            br?: string[];
            ba?: string[];
            c?: string[];
            a?: unknown;
        };
        Dip: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default 0 */
            s: string;
            /** @default 0 */
            kt: string;
            k?: string[];
            /** @default 0 */
            nt: string;
            n?: string[];
            /** @default 0 */
            bt: string;
            b?: string[];
            c?: string[];
            a?: unknown;
            /** @default  */
            di: string;
        };
        DrtV1: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default 0 */
            s: string;
            /** @default  */
            p: string;
            /** @default 0 */
            kt: string;
            k?: string[];
            /** @default 0 */
            nt: string;
            n?: string[];
            /** @default 0 */
            bt: string;
            br?: string[];
            ba?: string[];
            a?: unknown;
        };
        DrtV2: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default 0 */
            s: string;
            /** @default  */
            p: string;
            /** @default 0 */
            kt: string;
            k?: string[];
            /** @default 0 */
            nt: string;
            n?: string[];
            /** @default 0 */
            bt: string;
            br?: string[];
            ba?: string[];
            c?: string[];
            a?: unknown;
        };
        Vcp: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default  */
            ii: string;
            /** @default 0 */
            s: string;
            c?: string[];
            /** @default 0 */
            bt: string;
            b?: string[];
            /** @default  */
            n: string;
        };
        Vrt: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default  */
            p: string;
            /** @default 0 */
            s: string;
            /** @default 0 */
            bt: string;
            br?: string[];
            ba?: string[];
        };
        StateEERecord: {
            /** @default 0 */
            s: string;
            /** @default  */
            d: string;
            br?: unknown[];
            ba?: unknown[];
        };
        KeyStateRecord: {
            vn?: number[];
            /** @default  */
            i: string;
            /** @default 0 */
            s: string;
            /** @default  */
            p: string;
            /** @default  */
            d: string;
            /** @default 0 */
            f: string;
            /** @default  */
            dt: string;
            /** @default  */
            et: string;
            /** @default 0 */
            kt: string;
            k: string[];
            /** @default 0 */
            nt: string;
            n: string[];
            /** @default 0 */
            bt: string;
            b: string[];
            c: string[];
            ee: components["schemas"]["StateEERecord"];
            /** @default  */
            di: string;
        };
        Controller: {
            state: components["schemas"]["KeyStateRecord"];
            ee: components["schemas"]["Icp"] | components["schemas"]["RotV1"] | components["schemas"]["RotV2"] | components["schemas"]["Dip"] | components["schemas"]["DrtV1"] | components["schemas"]["DrtV2"] | components["schemas"]["Vcp"] | components["schemas"]["Vrt"];
        };
        AgentResourceResult: {
            agent: components["schemas"]["KeyStateRecord"];
            controller: components["schemas"]["Controller"];
            pidx: number;
            /** @default null */
            ridx: number | null;
            /** @default null */
            sxlt: string | null;
        };
        SaltyState: {
            tier: components["schemas"]["Tier"];
            /** @default  */
            sxlt: string;
            /** @default 0 */
            pidx: number;
            /** @default 0 */
            kidx: number;
            /** @default  */
            stem: string;
            /** @default  */
            dcode: string;
            icodes: string[];
            ncodes: string[];
            /** @default false */
            transferable: boolean;
        };
        RandyKeyState: {
            prxs: string[];
            nxts: string[];
        };
        GroupKeyState: {
            mhab: components["schemas"]["Identifier"];
            keys: string[];
            ndigs: string[];
        };
        ExternState: {
            extern_type: string;
            pidx: number;
        } & {
            [key: string]: unknown;
        };
        Identifier: {
            name: string;
            prefix: string;
            icp_dt: string;
            state: components["schemas"]["KeyStateRecord"];
            /** @default null */
            transferable: boolean | null;
            /** @default null */
            windexes: string[] | null;
            salty?: components["schemas"]["SaltyState"];
            randy?: components["schemas"]["RandyKeyState"];
            group?: components["schemas"]["GroupKeyState"];
            extern?: components["schemas"]["ExternState"];
        };
        /**
         * @description Tier of key material
         * @enum {string}
         */
        Tier: Tier;
        OOBI: {
            /** @enum {string} */
            role: OOBIRole;
            oobis: string[];
        };
        EndRole: {
            cid: string;
            role: string;
            eid: string;
        };
        RpyV1: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            dt: string;
            /** @default  */
            r: string;
            a?: unknown;
        };
        RpyV2: {
            /** @default  */
            v: string;
            /** @default  */
            t: string;
            /** @default  */
            d: string;
            /** @default  */
            i: string;
            /** @default  */
            dt: string;
            /** @default  */
            r: string;
            a?: unknown;
        };
        Rpy: components["schemas"]["RpyV1"] | components["schemas"]["RpyV2"];
        Challenge: {
            words: string[];
        };
        Contact: {
            id: string;
            alias: string;
            oobi: string;
        } & {
            [key: string]: unknown;
        };
        MemberEnds: {
            agent: {
                [key: string]: string;
            };
            /** @default null */
            controller: {
                [key: string]: string;
            } | null;
            /** @default null */
            witness: {
                [key: string]: string;
            } | null;
            /** @default null */
            registrar: {
                [key: string]: string;
            } | null;
            /** @default null */
            watcher: {
                [key: string]: string;
            } | null;
            /** @default null */
            judge: {
                [key: string]: string;
            } | null;
            /** @default null */
            juror: {
                [key: string]: string;
            } | null;
            /** @default null */
            peer: {
                [key: string]: string;
            } | null;
            /** @default null */
            mailbox: {
                [key: string]: string;
            } | null;
        };
        AidRecord: {
            aid: string;
            ends: components["schemas"]["MemberEnds"];
        };
        GroupMember: {
            signing: components["schemas"]["AidRecord"][];
            rotation: components["schemas"]["AidRecord"][];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
