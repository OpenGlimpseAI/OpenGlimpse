const { Sequelize,DataTypes } = require("sequelize");
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
});
const sequelize = new Sequelize(process.env.DB_NAME,process.env.DB_USER,process.env.DB_PASSWORD,{
    host: 'localhost',
    dialect: 'postgres',
})

const user = sequelize.define("users", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    enName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    zhName: {
        type: DataTypes.STRING,
        allowNull: true,
    }
})

const messages = sequelize.define("messages", {
    content: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: user,
            key: "id",
        },
    }
})

const attendee = sequelize.define("attendee", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    }
})

const admin = sequelize.define("admin", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    privileges: {
        type: DataTypes.STRING,
    }
})


const faceEmbeddings = sequelize.define("faceEmbeddings", {
    imageHash: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: user,
            key: "id",
        },
    },
    // imageType must be 'primary' or 'cache'
    imageType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    imageData: {
        type: DataTypes.BLOB("long"),
        allowNull: false,
    },
    embeddings: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false,
    },
})

messages.belongsTo(user, { foreignKey: 'senderId' })
user.hasMany(messages, { foreignKey: 'senderId' })

sequelize.sync({force:false})
    .then(() => {
        console.log("db sync successful")
    })
    .catch((err) => {
        console.error("Encountered error: ", err)
    })

module.exports = { sequelize, user, messages, attendee, admin, faceEmbeddings }