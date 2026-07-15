const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./database/db.cjs');
const { attachChatServer } = require('./modules/chat/chatserver.cjs');
const registerProgrammeRoutes = require('./modules/programmes/index');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || [/^http:\/\/localhost:\d+$/], methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});
const port = process.env.PORT || 3001;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
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

// Sync all Sequelize models to the database, then start listening
sequelize.sync({ alter: true })
    .then(async () => {
        console.log('Database synced');
        // Seed route_members from existing programme_delegates route_id column if present
        const db = require('./database/db.cjs');
        const { ProgrammeDelegate, RouteMember, Sequelize } = db;
        const count = await RouteMember.count();
        if (count === 0) {
            // Check if old route_id column still exists
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
        server.listen(port, () => {
            console.log(`Listening on port ${port}`);
        });
    })
    .catch((err) => {
        console.error('Database sync failed:', err);
        process.exit(1);
    });

