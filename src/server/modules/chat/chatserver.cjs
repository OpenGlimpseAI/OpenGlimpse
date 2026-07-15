const WebSocketServer = require('websocket').server;
const { Messages } = require('../../database/dbcrudmethods');
const { parseToken } = require('../auth/authRoutes');
const { user } = require('../../database/db.cjs');
const clients = new Map();

function sendJson(connection, payload) {
    connection.sendUTF(JSON.stringify(payload));
}

function broadcast(payload) {
    for (const [, client] of clients) {
        if (client.connection.connected) {
            sendJson(client.connection, payload);
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

    socketserver.on('request', async (request) => {
        let token;
        try {
            const resourceUrl = new URL(request.resource, 'http://localhost');
            token = resourceUrl.searchParams.get('token');
        } catch {
            token = null;
        }

        if (!token) {
            request.reject(401, 'Authentication required');
            return;
        }

        const payload = parseToken(token);
        if (!payload?.id) {
            request.reject(401, 'Invalid token');
            return;
        }

        const currentUser = await user.findByPk(payload.id);
        if (!currentUser) {
            request.reject(401, 'Invalid user');
            return;
        }

        const userId = currentUser.id;
        const connection = request.accept(null, request.origin);
        clients.set(connection, { connection, userId });

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

                if (!text || text.length > 1000) {
                    return sendJson(connection, {
                        type: "error",
                        text: "invalid message",
                    });
                }

                const savedMessage = await Messages.create({
                    content: text,
                    timestamp: new Date(),
                    senderId: userId,
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
