const express = require('express');
const crypto = require('crypto');
const { Staff } = require('../../database/db.cjs');

const router = express.Router();

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function createToken(staffRecord) {
    return Buffer.from(`${staffRecord.id}:${staffRecord.role}`).toString('base64');
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

    const currentStaff = await Staff.findByPk(payload.id);
    if (!currentStaff) {
        return res.status(401).json({ error: 'Invalid staff token' });
    }

    req.staff = currentStaff.get({ plain: true });
    next();
}

function ensureStaff(req, res, next) {
    if (req.staff.role !== 'staff') {
        return res.status(403).json({ error: 'Staff access required' });
    }
    next();
}

router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        const normalizedEmail = `${email}`.trim().toLowerCase();
        const existing = await Staff.findOne({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const created = await Staff.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash: hashPassword(password),
            role: 'staff',
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

// Staff create staff or participant accounts. Participants can log in but have limited capabilities.
router.post('/', authMiddleware, ensureStaff, async (req, res) => {
    try {
        const { name, email, password, role = 'participant' } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        const normalizedEmail = `${email}`.trim().toLowerCase();
        const existing = await Staff.findOne({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const created = await Staff.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash: hashPassword(password),
            role: role === 'staff' ? 'staff' : 'participant',
        });

        return res.status(201).json({
            id: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
        });
    } catch (err) {
        console.error('Create participant error:', err);
        return res.status(500).json({ error: 'Create participant failed: ' + (err.message || err.toString()) });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = `${email}`.trim().toLowerCase();
        const account = await Staff.findOne({ where: { email: normalizedEmail } });
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
            photoUrl: accountData.photoUrl,
            token,
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed: ' + (err.message || err.toString()) });
    }
});

router.get('/all', authMiddleware, ensureStaff, async (req, res) => {
    const staff = await Staff.findAll({
        attributes: ['id', 'name', 'email', 'role', 'photoUrl'],
    });
    return res.json(staff);
});

router.patch('/', authMiddleware, async (req, res) => {
    try {
        const { targetId, name, email, password, role } = req.body;
        const isStaff = req.staff.role === 'staff';
        const target = targetId ? await Staff.findByPk(targetId) : await Staff.findByPk(req.staff.id);

        if (!target) {
            return res.status(404).json({ error: 'Account not found' });
        }
        if (targetId && !isStaff && targetId !== req.staff.id) {
            return res.status(403).json({ error: 'Cannot update other accounts' });
        }
        if (role && !isStaff) {
            return res.status(403).json({ error: 'Cannot change role' });
        }

        if (name !== undefined) target.name = `${name}`.trim() || target.name;
        if (email !== undefined) target.email = `${email}`.trim().toLowerCase() || target.email;
        if (password) target.passwordHash = hashPassword(password);
        if (role !== undefined && isStaff) target.role = role === 'staff' ? 'staff' : 'participant';

        await target.save();
        const updated = target.get({ plain: true });

        return res.json({
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role,
        });
    } catch (err) {
        console.error('Update account error:', err);
        return res.status(500).json({ error: 'Update failed: ' + (err.message || err.toString()) });
    }
});

router.delete('/', authMiddleware, async (req, res) => {
    try {
        const { targetId } = req.body;
        const isStaff = req.staff.role === 'staff';
        const deleteId = targetId && isStaff ? targetId : req.staff.id;

        const target = await Staff.findByPk(deleteId);
        if (!target) {
            return res.status(404).json({ error: 'Account not found' });
        }

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
