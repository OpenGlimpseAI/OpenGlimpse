const crypto = require('crypto');
const { user, messages, faceEmbeddings, MessageReaction } = require('./db.cjs')

class Model {
    static async create() {
        throw new Error('create static method not implemented');
    }

    static async read() {
        throw new Error('read static method not implemented');
    }

    async update(fields = {}) {
        throw new Error('update method not implemented');
    }

    async delete() {
        throw new Error('delete method not implemented');
    }
}

class User extends Model {
    constructor({ id, enName, zhName, email, passwordHash, photoUrl, role } = {}) {
        super()
        this.id = id
        this.enName = enName
        this.zhName = zhName
        this.email = email
        this.passwordHash = passwordHash
        this.photoUrl = photoUrl
        this.role = role
    }

    static async create(enName, zhName = null, { email, passwordHash, photoUrl, role } = {}) {
        const record = await user.create({ enName, zhName, email, passwordHash, photoUrl, role })
        return new User(record.toJSON())
    }

    static async read(id) {
        const record = await user.findByPk(id)
        if (!record) return null
        return new User(record.toJSON())
    }

    async update({ enName, zhName, email, passwordHash, photoUrl, role } = {}) {
        const fields = {}
        if (enName !== undefined) fields.enName = enName
        if (zhName !== undefined) fields.zhName = zhName
        if (email !== undefined) fields.email = email
        if (passwordHash !== undefined) fields.passwordHash = passwordHash
        if (photoUrl !== undefined) fields.photoUrl = photoUrl
        if (role !== undefined) fields.role = role
        if (Object.keys(fields).length === 0) return
        return await user.update(fields, { where: { id: this.id } })
    }

    async delete() {
        await faceEmbeddings.destroy({ where: { userId: this.id } });
        return await user.destroy({ where: { id: this.id } })
    }
}

class FaceEmbeddings extends Model {
    constructor({ imageHash, userId, imageType, imageData, embeddings, model } = {}) {
        super()
        this.imageHash = imageHash
        this.userId = userId
        this.imageType = imageType
        this.imageData = imageData
        this.embeddings = embeddings
        this.model = model
    }

    static async create(imageHash, userId, imageType, imageData, embeddings, model) {
        const record = await faceEmbeddings.create({ imageHash, userId, imageType, imageData, embeddings, model })
        return new FaceEmbeddings(record.toJSON())
    }

    static async read(imageHash) {
        const record = await faceEmbeddings.findByPk(imageHash)
        if (!record) return null
        return new FaceEmbeddings(record.toJSON())
    }

    async update({ imageType, imageData, embeddings, model } = {}) {
        const fields = {}
        if (imageType !== undefined) fields.imageType = imageType
        if (imageData !== undefined) fields.imageData = imageData
        if (embeddings !== undefined) fields.embeddings = embeddings
        if (model !== undefined) fields.model = model
        if (Object.keys(fields).length === 0) return
        return await faceEmbeddings.update(fields, { where: { imageHash: this.imageHash } })
    }

    async delete() {
        return await faceEmbeddings.destroy({ where: { imageHash: this.imageHash } })
    }

    static async findPrimaryByUserId(userId) {
        const records = await faceEmbeddings.findAll({ where: { userId, imageType: 'primary' } })
        return records.map(r => new FaceEmbeddings(r.toJSON()))
    }

    static async deleteByUserIdAndType(userId, imageType) {
        return await faceEmbeddings.destroy({ where: { userId, imageType } })
    }

    static async createFromImage(userId, imageData, imageType){
        const { getFaceEmbeddings } = await import('../modules/facial_recog/facenetClient.js');

        const faces = await getFaceEmbeddings(imageData);
        const results = [];

        for (const face of faces) {
            const imageHash = crypto.createHash('sha256').update(face.faceImage).digest('hex');
            const record = await FaceEmbeddings.create(
                imageHash,
                userId,
                imageType,
                face.faceImage,
                JSON.stringify(face.embedding),
                'facenet'
            );
            results.push(record);
        }

        return results;
    }
}

class Messages extends Model {
    constructor({ id, content, timestamp, senderId } = {}) {
        super()
        this.id = id
        this.content = content
        this.timestamp = timestamp
        this.senderId = senderId
    }

    toJSON() {
        return {
            id: this.id,
            content: this.content,
            timestamp: this.timestamp,
            senderId: this.senderId,
        }
    }

    static async create({ content, timestamp = new Date(), senderId } = {}) {
        const savedMessage = await messages.create({
            content,
            timestamp,
            senderId,
        })

        return new Messages(savedMessage.toJSON())
    }

    static async read(limit = 100) {
        const results = await messages.findAll({
            order: [['timestamp', 'ASC']],
            limit,
        })
        return results.map((result) => new Messages(result.toJSON()))
    }

    async update({ content, timestamp, senderId } = {}) {
        const fields = {}
        if (content !== undefined) fields.content = content
        if (timestamp !== undefined) fields.timestamp = timestamp
        if (senderId !== undefined) fields.senderId = senderId
        if (Object.keys(fields).length === 0) return
        return await messages.update(fields, { where: { id: this.id } })
    }

    async delete() {
        return await messages.destroy({ where: { id: this.id } })
    }
}

class Reactions extends Model {
    static async create({ messageId, userId, emoji }) {
        const record = await MessageReaction.create({ messageId, userId, emoji });
        return record.toJSON();
    }

    static async findOne({ messageId, userId }) {
        return await MessageReaction.findOne({ where: { messageId, userId } });
    }

    static async update(record, emoji) {
        return await record.update({ emoji });
    }

    static async destroy({ messageId, userId }) {
        return await MessageReaction.destroy({ where: { messageId, userId } });
    }

    static async readByMessageIds(messageIds) {
        if (messageIds.length === 0) return [];
        const records = await MessageReaction.findAll({ where: { messageId: messageIds } });
        return records.map((r) => r.toJSON());
    }
}

module.exports = { Model, User, FaceEmbeddings, Messages, Reactions };
