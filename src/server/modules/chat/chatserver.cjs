const WebSocketServer = require('websocket').server;
const { Messages } = require('../../database/dbcrudmethods')
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
        text: row.content ?? row.text,
        timestamp: row.timestamp,
        senderId: row.senderId,
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
            const history = await Messages.read();
            sendJson(connection, {
                type:'history',
                messages: history.map(formatpayload),
            })
        })().catch((err)=>{
            console.error('Chat history could not be loaded', err);
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
                const senderId = typeof data.senderId === 'string' ? data.senderId.trim() : "";

                if (!text || text.length > 1000) {
                    return sendJson(connection, {
                        type: "error",
                        text: "invalid message",
                    });
                }
                if (!senderId) {
                    return sendJson(connection, {
                        type: "error",
                        text: "missing sender id",
                    });
                }

                const savedMessage = await Messages.create({
                    content: text,
                    timestamp: new Date(),
                    senderId,
                });
                broadcast({
                    type: 'message',
                    message: formatpayload(savedMessage.toJSON()),
                });
            } catch (error) {
                console.error('Failed to save chat message', error);
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
