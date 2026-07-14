const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { sequelize, Staff, user } = require('./database/db.cjs');
const { attachChatServer } = require('./modules/chat/chatserver.cjs');
const registerProgrammeRoutes = require('./modules/programmes/index');
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
//temporary endpoint to verify staff role
app.get('/staff/:id/role',async(req, res) => {
    try{
        const staff = await Staff.findByPk(req.params.id, { attributes: ['role'] });
        if (!staff) return res.status(404).json({error: 'Staff not found'})
        res.json({role:staff.role})
    } catch (e){
        res.status(500).json({error: "Failed to fetch role"});
    }
})

app.get('/users', async (req, res) => {
    try {
        const staffRows = await Staff.findAll({ attributes: ['id', 'name', 'email', 'role'] });
        const userRows = await user.findAll({ attributes: ['id', 'enName'] });
        const staffUsers = staffRows.map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role }));
        const regularUsers = userRows.map((u) => ({ id: u.id, name: u.enName, email: null, role: 'user' }));
        res.json([...staffUsers, ...regularUsers]);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
})

app.post('/users', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !role) return res.status(400).json({ error: 'Name and role are required' });
        if ((role === 'admin' || role === 'staff') && (!email || !password)) {
            return res.status(400).json({ error: 'Email and password are required for staff/admin' });
        }
        if (role === 'admin' || role === 'staff') {
            const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
            const created = await Staff.create({ name, email, passwordHash, role });
            return res.status(201).json({ id: created.id, name: created.name, email: created.email, role: created.role });
        }
        const created = await user.create({ enName: name });
        return res.status(201).json({ id: created.id, name: created.enName, email: null, role: 'user' });
    } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
})

app.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, role } = req.body;
        const staffRow = await Staff.findByPk(id);
        if (staffRow) {
            const updates = {};
            if (name !== undefined) updates.name = name;
            if (email !== undefined) updates.email = email;
            if (role !== undefined) updates.role = role;
            if (password) updates.passwordHash = crypto.createHash('sha256').update(password).digest('hex');
            await staffRow.update(updates);
            return res.json({ id: staffRow.id, name: staffRow.name, email: staffRow.email, role: staffRow.role });
        }
        const userRow = await user.findByPk(id);
        if (userRow) {
            if (name !== undefined) await userRow.update({ enName: name });
            return res.json({ id: userRow.id, name: userRow.enName, email: null, role: 'user' });
        }
        return res.status(404).json({ error: 'User not found' });
    } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
})

app.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedStaff = await Staff.destroy({ where: { id } });
        if (deletedStaff) return res.status(204).send();
        const deletedUser = await user.destroy({ where: { id } });
        if (deletedUser) return res.status(204).send();
        return res.status(404).json({ error: 'User not found' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
})

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

