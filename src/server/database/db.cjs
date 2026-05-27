const { Sequelize,DataTypes } = require("sequelize");
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
});
const sequelize = new Sequelize(process.env.DB_NAME,process.env.DB_USER,process.env.DB_PASSWORD,{
    host: 'localhost',
    dialect: 'postgres',
})

const messages = sequelize.define("messages", {
    content: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
    }
})

sequelize.sync({force: true})
.then(() => {
    console.log("db sync successful")
})
.catch((err) => {
    console.error("Encountered error: ", err)
})