const fs = require('fs');
const Emailer = require('./Emailer');

var mail = {
    to:"", //just email
    from:"alisamar181099@gmail.com", // just email
    username:"Alisamar Husain", // name on Account "Alisamar Husain",
    userId: "alisamar181099@gmail.com", // Just email
    subject:"",
    body:"" // raw non-base64 html text body
};

fs.readFile('email.txt', (err,content)=>{
    if (err) return console.log(err);

    fs.readFile('data.csv', (e,db)=>{
        if (e) return console.log(e);
        // Emailer.DatasetDelivery({
        //     to:"", //just email
        //     from:"alisamar181099@gmail.com", // just email
        //     username:"Alisamar Husain", // name on Account "Alisamar Husain",
        //     userId: "alisamar181099@gmail.com", // Just email
        //     subject:"",
        //     body: "" // raw non-base64 html text body
        // }, content.toString().trim(), db.toString().trim(), {}).then(()=>{
        //     console.log('DONE');
        // });
        Emailer.DistributedCampaign({
            to:"", //just email
            from:"alisamar181099@gmail.com", // just email
            username:"Alisamar Husain", // name on Account "Alisamar Husain",
            userId: "alisamar181099@gmail.com", // Just email
            subject:"",
            body: "" // raw non-base64 html text body
        }, content.toString().trim(), db.toString().trim(), {});
    });

    // Emailer.SingleDelivery({
    //     to:"zrthxn@gmail.com", //just email
    //     from:"alisamar181099@gmail.com", // just email
    //     username:"Alisamar Husain", // name on Account "Alisamar Husain",
    //     userId: "alisamar181099@gmail.com", // Just email
    //     subject:"Single Email",
    //     body: content.toString().trim() // raw non-base64 html text body
    // }).then(()=>{
    //     console.log('DONE');
    // }); 
});