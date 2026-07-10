const express = require('express');
const http = require('http');
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
});
const { attachChatServer } = require('./chatserver.cjs');
const { attachFaceServer } = require('./modules/facial_recog/facialrecogserver.js');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

attachChatServer(server);
attachFaceServer(app);

app.get('/', (req, res) => {
    res.send('server is running');
});

async function start() {
    try {
        const { startPythonServer, stopPythonServer } = await import('./modules/facial_recog/facenetClient.js');
        await startPythonServer();
        console.log('[FaceNet] Server is ready at http://127.0.0.1:8000');

        const cleanup = () => {
            stopPythonServer();
            process.exit();
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    } catch (err) {
        console.error('[FaceNet] Failed to start Python server:', err.message);
    }

    server.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
}

start();

