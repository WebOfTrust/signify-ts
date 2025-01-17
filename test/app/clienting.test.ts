import { strict as assert } from 'assert';
import { SignifyClient } from '../../src/keri/app/clienting';
import { Identifier } from '../../src/keri/app/aiding';
import {
    Operations,
    KeyEvents,
    KeyStates,
    Oobis,
} from '../../src/keri/app/coring';
import { Contacts, Challenges } from '../../src/keri/app/contacting';
import {
    Credentials,
    Schemas,
    Registries,
} from '../../src/keri/app/credentialing';
import { Escrows } from '../../src/keri/app/escrowing';
import { Exchanges } from '../../src/keri/app/exchanging';
import { Groups } from '../../src/keri/app/grouping';
import { Notifications } from '../../src/keri/app/notifying';
import { HEADER_SIG_INPUT, HEADER_SIG_TIME } from '../../src/keri/core/httping';
import { Salter, Tier } from '../../src/keri/core/salter';
import libsodium from 'libsodium-wrappers-sumo';
import fetchMock from 'jest-fetch-mock';
import 'whatwg-fetch';
import { Authenticator, Cigar, Siger, Signage, signature } from '../../src';

fetchMock.enableMocks();

const url = 'http://127.0.0.1:3901';
const boot_url = 'http://127.0.0.1:3903';
const bran = '0123456789abcdefghijk';

const mockConnect =
    '{"agent":{"vn":[1,0],"i":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei",' +
    '"s":"0","p":"","d":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei","f":"0",' +
    '"dt":"2023-08-19T21:04:57.948863+00:00","et":"dip","kt":"1",' +
    '"k":["DMZh_y-H5C3cSbZZST-fqnsmdNTReZxIh0t2xSTOJQ8a"],"nt":"1",' +
    '"n":["EM9M2EQNCBK0MyAhVYBvR98Q0tefpvHgE-lHLs82XgqC"],"bt":"0","b":[],' +
    '"c":[],"ee":{"s":"0","d":"EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei","br":[],"ba":[]},' +
    '"di":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose"},"controller":{"state":{"vn":[1,0],' +
    '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","p":"",' +
    '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","f":"0","dt":"2023-08-19T21:04:57.959047+00:00",' +
    '"et":"icp","kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1",' +
    '"n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"ee":{"s":"0",' +
    '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","br":[],"ba":[]},"di":""},' +
    '"ee":{"v":"KERI10JSON00012b_","t":"icp","d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose",' +
    '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","kt":"1",' +
    '"k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1",' +
    '"n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"a":[]}},"ridx":0,' +
    '"pidx":0}';
const mockGetAID = {
    name: 'aid1',
    prefix: 'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
    salty: {
        sxlt: '1AAHnNQTkD0yxOC9tSz_ukbB2e-qhDTStH18uCsi5PCwOyXLONDR3MeKwWv_AVJKGKGi6xiBQH25_R1RXLS2OuK3TN3ovoUKH7-A',
        pidx: 0,
        kidx: 0,
        stem: 'signify:aid',
        tier: 'low',
        dcode: 'E',
        icodes: ['A'],
        ncodes: ['A'],
        transferable: true,
    },
    transferable: true,
    state: {
        vn: [1, 0],
        i: 'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
        s: '0',
        p: '',
        d: 'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
        f: '0',
        dt: '2023-08-21T22:30:46.473545+00:00',
        et: 'icp',
        kt: '1',
        k: ['DPmhSfdhCPxr3EqjxzEtF8TVy0YX7ATo0Uc8oo2cnmY9'],
        nt: '1',
        n: ['EAORnRtObOgNiOlMolji-KijC_isa3lRDpHCsol79cOc'],
        bt: '0',
        b: [],
        c: [],
        ee: {
            s: '0',
            d: 'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK',
            br: [],
            ba: [],
        },
        di: '',
    },
    windexes: [],
};

