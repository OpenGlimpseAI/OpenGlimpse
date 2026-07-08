const { user, messages } = require('./db.cjs')

class Model {
    static async create() {
        throw new Error('create static method not implemented');
    }

    static async read() {
        throw new Error('read static method not implemented');
    }

    async update() {
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

    async update(enName, zhName = null) {
        return await user.update({ enName, zhName }, { where: { id: this.id } })
    }

    async delete() {
        return await user.destroy({ where: { id: this.id } })
    }
}

module.exports = { Model, User };
