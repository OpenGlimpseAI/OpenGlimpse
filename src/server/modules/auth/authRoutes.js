const express = require('express');
const crypto = require('crypto');
const { user, faceEmbeddings } = require('../../database/db.cjs');

const router = express.Router();

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

function ensureStaff(req, res, next) {
    if (req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Staff access required' });
    }
    next();
}

router.post('/', authMiddleware, ensureStaff, async (req, res) => {
    try {
        const { name, email, password, role = 'participant' } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        const normalizedEmail = `${email}`.trim().toLowerCase();
        const existing = await user.findOne({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const created = await user.create({
            enName: name.trim(),
            email: normalizedEmail,
            passwordHash: hashPassword(password),
            role: role === 'staff' ? 'staff' : 'participant',
        });

        return res.status(201).json({
            id: created.id,
            name: created.enName,
            email: created.email,
            role: created.role,
        });
    } catch (err) {
        console.error('Create account error:', err);
        return res.status(500).json({ error: 'Create account failed: ' + (err.message || err.toString()) });
    }
});

router.post('/login', async (req, res) => {
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
            name: accountData.enName,
            email: accountData.email,
            role: accountData.role,
            photoUrl: accountData.photoUrl,
            token,
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed: ' + (err.message || err.toString()) });
    }
});

router.get('/all', authMiddleware, ensureStaff, async (req, res) => {
    const users = await user.findAll({
        attributes: ['id', 'enName', 'email', 'role', 'photoUrl'],
    });
    return res.json(users.map(u => ({
        id: u.id,
        name: u.enName,
        email: u.email,
        role: u.role,
        photoUrl: u.photoUrl,
    })));
});

router.patch('/', authMiddleware, async (req, res) => {
    try {
        const { targetId, name, email, password, role } = req.body;
        const isStaff = req.user.role === 'staff';
        const target = targetId ? await user.findByPk(targetId) : await user.findByPk(req.user.id);

        if (!target) {
            return res.status(404).json({ error: 'Account not found' });
        }
        if (targetId && !isStaff && targetId !== req.user.id) {
            return res.status(403).json({ error: 'Cannot update other accounts' });
        }
        if (role && !isStaff) {
            return res.status(403).json({ error: 'Cannot change role' });
        }

        if (name !== undefined) target.enName = `${name}`.trim() || target.enName;
        if (email !== undefined) target.email = `${email}`.trim().toLowerCase() || target.email;
        if (password) target.passwordHash = hashPassword(password);
        if (role !== undefined && isStaff) target.role = role === 'staff' ? 'staff' : 'participant';

        await target.save();
        const updated = target.get({ plain: true });

        return res.json({
            id: updated.id,
            name: updated.enName,
            email: updated.email,
            role: updated.role,
        });
    } catch (err) {
        console.error('Update account error:', err);
        return res.status(500).json({ error: 'Update failed: ' + (err.message || err.toString()) });
    }
});

router.delete('/', authMiddleware, ensureStaff, async (req, res) => {
    try {
        const { targetId } = req.body;
        const deleteId = targetId || req.user.id;

        const target = await user.findByPk(deleteId);
        if (!target) {
            return res.status(404).json({ error: 'Account not found' });
        }

        await faceEmbeddings.destroy({ where: { userId: deleteId } });
        await target.destroy();
        return res.status(204).send();
    } catch (err) {
        console.error('Delete account error:', err);
        return res.status(500).json({ error: 'Delete failed: ' + (err.message || err.toString()) });
    }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.ensureStaff = ensureStaff;
module.exports.parseToken = parseToken;