const mockCredential = {
    sad: {
        v: 'ACDC10JSON000197_',
        d: 'EMwcsEMUEruPXVwPCW7zmqmN8m0I3CihxolBm-RDrsJo',
        i: 'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1',
        ri: 'EGK216v1yguLfex4YRFnG7k1sXRjh3OKY7QqzdKsx7df',
        s: 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao',
        a: {
            d: 'EK0GOjijKd8_RLYz9qDuuG29YbbXjU8yJuTQanf07b6P',
            i: 'EKvn1M6shPLnXTb47bugVJblKMuWC0TcLIePP8p98Bby',
            dt: '2023-08-23T15:16:07.553000+00:00',
            LEI: '5493001KJTIIGC8Y1R17',
        },
    },
    pre: 'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1',
    sadsigers: [
        {
            path: '-',
            pre: 'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1',
            sn: 0,
            d: 'EMQQpnSkgfUOgWdzQTWfrgiVHKIDAhvAZIPQ6z3EAfz1',
        },
    ],
    sadcigars: [],
    chains: [],
    status: {
        v: 'KERI10JSON000135_',
        i: 'EMwcsEMUEruPXVwPCW7zmqmN8m0I3CihxolBm-RDrsJo',
        s: '0',
        d: 'ENf3IEYwYtFmlq5ZzoI-zFzeR7E3ZNRN2YH_0KAFbdJW',
        ri: 'EGK216v1yguLfex4YRFnG7k1sXRjh3OKY7QqzdKsx7df',
        ra: {},
        a: { s: 2, d: 'EIpgyKVF0z0Pcn2_HgbWhEKmJhOXFeD4SA62SrxYXOLt' },
        dt: '2023-08-23T15:16:07.553000+00:00',
        et: 'iss',
    },
};
// prettier-ignore
const essrPayload = new Uint8Array([117,25,216,177,230,114,125,73,6,221,25,123,124,67,78,188,248,165,196,158,243,206,130,147,102,156,228,138,222,39,133,63,171,67,121,182,77,211,170,157,244,131,48,73,202,165,117,156,16,157,70,102,201,62,231,10,246,138,114,58,207,154,91,112,110,246,233,72,55,254,87,77,203,235,159,142,158,25,3,178,52,30,235,96,136,193,163,209,239,98,213,94,6,255,249,103,110,237,215,10,181,35,158,70,204,16,99,238,176,156,237,64,154,141,94,207,139,176,240,63,91,198,105,49,126,234,140,54,155,145,33,120,222,27,232,87,13,208,232,11,15,119,179,36,87,93,11,69,67,198,18,18,51,66,115,39,193,180,92,169,26,161,214,44,4,149,50,209,5,234,186,74,248,194,55,76,168,169,235,207,250,34,8,198,206,13,142,210,27,112,48,235,63,94,49,45,93,194,68,25,171,117,5,4,150,93,210,236,86,81,9,189,226,94,5,34,202,74,64,219,246,101,52,177,211,194,71,20,86,108,138,62,5,240,213,17,162,247,27,236,106,70,127,58,78,251,205,141,233,168,120,248,206,49,158,78,2,47,74,41,83,170,209,163,84,148,177,95,48,57,139,218,39,73,32,14,11,120,23,114,74,100,81,237,68,54,197,49,186,249,22,156,68,8,201,101,217,80,180,78,95,226,127,213,68,235,75,139,141,30,146,107,135,69,195,161,37,131,145,233,180,162,204,217,225,133,237,34,242,52,112,140,11,39,33,128,244,24,107,39,232,43,238,59,173,61,129,56,47,123,47,88,148,167,181,2,93,76,148,235,188,208,136,164,27,199,210,203,43,111,70,229,64,227,183,34,31,143,200,97,255,145,211,116,200,197,137,78,5,180,39,226,212,218,253,192,19,180,154,32,87,207,162,52,247,141,69,85,33,118,9,90,143,152,149,135,255,231,34,52,175,88,193,148,238,135,225,132,51,101,16,15,187,30,86,15,255,65,26,93,110,90,135,123,35,200,47,184,244,73,50,160,41,203,202,105,70,10,158,243,245,113,65,64,147,113,141,75,84,174,53,150,222,208,176,133,10,74,102,253,57,216,123,7,241,180,59,210,18,44,200,232,1,218,204,128,131,166,3,121,207,105,164,55,253,155,56,143,129,171,181,53,249,14,178,27,109,224,21,180,128,66,232,49,56,116,210,102,191,49,82,124,49,193,128,103,127,44,16,50,164,227,231,142,51,62,184,199,155,77,219,68,59,234,164,143,182,187,255,68,135,224,254,162,70,91,184,219,36,82,233,50,63,92,231,125,209,44,111,214,249,230,112,127,225,34,138,246,194,221,248,154,252,15,62,168,121,164,26,5,239,11,159,79,37,100,77,237,239,147,149,25,55,254,191,198,105,91,235,72,19,103,153,200,140,63,158,21,253,116,120,83,100,85,55,246,172,193,106,127,151,16,22,212,124,175,253,5,147,108,33,229,47,129,9,23,83,235,248,21,9,108,70,3,60,112,254,152,185,153,222,80,184,43,8,65,96,29,115,58,87,35,212,0,231,190,170,163,137,182,165,254,122,212,185,145,174,111,122,85,238,61,253,222,230,152,51,247,29,5,165,46,70,16,161,200,197,200,206,208,52,235,70,214,5,225,70,233,152,55,77,23,235,142,97,234,32,224,52,69,9,226,137,134,225,65,175,30,255,125,166,182,250,140,121,169,57,145,118,245,76,64,154,51,25,78,164,234,101,8]);
// prettier-ignore
const essrPayloadWrongSender = new Uint8Array([16,216,221,116,161,207,29,16,56,119,38,162,132,222,109,10,210,98,11,197,57,200,145,126,31,253,229,255,103,238,171,121,169,100,71,250,190,57,210,72,114,69,40,19,216,173,154,198,185,34,42,215,148,208,6,45,141,25,192,207,97,10,31,27,226,101,73,124,201,121,10,201,60,163,206,97,97,175,253,5,180,218,232,170,113,227,105,150,65,96,165,61,250,199,185,18,205,157,41,60,239,176,30,46,126,100,105,192,35,224,52,63,208,30,45,51,252,34,93,42,227,166,89,163,244,111,121,202,99,128,60,74,157,88,224,11,25,122,195]);
// prettier-ignore
const essrPayloadNoSender = new Uint8Array([119,138,58,107,131,131,130,130,136,117,95,96,48,74,71,43,135,116,175,134,222,207,167,251,22,116,64,94,254,151,14,38,181,7,111,123,147,187,68,32,151,21,183,245,137,134,58,139,173,58,45,121,137,232,136,63,252,64,247,24,18,203,49,141,210,198,99,210,117,56,18,104,213,202,160,9,218,228,254,102,118,66,29,54,183,118,49,148,112,249,9,31,74,41,0,163,254,173,111,230,147,146,223,106,160,8,23,188,1,62,32,108,116,190,43,95,238,186,240,197,52,84,123,105,249,172,252,251,235,38,29,79,113,243,104,216,124,94,148,87,45,30,249,122,87,83,228,53,168,184,140,76,193,166,8,211,226,45,217,50,33,52,53,0,153,42,70,163,154,1,26,5,34,197,168,30,253,48,45,247,203,221,66,5,18,135,114,228,8,13,178,19,95,184,93,140,236,101,233,78,234,134,250,50,222,142,72,108,43,161,162,80,199,83,23,72,254,215,171,42,91,214,83,218,203,48,84,38,148,33,186,8,141,42,69,62,205,177,195,224,197,139,105,109,85,165,189,240,90,139,4,102,89,111,87,250,155,154,79,227,112,155,249,174,155,73,151,39,159,146,170,26,226,35,123,230,143,105,132,163,100,71,25,136,24,232,156,156,111,51,96,71,7,9,78,66,138,6,25,193,136,19,116,43,190,141,107,74,105,247,132,48,64,135,161,101,140,241,31,125,139,4,82,149,202,18,124,240,238,204,188,247,50,27,113,63,133,199,34,170,88,149,121,118,30,11,35,48,142,138,193,210,125,212,229,199,78,150,153,166,93,63,213,144,160,37,185,193,164,116,137,212,120,141,233,36,147,31,200,95,97,206,118,114,8,19,78,104,57,95,136,66,250,99,31,188,85,218,223,143,219,6,61,144,74,49,255,169,229,148,153,43,21,188,73,24,220,121,151,249,69,59,228,94,7,172,17,39,217,170,46,219,228,153,220,200,172,64,187,10,249,220,101,206,157,8,129,105,91,77,93,35,242,171,165,242,47,173,196,137,185,168,90,104,220,194,73,172,207,172,253,204,187,96,138,122,96,62,191,81,225,160,138,1,228,26,87,249,124,47,76,142,197,250,204,125,14,76,181,208,11,106,239,134,180,93,123,176,178,156,202,72,170,79,81,30,130,46,26,231,147,194,16,165,9,117,66,162,139,229,59,254,95,51,250,252,114,199,5,171,56,184,171,251,233,88,118,203,166,219,241,27,236,112,16,250,165,129,192,8,42,177,108,94,203,135,181,61,186,135,209,173,240,224,58,81,51,94,223,223,234,104,127,169,184,140,44,224,162,70,245,80,117,152,178,63,123,74,102,136,226,253,207,206,49,148,119,235,59,36,14,54,201,210,68,231,53,102,196,68,34,83,252,90,0,51,53,33,250,219,105,140,212,55,11,118,140,132,176,224,137,202,145,13,112,159,166,177,23,163,56,69,37,108,148,235,135,247,127,69,187,88,14,135,230,147,142,213,25,223,173,205,234,45,139,93,193,39,8,47,247,254,226,253,97,120,123,230,24,165,61,236,33,232,113,199,105,95,51,163,57,227,153,224,29,81]);
// prettier-ignore
const essrPayload400Response = new Uint8Array([231,194,204,45,36,145,131,193,37,69,248,198,58,106,28,176,65,80,47,240,163,36,141,29,86,236,43,254,210,90,134,4,119,232,193,33,131,5,16,42,214,126,143,23,111,6,8,99,246,85,147,29,76,39,155,73,243,12,37,91,60,214,220,95,160,0,118,9,233,183,76,191,29,69,119,87,38,243,77,219,96,253,169,64,46,121,49,247,146,160,233,186,8,108,100,112,151,75,45,250,111,55,139,109,107,112,12,81,0,82,224,11,112,24,110,122,224,253,108,175,188,102,182,169,133,149,133,215,138,26,180,198,244,115,8,3,40,202,134,89,104,184,206,130,22,25,15,142,75,236,52,101,158,252,175,121,126,40,120,79,98,141,224,122,54,166,122,99,77,75,186,195,45,235,43,37,98,25,73,136,252,17,254,224,126,73,10,227,73,162,103,41,200,115,17,96,24,175,226,191,158,139,68,83,121,28,108,247,49,27,12,4,34,49,220,119,4,45,152,52,133,145,202,180,65,80,52,83,196,145,184,174,9,74,176,179,42,103,174,192,115,115,170,140,190,19,194,83,27,73,240,170,82,237,219,241,150,44,6,241,206,96,91,230,252,16,99,230,20,161,225,166,133,85,42,66,13,167,155,202,89,25,5,245,215,63,60,48,232,56,80,2,107]);

