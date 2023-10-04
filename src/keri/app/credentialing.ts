import { SignifyClient } from "./clienting"
import { Counter, CtrDex } from "../core/counter";
import { Seqner } from "../core/seqner";
import { Salter } from "../core/salter"
import { interact } from "../core/eventing"
import { vdr } from "../core/vdring"
import { b, Dict, Ident, Ilks, Serials, versify, Versionage } from "../core/core"
import { Saider } from "../core/saider"
import { Serder } from "../core/serder"
import { TraitDex } from "./habery"


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
    async list(name: string, kargs:CredentialFilter ={}): Promise<any> {
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
        let headers = includeCESR? new Headers({'Accept': 'application/json+cesr'}) : new Headers({'Accept': 'application/json'})
        let res = await this.client.fetch(path, method, null, headers)

        return includeCESR? await res.text() : await res.json()
    }

    /**
     * Issue a credential
     * @async
     * @param {string} name Name or alias of the identifier
     * @param {string} registy qb64 AID of credential registry
     * @param {string} schema SAID of the schema
     * @param {string} [recipient] Optional prefix of recipient identifier
     * @param {any} [credentialData] Optional credential data
     * @param {any} [rules] Optional credential rules
     * @param {any} [source] Optional credential sources
     * @param {boolean} [priv=false] Flag to issue a credential with privacy preserving features
     * @returns {Promise<any>} A promise to the long-running operation
     */
    async issue(name: string, registy: string, schema: string, recipient?: string, credentialData?: any, rules?: any, source?: any, priv: boolean=false): Promise<any> {
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
        subject = {...subject, ...credentialData}

        const [, a] = Saider.saidify(subject,undefined,undefined,"d")

        cred = {...cred, i:pre}
        cred.ri = registy
        cred = {...cred,...{s: schema}, ...{a: a}}

        if (source !== undefined ) {
            cred.e = source
        }
        if (rules !== undefined) {
            cred.r = rules
        }
        const [, vc] = Saider.saidify(cred)

        // Create iss
        let _iss = {
            v: vs,
            t: Ilks.iss,
            d: "",
            i: vc.d,
            s: "0",
            ri: registy,
            dt: dt

        }

        let [, iss] = Saider.saidify(_iss)

        // Create paths and sign
        let cpath = '6AABAAA-'
        let keeper = this.client!.manager!.get(hab)
        let csigs = keeper.sign(b(JSON.stringify(vc)))

        // Create ixn
        let ixn = {}
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

        let data:any = [{
            i: iss.i,
            s: iss.s,
            d: iss.d
        }]

        if (estOnly) {
            // TODO implement rotation event
            throw new Error("Establishment only not implemented")

        } else {
            let serder = interact({ pre: pre, sn: sn + 1, data: data, dig: dig, version: undefined, kind: undefined })
            sigs = keeper.sign(b(serder.raw))
            ixn = serder.ked
        }

        let body = {
            cred: vc,
            csigs: csigs,
            path: cpath,
            iss: iss,
            ixn: ixn,
            sigs: sigs
        }

        let path = `/identifiers/${name}/credentials`
        let method = 'POST'
        let headers = new Headers({
            'Accept': 'application/json+cesr'

        })
        let res = await this.client.fetch(path, method, body, headers)
        return await res.json()

    }

    /**
     * Revoke credential
     * @async
     * @param {string} name Name or alias of the identifier
     * @param {string} said SAID of the credential
     * @returns {Promise<any>} A promise to the long-running operation
     */
    async revoke(name: string, said: string): Promise<any> {
        let hab = await this.client.identifiers().get(name)
        let pre: string = hab.prefix

        const vs = versify(Ident.KERI, undefined, Serials.JSON, 0)
        const dt = new Date().toISOString().replace('Z', '000+00:00')

        let cred = await this.get(name, said)

        // Create rev
        let _rev = {
            v: vs,
            t: Ilks.rev,
            d: "",
            i: said,
            s: "1",
            p: cred.status.d,
            ri: cred.sad.ri,
            dt: dt
        }

        let [, rev] = Saider.saidify(_rev)

        // create ixn
        let ixn = {}
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

        let data:any = [{
            i: rev.i,
            s: rev.s,
            d: rev.d
        }]
        if (estOnly) {
            // TODO implement rotation event
            throw new Error("Establishment only not implemented")

        } else {
            let serder = interact({ pre: pre, sn: sn + 1, data: data, dig: dig, version: undefined, kind: undefined })
            let keeper = this.client!.manager!.get(hab)
            sigs = keeper.sign(b(serder.raw))
            ixn = serder.ked
        }

        let body = {
            rev: rev,
            ixn: ixn,
            sigs: sigs
        }

        let path = `/identifiers/${name}/credentials/${said}`
        let method = 'DELETE'
        let headers = new Headers({
            'Accept': 'application/json+cesr'

        })
        let res = await this.client.fetch(path, method, body, headers)
        return await res.json()

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
        const [, vc] = Saider.saidify(cred)

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

        let [, iss] = Saider.saidify(_iss)

        // Create paths and sign
        let keeper = this.client!.manager!.get(hab)

        // Create ixn
        let ixn = {}
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
            let ixnSerder = interact({ pre: pre, sn: sn + 1, data: data, dig: dig, version: undefined, kind: undefined })
            sigs = keeper.sign(b(ixnSerder.raw))
            ixn = ixnSerder.ked
        }
        let res = await this.createFromEvents(name, vc, iss, ixn, sigs)

        return [ vc, iss, ixn, sigs, res]

    }

    async createFromEvents(name: string, creder: any, iss: any, anc: any, sigs: any[]) {
        let data: any = {
            iss: iss,
            acdc: creder,
            ixn: anc,
            sigs: sigs
        }

        let path = `/identifiers/${name}/credentials`
        let method = 'POST'
        let headers = new Headers({
            'Accept': 'application/json'
        })
        let res = await this.client.fetch(path, method, data, headers)
        return await res.json()

    }

    serialize(serder: Serder, anc: any) {
        let seqner = new Seqner({sn: anc.sn})
        let couple = b(seqner.qb64b + anc.saider.qb64b)
        let atc = new Uint8Array()
        atc.set(new Counter({code:CtrDex.SealSourceCouples, count:1}).qb64b)
        atc.set(couple)

        if (atc.length % 4) {
            throw new Error(`Invalid attachments size=${atc.length}, nonintegral quadlets.`)
        }
        let pcnt = new Counter({code:CtrDex.AttachedMaterialQuadlets, count:(atc.length / 4)}).qb64b
        let msg = b(serder.raw)
        msg.set(pcnt)
        msg.set(atc)
        return msg
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

export interface CreateRegistryArgs {
    name: string, 
    registryName: string, 
    toad?: string | number | undefined
    noBackers?:boolean, 
    baks?:string[], 
    nonce?:string
}


export class RegistryResult {
    private readonly _regser: any
    private readonly _serder: Serder
    private readonly _sigs: string[]
    private readonly promise: Promise<Response>

    constructor(regser: Serder, serder: Serder, sigs: any[], promise: Promise<Response>) {
        this._regser = regser
        this._serder = serder
        this._sigs = sigs
        this.promise = promise
    }

    get regser() {
        return this._regser
    }

    get serder() {
        return this._serder
    }

    get sigs() {
        return this._sigs
    }

    async op(): Promise<any> {
        let res = await this.promise
        return await res.json()
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
    async list(name:string): Promise<any> {
        let path = `/identifiers/${name}/registries`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()

    }

    /**
     * Create a registry
     * @async
     * @param {CreateRegistryArgs}
     * @returns {Promise<[any, Serder, any[], object]> } A promise to the long-running operation
     */
    async create({ name, registryName, noBackers=true, toad=0, baks=[], nonce}: CreateRegistryArgs): Promise<RegistryResult> {
        let hab = await this.client.identifiers().get(name)
        let pre: string = hab.prefix

        let cnfg: string[] = [];
        if (noBackers) {
            cnfg.push(TraitDex.NoBackers);
        }

        let state = hab.state
        let estOnly = (state.c !== undefined && state.c.includes("EO"));
        if (estOnly) {
            cnfg.push(TraitDex.EstOnly);
        }

        let regser = vdr.incept({pre, baks, toad, nonce, cnfg});

        if (estOnly) {
            throw new Error("establishment only not implemented");
        } else {
            let state = hab.state
            let sn = Number(state.s)
            let dig = state.d

            let data: any = [{
                i: regser.pre,
                s: "0",
                d: regser.pre
            }]

            let serder = interact({pre: pre, sn: sn + 1, data: data, dig: dig, version: Versionage, kind: Serials.JSON})
            let keeper = this.client.manager!.get(hab)
            let sigs = keeper.sign(b(serder.raw))
            let res = this.createFromEvents(hab, name, registryName, regser.ked, serder.ked, sigs)
            return new RegistryResult(regser, serder, sigs, res);
        }
    }

    createFromEvents(hab: Dict<any>, name: string, registryName: string, vcp: Dict<any>, ixn: Dict<any>, sigs: any[]) {

        let path = `/identifiers/${name}/registries`
        let method = 'POST'

        let data: any = {
            name: registryName,
            vcp: vcp,
            ixn: ixn,
            sigs: sigs
        }
        let keeper = this.client!.manager!.get(hab)
        data[keeper.algo] = keeper.params()

        return this.client.fetch(path, method, data)
        
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
