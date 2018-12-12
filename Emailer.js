const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const sendFrequency = 250;

const SCOPES = ['https://mail.google.com'];
const CREDENTIALS_PATH = 'credentials.json';
const TOKEN_PATH = 'token.json';

function authorize() {
    return new Promise((resolve,reject)=>{
        fs.readFile(CREDENTIALS_PATH, (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            let credentials = JSON.parse(content);
            const {client_secret, client_id, redirect_uris} = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
            
            fs.readFile(TOKEN_PATH, (err, token) => {
                if (err) {
                    getNewToken(oAuth2Client).then((auth)=>{
                        resolve(auth);
                    });
                } else {
                    oAuth2Client.setCredentials(JSON.parse(token));
                    resolve(oAuth2Client);
                }
            });
        });
    });
}

function getNewToken(oAuth2Client) {
    return new Promise((resolve,reject)=>{
        const rlx = readline.createInterface({ input: process.stdin, output: process.stdout });
        rlx.question('Invalid or no token found. Generate new? (Y/N)...', (code) => {
            if(code=='Y'||code=='y') {
                const authUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: SCOPES,
                });
                console.log('Authorization URL:', authUrl);
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question('Validation code: ', (code) => {
                    rl.close();
                    oAuth2Client.getToken(code, (err, token) => {
                        if (err) return console.error('Error retrieving access token', err);
                        oAuth2Client.setCredentials(token);
                        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                            if (err) return reject(err);
                            console.log('Token stored to', TOKEN_PATH);
                            resolve(oAuth2Client);
                        });
                    });
                });
            }
        });
    });    
}

exports.SingleEmailDelivery = function (mail) {
    if(typeof mail==='object') throw "Invalid Types";
    let headers =
        'Mime-Version: 1.0\r\n' +
        'Content-Type: multipart/alternative; boundary="==X__MULTIPART__X=="\r\n' +
        'Content-Transfer-Encoding: binary\r\n'+
        'X-Mailer: MIME::Lite 3.030 (F2.84; T1.38; A2.12; B3.13; Q3.13)\r\n\r\n'+

        '--==X__MULTIPART__X==\r\n' +
        'Content-Transfer-Encoding: binary\r\n' +
        'Content-Type: text/html; charset="utf-8"\r\n' +
        'Content-Disposition: inline\r\n'+
        'Content-Length: '+ mail.length +'\r\n\r\n';
    
    let from = 'From: '+ mail.username + ' <' + mail.from + '>\r\n';
    let to = 'To: '+ mail.to +'\r\n';
    let subject = 'Subject: ' + mail.subject + '\r\n';

    return new Promise((resolve,reject)=>{       
        var mail64 = Buffer.from(from + to + subject + headers + mail.body + "\r\n--==X__MULTIPART__X==--\r\n")
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        authorize.then((auth)=>{
            const gmail = google.gmail({version: 'v1', auth});
            console.log('Sending email to ' + mail.to);
            gmail.users.messages.send({
                'userId': mail.userId,
                'resource': {
                    'raw': mail64
                }
            }, (err, res)=>{
                if(err) reject(JSON.stringify(err.errors[0]));
                console.log(res.status, res.statusText);
                resolve(res.status);
            });
        });
    });
}

exports.SingleEmailSyncDelivery = function (auth, mail) {
    if(typeof mail==='object') throw "Invalid Types";
    const gmail = google.gmail({version: 'v1', auth});
    let headers =
        'Mime-Version: 1.0\r\n' +
        'Content-Type: multipart/alternative; boundary="==X__MULTIPART__X=="\r\n' +
        'Content-Transfer-Encoding: binary\r\n'+
        'X-Mailer: MIME::Lite 3.030 (F2.84; T1.38; A2.12; B3.13; Q3.13)\r\n\r\n'+

        '--==X__MULTIPART__X==\r\n' +
        'Content-Transfer-Encoding: binary\r\n' +
        'Content-Type: text/html; charset="utf-8"\r\n' +
        'Content-Disposition: inline\r\n'+
        'Content-Length: '+ mail.length +'\r\n\r\n';
    
    let from = 'From: '+ mail.username + ' <' + mail.from + '>\r\n';
    let to = 'To: '+ mail.to +'\r\n';
    let subject = 'Subject: ' + mail.subject + '\r\n';

    var mail64 = Buffer.from(from + to + subject + headers + mail.body + "\r\n--==X__MULTIPART__X==--\r\n")
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    console.log('Sending email to', mail.to);
    gmail.users.messages.send({
        'userId': mail.userId,
        'resource': {
            'raw': mail64
        }
    }, (err, res)=>{
        if(err) return console.error(JSON.stringify(err.errors[0]));
        return console.log(res.status, res.statusText);
    });
}

