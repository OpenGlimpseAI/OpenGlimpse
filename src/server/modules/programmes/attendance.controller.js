const { AttendanceRecord } = require('./models');

function makeAttendanceController(io) {
    async function getAttendance(req, res) {
        const { id } = req.params;
        try {
            const result = await AttendanceRecord.getAttendance(id);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async function markAttendance(req, res) {
        const { id, delegateId } = req.params;
        const { status, method, notes } = req.body;

        if (!status || !['present', 'absent'].includes(status)) {
            return res.status(400).json({ error: 'status must be "present" or "absent"' });
        }
        if (status === 'present' && !method) {
            return res.status(400).json({ error: 'method is required when marking present' });
        }

        try {
            const result = await AttendanceRecord.markAttendance(
                id, delegateId, { status, method, notes }, io
            );
            res.json(result);
        } catch (err) {
            if (err.message === 'Delegate is not in this programme') {
                return res.status(400).json({ error: err.message });
            }
            res.status(500).json({ error: err.message });
        }
    }

    async function markAttendanceBatch(req, res) {
        const { id } = req.params;
        const { records } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: 'records must be a non-empty array' });
        }

        try {
            const result = await AttendanceRecord.markAttendanceBatch(id, records, io);
            const statusCode = result.errors.length === 0 ? 201 : result.success.length > 0 ? 200 : 400;
            res.status(statusCode).json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async function getSummary(req, res) {
        const { id } = req.params;
        try {
            const summary = await AttendanceRecord.getSummary(id);
            res.json(summary);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    return { getAttendance, markAttendance, markAttendanceBatch, getSummary };
}

module.exports = makeAttendanceController;
