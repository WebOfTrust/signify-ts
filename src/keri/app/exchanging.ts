import { SignifyClient } from './clienting.ts';
import { b, d, Dict, Protocols, Ilks, Serials, versify } from '../core/core.ts';
import { Serder } from '../core/serder.ts';
import { nowUTC } from '../core/utils.ts';
import { Pather } from '../core/pather.ts';
import { Counter, CtrDex } from '../core/counter.ts';
import { Saider } from '../core/saider.ts';
import { ExnV1, HabState, Icp, Ixn } from '../core/keyState.ts';
import { Rpy } from './escrowing.ts';
import { components } from '../../types/keria-api-schema.ts';

export type ExchangeResource = components['schemas']['ExchangeResource'];
export type ExchangeResourceV1 = Omit<ExchangeResource, 'exn'> & { exn: ExnV1 };
export type ExnMultisig = components['schemas']['ExnMultisig'];

export const MULTISIG_ICP_ROUTE = '/multisig/icp';
export const MULTISIG_ROT_ROUTE = '/multisig/rot';
export const MULTISIG_IXN_ROUTE = '/multisig/ixn';
export const MULTISIG_RPY_ROUTE = '/multisig/rpy';
export const MULTISIG_VCP_ROUTE = '/multisig/vcp';
export const MULTISIG_ISS_ROUTE = '/multisig/iss';
export const MULTISIG_EXN_ROUTE = '/multisig/exn';
export const MULTISIG_REV_ROUTE = '/multisig/rev';
export const IPEX_GRANT_ROUTE = '/ipex/grant';
export const IPEX_OFFER_ROUTE = '/ipex/offer';
export const IPEX_APPLY_ROUTE = '/ipex/apply';
export const IPEX_AGREE_ROUTE = '/ipex/agree';
export const IPEX_ADMIT_ROUTE = '/ipex/admit';
export type AnchorEvent =
    | components['schemas']['IXN_V_1']
    | components['schemas']['ICP_V_1']
    | components['schemas']['ROT_V_1']
    | components['schemas']['DIP_V_1']
    | components['schemas']['DIP_V_2'];

export type MultisigIcpExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof MULTISIG_ICP_ROUTE;
        e: {
            icp: Icp;
            d?: string;
        };
        a: {
            gid: string;
            smids: string[];
            rmids?: string[];
            [key: string]: unknown;
        };
    };
};
export type MultisigRotExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof MULTISIG_ROT_ROUTE;
        e: {
            rot: components['schemas']['ROT_V_1'];
            d?: string;
        };
        a: {
            gid: string;
            smids: string[];
            rmids?: string[];
            [key: string]: unknown;
        };
    };
};
export type MultisigIxnExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof MULTISIG_IXN_ROUTE;
        e: {
            ixn: Ixn;
            d?: string;
        };
        a: {
            gid: string;
            smids: string[];
            rmids?: string[];
            [key: string]: unknown;
        };
    };
};
export type MultisigRpyExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof MULTISIG_RPY_ROUTE;
        e: {
            rpy: Rpy;
            d?: string;
        };
        a: {
            gid: string;
            [key: string]: unknown;
        };
    };
};
export type MultisigVcpExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof MULTISIG_VCP_ROUTE;
        e: {
            vcp: components['schemas']['VCP_V_1'];
            anc: AnchorEvent;
            d?: string;
        };
        a: {
            gid: string;
            usage?: string;
            [key: string]: unknown;
        };
    };
};
export type MultisigIssExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof MULTISIG_ISS_ROUTE;
        e: {
            acdc: components['schemas']['ACDC_V_1'];
            iss: components['schemas']['ISS_V_1'];
            anc: AnchorEvent;
            d?: string;
        };
        a: {
            gid: string;
            [key: string]: unknown;
        };
    };
};
export type MultisigExnExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof MULTISIG_EXN_ROUTE;
        e: {
            exn: ExnV1;
            d?: string;
        };
        a: {
            gid: string;
            [key: string]: unknown;
        };
    };
};
export type MultisigRevExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof MULTISIG_REV_ROUTE;
        e: {
            rev: components['schemas']['REV_V_1'];
            d?: string;
        };
        a: {
            gid: string;
            [key: string]: unknown;
        };
    };
};

type WithGroupMetadata = Pick<
    ExnMultisig,
    'paths' | 'groupName' | 'memberName' | 'sender'
>;

export type MultisigIcpGroup = Omit<MultisigIcpExchange, 'pathed'> &
    WithGroupMetadata;
export type MultisigRotGroup = Omit<MultisigRotExchange, 'pathed'> &
    WithGroupMetadata;
