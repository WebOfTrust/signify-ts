import { assert, describe, it } from 'vitest';
import { Tier } from '../../src/keri/core/salter.ts';
import { SignifyClient } from '../../src/keri/app/clienting.ts';
import libsodium from 'libsodium-wrappers-sumo';
import { createMockFetch } from './test-utils.ts';

const fetchMock = createMockFetch();

const url = 'http://127.0.0.1:3901';
const boot_url = 'http://127.0.0.1:3903';

describe('SignifyClient', () => {
    it('Notifications', async () => {
        await libsodium.ready;
        const bran = '0123456789abcdefghijk';

        const client = new SignifyClient(url, bran, Tier.low, boot_url);

        await client.boot();
        await client.connect();

        const notifications = client.notifications();

        await notifications.list(20, 40);
        let lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.instanceOf(lastCall[0], Request);
        assert.equal(lastCall[0].url, url + '/notifications');
        assert.equal(lastCall[0].method, 'GET');
        const lastHeaders = new Headers(lastCall[0].headers);
        assert.equal(lastHeaders.get('Range'), 'notes=20-40');

        await notifications.mark('notificationSAID');
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.instanceOf(lastCall[0], Request);
        assert.equal(lastCall[0].url, url + '/notifications/notificationSAID');
        assert.equal(lastCall[0].method, 'PUT');

        await notifications.delete('notificationSAID');
        lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
        assert.instanceOf(lastCall[0], Request);
        assert.equal(lastCall[0].url, url + '/notifications/notificationSAID');
        assert.equal(lastCall[0].method, 'DELETE');
    });
});
