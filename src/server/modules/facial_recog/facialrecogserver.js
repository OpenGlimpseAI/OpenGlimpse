const express = require('express');
const { User, FaceEmbeddings } = require('../../database/dbcrudmethods');

const router = express.Router();

router.post('/api/user/:id/face', async (req, res) => {
    const { id } = req.params;
    const { image } = req.body;

    if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid image base64 in request body' });
    }

    const user = await User.read(id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const imageData = Buffer.from(image, 'base64');
    const records = await FaceEmbeddings.createFromImage(id, imageData, 'cache');

    res.status(201).json(records.map(r => ({
        imageHash: r.imageHash,
        embeddings: r.embeddings,
        model: r.model,
    })));
});

router.patch('/api/user/:id/face/default', async (req, res) => {
    const { id } = req.params;
    const { image } = req.body;

    if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid image base64 in request body' });
    }

    const user = await User.read(id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    await FaceEmbeddings.deleteByUserIdAndType(id, 'primary');

    const imageData = Buffer.from(image, 'base64');
    const records = await FaceEmbeddings.createFromImage(id, imageData, 'primary');

    res.status(200).json(records.map(r => ({
        imageHash: r.imageHash,
        embeddings: r.embeddings,
        model: r.model,
    })));
});

router.get('/api/user/:id/face/default', async (req, res) => {
    const { id } = req.params;

    const user = await User.read(id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const faces = await FaceEmbeddings.findPrimaryByUserId(id);
    if (!faces.length) {
        return res.status(404).json({ error: 'No default face found for this user' });
    }

    res.status(200).json(faces.map(r => ({
        imageHash: r.imageHash,
        imageData: r.imageData.toString('base64'),
        embeddings: r.embeddings,
        model: r.model,
    })));
});

function attachFaceServer(app) {
    app.use(express.json());
    app.use(router);
}

module.exports = { attachFaceServer };
