import { SignifyClient } from './clienting.ts';
import { Dict } from '../core/core.ts';
import { Operation } from './coring.ts';
import { components } from '../../types/keria-api-schema.ts';
import {
    MULTISIG_ICP_ROUTE,
    MULTISIG_ROT_ROUTE,
    MULTISIG_IXN_ROUTE,
    MULTISIG_RPY_ROUTE,
    MULTISIG_VCP_ROUTE,
    MULTISIG_ISS_ROUTE,
    MULTISIG_EXN_ROUTE,
    MULTISIG_REV_ROUTE,
    ExnMultisig,
    MultisigIcpGroup,
    MultisigRotGroup,
    MultisigIxnGroup,
    MultisigRpyGroup,
    MultisigVcpGroup,
    MultisigIssGroup,
    MultisigExnGroup,
    MultisigRevGroup,
} from './exchanging.ts';

export type Exn = components['schemas']['Exn'];

export function isMultisigIcpGroup(msg: ExnMultisig): msg is MultisigIcpGroup {
    return msg.exn.r === MULTISIG_ICP_ROUTE;
}

export function isMultisigRotGroup(msg: ExnMultisig): msg is MultisigRotGroup {
    return msg.exn.r === MULTISIG_ROT_ROUTE;
}

export function isMultisigIxnGroup(msg: ExnMultisig): msg is MultisigIxnGroup {
    return msg.exn.r === MULTISIG_IXN_ROUTE;
}

export function isMultisigRpyGroup(msg: ExnMultisig): msg is MultisigRpyGroup {
    return msg.exn.r === MULTISIG_RPY_ROUTE;
}

export function isMultisigVcpGroup(msg: ExnMultisig): msg is MultisigVcpGroup {
    return msg.exn.r === MULTISIG_VCP_ROUTE;
}

export function isMultisigIssGroup(msg: ExnMultisig): msg is MultisigIssGroup {
    return msg.exn.r === MULTISIG_ISS_ROUTE;
}

export function isMultisigExnGroup(msg: ExnMultisig): msg is MultisigExnGroup {
    return msg.exn.r === MULTISIG_EXN_ROUTE;
}

export function isMultisigRevGroup(msg: ExnMultisig): msg is MultisigRevGroup {
    return msg.exn.r === MULTISIG_REV_ROUTE;
}

/**
 * Groups
 */
export class Groups {
    client: SignifyClient;

    /**
     * Groups
     * @param {SignifyClient} client
     */
    constructor(client: SignifyClient) {
        this.client = client;
    }

    /**
     * Get group request messages
     * @async
     * @param {string} [said] SAID of exn message to load
     * @returns {Promise<ExnMultisig[]>} A promise to the list of replay messages
     */
    async getRequest(said: string): Promise<ExnMultisig[]> {
        const path = `/multisig/request/` + said;
        const method = 'GET';
        const res = await this.client.fetch(path, method, null);
        return await res.json();
    }

    /**
     * Send multisig exn request  messages to other group members
     * @async
     * @param {string} [name] human readable name of group AID
     * @param {Dict<any>} [exn] exn message to send to other members
     * @param {string[]} [sigs] signature of the participant over the exn
     * @param {string} [atc] additional attachments from embedded events in exn
     * @returns {Promise<Exn>} A promise to the list of replay messages
     */
    async sendRequest(
        name: string,
        exn: Dict<any>,
        sigs: string[],
        atc: string
    ): Promise<Exn> {
        const path = `/identifiers/${name}/multisig/request`;
        const method = 'POST';
        const data = {
            exn: exn,
            sigs: sigs,
            atc: atc,
        };
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }

    /**
     * Join multisig group using rotation event.
     * This can be used by participants being asked to contribute keys to a rotation event to join an existing group.
     * @async
     * @param {string} [name] human readable name of group AID
     * @param {any} [rot] rotation event
     * @param {any} [sigs] signatures
     * @param {string} [gid] prefix
     * @param {string[]} [smids] array of particpants
     * @param {string[]} [rmids] array of particpants
     * @returns {Promise<Operation<unknown>} A promise to the list of replay messages
     */
    async join(
        name: string,
        rot: any,
        sigs: any, //string[],
        gid: string,
        smids: string[],
        rmids: string[]
    ): Promise<Operation<unknown>> {
        const path = `/identifiers/${name}/multisig/join`;
        const method = 'POST';
        const data = {
            tpc: 'multisig',
            rot: rot.sad,
            sigs: sigs,
            gid: gid,
            smids: smids,
            rmids: rmids,
        };
        const res = await this.client.fetch(path, method, data);
        return await res.json();
    }
}
