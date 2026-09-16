import { assert, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import signify, {
    CreateIdentiferArgs,
    HabState,
    Serder,
    SignifyClient,
} from 'signify-ts';
import {
    addEndRoleMultisig,
    createAIDMultisig,
} from './utils/multisig-utils.ts';
import { retry } from './utils/retry.ts';
import {
    assertNotifications,
    assertNoNotifications,
    assertOperations,
    createTimestamp,
    getOrCreateAID,
    getOrCreateClients,
    getOrCreateContact,
    Notification,
    waitAndMarkNotification,
    waitForNotifications,
    waitOperation,
} from './utils/test-util.ts';
import { resolveEnvironment } from './utils/resolve-env.ts';

const { witnessIds } = resolveEnvironment();

const QVI_SCHEMA_SAID = 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao';
const IPEX_APPLY_NOTIFICATION_ROUTE = '/exn/ipex/apply';

interface Member {
    client: SignifyClient;
    name: string;
    aid: HabState;
    oobi: string;
}

function uniqueName(prefix: string): string {
    return `${prefix}-${randomUUID().slice(0, 8)}`;
}

async function createMember(
    client: SignifyClient,
    name: string,
    aidArgs: CreateIdentiferArgs
): Promise<Member> {
    const aid = await getOrCreateAID(client, name, aidArgs);
    const oobi = (await client.oobis().get(name, 'agent')).oobis[0];

    return { client, name, aid, oobi };
}

async function exchangeOobis(memberA: Member, memberB: Member): Promise<void> {
    await Promise.all([
        getOrCreateContact(memberA.client, memberB.name, memberB.oobi),
        getOrCreateContact(memberB.client, memberA.name, memberA.oobi),
    ]);
}

async function waitForNotificationFromAnyClient(
    clients: SignifyClient[],
    route: string,
    said: string
): Promise<Notification> {
    return retry(async () => {
        for (const client of clients) {
            const [note] = await waitForNotifications(client, route, {
                said,
                minCount: 0,
            });

            if (note) {
                return note;
            }
        }

        throw new Error(`No unread ${route} notification for ${said}`);
    });
}

async function createTwoMemberGroup(
    memberA: Member,
    memberB: Member,
    groupName: string,
    aidArgs: CreateIdentiferArgs
): Promise<[HabState, HabState]> {
    const states = [memberA.aid.state, memberB.aid.state];
    const kargsA: CreateIdentiferArgs = {
        algo: signify.Algos.group,
        mhab: memberA.aid,
        isith: 2,
        nsith: 2,
        toad: aidArgs.toad,
        wits: aidArgs.wits,
        states,
        rstates: states,
    };
    const groupOpA = await createAIDMultisig(
        memberA.client,
        memberA.aid,
        [memberB.aid],
        groupName,
        kargsA,
        true
    );
    const kargsB = { ...kargsA, mhab: memberB.aid };
    const groupOpB = await createAIDMultisig(
        memberB.client,
        memberB.aid,
        [memberA.aid],
        groupName,
        kargsB
    );

    await Promise.all([
        waitOperation(memberA.client, groupOpA),
        waitOperation(memberB.client, groupOpB),
    ]);
    await waitAndMarkNotification(memberA.client, '/multisig/icp', {
        minCount: 0,
    });

    const groupA = await memberA.client.identifiers().get(groupName);
    const groupB = await memberB.client.identifiers().get(groupName);
    assert.equal(groupA.prefix, groupB.prefix);

    const timestamp = createTimestamp();
    const endRoleOpsA = await addEndRoleMultisig(
        memberA.client,
        groupName,
        memberA.aid,
        [memberB.aid],
        groupA,
        timestamp,
        true
    );
    const endRoleOpsB = await addEndRoleMultisig(
        memberB.client,
        groupName,
        memberB.aid,
        [memberA.aid],
        groupB,
        timestamp
    );

    await Promise.all([
        ...endRoleOpsA.map((op) => waitOperation(memberA.client, op)),
        ...endRoleOpsB.map((op) => waitOperation(memberB.client, op)),
    ]);
    await waitAndMarkNotification(memberA.client, '/multisig/rpy', {
        minCount: 0,
    });

    return Promise.all([
        memberA.client.identifiers().get(groupName),
        memberB.client.identifiers().get(groupName),
    ]);
}

async function resolveGroupOobi(
    member: Member,
    groupName: string,
    alias: string
): Promise<string> {
    const response = await member.client.oobis().get(groupName, 'agent');
    const oobi = response.oobis[0].split('/agent/')[0];
    await getOrCreateContact(member.client, alias, oobi);

    return oobi;
}

async function mirrorMultisigApplyToPeerMember(
    member: Member,
    group: HabState,
    apply: Serder,
    sigs: string[],
    recipient: Member
): Promise<void> {
    const seal = [
        'SealEvent',
        {
            i: group.prefix,
            s: group.state.ee.s,
            d: group.state.ee.d,
        },
    ];
    const sigers = sigs.map((sig) => new signify.Siger({ qb64: sig }));
    const ims = signify.d(signify.messagize(apply, sigers, seal));
    const atc = ims.substring(apply.size);

    await member.client
        .exchanges()
        .send(
            member.name,
            'multisig',
            member.aid,
            '/multisig/exn',
            { gid: group.prefix },
            { exn: [apply, atc] },
            [recipient.aid.prefix]
        );
}

test(
    'outbound single-sig IPEX apply does not notify sender',
    { timeout: 90000 },
    async () => {
        const [senderClient, recipientClient] = await getOrCreateClients(2);
        const aidArgs = {
            toad: witnessIds.length,
            wits: witnessIds,
        };
        const sender = await createMember(
            senderClient,
            uniqueName('sender'),
            aidArgs
        );
        const recipient = await createMember(
            recipientClient,
            uniqueName('recipient'),
            aidArgs
        );
        await exchangeOobis(sender, recipient);

        const [apply, sigs] = await senderClient.ipex().apply({
            senderName: sender.name,
            schemaSaid: QVI_SCHEMA_SAID,
            attributes: { LEI: '5493001KJTIIGC8Y1R17' },
            recipient: recipient.aid.prefix,
            datetime: createTimestamp(),
        });
        const op = await senderClient
            .ipex()
            .submitApply(sender.name, apply, sigs, [recipient.aid.prefix]);
        await waitOperation(senderClient, op);

        const [recipientNote] = await waitForNotifications(
            recipientClient,
            IPEX_APPLY_NOTIFICATION_ROUTE,
            { said: apply.said }
        );

        assert.equal(recipientNote.a.d, apply.said);
        await assertNoNotifications(
            senderClient,
            IPEX_APPLY_NOTIFICATION_ROUTE,
            {
                said: apply.said,
            }
        );

        await waitAndMarkNotification(
            recipientClient,
            IPEX_APPLY_NOTIFICATION_ROUTE,
            { said: apply.said }
        );
        await assertOperations(senderClient, recipientClient);
        await assertNotifications(senderClient, recipientClient);
    }
);

test(
    'outbound multisig IPEX apply does not notify sender members',
    { timeout: 180000 },
    async () => {
        const [
            senderClientA,
            senderClientB,
            recipientClientA,
            recipientClientB,
        ] = await getOrCreateClients(4);
        const aidArgs = {
            toad: witnessIds.length,
            wits: witnessIds,
        };

        const senderA = await createMember(
            senderClientA,
            uniqueName('sender-a'),
            aidArgs
        );
        const senderB = await createMember(
            senderClientB,
            uniqueName('sender-b'),
            aidArgs
        );
        const recipientA = await createMember(
            recipientClientA,
            uniqueName('recipient-a'),
            aidArgs
        );
        const recipientB = await createMember(
            recipientClientB,
            uniqueName('recipient-b'),
            aidArgs
        );

        await Promise.all([
            exchangeOobis(senderA, senderB),
            exchangeOobis(recipientA, recipientB),
        ]);

        const senderGroupName = uniqueName('sender-group');
        const recipientGroupName = uniqueName('recipient-group');
        const [senderGroupA, senderGroupB] = await createTwoMemberGroup(
            senderA,
            senderB,
            senderGroupName,
            aidArgs
        );
        const [recipientGroupA, recipientGroupB] = await createTwoMemberGroup(
            recipientA,
            recipientB,
            recipientGroupName,
            aidArgs
        );
        assert.equal(senderGroupA.prefix, senderGroupB.prefix);
        assert.equal(recipientGroupA.prefix, recipientGroupB.prefix);

        const [senderGroupOobi, recipientGroupOobi] = await Promise.all([
            resolveGroupOobi(senderA, senderGroupName, senderGroupName),
            resolveGroupOobi(
                recipientA,
                recipientGroupName,
                recipientGroupName
            ),
        ]);
        await Promise.all([
            getOrCreateContact(
                senderA.client,
                recipientGroupName,
                recipientGroupOobi
            ),
            getOrCreateContact(
                senderB.client,
                recipientGroupName,
                recipientGroupOobi
            ),
            getOrCreateContact(
                recipientA.client,
                senderGroupName,
                senderGroupOobi
            ),
            getOrCreateContact(
                recipientB.client,
                senderGroupName,
                senderGroupOobi
            ),
        ]);

        const timestamp = createTimestamp();
        const [applyA, sigsA] = await senderA.client.ipex().apply({
            senderName: senderGroupName,
            schemaSaid: QVI_SCHEMA_SAID,
            attributes: { LEI: '5493001KJTIIGC8Y1R17' },
            recipient: recipientGroupA.prefix,
            datetime: timestamp,
        });
        const opA = await senderA.client
            .ipex()
            .submitApply(senderGroupName, applyA, sigsA, [
                recipientGroupA.prefix,
            ]);
        await mirrorMultisigApplyToPeerMember(
            senderA,
            senderGroupA,
            applyA,
            sigsA,
            senderB
        );

        await waitAndMarkNotification(senderB.client, '/multisig/exn');
        const [applyB, sigsB] = await senderB.client.ipex().apply({
            senderName: senderGroupName,
            schemaSaid: QVI_SCHEMA_SAID,
            attributes: { LEI: '5493001KJTIIGC8Y1R17' },
            recipient: recipientGroupB.prefix,
            datetime: timestamp,
        });
        const opB = await senderB.client
            .ipex()
            .submitApply(senderGroupName, applyB, sigsB, [
                recipientGroupB.prefix,
            ]);
        await mirrorMultisigApplyToPeerMember(
            senderB,
            senderGroupB,
            applyB,
            sigsB,
            senderA
        );

        await Promise.all([
            waitOperation(senderA.client, opA),
            waitOperation(senderB.client, opB),
        ]);
        await waitAndMarkNotification(senderA.client, '/multisig/exn', {
            minCount: 0,
        });

        const recipientNote = await waitForNotificationFromAnyClient(
            [recipientA.client, recipientB.client],
            IPEX_APPLY_NOTIFICATION_ROUTE,
            applyA.said
        );

        assert.equal(applyB.said, applyA.said);
        assert.equal(recipientNote.a.d, applyA.said);
        await Promise.all([
            assertNoNotifications(
                senderA.client,
                IPEX_APPLY_NOTIFICATION_ROUTE,
                {
                    said: applyA.said,
                }
            ),
            assertNoNotifications(
                senderB.client,
                IPEX_APPLY_NOTIFICATION_ROUTE,
                {
                    said: applyA.said,
                }
            ),
        ]);

        await Promise.all([
            waitAndMarkNotification(
                recipientA.client,
                IPEX_APPLY_NOTIFICATION_ROUTE,
                { said: applyA.said, minCount: 0 }
            ),
            waitAndMarkNotification(
                recipientB.client,
                IPEX_APPLY_NOTIFICATION_ROUTE,
                { said: applyA.said, minCount: 0 }
            ),
        ]);
        await assertOperations(
            senderA.client,
            senderB.client,
            recipientA.client,
            recipientB.client
        );
        await assertNotifications(
            senderA.client,
            senderB.client,
            recipientA.client,
            recipientB.client
        );
    }
);
