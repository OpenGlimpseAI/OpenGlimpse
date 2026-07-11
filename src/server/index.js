const express = require('express');
const http = require('http');
const path = require("path");
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
});
const { attachChatServer } = require('./chatserver.cjs');
const { user } = require('./database/db.cjs');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function createToken(userRecord) {
    return Buffer.from(`${userRecord.id}:${userRecord.role}`).toString('base64');
}

function parseToken(token) {
    if (!token) return null;
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const [id, role] = decoded.split(':');
        return { id, role };
    } catch {
        return null;
    }
}

async function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = parseToken(token);
    if (!payload?.id) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const currentUser = await user.findByPk(payload.id);
    if (!currentUser) {
        return res.status(401).json({ error: 'Invalid user token' });
    }

    req.user = currentUser.get({ plain: true });
    next();
}

function ensureAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

app.post('/api/user/signup', upload.single('profileImage'), async (req, res) => {
    try {
        const { name, email, password, birthDate } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        const normalizedEmail = `${email}`.trim().toLowerCase();
        const existing = await user.findOne({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const created = await user.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash: hashPassword(password),
            role: 'admin',
            birthDate: birthDate || null,
            imageUrl,
        });

        return res.status(201).json({
            id: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
        });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Signup failed: ' + (err.message || err.toString()) });
    }
});

app.post('/api/user', authMiddleware, ensureAdmin, upload.single('profileImage'), async (req, res) => {
    try {
        const { name, email, password, birthDate, role = 'participant' } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        const normalizedEmail = `${email}`.trim().toLowerCase();
        const existing = await user.findOne({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const created = await user.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash: hashPassword(password),
            role: role === 'admin' ? 'admin' : 'participant',
            birthDate: birthDate || null,
            imageUrl,
        });

        return res.status(201).json({
            id: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
        });
    } catch (err) {
        console.error('Create user error:', err);
        return res.status(500).json({ error: 'Create user failed: ' + (err.message || err.toString()) });
    }
});

app.post('/api/user/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = `${email}`.trim().toLowerCase();
        const account = await user.findOne({ where: { email: normalizedEmail } });
        if (!account || account.passwordHash !== hashPassword(password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accountData = account.get({ plain: true });
        const token = createToken(accountData);

        return res.json({
            id: accountData.id,
            name: accountData.name,
            email: accountData.email,
            role: accountData.role,
            birthDate: accountData.birthDate,
            imageUrl: accountData.imageUrl,
            token,
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed: ' + (err.message || err.toString()) });
    }
});

app.get('/api/user/all', authMiddleware, ensureAdmin, async (req, res) => {
    const users = await user.findAll({
        attributes: ['id', 'name', 'email', 'role', 'birthDate', 'imageUrl', 'createdAt', 'updatedAt'],
    });
    return res.json(users);
});

app.patch('/api/user', authMiddleware, upload.single('profileImage'), async (req, res) => {
    try {
        const { targetId, name, email, password, birthDate, role } = req.body;
        const isAdmin = req.user.role === 'admin';
        const target = targetId ? await user.findByPk(targetId) : await user.findByPk(req.user.id);

        if (!target) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (targetId && !isAdmin && targetId !== req.user.id) {
            return res.status(403).json({ error: 'Cannot update other accounts' });
        }
        if (role && !isAdmin) {
            return res.status(403).json({ error: 'Cannot change role' });
        }

        if (name !== undefined) target.name = `${name}`.trim() || target.name;
        if (email !== undefined) target.email = `${email}`.trim().toLowerCase() || target.email;
        if (password) target.passwordHash = hashPassword(password);
        if (birthDate !== undefined) target.birthDate = birthDate || null;
        if (req.file) target.imageUrl = `/uploads/${req.file.filename}`;
        if (role !== undefined && isAdmin) target.role = role === 'admin' ? 'admin' : 'participant';

        await target.save();
        const updated = target.get({ plain: true });

        return res.json({
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role,
            birthDate: updated.birthDate,
            imageUrl: updated.imageUrl,
        });
    } catch (err) {
        console.error('Update user error:', err);
        return res.status(500).json({ error: 'Update failed: ' + (err.message || err.toString()) });
    }
});

app.delete('/api/user', authMiddleware, async (req, res) => {
    try {
        const { targetId } = req.body;
        const isAdmin = req.user.role === 'admin';
        const deleteId = targetId && isAdmin ? targetId : req.user.id;

        if (targetId && !isAdmin && targetId !== req.user.id) {
            return res.status(403).json({ error: 'Cannot delete other users' });
        }

        const target = await user.findByPk(deleteId);
        if (!target) {
            return res.status(404).json({ error: 'User not found' });
        }

        await target.destroy();
        return res.json({ message: 'Account deleted', id: deleteId });
    } catch (err) {
        console.error('Delete user error:', err);
        return res.status(500).json({ error: 'Delete failed: ' + (err.message || err.toString()) });
    }
});

attachChatServer(server);

app.get('/', (req, res) => {
    res.send('server is running');
});

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

