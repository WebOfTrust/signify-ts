import { strict as assert } from "assert"
import signify, { Serder } from "signify-ts"

const url = "http://127.0.0.1:3901"
const boot_url = "http://127.0.0.1:3903"


// These witnesses should be running in the background with `kli witness demo`
const wanWitAID = "BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha"
const wilWitAID = "BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM"
const wesWitAID = "BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX"
const opWaitMs = 250 // milliseconds

const member1AIDName = 'member1'
const member2AIDName = 'member2'
const member3AIDName = 'member3'
const agentEndRoleName = "agent"

async function issueCredentialToMultisigAID() {
    await signify.ready()
    // Boot three clients
    let {client1, client2, client3} = await createMultisigClients()
    let {aid1, aid2, aid3} = await createMultisigAIDs({client1, client2, client3})

    await exchangeOOBIsMultisigAIDs({client1, client2, client3})

    // await performChallengeResponses({client1, client2, client3, aid1, aid2, aid3})

    await createMultisigIdentifier({
        client1, client2, client3,
        aid1, aid2, aid3
    })

    // await performMultisigInteraction({client1, client2, client3, aid1, aid2, aid3})

    // Multisig Rotation
    // let {aid1State, aid2State, aid3State} = await rotateIndividualAIDsOutOfBand({
    //     client1, client2, client3,
    //     aid1, aid2, aid3
    // })
    // await performMultisigRotation({
    //     client1, client2, client3,
    //     aid1, aid2, aid3,
    //     aid1State, aid2State, aid3State
    // })

    let {registryRegk} = await createMultisigRegistry({client1, client2, client3, aid1, aid2, aid3})


    await issueCredentialWithMultisigAID({client1, client2, client3, aid1, aid2, aid3, registryRegk})


}

async function createMultisigClients() {
    const bran1 = signify.randomPasscode()
    const bran2 = signify.randomPasscode()
    const bran3 = signify.randomPasscode()
    const client1 = new signify.SignifyClient(url, bran1, signify.Tier.low, boot_url);
    const client2 = new signify.SignifyClient(url, bran2, signify.Tier.low, boot_url);
    const client3 = new signify.SignifyClient(url, bran3, signify.Tier.low, boot_url);
    await client1.boot()
    await client2.boot()
    await client3.boot()
    await client1.connect()
    await client2.connect()
    await client3.connect()
    return {client1, client2, client3}
}


async function createMultisigAIDs({client1, client2, client3}) {
    const state1 = await client1.state()
    const state2 = await client2.state()
    const state3 = await client3.state()
    console.log("Client 1 connected. Client AID:", state1.controller.state.i, "Agent AID: ", state1.agent.i)
    console.log("Client 2 connected. Client AID:", state2.controller.state.i, "Agent AID: ", state2.agent.i)
    console.log("Client 3 connected. Client AID:", state3.controller.state.i, "Agent AID: ", state3.agent.i)

    // Create three identifiers, one for each client
    let icpResult1 = client1.identifiers().create(member1AIDName, {
        toad: 3,
        wits: [wanWitAID, wilWitAID, wesWitAID]
    })
    let op1 = await icpResult1.op()
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    let aid1 = await client1.identifiers().get(member1AIDName)
    await client1.identifiers().addEndRole(member1AIDName, agentEndRoleName, client1!.agent!.pre)
    console.log("Member1's AID:", aid1.prefix)

    let icpResult2 = client2.identifiers().create(member2AIDName, {
        toad: 3,
        wits: [wanWitAID, wilWitAID, wesWitAID]
    })
    let op2 = await icpResult2.op()
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    let aid2 = await client2.identifiers().get(member2AIDName)
    await client2.identifiers().addEndRole(member2AIDName, agentEndRoleName, client2!.agent!.pre)
    console.log("Member2's AID:", aid2.prefix)

    let icpResult3 = client3.identifiers().create(member3AIDName, {
        toad: 3,
        wits: [wanWitAID, wilWitAID, wesWitAID]
    })
    let op3 = await icpResult3.op()
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    let aid3 = await client3.identifiers().get(member3AIDName)
    await client3.identifiers().addEndRole(member3AIDName, agentEndRoleName, client3!.agent!.pre)
    console.log("Member3's AID:", aid3.prefix)
    return {aid1, aid2, aid3}
}

