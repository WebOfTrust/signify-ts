import { randomUUID } from 'crypto';
import signify, { SignifyClient } from 'signify-ts';

const URL = 'http://127.0.0.1:3901';
const BOOT_URL = 'http://127.0.0.1:3903';
const SCHEMA_SAID = 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao';

await run();

async function connect() {
    const client = new signify.SignifyClient(
        URL,
        signify.randomPasscode(),
        signify.Tier.low,
        BOOT_URL
    );

    await client.boot();
    await client.connect();

    return client;
}

async function resolveOobi(
    client: SignifyClient,
    oobi: string,
    alias: string
): Promise<void> {
    let op = await client.oobis().resolve(oobi, alias);
    while (!op['done']) {
        op = await client.operations().get(op.name);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}

async function run() {
    await signify.ready();
    const client = await connect();

    const dummyDomain = `test.${randomUUID().replaceAll('-', '')}.com`;
    const dummyOobi = `http://${dummyDomain}/oobi/${SCHEMA_SAID}`;
    console.log(`Resolving OOBIs... ${dummyOobi}`);

    const error = await resolveOobi(client, dummyOobi, 'test').catch((e) => e);

    // This fails with SocketError (other side closed) because keria shuts down
    console.log(error);
}
