import { SignifyClient } from "./clienting"
import { Salter } from "../core/salter"
import { interact } from "../core/eventing"
import { b, Dict, Ident, Ilks, Serials, versify } from "../core/core"
import { MtrDex } from "../core/matter"
import { Saider } from "../core/saider"
import { Prefixer } from "../core/prefixer"
import { randomNonce } from "./coring"

/** Types of credentials */
export class CredentialTypes {
    static issued = "issued"
    static received = "received"
}

/** Credential filter parameters */
export interface CredentialFilter {
    filter?: object,
    sort?: object[],
    skip?: number,
    limit?: number
}

/**
 * Credentials
 */
export class Credentials {
    public client: SignifyClient
    /**
     * Credentials
     * @param {SignifyClient} client 
     */
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * List credentials
     * @async
     * @param {string} name Name or alias of the identifier
     * @param {CredentialFilter} [kargs] Optional parameters to filter the credentials
     * @returns {Promise<any>} A promise to the list of credentials
     */
    async list(name: string, kargs: CredentialFilter = {}): Promise<any> {
        let path = `/identifiers/${name}/credentials/query`
        let filtr = kargs.filter === undefined ? {} : kargs.filter;
        let sort = kargs.sort === undefined ? [] : kargs.sort;
        let limit = kargs.limit === undefined ? 25 : kargs.limit;
        let skip = kargs.skip === undefined ? 0 : kargs.skip;

        let data = {
            filter: filtr,
            sort: sort,
            skip: skip,
            limit: limit
        }
        let method = 'POST'

        let res = await this.client.fetch(path, method, data, undefined)
        return await res.json()
    }

    /**
     * Get a credential
     * @async
     * @param {string} name - Name or alias of the identifier
     * @param {string} said - SAID of the credential
     * @param {boolean} [includeCESR=false] - Optional flag export the credential in CESR format
     * @returns {Promise<any>} A promise to the credential
     */
    async get(name: string, said: string, includeCESR: boolean = false): Promise<any> {
        let path = `/identifiers/${name}/credentials/${said}`
        let method = 'GET'
        let headers = includeCESR ? new Headers({ 'Accept': 'application/json+cesr' }) : new Headers({ 'Accept': 'application/json' })
        let res = await this.client.fetch(path, method, null, headers)

        return includeCESR ? await res.text() : await res.json()
    }

    /** 
    * Create a credential
    * @async
    * @param {any} name - Identifier
    * @param {string} registry - Registry
    * @param {Dict<any>} credentialData - Data for the credential
    * @param string schema - Schema
    * @param {string} [recipient] - Recipient of the credential
    * @param {Dict<any>} [edges] - Edges for the credential
    * @param {Dict<any>} [rules] - Rules for the credential
    * @param {boolean} [priv] - Private credential
    * @param {string} [timestamp] - Timestamp for the credential
    */

    async create(
        name: any,
        registry: string,
        credentialData: any,
        schema: string,
        recipient: string | undefined,
        edges: Dict<any> | undefined = undefined,
        rules: Dict<any> | undefined = undefined,
        priv: boolean) {
        // Create Credential
        let hab = await this.client.identifiers().get(name)
        let pre: string = hab.prefix
        const dt = new Date().toISOString().replace('Z', '000+00:00')

        const vsacdc = versify(Ident.ACDC, undefined, Serials.JSON, 0)
        const vs = versify(Ident.KERI, undefined, Serials.JSON, 0)

        let cred: any = {
            v: vsacdc,
            d: ""
        }
        let subject: any = {
            d: "",
        }
        if (priv) {
            cred.u = new Salter({})
            subject.u = new Salter({})
        }
        if (recipient != undefined) {
            subject.i = recipient
        }
        subject.dt = dt
        subject = { ...subject, ...credentialData }

        const [, a] = Saider.saidify(subject, undefined, undefined, "d")

        cred = { ...cred, i: pre }
        cred.ri = registry
        cred = { ...cred, ...{ s: schema }, ...{ a: a } }

        if (edges !== undefined) {
            cred.e = edges
        }
        if (rules !== undefined) {
            cred.r = rules
        }
        const [vcSaid, vc] = Saider.saidify(cred)

        // Create iss
        let _iss = {
            v: vs,
            t: Ilks.iss,
            d: "",
            i: vc.d,
            s: "0",
            ri: registry,
            dt: dt

        }

        let [issSaid, iss] = Saider.saidify(_iss)

        // Create paths and sign
        let keeper = this.client!.manager!.get(hab)

        // Create ixn
        let ixn = {}
        let ixnSaid = undefined
        let sigs = []

        let state = hab.state
        if (state.c !== undefined && state.c.includes("EO")) {
            var estOnly = true
        }
        else {
            var estOnly = false
        }
        let sn = Number(state.s)
        let dig = state.d

        let data: any = [{
            i: iss.i,
            s: iss.s,
            d: iss.d
        }]

        if (estOnly) {
            // TODO implement rotation event
            throw new Error("Establishment only not implemented")

        } else {
            let [_ixnSaid, ixnSerder] = interact({ pre: pre, sn: sn + 1, data: data, dig: dig, version: undefined, kind: undefined })
            ixnSaid = _ixnSaid
            sigs = keeper.sign(b(ixnSerder.raw))
            ixn = ixnSerder.ked
        }
        let res = await this.createFromEvents(name, vc, iss, ixn, sigs)

        return [vcSaid, vc, issSaid, iss, ixnSaid, ixn, sigs, res]

    }