export type MultisigIxnGroup = Omit<MultisigIxnExchange, 'pathed'> &
    WithGroupMetadata;
export type MultisigRpyGroup = Omit<MultisigRpyExchange, 'pathed'> &
    WithGroupMetadata;
export type MultisigVcpGroup = Omit<MultisigVcpExchange, 'pathed'> &
    WithGroupMetadata;
export type MultisigIssGroup = Omit<MultisigIssExchange, 'pathed'> &
    WithGroupMetadata;
export type MultisigExnGroup = Omit<MultisigExnExchange, 'pathed'> &
    WithGroupMetadata;
export type MultisigRevGroup = Omit<MultisigRevExchange, 'pathed'> &
    WithGroupMetadata;

export type IpexGrantExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof IPEX_GRANT_ROUTE;
        e: {
            acdc: components['schemas']['ACDC_V_1'];
            iss: components['schemas']['ISS_V_1'];
            anc: AnchorEvent;
            d?: string;
        };
    };
};

export type IpexOfferExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof IPEX_OFFER_ROUTE;
        e: {
            acdc: components['schemas']['ACDC_V_1'];
            d?: string;
        };
    };
};

export type IpexApplyExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof IPEX_APPLY_ROUTE;
        e: object;
    };
};

export type IpexAgreeExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof IPEX_AGREE_ROUTE;
        e: object;
    };
};

export type IpexAdmitExchange = ExchangeResourceV1 & {
    exn: ExnV1 & {
        r: typeof IPEX_ADMIT_ROUTE;
        e: object;
    };
};

export function isMultisigIcp(
    msg: ExchangeResourceV1
): msg is MultisigIcpExchange;
export function isMultisigIcp(msg: ExnMultisig): msg is MultisigIcpGroup;
export function isMultisigIcp(msg: ExnMessage): msg is ExnMessage {
    return msg.exn.r === MULTISIG_ICP_ROUTE;
}

export function isMultisigRot(
    msg: ExchangeResourceV1
): msg is MultisigRotExchange;
export function isMultisigRot(msg: ExnMultisig): msg is MultisigRotGroup;
export function isMultisigRot(msg: ExnMessage): msg is ExnMessage {
    return msg.exn.r === MULTISIG_ROT_ROUTE;
}

export function isMultisigIxn(
    msg: ExchangeResourceV1
): msg is MultisigIxnExchange;
export function isMultisigIxn(msg: ExnMultisig): msg is MultisigIxnGroup;
export function isMultisigIxn(msg: ExnMessage): msg is ExnMessage {
    return msg.exn.r === MULTISIG_IXN_ROUTE;
}

export function isMultisigRpy(
    msg: ExchangeResourceV1
): msg is MultisigRpyExchange;
export function isMultisigRpy(msg: ExnMultisig): msg is MultisigRpyGroup;
export function isMultisigRpy(msg: ExnMessage): msg is ExnMessage {
    return msg.exn.r === MULTISIG_RPY_ROUTE;
}

export function isMultisigVcp(
    msg: ExchangeResourceV1
): msg is MultisigVcpExchange;
export function isMultisigVcp(msg: ExnMultisig): msg is MultisigVcpGroup;
export function isMultisigVcp(msg: ExnMessage): msg is ExnMessage {
    return msg.exn.r === MULTISIG_VCP_ROUTE;
}

export function isMultisigIss(
    msg: ExchangeResourceV1
): msg is MultisigIssExchange;
export function isMultisigIss(msg: ExnMultisig): msg is MultisigIssGroup;
export function isMultisigIss(msg: ExnMessage): msg is ExnMessage {
    return msg.exn.r === MULTISIG_ISS_ROUTE;
}

export function isMultisigExn(
    msg: ExchangeResourceV1
): msg is MultisigExnExchange;
export function isMultisigExn(msg: ExnMultisig): msg is MultisigExnGroup;
export function isMultisigExn(msg: ExnMessage): msg is ExnMessage {
    return msg.exn.r === MULTISIG_EXN_ROUTE;
}

export function isMultisigRev(
    msg: ExchangeResourceV1
): msg is MultisigRevExchange;
export function isMultisigRev(msg: ExnMultisig): msg is MultisigRevGroup;
export function isMultisigRev(msg: ExnMessage): msg is ExnMessage {
    return msg.exn.r === MULTISIG_REV_ROUTE;
}

export function isIpexGrant(msg: ExchangeResourceV1): msg is IpexGrantExchange {
    return msg.exn.r === IPEX_GRANT_ROUTE;
}

export function isIpexOffer(msg: ExchangeResourceV1): msg is IpexOfferExchange {
    return msg.exn.r === IPEX_OFFER_ROUTE;
}

