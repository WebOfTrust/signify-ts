// AUTO-GENERATED: Only components and enums retained from OpenAPI schema

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
            t: IssEventT;
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
            a: unknown;
        };
        IXN_V_2: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            p: string;
            a: unknown;
        };
        ICP_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            kt: string | string[] | string[][];
            k: string[];
            nt: string | string[] | string[][];
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
            kt: string | string[] | string[][];
            k: string[];
            nt: string | string[] | string[][];
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
            kt: string | string[] | string[][];
            k: string[];
            nt: string | string[] | string[][];
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
            kt: string | string[] | string[][];
            k: string[];
            nt: string | string[] | string[][];
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
            kt: string | string[] | string[][];
            k: string[];
            nt: string | string[] | string[][];
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
            kt: string | string[] | string[][];
            k: string[];
            nt: string | string[] | string[][];
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
            kt: string | string[] | string[][];
            k: string[];
            nt: string | string[] | string[][];
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
            kt: string | string[] | string[][];
            k: string[];
            nt: string | string[] | string[][];
            n: string[];
            bt: string;
            br: string[];
            ba: string[];
            c: string[];
            a: unknown;
        };
        RPY_V_1: {
            v: string;
            t: string;
            d: string;
            dt: string;
            r: string;
            a: unknown;
        };
        RPY_V_2: {
            v: string;
            t: string;
            d: string;
            i: string;
            dt: string;
            r: string;
            a: unknown;
        };
        VCP_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            ii: string;
            s: string;
            c: string[];
            bt: string;
            b: string[];
            n: string;
        };
        ISS_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            ri: string;
            dt: string;
        };
        REV_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            s: string;
            ri: string;
            p: string;
            dt: string;
        };
        EXN_V_1: {
            v: string;
            t: string;
            d: string;
            i: string;
            rp: string;
            p: string;
            dt: string;
            r: string;
            q: {
                [key: string]: unknown;
            };
            a: unknown;
            e: {
                [key: string]: unknown;
            };
        };
        EXN_V_2: {
            v: string;
            t: string;
            d: string;
            i: string;
            x: string;
            p: string;
            dt: string;
            r: string;
            q: {
                [key: string]: unknown;
            };
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
            et: CredentialStateIssOrRevEt;
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
            et: CredentialStateBisOrBrvEt;
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
            kt: string | string[];
            k: string[];
            nt: string | string[];
            n: string[];
            /** @default 0 */
            bt: string;
            b: string[];
            c: string[];
            ee: components['schemas']['StateEERecord'];
            /** @default  */
            di: string;
        };
        Controller: {
            state: components['schemas']['KeyStateRecord'];
            ee:
                | components['schemas']['ICP_V_1']
                | components['schemas']['ICP_V_2']
                | components['schemas']['ROT_V_1']
                | components['schemas']['ROT_V_2']
                | components['schemas']['DIP_V_1']
                | components['schemas']['DIP_V_2']
                | components['schemas']['DRT_V_1']
                | components['schemas']['DRT_V_2'];
        };
        AgentResourceResult: {
            agent: components['schemas']['KeyStateRecord'];
            controller: components['schemas']['Controller'];
            pidx: number;
            /** @default null */
            ridx: number | null;
            /** @default null */
            sxlt: string | null;
        };
        HabState: {
            name: string;
            prefix: string;
            icp_dt: string;
            state: components['schemas']['KeyStateRecord'];
            transferable: boolean;
            windexes: string[];
        } & (
            | {
                  salty: components['schemas']['SaltyState'];
              }
            | {
                  randy: components['schemas']['RandyKeyState'];
              }
            | {
                  group: components['schemas']['GroupKeyState'];
              }
            | {
                  extern: components['schemas']['ExternState'];
              }
        );
        SaltyState: {
            tier: components['schemas']['Tier'];
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
            mhab: components['schemas']['HabState'];
            keys: string[];
            ndigs: string[];
        };
        ExternState: {
            extern_type: string;
            pidx: number;
        } & {
            [key: string]: unknown;
        };
        HabStateBase: {
            name: string;
            prefix: string;
            icp_dt: string;
        } & (
            | {
                  salty: components['schemas']['SaltyState'];
              }
            | {
                  randy: components['schemas']['RandyKeyState'];
              }
            | {
                  group: components['schemas']['GroupKeyState'];
              }
            | {
                  extern: components['schemas']['ExternState'];
              }
        );
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
        Challenge: {
            words: string[];
            dt?: string;
            said?: string;
            authenticated?: boolean;
        };
        MemberEnds: {
            /** @default null */
            agent: {
                [key: string]: string;
            } | null;
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
        WellKnown: {
            url: string;
            dt: string;
        };
        Contact: {
            id: string;
            alias?: string;
            oobi?: string;
            ends?: components['schemas']['MemberEnds'];
            challenges?: components['schemas']['Challenge'][];
            wellKnowns?: components['schemas']['WellKnown'][];
        } & {
            [key: string]: unknown;
        };
        AidRecord: {
            aid: string;
            ends: components['schemas']['MemberEnds'];
        };
        GroupMember: {
            signing: components['schemas']['AidRecord'][];
            rotation: components['schemas']['AidRecord'][];
        };
        KeyEventRecord: {
            ked:
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
            atc: string;
        };
        AgentConfig: {
            iurls?: string[];
        };
        Exn:
            | components['schemas']['EXN_V_1']
            | components['schemas']['EXN_V_2'];
        Icp:
            | components['schemas']['ICP_V_1']
            | components['schemas']['ICP_V_2'];
        Rot:
            | components['schemas']['ROT_V_1']
            | components['schemas']['ROT_V_2'];
        Vcp: components['schemas']['VCP_V_1'];
        Iss: components['schemas']['ISS_V_1'];
        Ixn:
            | components['schemas']['IXN_V_1']
            | components['schemas']['IXN_V_2'];
        Rpy:
            | components['schemas']['RPY_V_1']
            | components['schemas']['RPY_V_2'];
        NotificationData: {
            r?: string;
            d?: string;
            m?: string;
        } & {
            [key: string]: unknown;
        };
        Notification: {
            i: string;
            dt: string;
            r: boolean;
            a: components['schemas']['NotificationData'];
        };
        ExchangeResource: {
            exn: components['schemas']['Exn'];
            pathed: {
                [key: string]: unknown;
            };
        };
        MultisigInceptEmbeds: {
            icp: components['schemas']['Icp'];
        };
        MultisigRotateEmbeds: {
            rot: components['schemas']['Rot'];
        };
        MultisigInteractEmbeds: {
            ixn: components['schemas']['Ixn'];
        };
        MultisigRegistryInceptEmbeds: {
            vcp: components['schemas']['Vcp'];
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
        };
        MultisigIssueEmbeds: {
            acdc:
                | components['schemas']['ACDC_V_1']
                | components['schemas']['ACDC_V_2'];
            iss: components['schemas']['Iss'];
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
        };
        MultisigRevokeEmbeds: {
            rev: components['schemas']['REV_V_1'];
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
        };
        MultisigRpyEmbeds: {
            rpy: components['schemas']['Rpy'];
        };
        MultisigExnEmbeds: {
            exn: components['schemas']['Exn'];
        };
        ExnEmbeds: {
            d: string;
        } & (
            | components['schemas']['MultisigInceptEmbeds']
            | components['schemas']['MultisigRotateEmbeds']
            | components['schemas']['MultisigInteractEmbeds']
            | components['schemas']['MultisigRegistryInceptEmbeds']
            | components['schemas']['MultisigIssueEmbeds']
            | components['schemas']['MultisigRevokeEmbeds']
            | components['schemas']['MultisigRpyEmbeds']
            | components['schemas']['MultisigExnEmbeds']
        );
        ExnMultisig: {
            exn: components['schemas']['Exn'];
            paths: {
                [key: string]: unknown;
            };
            groupName?: string;
            memberName?: string;
            sender?: string;
        };
        OOBIMetadata: {
            oobi: string;
        };
        PendingOOBIOperation: {
            name: string;
            metadata?: components['schemas']['OOBIMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedOOBIOperation: {
            name: string;
            metadata?: components['schemas']['OOBIMetadata'];
            response: components['schemas']['KeyStateRecord'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        OperationStatus: {
            code: number;
            message: string;
            details?: {
                [key: string]: unknown;
            } | null;
        };
        FailedOOBIOperation: {
            name: string;
            metadata?: components['schemas']['OOBIMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        OOBIOperation:
            | components['schemas']['PendingOOBIOperation']
            | components['schemas']['CompletedOOBIOperation']
            | components['schemas']['FailedOOBIOperation'];
        QueryMetadata: {
            pre: string;
            sn: number;
            anchor?: components['schemas']['Anchor'];
        };
        PendingQueryOperation: {
            name: string;
            metadata?: components['schemas']['QueryMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedQueryOperation: {
            name: string;
            metadata?: components['schemas']['QueryMetadata'];
            response: components['schemas']['KeyStateRecord'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedQueryOperation: {
            name: string;
            metadata?: components['schemas']['QueryMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        QueryOperation:
            | components['schemas']['PendingQueryOperation']
            | components['schemas']['CompletedQueryOperation']
            | components['schemas']['FailedQueryOperation'];
        EndRoleMetadata: {
            cid: string;
            role: string;
            eid: string;
        };
        PendingEndRoleOperation: {
            name: string;
            metadata?: components['schemas']['EndRoleMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedEndRoleOperation: {
            name: string;
            metadata?: components['schemas']['EndRoleMetadata'];
            response:
                | components['schemas']['RPY_V_1']
                | components['schemas']['RPY_V_2'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedEndRoleOperation: {
            name: string;
            metadata?: components['schemas']['EndRoleMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        EndRoleOperation:
            | components['schemas']['PendingEndRoleOperation']
            | components['schemas']['CompletedEndRoleOperation']
            | components['schemas']['FailedEndRoleOperation'];
        WitnessMetadata: {
            pre: string;
            sn: number;
        };
        PendingWitnessOperation: {
            name: string;
            metadata?: components['schemas']['WitnessMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedWitnessOperation: {
            name: string;
            metadata?: components['schemas']['WitnessMetadata'];
            response:
                | components['schemas']['ICP_V_1']
                | components['schemas']['ICP_V_2']
                | components['schemas']['ROT_V_1']
                | components['schemas']['ROT_V_2']
                | components['schemas']['IXN_V_1']
                | components['schemas']['IXN_V_2'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedWitnessOperation: {
            name: string;
            metadata?: components['schemas']['WitnessMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        WitnessOperation:
            | components['schemas']['PendingWitnessOperation']
            | components['schemas']['CompletedWitnessOperation']
            | components['schemas']['FailedWitnessOperation'];
        DelegationMetadata: {
            pre: string;
            sn: number;
        };
        PendingDelegationOperation: {
            name: string;
            metadata?: components['schemas']['DelegationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedDelegationOperation: {
            name: string;
            metadata?: components['schemas']['DelegationMetadata'];
            response:
                | components['schemas']['DIP_V_1']
                | components['schemas']['DIP_V_2']
                | components['schemas']['DRT_V_1']
                | components['schemas']['DRT_V_2'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedDelegationOperation: {
            name: string;
            metadata?: components['schemas']['DelegationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        DelegationOperation:
            | components['schemas']['PendingDelegationOperation']
            | components['schemas']['CompletedDelegationOperation']
            | components['schemas']['FailedDelegationOperation'];
        RegistryOperationMetadata: {
            pre: string;
            depends?: components['schemas']['Operation'];
            anchor: components['schemas']['Anchor'];
        };
        PendingRegistryOperation: {
            name: string;
            metadata?: components['schemas']['RegistryOperationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        RegistryOperationResponse: {
            anchor: components['schemas']['Anchor'];
        };
        CompletedRegistryOperation: {
            name: string;
            metadata?: components['schemas']['RegistryOperationMetadata'];
            response: components['schemas']['RegistryOperationResponse'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedRegistryOperation: {
            name: string;
            metadata?: components['schemas']['RegistryOperationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        RegistryOperation:
            | components['schemas']['PendingRegistryOperation']
            | components['schemas']['CompletedRegistryOperation']
            | components['schemas']['FailedRegistryOperation'];
        LocSchemeMetadata: {
            eid: string;
            scheme: string;
            url: string;
        };
        PendingLocSchemeOperation: {
            name: string;
            metadata?: components['schemas']['LocSchemeMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedLocSchemeOperation: {
            name: string;
            metadata?: components['schemas']['LocSchemeMetadata'];
            response: components['schemas']['LocSchemeMetadata'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedLocSchemeOperation: {
            name: string;
            metadata?: components['schemas']['LocSchemeMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        LocSchemeOperation:
            | components['schemas']['PendingLocSchemeOperation']
            | components['schemas']['CompletedLocSchemeOperation']
            | components['schemas']['FailedLocSchemeOperation'];
        ChallengeOperationMetadata: {
            words: string[];
        };
        PendingChallengeOperation: {
            name: string;
            metadata?: components['schemas']['ChallengeOperationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        ChallengeOperationResponse: {
            exn:
                | components['schemas']['EXN_V_1']
                | components['schemas']['EXN_V_2'];
        };
        CompletedChallengeOperation: {
            name: string;
            metadata?: components['schemas']['ChallengeOperationMetadata'];
            response: components['schemas']['ChallengeOperationResponse'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedChallengeOperation: {
            name: string;
            metadata?: components['schemas']['ChallengeOperationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        ChallengeOperation:
            | components['schemas']['PendingChallengeOperation']
            | components['schemas']['CompletedChallengeOperation']
            | components['schemas']['FailedChallengeOperation'];
        ExchangeOperationMetadata: {
            said: string;
        };
        PendingExchangeOperation: {
            name: string;
            metadata?: components['schemas']['ExchangeOperationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedExchangeOperation: {
            name: string;
            metadata?: components['schemas']['ExchangeOperationMetadata'];
            response: components['schemas']['ExchangeOperationMetadata'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedExchangeOperation: {
            name: string;
            metadata?: components['schemas']['ExchangeOperationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        ExchangeOperation:
            | components['schemas']['PendingExchangeOperation']
            | components['schemas']['CompletedExchangeOperation']
            | components['schemas']['FailedExchangeOperation'];
        SubmitOperationMetadata: {
            pre: string;
            sn: number;
        };
        PendingSubmitOperation: {
            name: string;
            metadata?: components['schemas']['SubmitOperationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedSubmitOperation: {
            name: string;
            metadata?: components['schemas']['SubmitOperationMetadata'];
            response: components['schemas']['KeyStateRecord'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedSubmitOperation: {
            name: string;
            metadata?: components['schemas']['SubmitOperationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        SubmitOperation:
            | components['schemas']['PendingSubmitOperation']
            | components['schemas']['CompletedSubmitOperation']
            | components['schemas']['FailedSubmitOperation'];
        DoneOperationMetadata: {
            response:
                | components['schemas']['ICP_V_1']
                | components['schemas']['ICP_V_2']
                | components['schemas']['ROT_V_1']
                | components['schemas']['ROT_V_2']
                | components['schemas']['EXN_V_1']
                | components['schemas']['EXN_V_2'];
            /** @default null */
            pre: string | null;
        };
        PendingDoneOperation: {
            name: string;
            metadata?: components['schemas']['DoneOperationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedDoneOperation: {
            name: string;
            metadata?: components['schemas']['DoneOperationMetadata'];
            response:
                | components['schemas']['ICP_V_1']
                | components['schemas']['ICP_V_2']
                | components['schemas']['ROT_V_1']
                | components['schemas']['ROT_V_2']
                | components['schemas']['EXN_V_1']
                | components['schemas']['EXN_V_2'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedDoneOperation: {
            name: string;
            metadata?: components['schemas']['DoneOperationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        DoneOperation:
            | components['schemas']['PendingDoneOperation']
            | components['schemas']['CompletedDoneOperation']
            | components['schemas']['FailedDoneOperation'];
        CredentialOperationMetadata: {
            ced:
                | components['schemas']['ACDC_V_1']
                | components['schemas']['ACDC_V_2'];
            depends?: components['schemas']['Operation'];
        };
        CredentialOperationResponse: {
            ced?:
                | components['schemas']['ACDC_V_1']
                | components['schemas']['ACDC_V_2'];
        };
        PendingCredentialOperation: {
            name: string;
            metadata?: components['schemas']['CredentialOperationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedCredentialOperation: {
            name: string;
            metadata?: components['schemas']['CredentialOperationMetadata'];
            response: components['schemas']['CredentialOperationResponse'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedCredentialOperation: {
            name: string;
            metadata?: components['schemas']['CredentialOperationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        CredentialOperation:
            | components['schemas']['PendingCredentialOperation']
            | components['schemas']['CompletedCredentialOperation']
            | components['schemas']['FailedCredentialOperation'];
        GroupOperationMetadata: {
            pre: string;
            sn: number;
        };
        PendingGroupOperation: {
            name: string;
            metadata?: components['schemas']['GroupOperationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedGroupOperation: {
            name: string;
            metadata?: components['schemas']['GroupOperationMetadata'];
            response:
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
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedGroupOperation: {
            name: string;
            metadata?: components['schemas']['GroupOperationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        GroupOperation:
            | components['schemas']['PendingGroupOperation']
            | components['schemas']['CompletedGroupOperation']
            | components['schemas']['FailedGroupOperation'];
        DelegatorOperationMetadata: {
            pre: string;
            teepre: string;
            anchor?: components['schemas']['Anchor'];
            depends?:
                | components['schemas']['GroupOperation']
                | components['schemas']['WitnessOperation']
                | components['schemas']['DoneOperation'];
        };
        PendingDelegatorOperation: {
            name: string;
            metadata?: components['schemas']['DelegatorOperationMetadata'];
            /**
             * @default false
             * @enum {unknown}
             */
            done: false;
        };
        CompletedDelegatorOperation: {
            name: string;
            metadata?: components['schemas']['DelegatorOperationMetadata'];
            response: string;
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        FailedDelegatorOperation: {
            name: string;
            metadata?: components['schemas']['DelegatorOperationMetadata'];
            error: components['schemas']['OperationStatus'];
            /**
             * @default true
             * @enum {unknown}
             */
            done: true;
        };
        DelegatorOperation:
            | components['schemas']['PendingDelegatorOperation']
            | components['schemas']['CompletedDelegatorOperation']
            | components['schemas']['FailedDelegatorOperation'];
        Operation:
            | components['schemas']['OOBIOperation']
            | components['schemas']['QueryOperation']
            | components['schemas']['EndRoleOperation']
            | components['schemas']['WitnessOperation']
            | components['schemas']['DelegationOperation']
            | components['schemas']['RegistryOperation']
            | components['schemas']['LocSchemeOperation']
            | components['schemas']['ChallengeOperation']
            | components['schemas']['ExchangeOperation']
            | components['schemas']['SubmitOperation']
            | components['schemas']['DoneOperation']
            | components['schemas']['CredentialOperation']
            | components['schemas']['GroupOperation']
            | components['schemas']['DelegatorOperation'];
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export enum IssEventT {
    iss = 'iss',
    bis = 'bis',
}
export enum CredentialStateIssOrRevEt {
    iss = 'iss',
    rev = 'rev',
}
export enum CredentialStateBisOrBrvEt {
    bis = 'bis',
    brv = 'brv',
}
export enum Tier {
    low = 'low',
    med = 'med',
    high = 'high',
}
export enum OOBIRole {
    controller = 'controller',
    witness = 'witness',
    registrar = 'registrar',
    watcher = 'watcher',
    judge = 'judge',
    juror = 'juror',
    peer = 'peer',
    mailbox = 'mailbox',
    agent = 'agent',
}
