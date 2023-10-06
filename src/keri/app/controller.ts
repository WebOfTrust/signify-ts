import { SaltyCreator } from '../core/manager';
import { Salter, Tier } from '../core/salter';
import { MtrDex } from '../core/matter';
import { Diger } from '../core/diger';
import { incept, rotate, interact } from '../core/eventing';
import { Serder } from '../core/serder';
import { Tholder } from '../core/tholder';
import { Ilks, b, Serials, Versionage } from '../core/core';
import { Verfer } from '../core/verfer';
import { Encrypter } from '../core/encrypter';
import { Decrypter } from '../core/decrypter';
import { Cipher } from '../core/cipher';
import { Seqner } from '../core/seqner';
import { CesrNumber } from '../core/number';

/**
 * Agent is a custodial entity that can be used in conjuntion with a local Client to establish the
 * KERI "signing at the edge" semantic
 */
export class Agent {
    pre: string;
    anchor: string;
    verfer: Verfer | null;
    state: any | null;
    sn: number | undefined;
    said: string | undefined;

    constructor(agent: any) {
        this.pre = '';
        this.anchor = '';
        this.verfer = null;
        this.state = null;
        this.sn = 0;
        this.said = '';
        this.parse(agent);
    }

    private parse(agent: Agent) {
        let [state, verfer] = this.event(agent);

        this.sn = new CesrNumber({}, undefined, state['s']).num;
        this.said = state['d'];

        if (state['et'] !== Ilks.dip) {
            throw new Error(`invalid inception event type ${state['et']}`);
        }

        this.pre = state['i'];
        if (!state['di']) {
            throw new Error('no anchor to controller AID');
        }

        this.anchor = state['di'];

        this.verfer = verfer;
        this.state = state;
    }

    private event(evt: any): [any, Verfer, Diger] {
        if (evt['k'].length !== 1) {
            throw new Error(`agent inception event can only have one key`);
        }

        let verfer = new Verfer({ qb64: evt['k'][0] });

        if (evt['n'].length !== 1) {
            throw new Error(`agent inception event can only have one next key`);
        }

        let diger = new Diger({ qb64: evt['n'][0] });

        let tholder = new Tholder({ sith: evt['kt'] });
        if (tholder.num !== 1) {
            throw new Error(`invalid threshold ${tholder.num}, must be 1`);
        }

        let ntholder = new Tholder({ sith: evt['nt'] });
        if (ntholder.num !== 1) {
            throw new Error(
                `invalid next threshold ${ntholder.num}, must be 1`
            );
        }
        return [evt, verfer, diger];
    }
}

/**
 * Controller is responsible for managing signing keys for the client and agent.  The client
 * signing key represents the Account for the client on the agent
 */
export class Controller {
    private bran: string;
    public stem: string;
    public tier: Tier;
    public ridx: number;
    public salter: any;
    public signer: any;
    private nsigner: any;
    public serder: Serder;
    private keys: string[];
    public ndigs: string[];

    constructor(
        bran: string,
        tier: Tier,
        ridx: number = 0,
        state: any | null = null
    ) {
        this.bran = MtrDex.Salt_128 + 'A' + bran.substring(0, 21); // qb64 salt for seed
        this.stem = 'signify:controller';
        this.tier = tier;
        this.ridx = ridx;

        this.salter = new Salter({ qb64: this.bran, tier: this.tier });

        let creator = new SaltyCreator(this.salter.qb64, this.tier, this.stem);

        this.signer = creator
            .create(
                undefined,
                1,
                MtrDex.Ed25519_Seed,
                true,
                0,
                this.ridx,
                0,
                false
            )
            .signers.pop();
        this.nsigner = creator
            .create(
                undefined,
                1,
                MtrDex.Ed25519_Seed,
                true,
                0,
                this.ridx + 1,
                0,
                false
            )
            .signers.pop();
        this.keys = [this.signer.verfer.qb64];
        this.ndigs = [
            new Diger({ code: MtrDex.Blake3_256 }, this.nsigner.verfer.qb64b)
                .qb64,
        ];

        if (state == null || state['ee']['s'] == 0) {
            this.serder = incept({
                keys: this.keys,
                isith: '1',
                nsith: '1',
                ndigs: this.ndigs,
                code: MtrDex.Blake3_256,
                toad: '0',
                wits: [],
            });
        } else {
            this.serder = new Serder(state['ee']);
        }
    }

    approveDelegation(_agent: Agent) {
        let seqner = new Seqner({ sn: _agent.sn });
        let anchor = { i: _agent.pre, s: seqner.snh, d: _agent.said };
        let sn = new CesrNumber({}, undefined, this.serder.ked['s']).num + 1;
        this.serder = interact({
            pre: this.serder.pre,
            dig: this.serder.ked['d'],
            sn: sn,
            data: [anchor],
            version: Versionage,
            kind: Serials.JSON,
        });
        return [this.signer.sign(this.serder.raw, 0).qb64];
    }

    get pre(): string {
        return this.serder.pre;
    }

    get event() {
        let siger = this.signer.sign(this.serder.raw, 0);
        return [this.serder, siger];
    }

