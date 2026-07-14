const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./database/db.cjs');
const { attachChatServer } = require('./modules/chat/chatserver.cjs');
const registerProgrammeRoutes = require('./modules/programmes/index');
const authRoutes = require('./modules/auth/authRoutes.js');
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
});
const { attachFaceServer } = require('./modules/facial_recog/facialrecogserver.js');

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const io = new Server(server, {
    cors: { origin: [allowedOrigin, 'https://localhost:5173'], methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});
const port = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin.includes('localhost:5173') || origin.includes('127.0.0.1:5173'))) {
        res.header('Access-Control-Allow-Origin', origin);
    } else if (origin === allowedOrigin) {
        res.header('Access-Control-Allow-Origin', allowedOrigin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

attachChatServer(server);
attachFaceServer(app);

io.on('connection', (socket) => {
    socket.on('join:programme', (programmeId) => {
        socket.join(`programme:${programmeId}`);
    });
    socket.on('leave:programme', (programmeId) => {
        socket.leave(`programme:${programmeId}`);
    });
});

registerProgrammeRoutes(app, io);
app.use('/api/staff', authRoutes);

app.get('/', (req, res) => {
    res.send('server is running');
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
});

async function start() {
    try {
        await sequelize.sync();
        console.log('Database synced');
    } catch (err) {
        console.error('Database sync failed:', err);
        process.exit(1);
    }

    import('./modules/facial_recog/facenetClient.js').then(({ startPythonServer, stopPythonServer }) => {
        startPythonServer()
            .then(() => console.log('[FaceNet] Server is ready at http://127.0.0.1:8000'))
            .catch((err) => console.error('[FaceNet] Failed to start Python server:', err.message));

        const cleanup = () => {
            stopPythonServer();
            process.exit();
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    });

    server.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
}

start();

