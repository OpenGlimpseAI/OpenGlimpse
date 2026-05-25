const WebSocketServer = require('websocket').server;

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

function attachChatServer(server) {
    const socketserver = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false,
    });

    socketserver.on('request', (request) => {
        const connection = request.accept(null, request.origin);
        clients.add(connection);

        connection.on('message', (message) => {
            if (message.type !== 'utf8') {
                return;
            }

            try {
                const data = JSON.parse(message.utf8Data);
                broadcast({
                    text: data.text,
                    timestamp: data.timestamp || new Date().toISOString(),
                });
            } catch (error) {
                sendJson(connection, {
                    type: 'error',
                    text: 'Invalid message format',
                });
            }
        });

        connection.on('close', (rescode, description) => {
            clients.delete(connection);
            console.log('WebSocket closed', rescode, description);
        });
    });

    return socketserver;
}

module.exports = { attachChatServer };