async function exchangeOOBIsMultisigAIDs({client1, client2, client3}) {
    // Exchange OOBIs
    console.log("Resolving Agent OOBIs for each member")
    let oobi1 = await client1.oobis().get(member1AIDName, agentEndRoleName)
    let oobi2 = await client2.oobis().get(member2AIDName, agentEndRoleName)
    let oobi3 = await client3.oobis().get(member3AIDName, agentEndRoleName)

    let op1 = await client1.oobis().resolve(oobi2.oobis[0], member2AIDName)
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    op1 = await client1.oobis().resolve(oobi3.oobis[0], member3AIDName)
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Member1 resolved 2 OOBIs for members 2 and 3")

    let op2 = await client2.oobis().resolve(oobi1.oobis[0], member1AIDName)
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    op2 = await client2.oobis().resolve(oobi3.oobis[0], member3AIDName)
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Member2 resolved 2 OOBIs for members 1 and 3")

    let op3 = await client3.oobis().resolve(oobi1.oobis[0], member1AIDName)
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    op3 = await client3.oobis().resolve(oobi2.oobis[0], member2AIDName)
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Member3 resolved 2 OOBIs for members 1 and 2")
}

async function performChallengeResponses({client1, client2, client3, aid1, aid2, aid3}) {
    //
    // Challenge Phrase and Response
    //
    // First member challenge the other members with a random list of words
    // List of words should be passed to the other members out of band
    // The other members should do the same challenge/response flow, not shown here for brevity
    const words = (await client1.challenges().generate(128)).words
    console.log("Member1 generated challenge words:", words)

    await client2.challenges().respond(member2AIDName, aid1.prefix, words)
    console.log("Member2 responded challenge with signed words")

    await client3.challenges().respond(member3AIDName, aid1.prefix, words)
    console.log("Member3 responded challenge with signed words")

    let op1 = await client1.challenges().verify(member1AIDName, aid2.prefix, words)
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Member1 verified challenge response from member2")
    let exnwords = new Serder(op1.response.exn)
    op1 = await client1.challenges().responded(member1AIDName, aid2.prefix, exnwords.ked.d)
    console.log("Member1 marked member 2's challenge response as accepted")

    op1 = await client1.challenges().verify(member1AIDName, aid3.prefix, words)
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Member1 verified challenge response from member3")
    exnwords = new Serder(op1.response.exn)
    op1 = await client1.challenges().responded(member1AIDName, aid3.prefix, exnwords.ked.d)
    console.log("Member1 marked member 3's challenge response as accepted")
}