exports.DatasetEmailDelivery = function (mail, content, database) {
    // if(typeof content!=='string' || typeof database!=='string' || typeof mail==='object') 
    //     throw("Invalid Types :: " + typeof content + ' ' + typeof database + ' ' + typeof mail);
    let data = [], addressList = [];
    let raw = database.toString().trim().split('\r\n');
    let heads = raw[0].split(',');

    return new Promise((resolve, reject)=>{
        // ----- EMAIL ADDRESS EXTRACTION -----
        for(let row=1; row<raw.length; row++) {
            let row_entry = [];
            for(let col=0; col<heads.length; col++)
                if(heads[col]==="EMAIL")
                    addressList.push(raw[row].split(',')[col]);
                else {
                    row_entry.push({
                        id: heads[col],
                        data: raw[row].split(',')[col]
                    });
                }
            data.push(row_entry);
        }

        // ----- EMAIL CONTENT FORMATTING ----- 
        var splits = content.split('$');
        var emails = [], peices = [], identifiers = [];

        // Put Address identifiers and surrounding text in arrays
        for(let p=0; p<=splits.length; p+=2)
            peices.push(splits[p]);
        for(let a=1; a<splits.length; a+=2)
            identifiers.push(splits[a]);

        // Itrate over the entire data
        for(let i=0; i<data.length; i++) {
            let current_email = '';
            // Insert data into email block copy
            for(var j=0; j<peices.length; j++) {
                let _data = '';
                for(var k=0; k<data[i].length; k++)
                    if(identifiers[j]===data[i][k].id) {
                        _data = data[i][k].data;
                        break;
                    }
                let next = peices[j] + _data;
                current_email = current_email + next;
            }

            let headers = 
                'Mime-Version: 1.0\r\n' +
                'Content-Type: multipart/alternative; boundary="==X__MULTIPART__X=="\r\n' +
                'Content-Transfer-Encoding: binary\r\n'+
                'X-Mailer: MIME::Lite 3.030 (F2.84; T1.38; A2.12; B3.13; Q3.13)\r\n\r\n'+

                '--==X__MULTIPART__X==\r\n' +
                'Content-Transfer-Encoding: binary\r\n' +
                'Content-Type: text/html; charset="utf-8"\r\n' +
                'Content-Disposition: inline\r\n'+
                'Content-Length: '+ current_email.length +'\r\n\r\n';

            let to = 'To: ' + addressList[i]+ '\r\n';
            let from = 'From: '+ mail.username + ' <' + mail.from + '>\r\n';
            let subject = 'Subject: ' + current_email.split('<title>')[1].split('</title>')[0] + '\r\n';
            emails.push(
                Buffer.from(from + to + subject + headers + current_email + "\r\n--==X__MULTIPART__X==--\r\n").toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '')
            );
        }

        // SENDING BASE 64 EMAILS
        authorize().then((auth)=>{
            var INDEX=0;
            console.log('Processing' , addressList.length, 'emails');
            function deploy() {
                setTimeout(function() {
                    if(addressList[INDEX]!==undefined) {
                        const gmail = google.gmail({version: 'v1', auth});
                        console.log('Sending email to ' + addressList[INDEX]);
                        gmail.users.messages.send({
                            'userId': mail.userId,
                            'resource': {
                                'raw': emails[INDEX]
                            }
                        }, (err, res)=>{
                            if(err) return console.error(INDEX, JSON.stringify(err.errors[0]))
                            if(res.status===200) {
                                INDEX++;
                                if(INDEX<emails.length) 
                                    deploy();
                                else 
                                    resolve();
                            }
                        });
                    } else {
                        console.log('Invalid Data Row ::', INDEX);
                    }
                }, sendFrequency);
            }
            deploy();
        });
    });
}

// exports.BulkEmailDelivery = function (auth, mail, content, database) {
//     // Multithreaded EMail delivery for more than 250 emails
// }

exports.send = function (email, userId) {
    // Takes in already encoded base 64 email
    if(typeof email==='object') throw "Invalid Types";
    return new Promise((resolve,reject)=>{
        authorize().then((auth)=>{
            const gmail = google.gmail({version: 'v1', auth});
            gmail.users.messages.send({
                'userId': userId,
                'resource': {
                    'raw': email
                }
            }, (err, res)=>{
                if(err) return reject(JSON.stringify(err.errors[0]));
                if(res.status===200) resolve(res.status, res.statusText);
            });
        });
    });
}