// jest-fetch-mock doesn't work well with byte-stream bodies, so mocking this out. Tested in authing.test.ts.
jest.spyOn(Authenticator, 'serializeRequest').mockResolvedValue(`
POST http://127.0.0.1:3901/oobis HTTP/1.1
content-length: 99
content-type: application/json
signify-resource: ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose
    
{"url":"http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha","oobialias":"wit"}
`);

fetchMock.mockResponse((req) => {
    if (req.url.startsWith(url + '/agent')) {
        return Promise.resolve({ body: mockConnect, init: { status: 202 } });
    } else if (req.url == boot_url + '/boot') {
        return Promise.resolve({ body: '', init: { status: 202 } });
    } else {
        return Promise.resolve({ body: '', init: { status: 202 } });
    }
});

describe('SignifyClient', () => {
    it('SignifyClient initialization', async () => {
        await libsodium.ready;

        const t = () => {
            new SignifyClient(url, 'short', Tier.low, boot_url);
        };
        expect(t).toThrow('bran must be 21 characters');

        const client = new SignifyClient(url, bran, Tier.low, boot_url);
        assert.equal(client.bran, '0123456789abcdefghijk');
        assert.equal(client.url, url);
        assert.equal(client.bootUrl, boot_url);
        assert.equal(client.tier, Tier.low);
        assert.equal(client.pidx, 0);
        assert.equal(
            client.controller.pre,
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.equal(client.controller.stem, 'signify:controller');
        assert.equal(client.controller.tier, Tier.low);
        assert.equal(
            client.controller.serder.raw,
            '{"v":"KERI10JSON00012b_","t":"icp",' +
                '"d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose",' +
                '"i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0",' +
                '"kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],' +
                '"nt":"1","n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],' +
                '"bt":"0","b":[],"c":[],"a":[]}'
        );
        assert.deepEqual(client.controller.serder.ked.s, '0');

        const res = await client.boot();
        assert.equal(fetchMock.mock.calls[0]![0]!, boot_url + '/boot');
        assert.equal(
            fetchMock.mock.calls[0]![1]!.body!.toString(),
            '{"icp":{"v":"KERI10JSON00012b_","t":"icp","d":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","i":"ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose","s":"0","kt":"1","k":["DAbWjobbaLqRB94KiAutAHb_qzPpOHm3LURA_ksxetVc"],"nt":"1","n":["EIFG_uqfr1yN560LoHYHfvPAhxQ5sN6xZZT_E3h7d2tL"],"bt":"0","b":[],"c":[],"a":[]},"sig":"AACJwsJ0mvb4VgxD87H4jIsiT1QtlzznUy9zrX3lGdd48jjQRTv8FxlJ8ClDsGtkvK4Eekg5p-oPYiPvK_1eTXEG","stem":"signify:controller","pidx":1,"tier":"low"}'
        );
        assert.equal(res.status, 202);

        await client.connect();

        // validate agent
        assert(
            client.agent!.pre,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert(
            client.agent!.anchor,
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert(
            client.agent!.said,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert(client.agent!.state.s, '0');
        assert(
            client.agent!.state.d,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );

        // validate approve delegation
        assert.equal(client.controller.serder.ked.s, '1');
        assert.equal(client.controller.serder.ked.t, 'ixn');
        assert.equal(
            client.controller.serder.ked.a[0].i,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert.equal(
            client.controller.serder.ked.a[0].d,
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        );
        assert.equal(client.controller.serder.ked.a[0].s, '0');

        const data = client.data;
        assert(data[0], url);
        assert(data[0], bran);

        assert.equal(client.identifiers() instanceof Identifier, true);
        assert.equal(client.operations() instanceof Operations, true);
        assert.equal(client.keyEvents() instanceof KeyEvents, true);
        assert.equal(client.keyStates() instanceof KeyStates, true);
        assert.equal(client.keyStates() instanceof KeyStates, true);
        assert.equal(client.credentials() instanceof Credentials, true);
        assert.equal(client.registries() instanceof Registries, true);
        assert.equal(client.schemas() instanceof Schemas, true);
        assert.equal(client.challenges() instanceof Challenges, true);
        assert.equal(client.contacts() instanceof Contacts, true);
        assert.equal(client.notifications() instanceof Notifications, true);
        assert.equal(client.escrows() instanceof Escrows, true);
        assert.equal(client.oobis() instanceof Oobis, true);
        assert.equal(client.exchanges() instanceof Exchanges, true);
        assert.equal(client.groups() instanceof Groups, true);
    });

    it('Signed headers fetch', async () => {
        const clientFetchSpy = jest
            .spyOn(SignifyClient.prototype, 'fetch')
            .mockImplementation(async (rurl) => {
                const body = rurl.startsWith('/identifiers/aid1/credentials')
                    ? mockCredential
                    : mockGetAID;

                return Promise.resolve(
                    new Response(JSON.stringify(body), {
                        status: 202,
                    })
                );
            });

        await libsodium.ready;
        const bran = '0123456789abcdefghijk';
        const client = new SignifyClient(url, bran, Tier.low, boot_url);

        await client.connect();

        let resp = await client.saveOldPasscode('1234');
        assert.equal(resp.status, 202);
        let lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(
            lastCall[0]!,
            url + '/salt/ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.equal(lastCall[1]!.method, 'PUT');
        assert.equal(lastCall[1]!.body, '{"salt":"1234"}');

        resp = await client.deletePasscode();
        assert.equal(resp.status, 202);
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(
            lastCall[0]!,
            url + '/salt/ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.equal(lastCall[1]!.method, 'DELETE');

        resp = await client.rotate('abcdefghijk0123456789', []);
        assert.equal(resp.status, 202);
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.equal(
            lastCall[0]!,
            url + '/agent/ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        );
        assert.equal(lastCall[1]!.method, 'PUT');
        let lastBody = JSON.parse(lastCall[1]!.body!);
        assert.equal(lastBody.rot.t, 'rot');
        assert.equal(lastBody.rot.s, '1');
        assert.deepEqual(lastBody.rot.kt, ['1', '0']);
        assert.equal(
            lastBody.rot.d,
            'EGFi9pCcRaLK8dPh5S7JP9Em62fBMiR1l4gW1ZazuuAO'
        );

        const heads = new Headers();
        heads.set('Content-Type', 'application/json');
        const treqInit = {
            headers: heads,
            method: 'POST',
            body: JSON.stringify({ foo: true }),
        };
        const turl = 'http://example.com/test';
        const treq = await client.createSignedRequest('aid1', turl, treqInit);
        await fetch(treq);
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        const resReq = lastCall[0] as Request;
        assert.equal(resReq.url, 'http://example.com/test');
        assert.equal(resReq.method, 'POST');
        lastBody = await resReq.json();
        assert.deepEqual(lastBody.foo, true);
        const lastHeaders = new Headers(resReq.headers);
        assert.equal(
            lastHeaders.get('signify-resource'),
            'ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK'
        );
        assert.equal(
            lastHeaders
                .get(HEADER_SIG_INPUT)
                ?.startsWith(
                    'signify=("@method" "@path" "signify-resource" "signify-timestamp");created='
                ),
            true
        );
        assert.equal(
            lastHeaders
                .get(HEADER_SIG_INPUT)
                ?.endsWith(
                    ';keyid="DPmhSfdhCPxr3EqjxzEtF8TVy0YX7ATo0Uc8oo2cnmY9";alg="ed25519"'
                ),
            true
        );

        const aid = await client.identifiers().get('aid1');
        const keeper = client.manager!.get(aid);
        const signer = keeper.signers[0];
        const created = lastHeaders
            .get(HEADER_SIG_INPUT)
            ?.split(';created=')[1]
            .split(';keyid=')[0];
        const data = `"@method": POST\n"@path": /test\n"signify-resource": ELUvZ8aJEHAQE-0nsevyYTP98rBbGJUrTj5an-pCmwrK\n"signify-timestamp": ${lastHeaders.get(
            HEADER_SIG_TIME
        )}\n"@signature-params: (@method @path signify-resource signify-timestamp);created=${created};keyid=DPmhSfdhCPxr3EqjxzEtF8TVy0YX7ATo0Uc8oo2cnmY9;alg=ed25519"`;

        if (data) {
            const raw = new TextEncoder().encode(data);
            const sig = signer.sign(raw);
            assert.equal(
                sig.qb64,
                lastHeaders
                    .get('signature')
                    ?.split('signify="')[1]
                    .split('"')[0]
            );
        } else {
            fail(`${HEADER_SIG_INPUT} is empty`);
        }

        clientFetchSpy.mockRestore();
    });

    it('ESSR protected fetch', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';
        const client = new SignifyClient(url, bran, Tier.low, boot_url);

        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow('Client needs to call connect first');

        await client.connect();

        const headers = new Headers();
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow('Signature is missing from ESSR payload');

        headers.set(
            'Signature',
            'indexed="?0";signify="0BB50Boq4s2xcFNjskRLziD-dmw443Y3ObeKfd1xjmNTLBQEXkT3Vj67xVD9Fv7OKZysD7xN6sQ_SxWLM8DaCyXX"'
        );
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow('Message from a different remote agent');

        headers.set(
            'Signature',
            'indexed="?0";signify="0BB50Boq4s2xcFNjskRLziD-dmw443Y3ObeKfd1xjmNTLBQEXkT3Vj67xVD9Fv7OKZysD7xN6sQ_SxWLM8DaCyXX"'
        );
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow('Message from a different remote agent');

        headers.set(
            'Signify-Resource',
            'EPHceqLKZg1o95PuA-_47ffBOkpTjVWGQ9LsYf9M8Cs6'
        ); // Wrong
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow('Message from a different remote agent');

        headers.set(
            'Signify-Resource',
            'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei'
        ); // Right
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow(
            'Invalid ESSR payload, missing or incorrect destination prefix'
        );

        headers.set(
            'Signify-Receiver',
            'EPHceqLKZg1o95PuA-_47ffBOkpTjVWGQ9LsYf9M8Cs6'
        ); // Wrong
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow(
            'Invalid ESSR payload, missing or incorrect destination prefix'
        );

        headers.set(
            'Signify-Receiver',
            'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose'
        ); // Right
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow('Timestamp is missing from ESSR payload');

        headers.set('Signify-Timestamp', '2025-01-16T16:37:10.345000+00:00');
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow('Invalid signature');

        let signed = signWithAgent(new Uint8Array(
            Buffer.from(
                JSON.stringify({
                    src: 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
                    dest: 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                    d: 'ECgtcE3D9hvXYqvsMKLxIfj8-nmOM6XOy4mArqxDWIR8',
                    dt: '2025-01-16T16:37:10.345000+00:00',
                })
            )
        ));
        signed.forEach((value, key) => {
            headers.set(key, value);
        });
        fetchMock.mockResolvedValueOnce(
            new Response(essrPayloadNoSender, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow(
            'Invalid ESSR payload, missing or incorrect encrypted sender'
        );

        signed = signWithAgent(new Uint8Array(
            Buffer.from(
                JSON.stringify({
                    src: 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
                    dest: 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                    d: 'EKVuGrO8K7Yi5uV03HMn5Q_LqfbCJvvLzFixClN_QVLN',
                    dt: '2025-01-16T16:37:10.345000+00:00',
                })
            )
        ));
        signed.forEach((value, key) => {
            headers.set(key, value);
        });
        fetchMock.mockResolvedValueOnce(
            new Response(essrPayloadWrongSender, {
                status: 200,
                headers,
            })
        );
        await expect(
            client.fetch('/oobis', 'POST', {
                url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                alias: 'wit',
            })
        ).rejects.toThrow(
            'Invalid ESSR payload, missing or incorrect encrypted sender'
        );

        signed = signWithAgent(new Uint8Array(
            Buffer.from(
                JSON.stringify({
                    src: 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
                    dest: 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                    d: 'EABLUXFJKkV9ey8_-yNnQDhuDkiJ_s5tPZNwYg2g21C5',
                    dt: '2025-01-16T16:37:10.345000+00:00',
                })
            )
        ));
        signed.forEach((value, key) => {
            headers.set(key, value);
        });
        fetchMock.mockResolvedValueOnce(
            new Response(essrPayload, {
                status: 200,
                headers,
            })
        );

        const response = await client.fetch('/oobis', 'POST', {
            url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            alias: 'wit',
        });
        assert.equal(response.status, 202);
        assert.equal(response.headers.get("Signify-Resource"), "EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei");
        assert.equal(
            (await response.text()).replace(/ /g, ""),
            JSON.stringify({
                name: 'oobi.0ABZPhjVcllT3Sa2u61PRpqd',
                metadata: {
                    oobi: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                },
                done: true,
                error: null,
                response: {
                    vn: [1, 0],
                    i: 'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                    s: '0',
                    p: '',
                    d: 'EIkO4CUmYXukX4auGU9yaFoQaIicfVZkazQ0A3IO5biT',
                    f: '0',
                    dt: '2025-01-16T16:29:47.586818+00:00',
                    et: 'icp',
                    kt: '1',
                    k: ['BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha'],
                    nt: '0',
                    n: [],
                    bt: '0',
                    b: [],
                    c: [],
                    ee: {
                        s: '0',
                        d: 'EIkO4CUmYXukX4auGU9yaFoQaIicfVZkazQ0A3IO5biT',
                        br: [],
                        ba: [],
                    },
                    di: '',
                },
            })
        );
    });

    it('HTTP errors are protected except 401', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';
        const client = new SignifyClient(url, bran, Tier.low, boot_url);

        await client.connect();

        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 401,
                statusText: 'Unauthorized',
            })
        );

        await expect(
            client.fetch('/somepath', 'GET', undefined)
        ).rejects.toThrow('HTTP GET /somepath - 401 Unauthorized');

        const headers = new Headers({
            'Signify-Resource': 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
            'Signify-Receiver': 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
            'Signify-Timestamp': '2025-01-16T16:37:10.345000+00:00',
        });

        const signed = signWithAgent(new Uint8Array(
            Buffer.from(
                JSON.stringify({
                    src: 'EEXekkGu9IAzav6pZVJhkLnjtjM5v3AcyA-pdKUcaGei',
                    dest: 'ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose',
                    d: 'EM5HKVnEIAzAXdasQ85zSgN5i2ZQEBVI-GoejNUwk0cy',
                    dt: '2025-01-16T16:37:10.345000+00:00',
                })
            )
        ));
        signed.forEach((value, key) => {
            headers.set(key, value);
        });

        fetchMock.mockResolvedValueOnce(
            new Response(essrPayload400Response, {
                status: 200,
                headers,
            })
        );

        await expect(client.fetch('/oobis', 'POST', {
            url: 'http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            alias: 'wit',
        })).rejects.toThrow('HTTP POST /oobis - 400 Bad Request - {"title": "400 Bad Request", "description": "invalid OOBI request body, either \'rpy\' or \'url\' is required"}');
    });
});

function signWithAgent(payload: Uint8Array): Headers {
    const salter = new Salter({ qb64: '0AAwMTIzNDU2Nzg5YWJjZGVm' });
    const signer = salter.signer(
        'A',
        true,
        'agentagent-ELI7pg979AdhmvrjDeam2eAO2SR5niCgnjAJXJHtJose00',
        Tier.low
    );
    const sig = signer.sign(payload);
    const markers = new Map<string, Siger | Cigar>();
    markers.set('signify', sig);
    const signage = new Signage(markers, false);
    return signature([signage]);
}