async function createMultisigIdentifier({client1, client2, client3, aid1, aid2, aid3}) {
    //
    // multisig identifier
    //
    // First member start the creation of a multisig identifier
    let rstates = [aid1["state"], aid2["state"], aid3["state"]]
    let states = rstates
    let icpResult1 = client1.identifiers().create("multisig", {
        algo: signify.Algos.group,
        mhab: aid1,
        isith: 3,
        nsith: 3,
        toad: 3,
        wits: [wanWitAID, wilWitAID, wesWitAID],
        states: states,
        rstates: rstates
    })
    let op1 = await icpResult1.op()
    let serder = icpResult1.serder

    let sigs = icpResult1.sigs
    let sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    let ims = signify.d(signify.messagize(serder, sigers))
    let atc = ims.substring(serder.size)
    let embeds = {
        icp: [serder, atc],
    }

    let smids = states.map((state) => state['i'])
    let recp = [aid2["state"], aid3["state"]].map((state) => state['i'])

    await client1.exchanges().send("member1", "multisig", aid1, "/multisig/icp",
        {'gid': serder.pre, smids: smids, rmids: smids}, embeds, recp)
    console.log("Member1 initiated multisig, waiting for others to join...")

    // Second member check notifications and join the multisig
    let msgSaid = ""
    while (msgSaid == "") {
        let notifications = await client2.notifications().list()
        for (let notif of notifications.notes) {
            if (notif.a.r == '/multisig/icp') {
                msgSaid = notif.a.d
                await client2.notifications().mark(notif.i)
                console.log("Member2 received exchange message to join multisig")
            }
        }
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    let res = await client2.groups().getRequest(msgSaid)
    let exn = res[0].exn
    let icp = exn.e.icp

    let icpResult2 = client2.identifiers().create("multisig", {
        algo: signify.Algos.group,
        mhab: aid2,
        isith: icp.kt,
        nsith: icp.nt,
        toad: parseInt(icp.bt),
        wits: icp.b,
        states: states,
        rstates: rstates
    })
    let op2 = await icpResult2.op()
    serder = icpResult2.serder
    sigs = icpResult2.sigs
    sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    ims = signify.d(signify.messagize(serder, sigers))
    atc = ims.substring(serder.size)
    embeds = {
        icp: [serder, atc],
    }

    smids = exn.a.smids
    recp = [aid1["state"], aid3["state"]].map((state) => state['i'])

    await client2.exchanges().send("member2", "multisig", aid2, "/multisig/icp",
        {'gid': serder.pre, smids: smids, rmids: smids}, embeds, recp)
    console.log("Member2 joined multisig, waiting for others...")


    // Third member check notifications and join the multisig
    msgSaid = ""
    while (msgSaid == "") {
        let notifications = await client3.notifications().list()
        for (let notif of notifications.notes) {
            if (notif.a.r == '/multisig/icp') {
                msgSaid = notif.a.d
                await client3.notifications().mark(notif.i)
                console.log("Member3 received exchange message to join multisig")
            }
        }
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    res = await client3.groups().getRequest(msgSaid)
    exn = res[0].exn
    icp = exn.e.icp
    let icpResult3 = client3.identifiers().create("multisig", {
        algo: signify.Algos.group,
        mhab: aid3,
        isith: icp.kt,
        nsith: icp.nt,
        toad: parseInt(icp.bt),
        wits: icp.b,
        states: states,
        rstates: rstates
    })
    let op3 = await icpResult3.op()
    serder = icpResult3.serder
    sigs = icpResult3.sigs
    sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    ims = signify.d(signify.messagize(serder, sigers))
    atc = ims.substring(serder.size)
    embeds = {
        icp: [serder, atc],
    }

    smids = exn.a.smids
    recp = [aid1["state"], aid2["state"]].map((state) => state['i'])

    await client3.exchanges().send("member3", "multisig", aid3, "/multisig/icp",
        {'gid': serder.pre, smids: smids, rmids: smids}, embeds, recp)
    console.log("Member3 joined, multisig waiting for others...")

    // Check for completion
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Multisig created!")

    const identifiers1 = await client1.identifiers().list()
    assert.equal(identifiers1.aids.length, 2)
    assert.equal(identifiers1.aids[0].name, "member1")
    assert.equal(identifiers1.aids[1].name, "multisig")

    const identifiers2 = await client2.identifiers().list()
    assert.equal(identifiers2.aids.length, 2)
    assert.equal(identifiers2.aids[0].name, "member2")
    assert.equal(identifiers2.aids[1].name, "multisig")

    const identifiers3 = await client3.identifiers().list()
    assert.equal(identifiers3.aids.length, 2)
    assert.equal(identifiers3.aids[0].name, "member3")
    assert.equal(identifiers3.aids[1].name, "multisig")

    console.log("Client 1 managed AIDs:\n", identifiers1.aids[0].name, `[${identifiers1.aids[0].prefix}]\n`,
        identifiers1.aids[1].name, `[${identifiers1.aids[1].prefix}]`)
    console.log("Client 2 managed AIDs:\n", identifiers2.aids[0].name, `[${identifiers2.aids[0].prefix}]\n`,
        identifiers2.aids[1].name, `[${identifiers2.aids[1].prefix}]`)
    console.log("Client 3 managed AIDs:\n", identifiers3.aids[0].name, `[${identifiers3.aids[0].prefix}]\n`,
        identifiers3.aids[1].name, `[${identifiers3.aids[1].prefix}]`)
    return {identifiers1, identifiers2, identifiers3}
}

async function performMultisigInteraction({client1, client2, client3, aid1, aid2, aid3}) {
    // MultiSig Interaction

    let rstates = [aid1["state"], aid2["state"], aid3["state"]]
    let states = rstates

    // Member1 initiates an interaction event
    let data = {"i": "EE77q3_zWb5ojgJr-R1vzsL5yiL4Nzm-bfSOQzQl02dy"}
    let eventResponse1 = await client1.identifiers().interact("multisig", data)
    let op1 = await eventResponse1.op()
    let serder = eventResponse1.serder
    let sigs = eventResponse1.sigs
    let sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    let ims = signify.d(signify.messagize(serder, sigers))
    let atc = ims.substring(serder.size)
    let xembeds = {
        ixn: [serder, atc],
    }

    let smids = states.map((state) => state['i'])
    let recp = [aid2["state"], aid3["state"]].map((state) => state['i'])

    await client1.exchanges().send("member1", "multisig", aid1, "/multisig/ixn",
        {'gid': serder.pre, smids: smids, rmids: smids}, xembeds, recp)
    console.log("Member1 initiates interaction event, waiting for others to join...")

    // Member2 check for notifications and join the interaction event
    let msgSaid = ""
    while (msgSaid == "") {
        let notifications = await client2.notifications().list()
        for (let notif of notifications.notes) {
            if (notif.a.r == '/multisig/ixn') {
                msgSaid = notif.a.d
                await client2.notifications().mark(notif.i)
                console.log("Member2 received exchange message to join the interaction event")
            }
        }
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    let res = await client2.groups().getRequest(msgSaid)
    let exn = res[0].exn
    let ixn = exn.e.ixn
    data = ixn.a

    let icpResult2 = await client2.identifiers().interact("multisig", data)
    let op2 = await icpResult2.op()
    serder = icpResult2.serder
    sigs = icpResult2.sigs
    sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    ims = signify.d(signify.messagize(serder, sigers))
    atc = ims.substring(serder.size)
    xembeds = {
        ixn: [serder, atc],
    }

    smids = exn.a.smids
    recp = [aid1["state"], aid3["state"]].map((state) => state['i'])

    await client2.exchanges().send("member2", "multisig", aid2, "/multisig/ixn",
        {'gid': serder.pre, smids: smids, rmids: smids}, xembeds, recp)
    console.log("Member2 joins interaction event, waiting for others...")

    // Member3 check for notifications and join the interaction event
    msgSaid = ""
    while (msgSaid == "") {
        let notifications = await client3.notifications().list()
        for (let notif of notifications.notes) {
            if (notif.a.r == '/multisig/ixn') {
                msgSaid = notif.a.d
                await client3.notifications().mark(notif.i)
                console.log("Member3 received exchange message to join the interaction event")
            }
        }
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    res = await client3.groups().getRequest(msgSaid)
    exn = res[0].exn
    ixn = exn.e.ixn
    data = ixn.a

    let icpResult3 = await client3.identifiers().interact("multisig", data)
    let op3 = await icpResult3.op()
    serder = icpResult3.serder
    sigs = icpResult3.sigs
    sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    ims = signify.d(signify.messagize(serder, sigers))
    atc = ims.substring(serder.size)
    xembeds = {
        ixn: [serder, atc],
    }

    smids = exn.a.smids
    recp = [aid1["state"], aid2["state"]].map((state) => state['i'])

    await client3.exchanges().send("member3", "multisig", aid3, "/multisig/ixn",
        {'gid': serder.pre, smids: smids, rmids: smids}, xembeds, recp)
    console.log("Member3 joins interaction event, waiting for others...")

    // Check for completion
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Multisig interaction completed!")
}

async function rotateIndividualAIDsOutOfBand({client1, client2, client3, aid1, aid2, aid3}) {
    // Members agree out of band to rotate keys
    console.log("Members agree out of band to rotate keys")
    let icpResult1 = await client1.identifiers().rotate('member1')
    let op1 = await icpResult1.op()
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    aid1 = await client1.identifiers().get("member1")

    console.log("Member1 rotated keys")
    let icpResult2 = await client2.identifiers().rotate('member2')
    let op2 = await icpResult2.op()
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    aid2 = await client2.identifiers().get("member2")
    console.log("Member2 rotated keys")
    let icpResult3 = await client3.identifiers().rotate('member3')
    let op3 = await icpResult3.op()
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    aid3 = await client3.identifiers().get("member3")
    console.log("Member3 rotated keys")

    // Update new key states
    op1 = await client1.keyStates().query(aid2.prefix, 1)
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    let aid2State = op1["response"]
    op1 = await client1.keyStates().query(aid3.prefix, 1)
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    let aid3State = op1["response"]

    op2 = await client2.keyStates().query(aid3.prefix, 1)
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    op2 = await client2.keyStates().query(aid1.prefix, 1)
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    let aid1State = op2["response"]

    op3 = await client3.keyStates().query(aid1.prefix, 1)
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    op3 = await client3.keyStates().query(aid2.prefix, 1)
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    return {aid1State, aid2State, aid3State}
}

async function performMultisigRotation({client1, client2, client3, aid1, aid2, aid3, aid1State, aid2State, aid3State}) {
    let rstates = [aid1State, aid2State, aid3State]
    let states = rstates

    // Multisig Rotation

    // Member1 initiates a rotation event
    let eventResponse1 = await client1.identifiers().rotate("multisig", {states: states, rstates: rstates})
    let op1 = await eventResponse1.op()
    let serder = eventResponse1.serder
    let sigs = eventResponse1.sigs
    let sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    let ims = signify.d(signify.messagize(serder, sigers))
    let atc = ims.substring(serder.size)
    let rembeds = {
        rot: [serder, atc],
    }

    let smids = states.map((state) => state['i'])
    let recp = [aid2State, aid3State].map((state) => state['i'])

    await client1.exchanges().send("member1", "multisig", aid1, "/multisig/rot",
        {'gid': serder.pre, smids: smids, rmids: smids}, rembeds, recp)
    console.log("Member1 initiates rotation event, waiting for others to join...")

    // Member2 check for notifications and join the rotation event
    let msgSaid = ""
    while (msgSaid == "") {
        let notifications = await client2.notifications().list()
        for (let notif of notifications.notes) {
            if (notif.a.r == '/multisig/rot') {
                msgSaid = notif.a.d
                await client2.notifications().mark(notif.i)
                console.log("Member2 received exchange message to join the rotation event")
            }
        }
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    // TODO how do we remove this arbitrary wait of five seconds? What is being waited for? the notifications
    //   to be sent or received? Is there an op that can be waited on for client2 here?
    await new Promise(resolve => setTimeout(resolve, 5000));
    let res = await client2.groups().getRequest(msgSaid)
    let exn = res[0].exn

    let icpResult2 = await client2.identifiers().rotate("multisig", {states: states, rstates: rstates})
    let op2 = await icpResult2.op()
    serder = icpResult2.serder
    sigs = icpResult2.sigs
    sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    ims = signify.d(signify.messagize(serder, sigers))
    atc = ims.substring(serder.size)
    rembeds = {
        rot: [serder, atc],
    }

    smids = exn.a.smids
    recp = [aid1State, aid3State].map((state) => state['i'])

    await client2.exchanges().send("member2", "multisig", aid2, "/multisig/ixn",
        {'gid': serder.pre, smids: smids, rmids: smids}, rembeds, recp)
    console.log("Member2 joins rotation event, waiting for others...")

    // Member3 check for notifications and join the rotation event
    msgSaid = ""
    while (msgSaid == "") {
        let notifications = await client3.notifications().list(1)
        for (let notif of notifications.notes) {
            if (notif.a.r == '/multisig/rot') {
                msgSaid = notif.a.d
                await client3.notifications().mark(notif.i)
                console.log("Member3 received exchange message to join the rotation event")
            }
        }
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    res = await client3.groups().getRequest(msgSaid)
    exn = res[0].exn

    let icpResult3 = await client3.identifiers().rotate("multisig", {states: states, rstates: rstates})
    let op3 = await icpResult3.op()
    serder = icpResult3.serder
    sigs = icpResult3.sigs
    sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    ims = signify.d(signify.messagize(serder, sigers))
    atc = ims.substring(serder.size)
    rembeds = {
        rot: [serder, atc],
    }

    smids = exn.a.smids
    recp = [aid1State, aid2State].map((state) => state['i'])

    await client3.exchanges().send("member3", "multisig", aid3, "/multisig/ixn",
        {'gid': serder.pre, smids: smids, rmids: smids}, rembeds, recp)
    console.log("Member3 joins rotation event, waiting for others...")

    // Check for completion
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Multisig rotation completed!")
}

async function createMultisigRegistry({client1, client2, client3, aid1, aid2, aid3}) {
    console.log("Starting multisig registry creation")
    const identifiers3 = await client3.identifiers().list()
    let multisig = identifiers3.aids[1].prefix

    let vcpRes1 = await client1.registries().create({
        name: "member1",
        registryName: "vLEI Registry",
        nonce: "AHSNDV3ABI6U8OIgKaj3aky91ZpNL54I5_7-qwtC6q2s"
    });
    let op1 = await vcpRes1.op();
    let serder = vcpRes1.regser
    let anc = vcpRes1.serder
    let sigs = vcpRes1.sigs

    let sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}));

    let ims = signify.d(signify.messagize(anc, sigers));
    let atc = ims.substring(anc.size);
    let regbeds = {
        vcp: [serder, ""],
        anc: [anc, atc]
    }

    let recp = [aid2["state"], aid3["state"]].map((state) => state['i'])
    let res = await client1.exchanges().send("member1", "registry", aid1, "/multisig/vcp",
        {gid: multisig, usage: "Issue vLEIs"}, regbeds, recp);

    console.log("Member1 initiated registry, waiting for others to join...")

    // Member2 check for notifications and join the create registry event
    let msgSaid = ""
    while (msgSaid == "") {
        let notifications = await client2.notifications().list()
        for (let notif of notifications.notes) {
            if (notif.a.r == '/multisig/vcp') {
                msgSaid = notif.a.d
                await client2.notifications().mark(notif.i)
                console.log("Member2 received exchange message to join the create registry event")
            }
        }
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    res = await client2.groups().getRequest(msgSaid)
    let exn = res[0].exn

    let vcpRes2 = await client2.registries().create({
        name: "member2",
        registryName: "vLEI Registry",
        nonce: "AHSNDV3ABI6U8OIgKaj3aky91ZpNL54I5_7-qwtC6q2s"
    });
    let op2 = await vcpRes2.op()
    serder = vcpRes2.regser
    anc = vcpRes2.serder
    sigs = vcpRes2.sigs

    sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    ims = signify.d(signify.messagize(anc, sigers));
    atc = ims.substring(anc.size);
    regbeds = {
        vcp: [serder, ""],
        anc: [anc, atc]
    }

    recp = [aid1["state"], aid3["state"]].map((state) => state['i'])
    await client2.exchanges().send("member2", "registry", aid2, "/multisig/vcp",
        {gid: multisig, usage: "Issue vLEIs"}, regbeds, recp);
    console.log("Member2 joins rotation event, waiting for others...")

    // Member3 check for notifications and join the create registry event
    msgSaid = ""
    while (msgSaid == "") {
        let notifications = await client3.notifications().list()
        for (let notif of notifications.notes) {
            if (notif.a.r == '/multisig/vcp') {
                msgSaid = notif.a.d
                await client3.notifications().mark(notif.i)
                console.log("Member3 received exchange message to join the create registry event")
            }
        }
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    res = await client3.groups().getRequest(msgSaid)
    exn = res[0].exn

    let vcpRes3 = await client3.registries().create({
        name: "member3",
        registryName: "vLEI Registry",
        nonce: "AHSNDV3ABI6U8OIgKaj3aky91ZpNL54I5_7-qwtC6q2s"
    });
    let op3 = await vcpRes3.op()
    serder = vcpRes2.regser
    anc = vcpRes2.serder
    sigs = vcpRes2.sigs

    sigers = sigs.map((sig: any) => new signify.Siger({qb64: sig}))

    ims = signify.d(signify.messagize(anc, sigers));
    atc = ims.substring(anc.size);
    regbeds = {
        vcp: [serder, ""],
        anc: [anc, atc]
    }

    recp = [aid1["state"], aid2["state"]].map((state) => state['i'])
    await client3.exchanges().send("member3", "multisig", aid3, "/multisig/vcp",
        {gid: multisig, usage: "Issue vLEIs"}, regbeds, recp);

    // Done
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }
    console.log("Multisig create registry completed!")
    return {registryRegk: serder.ked['d']}
}

async function issueCredentialWithMultisigAID({client1, client2, client3, aid1, aid2, aid3, registryRegk}) {
    console.log(`AID3's prefix ${aid3.prefix}`) // just to use the variable and eliminate type errors on compilation
    const identifiers3 = await client3.identifiers().list()
    let multisig = identifiers3.aids[1].prefix

    const schemaSAID = "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao"
    let schemaOobi = "http://127.0.0.1:7723/oobi/" + schemaSAID
    console.log("Resolving schema OOBIs")
    let op1 = await client1.oobis().resolve(schemaOobi, "schema")
    while (!op1["done"]) {
        op1 = await client1.operations().get(op1.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    let op2 = await client2.oobis().resolve(schemaOobi, "schema")
    while (!op2["done"]) {
        op2 = await client2.operations().get(op2.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }

    let op3 = await client3.oobis().resolve(schemaOobi, "schema")
    while (!op3["done"]) {
        op3 = await client3.operations().get(op3.name);
        await new Promise(resolve => setTimeout(resolve, opWaitMs));
    }


    const vcdata = {
        "LEI": "5493001KJTIIGC8Y1R17"
    }


    let [cred, credIss, credIxn, redSigs, _credRes] = await client1.credentials().create(
        member1AIDName, registryRegk, vcdata, schemaSAID, aid2.prefix, undefined, undefined, false)

    let prefixer = new signify.Prefixer({qb64: credIss.pre})
    let seqner = new signify.Seqner({sn: credIss['n']})

    let sigers = redSigs.map((sig: any) => new signify.Siger({qb64: sig}))


    let acdc = signify.seralize(cred.ked, prefixer, seqner, credIss.ked)
    let iss = client1.credentials().serialize(credIss, credIxn)

    let ims = signify.d(signify.messagize(credIxn, sigers));
    let atc = ims.substring(credIxn.size);

    let vembeds = {
        acdc: acdc,
        iss: iss,
        anc: atc
    }
    let recp = [aid1["state"], aid2["state"]].map((state) => state['i'])
    await client1.exchanges().send(member1AIDName, "credential", aid1, "/multisig/iss",
        {gid: multisig, usage: "Issue vLEIs"}, vembeds, recp);
}

await issueCredentialToMultisigAID()