export function isIpexApply(msg: ExchangeResourceV1): msg is IpexApplyExchange {
    return msg.exn.r === IPEX_APPLY_ROUTE;
}

export function isIpexAgree(msg: ExchangeResourceV1): msg is IpexAgreeExchange {
    return msg.exn.r === IPEX_AGREE_ROUTE;
}

export function isIpexAdmit(msg: ExchangeResourceV1): msg is IpexAdmitExchange {
    return msg.exn.r === IPEX_ADMIT_ROUTE;
}

type ExnMessage = ExchangeResourceV1 | ExnMultisig;

function assertRoute<T extends ExnMessage>(
    msg: T,
    route: string,
    label: string
): T {
    if (msg.exn?.r !== route) {
        throw new Error(`Expected ${label} but got route: ${msg.exn?.r}`);
    }
    return msg;
}

export function assertMultisigIss(msg: ExchangeResourceV1): MultisigIssExchange;
export function assertMultisigIss(msg: ExnMultisig): MultisigIssGroup;
export function assertMultisigIss(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, MULTISIG_ISS_ROUTE, 'Multisig ISS message');
}

export function assertMultisigIcp(msg: ExchangeResourceV1): MultisigIcpExchange;
export function assertMultisigIcp(msg: ExnMultisig): MultisigIcpGroup;
export function assertMultisigIcp(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, MULTISIG_ICP_ROUTE, 'Multisig ICP message');
}

export function assertMultisigRot(msg: ExchangeResourceV1): MultisigRotExchange;
export function assertMultisigRot(msg: ExnMultisig): MultisigRotGroup;
export function assertMultisigRot(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, MULTISIG_ROT_ROUTE, 'Multisig ROT message');
}

export function assertMultisigIxn(msg: ExchangeResourceV1): MultisigIxnExchange;
export function assertMultisigIxn(msg: ExnMultisig): MultisigIxnGroup;
export function assertMultisigIxn(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, MULTISIG_IXN_ROUTE, 'Multisig IXN message');
}

export function assertMultisigRpy(msg: ExchangeResourceV1): MultisigRpyExchange;
export function assertMultisigRpy(msg: ExnMultisig): MultisigRpyGroup;
export function assertMultisigRpy(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, MULTISIG_RPY_ROUTE, 'Multisig RPY message');
}

export function assertMultisigVcp(msg: ExchangeResourceV1): MultisigVcpExchange;
export function assertMultisigVcp(msg: ExnMultisig): MultisigVcpGroup;
export function assertMultisigVcp(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, MULTISIG_VCP_ROUTE, 'Multisig VCP message');
}

export function assertMultisigExn(msg: ExchangeResourceV1): MultisigExnExchange;
export function assertMultisigExn(msg: ExnMultisig): MultisigExnGroup;
export function assertMultisigExn(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, MULTISIG_EXN_ROUTE, 'Multisig EXN message');
}

export function assertMultisigRev(msg: ExchangeResourceV1): MultisigRevExchange;
export function assertMultisigRev(msg: ExnMultisig): MultisigRevGroup;
export function assertMultisigRev(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, MULTISIG_REV_ROUTE, 'Multisig REV message');
}

export function assertIpexGrant(msg: ExchangeResourceV1): IpexGrantExchange;
export function assertIpexGrant(msg: ExnMultisig): ExnMultisig;
export function assertIpexGrant(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, IPEX_GRANT_ROUTE, 'IPEX grant message');
}

export function assertIpexOffer(msg: ExchangeResourceV1): IpexOfferExchange;
export function assertIpexOffer(msg: ExnMultisig): ExnMultisig;
export function assertIpexOffer(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, IPEX_OFFER_ROUTE, 'IPEX offer message');
}

export function assertIpexApply(msg: ExchangeResourceV1): IpexApplyExchange;
export function assertIpexApply(msg: ExnMultisig): ExnMultisig;
export function assertIpexApply(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, IPEX_APPLY_ROUTE, 'IPEX apply message');
}

export function assertIpexAgree(msg: ExchangeResourceV1): IpexAgreeExchange;
export function assertIpexAgree(msg: ExnMultisig): ExnMultisig;
export function assertIpexAgree(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, IPEX_AGREE_ROUTE, 'IPEX agree message');
}

export function assertIpexAdmit(msg: ExchangeResourceV1): IpexAdmitExchange;
export function assertIpexAdmit(msg: ExnMultisig): ExnMultisig;
export function assertIpexAdmit(msg: ExnMessage): ExnMessage {
    return assertRoute(msg, IPEX_ADMIT_ROUTE, 'IPEX admit message');
}

