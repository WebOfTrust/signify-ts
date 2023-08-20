import {strict as assert} from "assert"
import { SignifyClient, Identifier, Operations, KeyEvents, KeyStates, Contacts, Notifications, Credentials, Registries, Schemas, Challenges, Escrows} from "../../src/keri/app/signify"
import { Tier } from "../../src/keri/core/salter"
import libsodium from "libsodium-wrappers-sumo"
import fetchMock from "jest-fetch-mock"
import 'whatwg-fetch'


fetchMock.enableMocks();

const connectResponse = '{"agent":{"vn":[1,0],"i":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei",'+
                                '"s":"0","p":"","d":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei","f":"0",'+
                                '"dt":"2023-08-19T21:04:57.948863+00:00","et":"dip","kt":"1",'+
                                '"k":["DMZh_y-H5C3cSbZZST-fqnsmdNTReZxIh0t2xSTOJQ8a"],"nt":"1",'+
                                '"n":["EM9M2EQNCBK0MyAhVYBvR98Q0tefpvHgE-lHLs82XgqC"],"bt":"0","b":[],'+
                                '"c":[],"ee":{"s":"0","d":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei","br":[],"ba":[]},'+
                                '"di":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose"},"controller":{"state":{"vn":[1,0],'+
                                '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","p":"",'+
                                '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","f":"0","dt":"2023-08-19T21:04:57.959047+00:00",'+
                                '"et":"icp","kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1",'+
                                '"n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"ee":{"s":"0",'+
                                '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","br":[],"ba":[]},"di":""},'+
                                '"ee":{"v":"KERI10JSON00012b_","t":"icp","d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose",'+
                                '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","kt":"1",'+
                                '"k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1",'+
                                '"n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"a":[]}},"ridx":0,'+
                                '"pidx":0}'

describe('SignifyClient', () => {
    it('SignifyClient initialization', async () => {
        await libsodium.ready;
        const url = "http://127.0.0.1:3901"
        const boot_url = "http://127.0.0.1:3903"
        const bran = "0123456789abcdefghijk"
        const client = new SignifyClient(url, bran, Tier.low, boot_url)
        assert.equal(client.bran, "0123456789abcdefghijk")
        assert.equal(client.url, url)
        assert.equal(client.bootUrl, boot_url)
        assert.equal(client.tier, Tier.low)
        assert.equal(client.pidx, 0)
        assert.equal(client.controller.pre, "ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose")
        assert.equal(client.controller.stem, "signify:controller")
        assert.equal(client.controller.tier, Tier.low)
        assert.equal(client.controller.serder.raw, '{"v":"KERI10JSON00012b_","t":"icp",'+
                                                    '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose",' +
                                                    '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0",' +
                                                    '"kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],' +
                                                    '"nt":"1","n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],' +
                                                    '"bt":"0","b":[],"c":[],"a":[]}')
        assert.deepEqual(client.controller.serder.ked.s, "0")
        
        fetchMock.mockResponseOnce("", { status: 202 })
        let res = await client.boot()
        assert.equal(fetchMock.mock.calls[0]![0]!,boot_url+'/boot')
        assert.equal(fetchMock.mock.calls[0]![1]!.body!.toString(),'{"icp":{"v":"KERI10JSON00012b_","t":"icp","d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1","n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"a":[]},"sig":"AACJwsJ0mvb4VgxD87H4jIsiT1QtlzznUy9zrX3lGdd48jjQRTv8FxlJ8ClDsGtkvK4Eekg5p-oPYiPvK_1eTXEG","stem":"signify:controller","pidx":1,"tier":"low"}')
        assert.equal(res.status, 202)
        
        fetchMock.mockResponseOnce(connectResponse, { status: 202 })
        await client.connect()

        // validate agent 
        assert(client.agent!.pre, 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei')
        assert(client.agent!.anchor, 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose')
        assert(client.agent!.said, 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei')
        assert(client.agent!.state.s,'0')
        assert(client.agent!.state.d,'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei')

        // validate approve delegation
        assert.equal(client.controller.serder.ked.s, "1")
        assert.equal(client.controller.serder.ked.t, "ixn")
        assert.equal(client.controller.serder.ked.a[0].i, "EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei")
        assert.equal(client.controller.serder.ked.a[0].d, "EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei")
        assert.equal(client.controller.serder.ked.a[0].s, "0")

        let data =client.data
        assert(data[0],url)
        assert(data[0],bran)

        assert.equal(client.identifiers() instanceof Identifier, true)
        assert.equal(client.operations() instanceof Operations, true)
        assert.equal(client.keyEvents() instanceof KeyEvents, true)
        assert.equal(client.keyStates() instanceof KeyStates, true)
        assert.equal(client.keyStates() instanceof KeyStates, true)
        assert.equal(client.credentials() instanceof Credentials, true)
        assert.equal(client.registries() instanceof Registries, true)
        assert.equal(client.schemas() instanceof Schemas, true)
        assert.equal(client.challenges() instanceof Challenges, true)
        assert.equal(client.contacts() instanceof Contacts, true)
        assert.equal(client.notifications() instanceof Notifications, true)
        assert.equal(client.escrows() instanceof Escrows, true)

    })

    it('Signed fetch', async () => { 
        await libsodium.ready
        await libsodium.ready;
        const url = "http://127.0.0.1:3901"
        const boot_url = "http://127.0.0.1:3903"
        const bran = "0123456789abcdefghijk"
        const client = new SignifyClient(url, bran, Tier.low, boot_url)

        fetchMock.mockResponseOnce(connectResponse, { status: 202 })
        await client.connect()

        // const resp = await client.fetch('/anypath','GET', {headers: {'Content-Type': 'application/json'}})
        // console.log(resp)

        
    
    })
})