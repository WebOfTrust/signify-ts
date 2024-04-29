import { strict as assert } from 'assert';
import {
    getOrCreateClients,
} from './utils/test-setup';
import {getGrantedCredential, ECR_SCHEMA_SAID} from './singlesig-vlei-issuance.test';

// This test assumes you have run a vlei test that sets up the glief, qvi, le, and
// role identifiers and Credentials.
test('vlei-verification', async function run() {

//     // these come from a previous test (ex. singlesig-vlei-issuance.test.ts)
//     const bran = 'DbH7DF2uJgXg8gTRpM2ar'; //taken from SIGNIFY_SECRETS
//     const aidName = 'role';
//     const [roleClient] = await getOrCreateClients(1,[bran]);

//     try {
//         // let resp = await roleClient.signedFetch(
//         //     'http://localhost:7676',
//         //     '/health',
//         //     'GET',
//         //     null,
//         //     aidName
//         // );
//         // assert.equal(200,resp.status)

//         let ecrCreds = (await roleClient.credentials().list());
//         let ecrCred = ecrCreds.find((cred: any) => cred.sad.s === ECR_SCHEMA_SAID);
//         let ecrCredHolder = await getGrantedCredential(roleClient, ecrCred.sad.d);
//         assert(ecrCred !== undefined);
//         assert.equal(ecrCredHolder.sad.d, ecrCred.sad.d);
//         assert.equal(ecrCredHolder.sad.s, ECR_SCHEMA_SAID);
//         assert.equal(ecrCredHolder.status.s, '0');
//         assert(ecrCredHolder.atc !== undefined);

//         let ecrCredCesr = (await roleClient.credentials().get(ecrCred.sad.d,true));
//         let resp = await roleClient.signedFetch(
//             'http://localhost:7676',
//             `/presentations/${ecrCred.sad.d}`,
//             'PUT',
//             ecrCredCesr,
//             aidName,
//             true)
//         assert.equal(202,resp.status)
//     } catch (e) {
//         console.log(e);
//         fail(e);
//     }
});