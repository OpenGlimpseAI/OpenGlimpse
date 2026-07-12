const { ProgrammeDelegate, Programme, Delegate } = require('./models');

async function listDelegates(req, res) {
    const { id } = req.params;
    try {
        const delegates = await ProgrammeDelegate.listForProgramme(id);
        res.json(delegates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function addDelegates(req, res) {
    const { id } = req.params;

    try {
        const existing = await Programme.findByPk(id);
        if (!existing) return res.status(404).json({ error: 'Programme not found' });

        const added = await ProgrammeDelegate.addDelegates(id, req.body);
        res.status(201).json({ added });
    } catch (err) {
        if (err.message === 'Provide delegates array, delegateId, or name') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
}

async function removeDelegate(req, res) {
    const { id, delegateId } = req.params;
    try {
        const removed = await ProgrammeDelegate.removeFromProgramme(id, delegateId);
        if (!removed) return res.status(404).json({ error: 'Delegate not found in programme' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { listDelegates, addDelegates, removeDelegate };