/**
 * Exchanges
 */
export class Exchanges {
    client: SignifyClient;

    /**
     * Exchanges
     * @param {SignifyClient} client
     */
    constructor(client: SignifyClient) {
        this.client = client;
    }

    /**
     * Create exn message
     * @async
     * @returns {Promise<any>} A promise to the list of replay messages
     * @param sender
     * @param route
     * @param payload
     * @param embeds
     * @param recipient
     * @param datetime
     * @param dig
     */
    async createExchangeMessage(
        sender: HabState,
        route: string,
        payload: Dict<any>,
        embeds: Dict<any>,
        recipient: string,
        datetime?: string,
        dig?: string
    ): Promise<[Serder, string[], string]> {
        const keeper = this.client.manager!.get(sender);
        const [exn, end] = exchange(
            route,
            payload,
            sender['prefix'],
            recipient,
            datetime,
            dig,
            undefined,
            embeds
        );

        const sigs = await keeper.sign(b(exn.raw));
        return [exn, sigs, d(end)];
    }

    /**
     * Send exn messages to list of recipients
     * @async
     * @returns {Promise<any>} A promise to the list of replay messages
     * @param name
     * @param topic
     * @param sender
     * @param route
     * @param payload
     * @param embeds
     * @param recipients
     */
    async send(
        name: string,
        topic: string,
        sender: HabState,
        route: string,
        payload: Dict<any>,
        embeds: Dict<any>,
        recipients: string[]
    ): Promise<any> {
        for (const recipient of recipients) {
            const [exn, sigs, atc] = await this.createExchangeMessage(
                sender,
                route,
                payload,
                embeds,
                recipient
            );
            return await this.sendFromEvents(
                name,
                topic,
                exn,
                sigs,
                atc,
                recipients
            );
        }
    }

    /**
     * Send exn messaget to list of recipients
     * @async
     * @returns {Promise<Exn>} A promise to the list of replay messages
     * @param name
     * @param topic
     * @param exn
     * @param sigs
     * @param atc
     * @param recipients
     */
    async sendFromEvents(
        name: string,
        topic: string,
        exn: Serder,
        sigs: string[],
        atc: string,
        recipients: string[]
    ): Promise<any> {
        const path = `/identifiers/${name}/exchanges`;
        const method = 'POST';
        const data: any = {
            tpc: topic,
            exn: exn.sad,
            sigs: sigs,
            atc: atc,
            rec: recipients,
        };

        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }

    /**
     * Get exn message by said
     * @async
     * @returns A promise to the exn message
     * @param said The said of the exn message
     */
    async get(said: string): Promise<ExchangeResourceV1> {
        const path = `/exchanges/${said}`;
        const method = 'GET';
        const res = await this.client.fetch(path, method, null);
        return await res.json();
    }
}

export function exchange(
    route: string,
    payload: Dict<any>,
    sender: string,
    recipient: string,
    date?: string,
    dig?: string,
    modifiers?: Dict<any>,
    embeds?: Dict<any>
): [Serder, Uint8Array] {
    const vs = versify(Protocols.KERI, undefined, Serials.JSON, 0);
    const ilk = Ilks.exn;
    const dt =
        date !== undefined
            ? date
            : nowUTC().toISOString().replace('Z', '000+00:00');
    const p = dig !== undefined ? dig : '';
    const q = modifiers !== undefined ? modifiers : {};
    const ems = embeds != undefined ? embeds : {};

    let e = {} as Dict<any>;
    let end = '';
    Object.entries(ems).forEach(([key, value]) => {
        const serder = value[0];
        const atc = value[1];
        e[key] = serder.sad;

        if (atc == undefined) {
            return;
        }
        let pathed = '';
        const pather = new Pather({}, undefined, ['e', key]);
        pathed += pather.qb64;
        pathed += atc;

        const counter = new Counter({
            code: CtrDex.PathedMaterialQuadlets,
            count: Math.floor(pathed.length / 4),
        });
        end += counter.qb64;
        end += pathed;
    });

    if (Object.keys(e).length > 0) {
        e['d'] = '';
        [, e] = Saider.saidify(e);
    }

    const attrs = {} as Dict<any>;

    attrs['i'] = recipient;

    const a = {
        ...attrs,
        ...payload,
    };

    const _sad = {
        v: vs,
        t: ilk,
        d: '',
        i: sender,
        rp: recipient,
        p: p,
        dt: dt,
        r: route,
        q: q,
        a: a,
        e: e,
    };
    const [, sad] = Saider.saidify(_sad);

    const exn = new Serder(sad);

    return [exn, b(end)];
}
