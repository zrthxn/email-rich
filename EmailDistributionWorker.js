const cluster = require('cluster');
const Emailer = require('./Emailer');

process.on('message', (order)=>{
    function startInstance() {
        setTimeout(function(){
            Emailer.DatasetDelivery(order.payload.mail, order.payload.content, order.payload.data)
                .then(()=>{
                    process.send({ pid: order.pid, complete: true, errors: [] });
                })
                .catch((err)=>{
                    process.send({ pid : order.pid, complete : true, errors: [err]});
                });
        }, order.delay);
    }
    startInstance();
});