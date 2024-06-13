import signify, { Algos, Siger, SignifyClient, d, messagize } from 'signify-ts';
import { waitForNotifications, waitOperation } from './test-util';
import { HabState } from '../../../src/keri/core/state';
import assert from 'assert';

export interface AcceptMultisigInceptArgs {
    groupName: string;
    localMemberName: string;
    msgSaid: string;
}

export async function acceptMultisigIncept(
    client2: SignifyClient,
    { groupName, localMemberName, msgSaid }: AcceptMultisigInceptArgs
) {
    const memberHab = await client2.identifiers().get(localMemberName);

    const res = await client2.groups().getRequest(msgSaid);
    const exn = res[0].exn;
    const icp = exn.e.icp;
    const smids = exn.a.smids;
    const rmids = exn.a.rmids;
    const states = await getStates(client2, smids);
    const rstates = await getStates(client2, rmids);

    const icpResult2 = await client2.identifiers().create(groupName, {
        algo: Algos.group,
        mhab: memberHab,
        isith: icp.kt,
        nsith: icp.nt,
        toad: parseInt(icp.bt),
        wits: icp.b,
        states: states,
        rstates: rstates,
        delpre: icp.di,
    });
    const op2 = await icpResult2.op();
    const serder = icpResult2.serder;
    const sigs = icpResult2.sigs;
    const sigers = sigs.map((sig) => new Siger({ qb64: sig }));

    const ims = d(messagize(serder, sigers));
    const atc = ims.substring(serder.size);
    const embeds = {
        icp: [serder, atc],
    };

    const recipients = smids.filter((id: string) => memberHab.prefix !== id);

    client2
        .exchanges()
        .send(
            localMemberName,
            groupName,
            memberHab,
            '/multisig/icp',
            { gid: serder.pre, smids: smids, rmids: smids },
            embeds,
            recipients
        );

    return op2;
}

export async function addEndRoleMultisig(
    client: SignifyClient,
    groupName: string,
    aid: HabState,
    otherMembersAIDs: HabState[],
    multisigAID: HabState,
    timestamp: string,
    isInitiator: boolean = false
) {
    if (!isInitiator) await waitAndMarkNotification(client, '/multisig/rpy');

    const opList: any[] = [];
    const members = await client.identifiers().members(multisigAID.name);
    const signings = members['signing'];

    for (const signing of signings) {
        const eid = Object.keys(signing.ends.agent)[0];
        const endRoleResult = await client
            .identifiers()
            .addEndRole(multisigAID.name, 'agent', eid, timestamp);
        const op = await endRoleResult.op();
        opList.push(op);

        const rpy = endRoleResult.serder;
        const sigs = endRoleResult.sigs;
        const ghabState1 = multisigAID.state;
        const seal = [
            'SealEvent',
            {
                i: multisigAID.prefix,
                s: ghabState1['ee']['s'],
                d: ghabState1['ee']['d'],
            },
        ];
        const sigers = sigs.map(
            (sig: string) => new signify.Siger({ qb64: sig })
        );
        const roleims = signify.d(
            signify.messagize(rpy, sigers, seal, undefined, undefined, false)
        );
        const atc = roleims.substring(rpy.size);
        const roleembeds = {
            rpy: [rpy, atc],
        };
        const recp = otherMembersAIDs.map((aid) => aid.prefix);
        await client
            .exchanges()
            .send(
                aid.name,
                groupName,
                aid,
                '/multisig/rpy',
                { gid: multisigAID.prefix },
                roleembeds,
                recp
            );
    }

    return opList;
}
export interface StartMultisigInceptArgs {
    groupName: string;
    localMemberName: string;
    participants: string[];
    isith?: number | string | string[];
    nsith?: number | string | string[];
    toad?: number;
    wits?: string[];
    delpre?: string;
}

