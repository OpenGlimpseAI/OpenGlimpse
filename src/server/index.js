const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const { sequelize, user } = require('./database/db.cjs');
const { attachChatServer } = require('./modules/chat/chatserver.cjs');
const registerProgrammeRoutes = require('./modules/programmes/index');
const authRoutes = require('./modules/auth/authRoutes.js');
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
});
const { attachFaceServer } = require('./modules/facial_recog/facialrecogserver.js');
const registerSyncRoutes = require('./modules/sync/syncRoutes');

let CHATBOT_USER_ID = null;
const getChatbotUserId = () => CHATBOT_USER_ID;

const app = express();
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigin = isProduction ? process.env.CLIENT_URL : /^https?:\/\/localhost:\d+$/;
const io = new Server(server, {
    cors: { origin: allowedOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});
const port = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

// In-memory rate limiter for sensitive endpoints
const rateLimitStore = {};
const RATE_LIMIT_WINDOW = 60000;
setInterval(() => {
  const now = Date.now();
  for (const ip in rateLimitStore) {
    rateLimitStore[ip] = rateLimitStore[ip].filter(t => now - t < RATE_LIMIT_WINDOW);
    if (rateLimitStore[ip].length === 0) delete rateLimitStore[ip];
  }
}, 300000);

app.use((req, res, next) => {
  if ((req.path === '/sync' || req.path === '/api/auth/login') && req.method !== 'OPTIONS') {
    const ip = req.ip;
    const now = Date.now();
    if (!rateLimitStore[ip]) rateLimitStore[ip] = [];
    const windowLimit = req.path === '/api/auth/login' ? 10 : 60;
    rateLimitStore[ip] = rateLimitStore[ip].filter(t => now - t < RATE_LIMIT_WINDOW);
    if (rateLimitStore[ip].length >= windowLimit) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    rateLimitStore[ip].push(now);
  }
  next();
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', isProduction ? (process.env.CLIENT_URL || '*') : '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

attachChatServer(io, getChatbotUserId);
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
app.use('/api/auth', authRoutes);
//attach syncRoutes and handlers to app
registerSyncRoutes(app);
// Users
app.get('/users', async (req, res) => {
    try {
        const { user } = require('./database/db.cjs');
        const users = await user.findAll({ attributes: ['id', 'enName', 'zhName', 'role'], order: [['enName', 'ASC']] });
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

        // Ready-to-depart is per-route (keyed by route_id); drop any stale unique index
        // on ready_to_depart.programme_id that an older schema may have created.
        try {
            const [idx] = await sequelize.query(
                `SELECT indexname FROM pg_indexes WHERE tablename = 'ready_to_depart' AND indexdef ILIKE '%programme_id%' AND indexdef ILIKE '%UNIQUE%'`
            );
            if (idx.length > 0) {
                await sequelize.query(`DROP INDEX IF EXISTS "${idx[0].indexname}"`);
                console.log('Dropped stale unique index on ready_to_depart.programme_id');
            }
        } catch (e) {
            console.log('No stale ready_to_depart unique index to clean:', e.message);
        }

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

        const existingBot = await user.findOne({ where: { email: 'ai-assistant@openglimpse.com' } });
        if (!existingBot) {
            const botPasswordHash = crypto.createHash('sha256').update('bot-no-login').digest('hex');
            const bot = await user.create({
                enName: 'AI Assistant',
                email: 'ai-assistant@openglimpse.com',
                passwordHash: botPasswordHash,
                role: 'staff',
            });
            CHATBOT_USER_ID = bot.id;
            console.log('Seeded chatbot user: ai-assistant@openglimpse.com');
        } else {
            CHATBOT_USER_ID = existingBot.id;
        }
    } catch (err) {
        console.error('Database sync failed:', err);
        process.exit(1);
    }

    import('./modules/facial_recog/facenetClient.js').then(({ startPythonServer, stopPythonServer, PYTHON_SERVER_URL }) => {
        startPythonServer()
            .then(() => console.log('[FaceNet] Python server ready (', PYTHON_SERVER_URL, ')'))
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
