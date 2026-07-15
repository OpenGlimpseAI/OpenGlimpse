const { Delegate, ProgrammeDelegate } = require('./models');

async function lookupBadge(req, res) {
    const { id } = req.params;
    const { badge, badges } = req.body;

    if (!badge && !badges) {
        return res.status(400).json({ error: 'Provide "badge" or "badges" in request body' });
    }

    if (!badges && (typeof badge !== 'string' || !badge.trim())) {
        return res.status(400).json({ error: '"badge" must be a non-empty string' });
    }

    const badgeList = badges || [badge];

    try {
        const programmeDelegates = await ProgrammeDelegate.findAll({
            where: { programmeId: id },
            include: [
                { model: Delegate, as: 'delegate', required: true },
            ],
        });

        const badgeToPd = {};
        for (const pd of programmeDelegates) {
            if (pd.delegate.badge) {
                badgeToPd[pd.delegate.badge] = pd;
            }
        }

        const matches = [];
        const errors = [];

        for (const b of badgeList) {
            const pd = badgeToPd[b];
            if (pd) {
                matches.push({
                    delegateId: pd.delegate.id,
                    name: pd.delegate.name,
                    badge: pd.delegate.badge,
                    photoUrl: pd.delegate.photoUrl || null,
                });
            } else {
                errors.push(`No delegate found for badge: ${b}`);
            }
        }

        res.json({ matches, errors });
    } catch (err) {
        console.error('[QR Lookup] Error:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { lookupBadge };
