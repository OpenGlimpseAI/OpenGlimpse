const { faceEmbeddings, Delegate, ProgrammeDelegate, ScanEvent } = require('./models');

async function recognize(req, res) {
    const { id } = req.params;
    const { image } = req.body;

    if (!image) return res.status(400).json({ error: 'image is required' });

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return res.status(400).json({ error: 'Invalid programme ID' });

    try {
        const imageBuffer = Buffer.from(image, 'base64');

        const { getFaceEmbeddings } = await import('../facial_recog/facenetClient.js');
        const capturedFaces = await getFaceEmbeddings(imageBuffer);

        if (capturedFaces.length === 0) {
            await ScanEvent.create({
                programmeId: id,
                status: 'unverified',
                unverifiedReason: 'No face detected in image',
            });
            return res.json({ matches: [] });
        }

        const storedEmbeddings = await faceEmbeddings.findAll({
            where: { imageType: 'primary' },
        });

        const matchMap = new Map();
        const threshold = 0.4;

        for (const captured of capturedFaces) {
            for (const stored of storedEmbeddings) {
                const storedEmbedding = JSON.parse(stored.embeddings);
                const similarity = cosineSimilarity(captured.embedding, storedEmbedding);

                if (similarity >= threshold) {
                    const delegate = await Delegate.findOne({ where: { userId: stored.userId } });
                    if (!delegate) continue;

                    const inProgramme = await ProgrammeDelegate.findOne({
                        where: { programmeId: id, delegateId: delegate.id },
                    });
                    if (!inProgramme) continue;

                    const existing = matchMap.get(delegate.id);
                    if (!existing || similarity > existing.confidence) {
                        matchMap.set(delegate.id, {
                            delegateId: delegate.id,
                            name: delegate.name,
                            confidence: similarity,
                            imageData: stored.imageData.toString('base64'),
                        });
                    }
                }
            }
        }

        if (matchMap.size === 0) {
            await ScanEvent.create({
                programmeId: id,
                status: 'unverified',
                unverifiedReason: 'No matching face found',
            });
        } else {
            for (const [, match] of matchMap) {
                await ScanEvent.create({
                    programmeId: id,
                    delegateId: match.delegateId,
                    confidence: match.confidence,
                    status: 'verified',
                });
            }
        }

        const matches = Array.from(matchMap.values()).sort((a, b) => b.confidence - a.confidence);

        res.json({ matches });
    } catch (err) {
        console.error('[Recognize] Error:', err);
        res.status(500).json({ error: err.message });
    }
}

function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;
    return dotProduct / denom;
}

module.exports = { recognize };
