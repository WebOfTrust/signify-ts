import { Controller, Agent } from "./controller"
import { Tier } from "../core/salter"
import { Authenticater } from "../core/authing"
import { KeyManager } from "../core/keeping"
import { Algos } from '../core/manager'
import { incept, rotate, interact, reply, messagize } from "../core/eventing"
import { b, Serials, Versionage, Ilks, versify, Ident} from "../core/core"
import { Tholder } from "../core/tholder"
import { MtrDex } from "../core/matter"
import { Saider } from "../core/saider"
import { Serder } from "../core/serder"
import { Siger } from "../core/siger"
import { Prefixer } from "../core/prefixer"
import { Salter } from "../core/salter"
import { randomNonce } from "./apping"

const DEFAULT_BOOT_URL = "http://localhost:3903"

export class CredentialTypes {
    static issued = "issued"
    static received = "received"
}

/**
 * State
 */
class State {
    agent: any | null
    controller: any | null
    ridx: number
    pidx: number

    constructor() {
        this.agent = null
        this.controller = null
        this.pidx = 0
        this.ridx = 0
    }
}

/**
 * SignifyClient
 */
export class SignifyClient {
    public controller: Controller
    public url: string
    public bran: string
    public pidx: number
    public agent: Agent | null
    public authn: Authenticater | null
    public manager: KeyManager | null
    public tier: Tier
    public bootUrl: string

    /**
     * SignifyClient
     * @param {string} url 
     * @param {string} bran 
     * @param {Tier} tier 
     * @param {string} bootUrl 
     */
    constructor(url: string, bran: string, tier: Tier = Tier.low, bootUrl: string = DEFAULT_BOOT_URL) {
        this.url = url
        if (bran.length < 21) {
            throw Error("bran must be 21 characters")
        }
        this.bran = bran
        this.pidx = 0
        this.controller = new Controller(bran, tier)
        this.authn = null
        this.agent = null
        this.manager = null
        this.tier = tier
        this.bootUrl = bootUrl
    }

    get data() {
        return [this.url, this.bran, this.pidx, this.authn]
    }

    /**
     * boot
     * @async
     * @returns {Promise<Response>}
     */
    async boot(): Promise<Response>{
        const [evt, sign] = this.controller?.event ?? [];
        const data = {
            icp: evt.ked,
            sig: sign.qb64,
            stem: this.controller?.stem,
            pidx: 1,
            tier: this.controller?.tier
        };

        const res = await fetch(this.bootUrl + "/boot", {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        });

        return res;
    }


    /**
     * state
     * @async
     * @returns {Promise<State>}
     */
    async state(): Promise<State> {
        const caid = this.controller?.pre

        let res = await fetch(this.url + `/agent/${caid}`);
        if (res.status == 404) {
            throw new Error(`agent does not exist for controller ${caid}`);
        }

        const data = await res.json();
        let state = new State();
        state.agent = data.agent ?? {};
        state.controller = data.controller ?? {};
        state.ridx = data.ridx ?? 0;
        state.pidx = data.pidx ?? 0;
        return state;
    }

    /**
     * connect
     * @async
     */
    async connect() {
        const state = await this.state()
        this.pidx = state.pidx
        //Create controller representing the local client AID
        this.controller = new Controller(this.bran, this.tier, 0, state.controller)
        this.controller.ridx = state.ridx !== undefined ? state.ridx : 0
        // Create agent representing the AID of KERIA cloud agent
        this.agent = new Agent(state.agent)
        if (this.agent.anchor != this.controller.pre) {
            throw Error("commitment to controller AID missing in agent inception event")
        }
        if (this.controller.serder.ked.s == 0) {
            await this.approveDelegation()
        }
        this.manager = new KeyManager(this.controller.salter, null)
        this.authn = new Authenticater(this.controller.signer, this.agent.verfer!)
    }

