const fs = require('fs');
const Emailer = require('./Emailer');

fs.readFile('email.txt', (err,content)=>{
    if (err) return console.log(err);
    let read = content.toString();

    fs.readFile('data.csv', (e,db)=>{    
        if (e) return console.log(e);
        Emailer.DatasetEmailDelivery({
            to:"", //just email
            from:"alisamar181099@gmail.com", // just email
            username:"Alisamar Husain", // name on Account "Alisamar Husain",
            userId: "alisamar181099@gmail.com", // Just email
            subject:"",
            body:"" // raw non-base64 html text body
        }, read.trim(), db.toString().trim()).then(()=>{
            console.log('DONE');
        });
    });
});