import { assert, describe, expect, it } from 'vitest';
import libsodium from 'libsodium-wrappers-sumo';
import {
    AgentSignals,
    b,
    reply,
    Serials,
    SignifyClient,
    Siger,
    Signer,
} from '../../src/index.ts';

const TEST_SIGNAL_ROUTE = '/test/signals/request';

const signedEnvelope = ({
    route = TEST_SIGNAL_ROUTE,
    agent = 'agent-aid',
    signer,
}: {
    route?: string;
    agent?: string;
    signer: Signer;
}) => {
    const rpy = reply(
        route,
        { d: 'request-id', agent, aid: 'managed-aid' },
        undefined,
        undefined,
        Serials.JSON
    );
    const sig = signer.sign(b(rpy.raw), 0) as Siger;
    return {
        rpy: rpy.sad,
        sigs: [sig.qb64],
    };
};

describe('AgentSignals', () => {
    it('opens the generic agent SSE stream', async () => {
        const calls: unknown[][] = [];
        const client = {
            async fetch(...args: unknown[]) {
                calls.push(args);
                return new Response();
            },
        } as unknown as SignifyClient;

        await new AgentSignals(client).stream();

        assert.equal(calls[0]?.[0], '/signals/stream');
        assert.equal(calls[0]?.[1], 'GET');
        assert.equal(calls[0]?.[2], null);
        assert.equal(
            (calls[0]?.[3] as Headers).get('Accept'),
            'text/event-stream'
        );
    });

    it('verifies an agent-signed reply envelope for an expected route', async () => {
        await libsodium.ready;
        const signer = new Signer({});
        const client = {
            agent: { pre: 'agent-aid', verfer: signer.verfer },
        } as unknown as SignifyClient;

        const verified = new AgentSignals(client).verifyReplyEnvelope(
            signedEnvelope({ signer }),
            { route: TEST_SIGNAL_ROUTE }
        );

        assert.equal(verified, true);
    });

    it('rejects the wrong route', async () => {
        await libsodium.ready;
        const signer = new Signer({});
        const client = {
            agent: { pre: 'agent-aid', verfer: signer.verfer },
        } as unknown as SignifyClient;

        const verified = new AgentSignals(client).verifyReplyEnvelope(
            signedEnvelope({ route: '/wrong', signer }),
            { route: TEST_SIGNAL_ROUTE }
        );

        assert.equal(verified, false);
    });

    it('rejects the wrong agent payload', async () => {
        await libsodium.ready;
        const signer = new Signer({});
        const client = {
            agent: { pre: 'agent-aid', verfer: signer.verfer },
        } as unknown as SignifyClient;

        const verified = new AgentSignals(client).verifyReplyEnvelope(
            signedEnvelope({ agent: 'other-agent', signer })
        );

        assert.equal(verified, false);
    });

    it('rejects missing signatures', async () => {
        await libsodium.ready;
        const signer = new Signer({});
        const client = {
            agent: { pre: 'agent-aid', verfer: signer.verfer },
        } as unknown as SignifyClient;
        const envelope = signedEnvelope({ signer });

        const verified = new AgentSignals(client).verifyReplyEnvelope({
            ...envelope,
            sigs: [],
        });

        assert.equal(verified, false);
    });

    it('rejects bad signatures', async () => {
        await libsodium.ready;
        const agentSigner = new Signer({});
        const otherSigner = new Signer({});
        const client = {
            agent: { pre: 'agent-aid', verfer: agentSigner.verfer },
        } as unknown as SignifyClient;

        const verified = new AgentSignals(client).verifyReplyEnvelope(
            signedEnvelope({ signer: otherSigner })
        );

        assert.equal(verified, false);
    });

    it('requires a connected agent before verification', () => {
        const client = { agent: null } as unknown as SignifyClient;

        expect(() =>
            new AgentSignals(client).verifyReplyEnvelope({ rpy: {}, sigs: [] })
        ).toThrow('client must be connected before verification');
    });
});