    /**
     * fetch
     * @param {string} path 
     * @param {string} method 
     * @param {any} data 
     * @param {Headers} extraHeaders 
     * @throws {Error}
     * @returns {Response}
     */
    async fetch(path: string, method: string, data: any, extraHeaders?: Headers): Response {
        let headers = new Headers()
        let signed_headers = new Headers()
        let final_headers = new Headers()

        headers.set('Signify-Resource', this.controller.pre)
        headers.set('Signify-Timestamp', new Date().toISOString().replace('Z', '000+00:00'))
        headers.set('Content-Type', 'application/json')

        let _body = method == 'GET' ? null : JSON.stringify(data)
        if (_body !== null) {
            headers.set('Content-Length', String(_body.length))
        }
        if (this.authn) {
            signed_headers = this.authn.sign(headers, method, path.split('?')[0])
        } else {
            throw new Error('client need to call connect first')
        }
        
        signed_headers.forEach((value, key) => {
            final_headers.set(key, value)
        })
        if (extraHeaders !== undefined) {
            extraHeaders.forEach((value, key) => {
                final_headers.set(key, value)
            })
        }

        let res = await fetch(this.url + path, {
            method: method,
            body: _body,
            headers: final_headers
        });

        if (!(res.status == 200 || res.status == 202)) {
            const error = await res.text()
            throw new Error(error)
        }
        const isSameAgent = this.agent?.pre === res.headers.get('signify-resource');
        if (!isSameAgent) {
            throw new Error('message from a different remote agent');
        }

        const verification = this.authn.verify(res.headers, method, path.split('?')[0]);
        if (verification) {
            return res;
        } else {
            throw new Error('response verification failed');
        }
    }

    /**
     * signedFetch
     * @param {string} url 
     * @param {string} path 
     * @param {string} method 
     * @param {any} data 
     * @param {string} aidName 
     * @returns {Promise<Response>}
     */
    async signedFetch(url: string, path: string, method: string, data: any, aidName: string): Promise<Response> {
        const hab = await this.identifiers().get(aidName)
        const keeper = this.manager!.get(hab)

        const authenticator = new Authenticater(keeper.signers[0], keeper.signers[0].verfer)

        let headers = new Headers()
        headers.set('Signify-Resource', hab.prefix)
        headers.set('Signify-Timestamp', new Date().toISOString().replace('Z', '000+00:00'))

        if (data !== null) {
            headers.set('Content-Length', data.length)
        }
        else {
            headers.set('Content-Length', '0')
        }
        let signed_headers = authenticator.sign(headers, method, path.split('?')[0])
        let _body = null
        if(method != 'GET') {
            if(data instanceof FormData) {
                _body = data
                // do not set the content type, let the browser do it
                // headers.set('Content-Type', 'multipart/form-data')
            } else {
                _body = JSON.stringify(data)
                headers.set('Content-Type', 'application/json')
            }
        } else {
            headers.set('Content-Type', 'application/json')
        }

        return await fetch(url + path, {
            method: method,
            body: _body,
            headers: signed_headers
        });

    }

