const { ReadyToDepart } = require('../../../database/db.cjs');

// ── Class methods ──────────────────────────────────────────

ReadyToDepart.getStatus = async function (programmeId) {
    const record = await ReadyToDepart.findOne({
        where: { programmeId },
        attributes: ['ready', 'toggledBy', 'toggledAt'],
    });
    if (!record) return { ready: false, toggledBy: null, toggledAt: null };
    return { ready: record.ready, toggledBy: record.toggledBy, toggledAt: record.toggledAt };
};

ReadyToDepart.setStatus = async function (programmeId, ready) {
    const [record, created] = await ReadyToDepart.findOrCreate({
        where: { programmeId },
        defaults: { programmeId, ready, toggledAt: new Date() },
    });
    if (!created) {
        await record.update({ ready, toggledAt: new Date() });
    }
    return { ready: record.ready, toggledBy: record.toggledBy, toggledAt: record.toggledAt };
};

module.exports = ReadyToDepart;