    async createFromEvents(name: string, creder: any, iss: any, anc: any, sigs: any[]) {
        let data: any = {
            iss: iss,
            acdc: creder,
            ixn: anc,
            sigs: sigs
        }
        console.log(data)

        let path = `/identifiers/${name}/credentials`
        let method = 'POST'
        let headers = new Headers({
            'Accept': 'application/json'
        })
        let res = await this.client.fetch(path, method, data, headers)
        return await res.json()

    }
}

export class Ipex {
    public client: SignifyClient
    /**
     * Ipex
     * @param {SignifyClient} client 
     */
    constructor(client: SignifyClient) {
        this.client = client
    }

    async grant(name: string, recp: string, message: string, acdc: any, iss: any, anc: any, date: string) {
        let exchanges = this.client.exchanges()
        let hab = await this.client.identifiers().get(name)
        let sender = hab.prefix

        let data = {
            m: message,
            i: recp
        }
        let embeds = {
            acdc: acdc,
            iss: iss,
            anc: anc
        }
        let [grant, gsigs, end] = exchanges.createExchangeMessage(sender, "/ipex/grant", data, embeds, date)

        return [grant, gsigs, end]
    }

}

/**
 * Registries
 */
export class Registries {
    public client: SignifyClient
    /**
     * Registries
     * @param {SignifyClient} client 
     */
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * List registries
     * @async
     * @param {string} name Name or alias of the identifier
     * @returns {Promise<any>} A promise to the list of registries
     */
    async list(name: string): Promise<any> {
        let path = `/identifiers/${name}/registries`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()

    }

    /**
     * Create a registry
     * @async
     * @param {string} name Name or alias of the identifier
     * @param {string} registryName Name for the registry
     * @param {string} [nonce] Nonce used to generate the registry. If not provided a random nonce will be generated
     * @returns {Promise<any>} A promise to the long-running operation
     */
    async create(name: string, registryName: string, nonce?: string): Promise<any> {
        // TODO add backers option
        // TODO get estOnly from get_identifier ?

        let hab = await this.client.identifiers().get(name)
        let pre: string = hab.prefix

        nonce = nonce !== undefined ? nonce : randomNonce()

        const vs = versify(Ident.KERI, undefined, Serials.JSON, 0)
        let vcp = {
            v: vs,
            t: Ilks.vcp,
            d: "",
            i: "",
            ii: pre,
            s: "0",
            c: ['NB'],
            bt: "0",
            b: [],
            n: nonce
        }

        let prefixer = new Prefixer({ code: MtrDex.Blake3_256 }, vcp)
        vcp.i = prefixer.qb64
        vcp.d = prefixer.qb64

        let ixn = {}
        let sigs = []

        let state = hab.state
        let estOnly = false
        if (state.c !== undefined && state.c.includes("EO")) {
            estOnly = true
        }

        if (estOnly) {
            // TODO implement rotation event
            throw new Error("establishment only not implemented")

        } else {
            let state = hab.state
            let sn = Number(state.s)
            let dig = state.d

            let data: any = [{
                i: prefixer.qb64,
                s: "0",
                d: prefixer.qb64
            }]

            let [, serder] = interact({ pre: pre, sn: sn + 1, data: data, dig: dig, version: undefined, kind: undefined })
            let keeper = this.client!.manager!.get(hab)
            sigs = keeper.sign(b(serder.raw))
            ixn = serder.ked
        }

        return await this.createFromEvents(hab, name, registryName, vcp, ixn, sigs)
    }

    async createFromEvents(hab: Dict<any>, name: string, registryName: string, vcp: Dict<any>, ixn: Dict<any>, sigs: any[]) {

        let path = `/identifiers/${name}/registries`
        let method = 'POST'

        let data: any = {
            name: registryName,
            vcp: vcp,
            ixn: ixn!,
            sigs: sigs
        }
        let keeper = this.client!.manager!.get(hab)
        data[keeper.algo] = keeper.params()

        let res = await this.client.fetch(path, method, data)
        return await res.json()
    }

}
/**
 * Schemas
 */
export class Schemas {
    client: SignifyClient
    /**
     * Schemas
     * @param {SignifyClient} client 
     */
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * Get a schema
     * @async
     * @param {string} said SAID of the schema
     * @returns {Promise<any>} A promise to the schema
     */
    async get(said: string): Promise<any> {
        let path = `/schema/${said}`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }

    /**
     * List schemas
     * @async
     * @returns {Promise<any>} A promise to the list of schemas
     */
    async list(): Promise<any> {
        let path = `/schema`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }
}
