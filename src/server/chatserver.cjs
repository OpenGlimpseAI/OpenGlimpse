const WebSocketServer = require('websocket').server;
const { addmessage,readchathistory } = require('./database/dbcrudmethods')

const clients = new Set();

function sendJson(connection, payload) {
    connection.sendUTF(JSON.stringify(payload));
}

function broadcast(payload) {
    for (const client of clients) {
        if (client.connected) {
            sendJson(client, payload);
        }
    }
}

function formatpayload(row){
    return {
        text: row.content,
        timestamp: row.timestamp,
    }
}

function attachChatServer(server) {
    const socketserver = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false,
    });

    socketserver.on('request', (request) => {
        const connection = request.accept(null, request.origin);
        clients.add(connection);
        (async ()=>{
            const history = await readchathistory();
            sendJson(connection, {
                type:'history',
                messages: history.map(formatpayload),
            })
        })().catch((err)=>{
            sendJson(connection, {
                type:'error',
                text:"Chat history could not be found",
            })
        })
        connection.on('message', async (message) => {
            if (message.type !== 'utf8') {
                return;
            }

            try {
                const data = JSON.parse(message.utf8Data);
                const text = typeof data.text === 'string' ? data.text.trim() : "";
                if (!text || text.length > 1000) {
                    return sendJson(connection, {
                        type: "error",
                        text: "invalid message",
                    });
                }

                const savedMessage = await addmessage({
                    content: text,
                    timestamp: new Date(),
                });
                broadcast({
                    type: 'message',
                    message: formatpayload(savedMessage.get({plain: true})),
                });
            } catch (error) {
                sendJson(connection, {
                    type: 'error',
                    text: 'invalid message format',
                });
            }
        });

        connection.on('close', (rescode, description) => {
            clients.delete(connection);
            console.log('websocket closed', rescode, description);
        });
    });

    return socketserver;
}

module.exports = { attachChatServer };
