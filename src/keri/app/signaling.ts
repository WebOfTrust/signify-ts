import { SignifyClient } from './clienting.ts';
import { Serder } from '../core/serder.ts';
import { Siger } from '../core/siger.ts';

/**
 * KERIA agent-signed KERI reply envelope carried as SSE event data.
 *
 * The envelope format is generic. Topic modules decide which reply route and
 * payload fields they understand, but they should all reuse
 * `AgentSignals.verifyReplyEnvelope` before auto-approving edge-signed work.
 */
export interface SignedReplyEnvelope {
    rpy: Record<string, unknown>;
    sigs: string[];
}

/**
 * Optional constraints applied while verifying a signed reply envelope.
 */
export interface VerifyReplyEnvelopeOptions {
    /**
     * Expected KERI reply route, such as `/test/signals/request`.
     */
    route?: string;
}

/**
 * Generic signaling API for one connected KERIA agent.
 *
 * This class intentionally owns only live transport and server-authentication
 * checks. Topic-specific modules use it, but do not own it. SSE delivery is
 * transient, so topic modules must still provide durable
 * polling fallback endpoints for missed events and restarts.
 */
export class AgentSignals {
    client: SignifyClient;

    constructor(client: SignifyClient) {
        this.client = client;
    }

    /**
     * Open KERIA's authenticated generic agent SSE stream.
     *
     * Browser `EventSource` cannot attach Signify authentication headers, so
     * consumers should use this signed `fetch` response and parse SSE frames
     * from the returned body stream.
     */
    async stream(): Promise<Response> {
        const headers = new Headers({ Accept: 'text/event-stream' });
        return await this.client.fetch('/signals/stream', 'GET', null, headers);
    }

    /**
     * Verify one KERIA agent-signed KERI `rpy` envelope.
     *
     * Verification is route-agnostic by default. Pass `options.route` when a
     * caller is expecting a specific topic request. The payload must name the
     * connected KERIA agent in `rpy.a.agent`, and the first signature must verify
     * against the connected agent verifier.
     */
    verifyReplyEnvelope(
        envelope: SignedReplyEnvelope,
        options: VerifyReplyEnvelopeOptions = {}
    ): boolean {
        if (this.client.agent === null || this.client.agent.verfer === null) {
            throw new Error('client must be connected before verification');
        }

        const rpy = new Serder(envelope.rpy);
        if (options.route !== undefined && rpy.sad.r !== options.route) {
            return false;
        }
        if (rpy.sad.a?.agent !== this.client.agent.pre) {
            return false;
        }
        if (envelope.sigs.length === 0) {
            return false;
        }

        const siger = new Siger({ qb64: envelope.sigs[0] });
        return this.client.agent.verfer.verify(siger.raw, rpy.raw);
    }
}
