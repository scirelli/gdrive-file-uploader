const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

module.exports = async function requestDriveService(config) {
    return authenticate(config).then(auth=> {
        return google.drive({version: config.driveAPIVersion, auth});
    });
};

async function authenticate(config) {
    return {
        'serviceAccount': authenticateServiceAccount,
        'OAuth':          ()=> { throw new Error('Not implemented'); },
        'OAuth_':         authenticateWithOAuth
    }[config.authType](config);
}

async function authenticateServiceAccount(config) {
    return new google.auth.GoogleAuth({
        keyFile: config.googleAppCredsFile,
        scopes:  config.scopes
    });
}

async function authenticateWithOAuth(config) {
    // Load client secrets from a local file.
    return readFile(config.googleAppCredsFile).then(content => {
        // Authorize a client with credentials, then call the Google Drive API.
        return authorizeOAuth(config, JSON.parse(content));
    });
}

/**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
async function authorizeOAuth(config, credentials) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    return readFile(config.tokenFile).then(token => {
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    }).catch(err=> {
        config.logger.error(err);
        return getAccessToken(config.logger, oAuth2Client);
    });
}

/**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback for the authorized client.
     */
async function getAccessToken(config, oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope:       config.scopes
    });
    config.logger.log('Authorize this app by visiting this url:', authUrl);
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
                return writeFile(config.tokenFile, JSON.stringify(token))
                    .then(() => {
                        config.logger.log('Token stored to', config.tokenFile);
                        return oAuth2Client;
                    });
            }).catch(err=> {
                config.logger.error('Error retrieving access token', err);
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
            logger.log('Files:');
            files.map((file) => {
                logger.log(`${file.name} (${file.id})`);
            });
        } else {
            logger.log('No files found.');
        }
    }).catch(err=> {
        logger.log('The API returned an error: ' + err);
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
        logger.log('File Id: ', file.id);
    }).catch(err=>{
        logger.error(err);
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
        logger.log('File Id: ', file.id);
    }).catch(err=>{
        logger.error(err);
    });
}