export async function startMultisigIncept(
    client: SignifyClient,
    {
        groupName,
        localMemberName,
        participants,
        ...args
    }: StartMultisigInceptArgs
) {
    const aid1 = await client.identifiers().get(localMemberName);
    const participantStates = await getStates(client, participants);
    const icpResult1 = await client.identifiers().create(groupName, {
        algo: Algos.group,
        mhab: aid1,
        isith: args.isith,
        nsith: args.nsith,
        toad: args.toad,
        wits: args.wits,
        delpre: args.delpre,
        states: participantStates,
        rstates: participantStates,
    });
    const op1 = await icpResult1.op();
    const serder = icpResult1.serder;

    const sigs = icpResult1.sigs;
    const sigers = sigs.map((sig) => new Siger({ qb64: sig }));
    const ims = d(messagize(serder, sigers));
    const atc = ims.substring(serder.size);
    const embeds = {
        icp: [serder, atc],
    };

    const smids = participantStates.map((state) => state['i']);

    await client
        .exchanges()
        .send(
            localMemberName,
            groupName,
            aid1,
            '/multisig/icp',
            { gid: serder.pre, smids: smids, rmids: smids },
            embeds,
            participants
        );
    return op1;
}

async function getStates(client: SignifyClient, prefixes: string[]) {
    const participantStates = await Promise.all(
        prefixes.map((p) => client.keyStates().get(p))
    );
    return participantStates.map((s) => s[0]);
}

export async function waitAndMarkNotification(
    client: SignifyClient,
    route: string
) {
    const notes = await waitForNotifications(client, route);

    await Promise.all(
        notes.map(async (note) => {
            await client.notifications().mark(note.i);
        })
    );

    return notes[notes.length - 1]?.a.d ?? '';
}

export async function delegateMultisig(
    client: SignifyClient,
    aid: HabState,
    otherMembersAIDs: HabState[],
    multisigAID: HabState,
    anchor: { i: string; s: string; d: string },
    isInitiator: boolean = false
) {
    if (!isInitiator) {
        const msgSaid = await waitAndMarkNotification(client, '/multisig/ixn');
        console.log(
            `${aid.name}(${aid.prefix}) received exchange message to join the interaction event`
        );
        const res = await client.groups().getRequest(msgSaid);
        const exn = res[0].exn;
        const ixn = exn.e.ixn;
        anchor = ixn.a;
    }

    // const {delResult, delOp} = await retry(async () => {
    const delResult = await client.delegations().approve(aid.name, anchor);
    
    console.log(`Delegator ${aid.name}(${aid.prefix}) approved delegation for ${multisigAID.name} with anchor ${JSON.stringify(anchor)}`);
    // return {delResult, delOp};
    // },RETRY_DEFAULTS);
    assert.equal(JSON.stringify(delResult.serder.ked.a[0]), JSON.stringify(anchor));
    // const ixnResult = await client
    //     .identifiers()
    //     .interact(multisigAID.name, anchor);
    // const op = await ixnResult.op();
    const serder = delResult.serder;
    const sigs = delResult.sigs;
    const sigers = sigs.map((sig) => new signify.Siger({ qb64: sig }));
    const ims = signify.d(signify.messagize(serder, sigers));
    const atc = ims.substring(serder.size);
    const xembeds = {
        ixn: [serder, atc],
    };
    const smids = [aid.prefix, ...otherMembersAIDs.map((aid) => aid.prefix)];
    const recp = otherMembersAIDs.map((aid) => aid.prefix);

    await client
        .exchanges()
        .send(
            aid.name,
            multisigAID.name,
            aid,
            '/multisig/ixn',
            { gid: serder.pre, smids: smids, rmids: smids },
            xembeds,
            recp
        );
    
    if (isInitiator) {
        console.log(
            `${aid.name}(${aid.prefix}) initiates interaction event, waiting for others to join...`
        );
    } else {
        console.log(
            `${aid.name}(${aid.prefix}) joins interaction event, waiting for others to join...`
        );
    }

    return delResult.op();
}