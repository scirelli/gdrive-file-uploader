#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const util = require('util');

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.file'
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
const CREDENTIALS_FILE = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

let authenticate = authenticateServiceAccount;

requestDriveService().then(upload);

async function requestDriveService() {
    return authenticate().then(auth=> {
        return google.drive({version: 'v3', auth});
    });
}

async function authenticateServiceAccount() {
    return new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_FILE,
        scopes:  SCOPES
    });
}

async function authenticateWithOAuth() {
    // Load client secrets from a local file.
    return readFile(CREDENTIALS_FILE).then(content => {
        // Authorize a client with credentials, then call the Google Drive API.
        return authorizeOAuth(JSON.parse(content));
    });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorizeOAuth(credentials) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    return readFile(TOKEN_PATH).then(token => {
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    }).catch(err=> {
        console.error(err);
        return getAccessToken(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope:       SCOPES
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input:  process.stdin,
        output: process.stdout
    });
    return new Promise(resolve=> {
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            resolve(oAuth2Client.getToken(code).then((token) => {
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                return writeFile(TOKEN_PATH, JSON.stringify(token))
                    .then(() => {
                        console.log('Token stored to', TOKEN_PATH);
                        return oAuth2Client;
                    });
            }).catch(err=> {
                console.error('Error retrieving access token', err);
                throw err;
            }));
        });
    });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listFiles(drive) {
    return drive.files.list({
        pageSize: 10,
        fields:   'nextPageToken, files(id, name)'
    }).then(res => {
        const files = res.data.files;
        if (files.length) {
            console.log('Files:');
            files.map((file) => {
                console.log(`${file.name} (${file.id})`);
            });
        } else {
            console.log('No files found.');
        }
    }).catch(err=> {
        console.log('The API returned an error: ' + err);
    });
}

async function upload(drive) {
    var fileMetadata = {
        'name':  'A0327F0F5AAE7D6978CA82FC38.txt',
        parents: ['1FBc1Y3dMFWn06TeBEydP4H1b1sPHD5_C']
    };
    var media = {
        mimeType: 'text/plain',
        body:     fs.createReadStream('/tmp/A0327F0F5AAE7D6978CA82FC38.txt')
    };
    return drive.files.create({
        resource: fileMetadata,
        media:    media,
        fields:   'id'
    }).then(file=> {
        console.log('File Id: ', file.id);
    }).catch(err=>{
        console.error(err);
    });
}

async function createTempFolder(drive) {
    var fileMetadata = {
        'name':     'tmp_A0327F0F5AAE7D6978CA82FC38',
        'mimeType': 'application/vnd.google-apps.folder',
        parents:    ['1FBc1Y3dMFWn06TeBEydP4H1b1sPHD5_C']
    };
    return drive.files.create({
        resource: fileMetadata,
        fields:   'id'
    }).then(file=> {
        console.log('File Id: ', file.id);
    }).catch(err=>{
        console.error(err);
    });
}
