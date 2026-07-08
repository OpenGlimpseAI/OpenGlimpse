const crypto = require('crypto');
const { user, messages, faceEmbeddings } = require('./db.cjs')

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
    constructor({ id, enName, zhName } = {}) {
        super()
        this.id = id
        this.enName = enName
        this.zhName = zhName
    }

    static async create(enName, zhName = null) {
        const record = await user.create({ enName, zhName })
        return new User(record.toJSON())
    }

    static async read(id) {
        const record = await user.findByPk(id)
        if (!record) return null
        return new User(record.toJSON())
    }

    async update({ enName, zhName } = {}) {
        const fields = {}
        if (enName !== undefined) fields.enName = enName
        if (zhName !== undefined) fields.zhName = zhName
        if (Object.keys(fields).length === 0) return
        return await user.update(fields, { where: { id: this.id } })
    }

    async delete() {
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

module.exports = { Model, User, FaceEmbeddings };
