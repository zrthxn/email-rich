const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = ['https://mail.google.com'];
const TOKEN_PATH = 'token.json';

fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  authorize(JSON.parse(content), sendEmail);
});

function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function sendEmail(auth) {
  const gmail = google.gmail({version: 'v1', auth});

  fs.readFile('email.txt', (err,content)=>{
    if (err) return console.log(err);
    let read = content.toString();
        
    let userId = 'alisamar181099@gmail.com';
    let from = 'From: ' + userId + '\r\n';
    let subject = 'Subject: Test 56789\r\n';
      
    let headers = 
        'Mime-Version: 1.0\r\n' +
        'Content-Type: Text/HTML; charset=ISO-8859-1\r\n' +
        'Content-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n';

    let data = [];
    let address_list = [];

    fs.readFile('data.csv', (e,db)=>{    
        if (e) return console.log(e);
        let raw = db.toString().split('\r\n');
        let heads = raw[0].split(',');
        
        for(let row=1; row<raw.length; row++) {
            let row_entry = [];
            for(let col=0; col<heads.length; col++) {
                if(heads[col]==="EMAIL") {
                    address_list.push(raw[row].split(',')[col]);
                } else {
                    let cell = {
                        id: heads[col],
                        data: raw[row].split(',')[col]
                    }
                    row_entry.push(cell);
                }
            }
            data.push(row_entry);
        }

        let emails = [];

        let splits = read.split('#');
        let peices = [];
        let addresses = [];
        for(let p=0; p<=splits.length; p+=2) {
            peices.push(splits[p]);
        }
        for(let a=1; a<splits.length; a+=2) {
            addresses.push(splits[a]);
        }

        for(var i=0; i<data.length; i++) {
            let current_email = '';
            for(var j=0; j<peices.length; j++) {
                let _data = '';
                for(var k=0; k<data[i].length; k++) {
                    if(addresses[j]===data[i][k].id) {
                        _data = data[i][k].data;
                    }
                }
                let next = peices[j] + _data;
                current_email = current_email + next;
            }
            emails.push(
                Buffer.from(from + `To: ${address_list[i]}\r\n` + subject + headers + current_email).toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')
            );
        }

        var email_num=0; 
        function send() {
            setTimeout(function() {
                if(address_list[email_num]!==undefined) {
                    console.log('Sending email to ' + address_list[email_num]);
                    // gmail.users.messages.send({
                    //     'userId': userId,
                    //     'resource': {
                    //         'raw': emails[email_num]
                    //     }
                    // });
                } else {
                    console.log('1 invalid, row ' + email_num);
                }
                email_num++
                if(email_num<emails.length) {
                    send();
                };
            }, 300);
        }
        send();
    });    
  });  
}