    /**
     * approveDelegation
     * @async
     */
    async approveDelegation() {
        let sigs = this.controller.approveDelegation(this.agent!)

        let data = {
            ixn: this.controller.serder.ked,
            sigs: sigs
        }

        await fetch(this.url + "/agent/" + this.controller.pre + "?type=ixn", {
            method: "PUT",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    /**
     * saveOldSalt
     * @async
     * @param {string} salt 
     * @returns {Promise<Response>}
     */
    async saveOldSalt(salt:string): Promise<Response> {
        const caid = this.controller?.pre;
        const body = { salt: salt };
        return await fetch(this.url + "/salt/" + caid, {
            method: "PUT",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    /**
     * deleteldSalt
     * @async
     * @returns {Promise<Response>}
     */
    async deleteldSalt(): Promise<Response> {
        const caid = this.controller?.pre;
        return await fetch(this.url + "/salt/" + caid, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    /**
     * rotate
     * @param {string} nbran 
     * @param {Array<string>} aids 
     */
    async rotate(nbran: string, aids: [string] ){
        let data = this.controller.rotate(nbran, aids)
        await fetch(this.url + "/agent/" + this.controller.pre, {
            method: "PUT",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    /**
     * identifiers
     * @returns {Identifier}
     */
    identifiers(): Identifier {
        return new Identifier(this)
    }

    /**
     * oobis
     * @returns {Oobis}
     */
    oobis(): Oobis {
        return new Oobis(this)
    }

    /**
     * operations
     * @returns {Operations}
     */
    operations(): Operations {
        return new Operations(this)
    }

    /**
     * keyEvents
     * @returns {KeyEvents}
     */
    keyEvents(): KeyEvents {
        return new KeyEvents(this)
    }

    /**
     * keyStates
     * @returns {KeyStates}
     */
    keyStates(): KeyStates {
        return new KeyStates(this)
    }

    /**
     * credentials
     * @returns {Credentials}
     */
    credentials(): Credentials {
        return new Credentials(this)
    }

    /**
     * registries
     * @returns {Registries}
     */
    registries(): Registries {
        return new Registries(this)
    }

    /**
     * schemas
     * @returns {Schemas}
     */
    schemas(): Schemas {
        return new Schemas(this)
    }

    /**
     * challenges
     * @returns {Challenges}
     */
    challenges(): Challenges {
        return new Challenges(this)
    }

    /**
     * contacts
     * @returns {Contacts}
     */
    contacts(): Contacts {
        return new Contacts(this)
    }

    /**
     * notifications
     * @returns {Notifications}
     */
    notifications(): Notifications {
        return new Notifications(this)
    }

    /**
     * 
     * @returns 
     */
    escrows(): Escrows {
        return new Escrows(this)
    }
}

export interface CreateIdentiferArgs {
    transferable?: boolean,
    isith?: string | number,
    nsith?: string | number,
    wits?: string[],
    toad?: number,
    proxy?: string,
    delpre?: string,
    dcode?: string,
    data?: any,
    algo?: Algos,
    pre?: string,
    states?: any[],
    rstates?: any[]
    prxs?: any[],
    nxts?: any[],
    mhab?: any,
    keys?: any[],
    ndigs?: any[],
    bran?: string,
    count?: number,
    ncount?: number,
    tier?: Tier
}

export interface RotateIdentifierArgs {
    transferable?: boolean,
    nsith?: string | number,
    toad?: number,
    cuts?: string[],
    adds?: string[],
    data?: Array<object>,
    ncode?: string,
    ncount?: number,
    ncodes?: string[],
    states?: any[],
    rstates?: any[]
}

/**
 * Identifier
 */
class Identifier {
    public client: SignifyClient
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * list
     * @async
     * @returns {Promise<any>}
     */
    async list(): Promise<any> {
        let path = `/identifiers`
        let data = null
        let method = 'GET'
        let res = await this.client.fetch(path, method, data)
        return await res.json()
    }

    /**
     * get
     * @param {string} name 
     * @returns {Promise<any>}
     */
    async get(name: string): Promise<any> {
        let path = `/identifiers/${name}`
        let data = null
        let method = 'GET'
        let res = await this.client.fetch(path, method, data)
        return await res.json()
    }

    /**
     * create
     * @async
     * @param name 
     * @param {CreateIdentiferArgs} 
     * @returns {Promise<any>}
     */
    async create(name: string, kargs:CreateIdentiferArgs ={}): Promise<any> {

        const algo = kargs.algo == undefined ? Algos.salty : kargs.algo


        let transferable = kargs.transferable ?? true
        let isith = kargs.isith ?? "1"
        let nsith = kargs.nsith ?? "1"
        let wits = kargs.wits ?? []
        let toad = kargs.toad ?? 0
        let dcode = kargs.dcode ?? MtrDex.Blake3_256
        let proxy = kargs.proxy
        let delpre = kargs.delpre
        let data = kargs.data != undefined ? [kargs.data] : []
        let pre = kargs.pre
        let states = kargs.states
        let rstates = kargs.rstates
        let prxs = kargs.prxs
        let nxts = kargs.nxts
        let mhab = kargs.mhab
        let _keys = kargs.keys
        let _ndigs = kargs.ndigs
        let bran = kargs.bran
        let count = kargs.count
        let ncount = kargs.ncount
        let tier = kargs.tier

        let xargs = {
            transferable: transferable,
            isith: isith,
            nsith: nsith,
            wits: wits,
            toad: toad,
            proxy: proxy,
            delpre: delpre,
            dcode: dcode,
            data: data,
            algo: algo,
            pre: pre,
            prxs: prxs,
            nxts: nxts,
            mhab: mhab,
            states: states,
            rstates: rstates,
            keys: _keys,
            ndigs: _ndigs,
            bran: bran,
            count: count,
            ncount: ncount,
            tier: tier
        }

        let keeper = this.client.manager!.new(algo, this.client.pidx, xargs)
        let [keys, ndigs] = keeper!.incept(transferable)
        wits = wits !== undefined ? wits : []
        if (delpre == undefined) {
            var serder = incept({
                keys: keys!,
                isith: isith,
                ndigs: ndigs,
                nsith: nsith,
                toad: toad,
                wits: wits,
                cnfg: [],
                data: data,
                version: Versionage,
                kind: Serials.JSON,
                code: dcode,
                intive: false
            })

        } else {
            var serder = incept({
                keys: keys!,
                isith: isith,
                ndigs: ndigs,
                nsith: nsith,
                toad: toad,
                wits: wits,
                cnfg: [],
                data: data,
                version: Versionage,
                kind: Serials.JSON,
                code: dcode,
                intive: false,
                delpre: delpre
            })
        }

        let sigs = keeper!.sign(b(serder.raw))
        var jsondata: any = {
            name: name,
            icp: serder.ked,
            sigs: sigs,
            proxy: proxy,
            smids: states != undefined ? states.map(state => state.i) : undefined,
            rmids: rstates != undefined ? rstates.map(state => state.i) : undefined
        }
        jsondata[algo] = keeper.params(),

            this.client.pidx = this.client.pidx + 1
        let res = await this.client.fetch("/identifiers", "POST", jsondata)
        return res.json()
    }

    /**
     * interact
     * @async
     * @param {string} name 
     * @param {any} data 
     * @returns {Promise<any>}
     */
    async interact(name: string, data?: any): Promise<any> {

        let hab = await this.get(name)
        let pre: string = hab.prefix

        let state = hab.state
        let sn = Number(state.s)
        let dig = state.d

        data = Array.isArray(data) ? data : [data]

        let serder = interact({ pre: pre, sn: sn + 1, data: data, dig: dig, version: undefined, kind: undefined })
        let keeper = this.client!.manager!.get(hab)
        let sigs = keeper.sign(b(serder.raw))

        let jsondata: any = {
            ixn: serder.ked,
            sigs: sigs,
        }
        jsondata[keeper.algo] = keeper.params()

        let res = await this.client.fetch("/identifiers/" + name + "?type=ixn", "PUT", jsondata)
        return res.json()
    }


    /**
     * rotate
     * @param name 
     * @param {RotateIdentifierArgs} kargs 
     * @returns {Promise<any>}
     */
    async rotate(name: string, kargs: RotateIdentifierArgs={}): Promise<any> {

        let transferable = kargs.transferable ?? true
        let ncode = kargs.ncode ?? MtrDex.Ed25519_Seed
        let ncount = kargs.ncount ?? 1


        let hab = await this.get(name)
        let pre = hab.prefix

        let state = hab.state
        let count = state.k.length
        let dig = state.d
        let ridx = (Number(state.s) + 1)
        let wits = state.b
        let isith = state.kt

        let nsith = kargs.nsith ?? isith


        // if isith is None:  # compute default from newly rotated verfers above
        if (isith == undefined) isith = `${Math.max(1, Math.ceil(count / 2)).toString(16)}`

        // if nsith is None:  # compute default from newly rotated digers above
        if (nsith == undefined) nsith = `${Math.max(1, Math.ceil(ncount / 2)).toString(16)}`

        let cst = new Tholder({sith: isith}).sith  // current signing threshold
        let nst = new Tholder({sith: nsith}).sith  // next signing threshold

        // Regenerate next keys to sign rotation event
        let keeper = this.client.manager!.get(hab)
        // Create new keys for next digests
        let ncodes = kargs.ncodes ?? new Array(ncount).fill(ncode)

        let states = kargs.states == undefined? [] : kargs.states
        let rstates = kargs.rstates == undefined? [] : kargs.rstates
        let [keys, ndigs] = keeper!.rotate(ncodes, transferable, states, rstates)

        let cuts = kargs.cuts ?? []
        let adds = kargs.adds ?? []
        let data = kargs.data != undefined ? [kargs.data] : []
        let toad = kargs.toad
        let serder = rotate({
            pre: pre,
            keys: keys,
            dig: dig,
            sn: ridx,
            isith: cst,
            nsith: nst,
            ndigs: ndigs,
            toad: toad,
            wits: wits,
            cuts: cuts,
            adds: adds,
            data: data
        })

        let sigs = keeper.sign(b(serder.raw))

        var jsondata: any = {
            rot: serder.ked,
            sigs: sigs,
            smids: states != undefined ? states.map(state => state.i) : undefined,
            rmids: rstates != undefined ? rstates.map(state => state.i) : undefined
        }
        jsondata[keeper.algo] = keeper.params()

        let res = await this.client.fetch("/identifiers/" + name, "PUT", jsondata)
        return res.json()
    }

    /**
     * addEndRole
     * @async
     * @param {string} name 
     * @param {string} role 
     * @param {string} eid 
     * @param {string} stamp 
     * @returns {Promise<any>}
     */
    async addEndRole(name: string, role: string, eid?: string, stamp?: string): Promise<any> {
        const hab = await this.get(name)
        const pre = hab.prefix

        const rpy = this.makeEndRole(pre, role, eid, stamp)
        const keeper = this.client.manager!.get(hab)
        const sigs = keeper.sign(b(rpy.raw))

        const jsondata = {
            rpy: rpy.ked,
            sigs: sigs
        }

        let res = await this.client.fetch("/identifiers/" + name + "/endroles", "POST", jsondata)
        return res.json()

    }

    /**
     * makeEndRole
     * @param {string} pre 
     * @param {string} role 
     * @param {string} eid 
     * @param {string} stamp 
     * @returns {Serder}
     */
    makeEndRole(pre: string, role: string, eid?: string, stamp?: string): Serder {
        const data: any = {
            cid: pre,
            role: role
        }
        if (eid != undefined) {
            data.eid = eid
        }
        const route = "/end/role/add"
        return reply(route, data, stamp, undefined, Serials.JSON)
    }

    /**
     * members
     * @async
     * @param {string} name 
     * @returns {Promise<any>}
     */
    async members(name: string): Promise<any> {
        let res = await this.client.fetch("/identifiers/" + name + "/members", "GET", undefined)
        return res.json()
    }
}

/**
 * Oobis
 */
class Oobis {
    public client: SignifyClient
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * get
     * @param {string} name 
     * @param {string} role 
     * @returns {Promise<any>}
     */
    async get(name: string, role: string = 'agent'): Promise<any> {
        let path = `/identifiers/${name}/oobis?role=${role}`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()

    }

    /**
     * resolve
     * @async
     * @param oobi 
     * @param alias 
     * @returns {Promise<any>}
     */
    async resolve(oobi: string, alias?: string): Promise<any> {
        let path = `/oobis`
        let data: any = {
            url: oobi
        }
        if (alias !== undefined) {
            data.oobialias = alias
        }
        let method = 'POST'
        let res = await this.client.fetch(path, method, data)
        return await res.json()

    }
}

/**
 * Operations
 */
class Operations {
    public client: SignifyClient
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * get
     * @async
     * @param {string} name 
     * @returns {Promise<any>}
     */
    async get(name: string): Promise<any> {
        let path = `/operations/${name}`
        let data = null
        let method = 'GET'
        let res = await this.client.fetch(path, method, data)
        return await res.json()

    }
}

/**
 * KeyEvents
 */
class KeyEvents {
    public client: SignifyClient
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * get
     * @async
     * @param {string} pre 
     * @returns {Promise<any>}
     */
    async get(pre: string): Promise<any> {
        let path = `/events?pre=${pre}`
        let data = null
        let method = 'GET'
        let res = await this.client.fetch(path, method, data)
        return await res.json()

    }
}

/**
 * KeyStates
 */
class KeyStates {
    public client: SignifyClient
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * get
     * @async
     * @param {string} pre 
     * @returns {Promise<any>}
     */
    async get(pre: string): Promise<any> {
        let path = `/states?pre=${pre}`
        let data = null
        let method = 'GET'
        let res = await this.client.fetch(path, method, data)
        return await res.json()

    }

    /**
     * list
     * @async
     * @param {Array<string>} pres
     * @returns {Promise<any>}
     */
    async list(pres: [string]): Promise<any> {
        let path = `/states?${pres.map(pre => `pre=${pre}`).join('&')}`
        let data = null
        let method = 'GET'
        let res = await this.client.fetch(path, method, data)
        return await res.json()

    }

    /**
     * query
     * @async
     * @param {string} pre 
     * @param {number} sn 
     * @param {string} anchor 
     * @returns {Promise<any>}
     */
    async query(pre: string, sn?: number, anchor?: string): Promise<any> {
        let path = `/queries`
        let data: any = {
            pre: pre
        }
        if (sn !== undefined) {
            data.sn = sn
        }
        if (anchor !== undefined) {
            data.anchor = anchor
        }

        let method = 'POST'
        let res = await this.client.fetch(path, method, data)
        return await res.json()
    }
}

export interface CredentialFilter {
    filter?: object, 
    sort?: object[], 
    skip?: number, 
    limit?: number
}

/**
 * Credentials
 */
class Credentials {
    public client: SignifyClient
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * list
     * @async
     * @param {string} name 
     * @param {CredentialFilter} kargs 
     * @returns 
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
     * get
     * @async
     * @param {string} name 
     * @param {string} said 
     * @param {boolean} includeCESR 
     * @returns {Promise<any>}
     */
    async get(name: string, said: string, includeCESR: boolean = false): Promise<any> {
        let path = `/identifiers/${name}/credentials/${said}`
        let method = 'GET'
        let headers = includeCESR? new Headers({'Accept': 'application/json+cesr'}) : new Headers({'Accept': 'application/json'})
        let res = await this.client.fetch(path, method, null, headers)

        return includeCESR? await res.text() : await res.json()
    }

    /**
     * issue
     * @async
     * @param {string} name 
     * @param {string} registy 
     * @param {string} schema 
     * @param {string} recipient 
     * @param {any} credentialData 
     * @param {any} rules 
     * @param {any} source 
     * @param {boolean} priv 
     * @returns {Promise<any>}
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
     * revoke
     * @async
     * @param {string} name 
     * @param {string} said 
     * @returns {Promise<any>}
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
     * present
     * @async
     * @param {string} name 
     * @param {string} said 
     * @param {string} recipient 
     * @param {boolean} include 
     * @returns {Promise<string>}
     */
    async present(name: string, said: string, recipient: string, include: boolean=true): Promise<string> {

        let hab = await this.client.identifiers().get(name)
        let pre: string = hab.prefix

        let cred = await this.get(name, said)
        let data = {
            i: cred.sad.i,
            s: cred.sad.s,
            n: said
        }

        const vs = versify(Ident.KERI, undefined, Serials.JSON, 0)

        const _sad = {
            v: vs,
            t: Ilks.exn,
            d: "",
            dt: new Date().toISOString().replace("Z","000+00:00"),
            r: "/presentation",
            q: {},
            a: data
        }
        const [, sad] = Saider.saidify(_sad)
        const exn = new Serder(sad)

        let keeper = this.client!.manager!.get(hab)

        let sig = keeper.sign(b(exn.raw),true)

        let siger = new Siger({qb64:sig[0]})
        let seal = ["SealLast" , {i:pre}]
        let ims = messagize(exn,[siger],seal, undefined, undefined, true)
        ims = ims.slice(JSON.stringify(exn.ked).length)


        let body = {
            exn: exn.ked,
            sig: new TextDecoder().decode(ims),
            recipient: recipient,
            include: include
        }

        let path = `/identifiers/${name}/credentials/${said}/presentations`
        let method = 'POST'
        let headers = new Headers({
            'Accept': 'application/json+cesr'

        })
        let res = await this.client.fetch(path, method, body, headers)
        return await res.text()

    }

    /**
     * request
     * @async
     * @param {string} name 
     * @param {string} recipient 
     * @param {string} schema 
     * @param {string} issuer 
     * @returns {Promise<string>}
     */
    async request(name: string, recipient: string, schema: string, issuer?: string): Promise<string> {
        let hab = await this.client.identifiers().get(name)
        let pre: string = hab.prefix

        let data:any = {
            s: schema
        }
        if (issuer !== undefined) {
            data["i"] = issuer
        }

        const vs = versify(Ident.KERI, undefined, Serials.JSON, 0)

        const _sad = {
            v: vs,
            t: Ilks.exn,
            d: "",
            dt: new Date().toISOString().replace("Z","000+00:00"),
            r: "/presentation/request",
            q: {},
            a: data
        }
        const [, sad] = Saider.saidify(_sad)
        const exn = new Serder(sad)

        let keeper = this.client!.manager!.get(hab)

        let sig = keeper.sign(b(exn.raw),true)

        let siger = new Siger({qb64:sig[0]})
        let seal = ["SealLast" , {i:pre}]
        let ims = messagize(exn,[siger],seal, undefined, undefined, true)
        ims = ims.slice(JSON.stringify(exn.ked).length)


        let body = {
            exn: exn.ked,
            sig: new TextDecoder().decode(ims),
            recipient: recipient,
        }

        let path = `/identifiers/${name}/requests`
        let method = 'POST'
        let headers = new Headers({
            'Accept': 'application/json+cesr'

        })
        let res = await this.client.fetch(path, method, body, headers)
        return await res.text()

    }
}

/**
 * Registries
 */
class Registries {
    public client: SignifyClient
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * list
     * @async
     * @param {string} name
     * @returns {Promise<any>}
     */
    async list(name:string): Promise<any> {
        let path = `/identifiers/${name}/registries`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()

    }

    /**
     * create
     * @async
     * @param {string} name 
     * @param {string} registryName 
     * @param {string} nonce 
     * @returns {Promise<any>}
     */
    async create(name: string, registryName: string, nonce?:string): Promise<any> {
        // TODO add backers option
        // TODO get estOnly from get_identifier ?

        let hab = await this.client.identifiers().get(name)
        let pre: string = hab.prefix

        nonce = nonce !== undefined? nonce : randomNonce()

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

        let prefixer = new Prefixer({code: MtrDex.Blake3_256}, vcp)
        vcp.i = prefixer.qb64
        vcp.d = prefixer.qb64

        let ixn = {}
        let sigs = []

        let state = hab.state
        if (state.c !== undefined && state.c.includes("EO")) {
            var estOnly = true
        }
        else {
            var estOnly = false
        }
        if (estOnly) {
            // TODO implement rotation event
            throw new Error("establishment only not implemented")

        } else {
            let state = hab.state
            let sn = Number(state.s)
            let dig = state.d

            let data:any = [{
                i: prefixer.qb64,
                s: "0",
                d: prefixer.qb64
            }]

            let serder = interact({ pre: pre, sn: sn + 1, data: data, dig: dig, version: undefined, kind: undefined })
            let keeper = this.client!.manager!.get(hab)
            sigs = keeper.sign(b(serder.raw))
            ixn = serder.ked
        }

        let path = `/identifiers/${name}/registries`
        let method = 'POST'
        let data = {
            name: registryName,
            vcp: vcp,
            ixn: ixn!,
            sigs: sigs
        }
        let res = await this.client.fetch(path, method, data)
        return await res.json()
    }

}

/**
 * Schemas
 */
class Schemas {
    client: SignifyClient
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * get
     * @async
     * @param {string} said 
     * @returns {Promise<any>}
     */
    async get(said: string): Promise<any> {
        let path = `/schema/${said}`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }

    /**
     * list
     * @async
     * @returns {Promise<any>}
     */
    async list(): Promise<any> {
        let path = `/schema`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }
}

/**
 * Challenges
 */
class Challenges {
    client: SignifyClient

    /**
     * Challenges
     * @param {SignifyClient} client 
     */
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * generate
     * @async
     * @param {number} strength 
     * @returns {Promise<any>}
     */
    async generate(strength: number = 128): Promise<any> {
        let path = `/challenges?strength=${strength.toString()}`
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }

    /**
     * respond
     * @async
     * @param {string} name 
     * @param {string} recipient 
     * @param {Array<string>} words 
     * @returns {any}
     */
    async respond(name: string, recipient: string, words: string[]) {
        let path = `/challenges/${name}`
        let method = 'POST'

        let hab = await this.client.identifiers().get(name)
        let pre: string = hab.prefix
        let data = {
            i: pre,
            words: words
        }

        const vs = versify(Ident.KERI, undefined, Serials.JSON, 0)

        const _sad = {
            v: vs,
            t: Ilks.exn,
            d: "",
            dt: new Date().toISOString().replace("Z","000+00:00"),
            r: "/challenge/response",
            q: {},
            a: data
        }
        const [, sad] = Saider.saidify(_sad)
        const exn = new Serder(sad)

        let keeper = this.client!.manager!.get(hab)

        let sig = keeper.sign(b(exn.raw),true)

        let siger = new Siger({qb64:sig[0]})
        let seal = ["SealLast" , {i:pre}]
        let ims = messagize(exn,[siger],seal, undefined, undefined, true)
        ims = ims.slice(JSON.stringify(exn.ked).length)

        let jsondata = {
            recipient: recipient,
            words: words,
            exn: exn.ked,
            sig: new TextDecoder().decode(ims)
        }

        let resp = await this.client.fetch(path, method, jsondata)
        if (resp.status === 202) {
            return exn.ked.d
        }
        else {
            return resp
        }
    }

    /**
     * accept
     * @param {string} name 
     * @param {string} pre 
     * @param {string} said 
     * @returns {Promise<Response>}
     */
    async accept(name: string, pre: string, said: string): Promise<Response> {
        let path = `/challenges/${name}`
        let method = 'PUT'
        let data = {
            aid: pre,
            said: said
        }
        let res = await this.client.fetch(path, method, data)

        return res
    }
}

/**
 * Contacts
 */
class Contacts {
    client: SignifyClient

    /**
     * Contacts
     * @param {SignifyClient} client 
     */
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * list
     * @async
     * @param {string} group 
     * @param {string} filterField 
     * @param {string} filterValue 
     * @returns {Promise<any>}
     */
    async list(group?:string, filterField?:string, filterValue?:string): Promise<any> {
        let params = new URLSearchParams()
        if (group !== undefined) {params.append('group', group)}
        if (filterField !== undefined && filterValue !== undefined) {params.append(filterField, filterValue)}

        let path = `/contacts`+ '?' + params.toString()
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()

    }

    /**
     * get
     * @async
     * @param {string} pre 
     * @returns {Promise<any>}
     */
    async get(pre:string): Promise<any> {

        let path = `/contacts/`+ pre
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()

    }

    /**
     * add
     * @async
     * @param {string} pre 
     * @param {any} info 
     * @returns {Promise<any>}
     */
    async add(pre: string, info: any): Promise<any> {
        let path = `/contacts/`+ pre
        let method = 'POST'

        let res = await this.client.fetch(path, method, info)
        return await res.json()
    }

    /**
     * delete
     * @async
     * @param {string} pre 
     * @returns {Promise<any>}
     */
    async delete(pre: string): Promise<any> {
        let path = `/contacts/`+ pre
        let method = 'DELETE'

        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }

    /**
     * update
     * @async
     * @param {string} pre 
     * @param {any} info 
     * @returns {Promise<any>}
     */
    async update(pre: string, info: any): Promise<any> {
        let path = `/contacts/` + pre
        let method = 'PUT'

        let res = await this.client.fetch(path, method, info)
        return await res.json()
    }

}

/**
 * Notifications
 */
class Notifications {
    client: SignifyClient

    /**
     * Notifications
     * @param {SignifyClient} client 
     */
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * list
     * @async
     * @param {string} last 
     * @param {number} limit 
     * @returns {Promise<any>}
     */
    async list(last?:string, limit?:number): Promise<any> {
        let params = new URLSearchParams()
        if (last !== undefined) {params.append('last', last)}
        if (limit !== undefined) {params.append('limit', limit.toString())}

        let path = `/notifications` + '?' + params.toString()
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }

    /**
     * mark
     * @async
     * @param {string} said 
     * @returns {Promise<string>}
     */
    async mark(said:string): Promise<string> {

        let path = `/notifications/`+ said
        let method = 'PUT'
        let res = await this.client.fetch(path, method, null)
        return await res.text()
    }

    /**
     * delete
     * @async
     * @param {string} said 
     * @returns {Promise<any>} 
     */
    async delete(said:string) {

        let path = `/notifications/`+ said
        let method = 'DELETE'
        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }

}

/**
 * Escrows
 */
class Escrows {
    client: SignifyClient

    /**
     * Escrows
     * @param {SignifyClient} client 
     */
    constructor(client: SignifyClient) {
        this.client = client
    }

    /**
     * listReply
     * @async
     * @param {string} route 
     * @returns {Promise<any>}
     */
    async listReply(route?:string) {
        let params = new URLSearchParams()
        if (route !== undefined) {params.append('route', route)}

        let path = `/escrows/rpy` + '?' + params.toString()
        let method = 'GET'
        let res = await this.client.fetch(path, method, null)
        return await res.json()
    }
}
