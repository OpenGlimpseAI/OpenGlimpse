const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { attachChatServer } = require('./modules/chat/chatserver.cjs');
const registerProgrammeRoutes = require('./modules/programmes/index');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});
const port = process.env.PORT || 3001;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});
app.use(express.json({ limit: '10mb' }));

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

attachChatServer(server);

io.on('connection', (socket) => {
    socket.on('join:programme', (programmeId) => {
        socket.join(`programme:${programmeId}`);
    });
    socket.on('leave:programme', (programmeId) => {
        socket.leave(`programme:${programmeId}`);
    });
});

registerProgrammeRoutes(app, io);

app.get('/', (req, res) => {
    res.send('server is running');
});

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

