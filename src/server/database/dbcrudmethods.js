const { messages } = require('./db.cjs')

//messages table funcs
async function addmessage(message){
    const savedMessage = await messages.create({
        content: message.content,
        timestamp: message.timestamp,
        senderId: message.senderId,
    })

    console.log("message added");
    return savedMessage;
}

async function readchathistory(limit=100){
    const results = await messages.findAll({
        order: [['timestamp', 'ASC']],
        limit,
    })
    return results.map((result)=>result.get({plain: true}))
}

module.exports = { addmessage,readchathistory };
