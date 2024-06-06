export type TestEnvironmentPreset = 'local' | 'docker' | 'rootsid1' | 'rootsid2';

export interface TestEnvironment {
    preset: TestEnvironmentPreset;
    url: string;
    bootUrl: string;
    vleiServerUrl: string;
    witnessUrls: string[];
    witnessIds: string[];
}

const WAN = 'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha';
const WIL = 'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM';
const WES = 'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX';

// rootsid witnesses
const W1 = 'BHI7yViNOGWd1X0aKMgxLm4dUgbQDYoCFSJM2U8Hb3cx'
const W2 = 'BOUZ4v-vPMP5KyZQP-d_8B30UHI4KWgXczBgWcRJnnYd'
const W3 = 'BNY3LWk2BzX8wXmkXuvpYRVSdfynanwKQwD80KOG00VH'


export function resolveEnvironment(
    input?: TestEnvironmentPreset
): TestEnvironment {
    const preset = input ?? process.env.TEST_ENVIRONMENT ?? 'local';

    const url = 'http://127.0.0.1:3901';
    const bootUrl = 'http://127.0.0.1:3903';

    switch (preset) {
        case 'docker':
            return {
                preset: preset,
                url,
                bootUrl,
                witnessUrls: [
                    'http://witness-demo:5642',
                    'http://witness-demo:5643',
                    'http://witness-demo:5644',
                ],
                witnessIds: [WAN, WIL, WES],
                vleiServerUrl: 'http://vlei-server:7723',
            };
        case 'local':
            return {
                preset: preset,
                url,
                bootUrl,
                vleiServerUrl: 'http://localhost:7723',
                witnessUrls: [
                    'http://localhost:5642',
                    'http://localhost:5643',
                    'http://localhost:5644',
                ],
                witnessIds: [WAN, WIL, WES],
            };
        case 'rootsid1':
            return {
                preset: preset,
                // url: "http://keria--publi-7wqhypzd56ee-cc3c56cbeced4f45.elb.us-east-1.amazonaws.com/admin",
                // bootUrl: "http://keria--publi-7wqhypzd56ee-cc3c56cbeced4f45.elb.us-east-1.amazonaws.com:3903",
                url: "https://keria-dev.rootsid.cloud/admin",
                bootUrl: "https://keria-dev.rootsid.cloud",
                witnessUrls: [
                    "https://witness-dev01.rootsid.cloud", 
                    "https://witness-dev02.rootsid.cloud",
                    "https://witness-dev03.rootsid.cloud"
                ],
                witnessIds: [WAN, WIL, WES],
                vleiServerUrl: 'http://schemas.rootsid.cloud',
            };
        case 'rootsid2':
            return {
                preset: preset,
                url: "https://keria-demoservice.rootsid.cloud/admin",
                bootUrl: "https://keria-demoservice.rootsid.cloud",
                witnessUrls: [
                    "https://witness-dev01.rootsid.cloud", 
                    "https://witness-dev02.rootsid.cloud",
                    "https://witness-dev03.rootsid.cloud"
                ],
                witnessIds: [WAN, WIL, WES],
                vleiServerUrl: 'http://schemas.rootsid.cloud',
            };
        default:
            throw new Error(`Unknown test environment preset '${preset}'`);
    }
}