    get verfers(): [] {
        return this.signer.verfer();
    }

    derive(state: any) {
        if (state != undefined && state['ee']['s'] === '0') {
            return incept({
                keys: this.keys,
                isith: '1',
                nsith: '1',
                ndigs: this.ndigs,
                code: MtrDex.Blake3_256,
                toad: '0',
                wits: [],
            });
        } else {
            return new Serder({ ked: state.controller['ee'] });
        }
    }

    rotate(bran: string, aids: Array<any>) {
        let nbran = MtrDex.Salt_128 + 'A' + bran.substring(0, 21); // qb64 salt for seed
        let nsalter = new Salter({ qb64: nbran, tier: this.tier });
        let nsigner = this.salter.signer(undefined, false);

        let creator = new SaltyCreator(this.salter.qb64, this.tier, this.stem);
        let signer = creator
            .create(
                undefined,
                1,
                MtrDex.Ed25519_Seed,
                true,
                0,
                this.ridx + 1,
                0,
                false
            )
            .signers.pop();

        let ncreator = new SaltyCreator(nsalter.qb64, this.tier, this.stem);
        this.signer = ncreator
            .create(
                undefined,
                1,
                MtrDex.Ed25519_Seed,
                true,
                0,
                this.ridx,
                0,
                false
            )
            .signers.pop();
        this.nsigner = ncreator
            .create(
                undefined,
                1,
                MtrDex.Ed25519_Seed,
                true,
                0,
                this.ridx + 1,
                0,
                false
            )
            .signers.pop();

        this.keys = [this.signer.verfer.qb64, signer?.verfer.qb64];
        this.ndigs = [new Diger({}, this.nsigner.verfer.qb64b).qb64];

        let rot = rotate({
            pre: this.pre,
            keys: this.keys,
            dig: this.serder.ked['d'],
            isith: ['1', '0'],
            nsith: '1',
            ndigs: this.ndigs,
        });

        let sigs = [
            signer?.sign(b(rot.raw), 1, false, 0).qb64,
            this.signer.sign(rot.raw, 0).qb64,
        ];
        let encrypter = new Encrypter({}, b(nsigner.verfer.qb64));
        let decrypter = new Decrypter({}, nsigner.qb64b);
        let sxlt = encrypter.encrypt(b(this.bran)).qb64;

        let keys: Record<any, any> = {};

        for (let aid of aids) {
            let pre: string = aid['prefix'] as string;
            if ('salty' in aid) {
                console.log('salty aid to rotate');
                console.log(aid);
                let salty: any = aid['salty'];
                let cipher = new Cipher({ qb64: salty['sxlt'] });
                let dnxt = decrypter.decrypt(null, cipher).qb64;

                // Now we have the AID salt, use it to verify against the current public keys
                let acreator = new SaltyCreator(
                    dnxt,
                    salty['tier'],
                    salty['stem']
                );
                let signers = acreator.create(
                    salty['icodes'],
                    undefined,
                    MtrDex.Ed25519_Seed,
                    salty['transferable'],
                    salty['pidx'],
                    0,
                    salty['kidx'],
                    false
                );
                let _signers = [];
                for (let signer of signers.signers) {
                    _signers.push(signer.verfer.qb64);
                }
                let pubs = aid['state']['k'];

                if (pubs.join(',') != _signers.join(',')) {
                    throw new Error('Invalid Salty AID');
                }

                let asxlt = encrypter.encrypt(b(dnxt)).qb64;
                keys[pre] = {
                    sxlt: asxlt,
                };
            } else if ('randy' in aid) {
                let randy = aid['randy'];
                let prxs = randy['prxs'];
                let nxts = randy['nxts'];

                let nprxs = [];
                let signers = [];
                for (let prx of prxs) {
                    let cipher = new Cipher({ qb64: prx });
                    let dsigner = decrypter.decrypt(null, cipher, true);
                    signers.push(dsigner);
                    nprxs.push(encrypter.encrypt(b(dsigner.qb64)).qb64);
                }
                let pubs = aid['state']['k'];
                let _signers = [];
                for (let signer of signers) {
                    _signers.push(signer.verfer.qb64);
                }

                if (pubs.join(',') != _signers.join(',')) {
                    throw new Error(
                        `unable to rotate, validation of encrypted public keys ${pubs} failed`
                    );
                }

                let nnxts = [];
                for (let nxt of nxts) {
                    nnxts.push(this.recrypt(nxt, decrypter, encrypter));
                }

                keys[pre] = {
                    prxs: nprxs,
                    nxts: nnxts,
                };
            } else {
                throw new Error('invalid aid type ');
            }
        }

        let data = {
            rot: rot.ked,
            sigs: sigs,
            sxlt: sxlt,
            keys: keys,
        };
        return data;
    }

    recrypt(enc: string, decrypter: Decrypter, encrypter: Encrypter) {
        let cipher = new Cipher({ qb64: enc });
        let dnxt = decrypter.decrypt(null, cipher).qb64;
        return encrypter.encrypt(b(dnxt)).qb64;
    }
}
