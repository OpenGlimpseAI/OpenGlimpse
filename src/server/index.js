const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./database/db.cjs');
const { attachChatServer } = require('./modules/chat/chatserver.cjs');
const registerProgrammeRoutes = require('./modules/programmes/index');
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
});
const { attachFaceServer } = require('./modules/facial_recog/facialrecogserver.js');

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_URL || /^https?:\/\/localhost:\d+$/;
const io = new Server(server, {
    cors: { origin: allowedOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});
const port = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
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

// Users
app.get('/users', async (req, res) => {
    try {
        const { user } = require('./database/db.cjs');
        const users = await user.findAll({ attributes: ['id', 'enName', 'zhName'], order: [['enName', 'ASC']] });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('server is running');
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
});

async function start() {
    try {
        await sequelize.sync({ alter: true });
        console.log('Database synced');

        // Seed route_members from existing programme_delegates route_id column if present
        const db = require('./database/db.cjs');
        const { ProgrammeDelegate, RouteMember, Sequelize } = db;
        const count = await RouteMember.count();
        if (count === 0) {
            try {
                const [results] = await db.sequelize.query(`SELECT id, programme_id, delegate_id, route_id FROM programme_delegates WHERE route_id IS NOT NULL LIMIT 1`);
                if (results.length > 0) {
                    const all = await db.sequelize.query(`SELECT id, programme_id, delegate_id, route_id FROM programme_delegates WHERE route_id IS NOT NULL`);
                    const rows = all[0] || [];
                    if (rows.length > 0) {
                        await RouteMember.bulkCreate(
                            rows.map((r) => ({ routeId: r.route_id, delegateId: r.delegate_id, programmeId: r.programme_id })),
                            { ignoreDuplicates: true }
                        );
                        console.log(`Seeded ${rows.length} route_members from legacy data`);
                    }
                }
            } catch (e) {
                console.log('No legacy route_id column found, skipping seed');
            }
        }
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

