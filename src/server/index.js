const express = require('express');
const http = require('http');
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
});
const { attachChatServer } = require('./chatserver.cjs');
const { userRoutes } = require('./routes/userRoutes.js');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json());
app.use('/api/user', userRoutes);

attachChatServer(server);

app.get('/', (req, res) => {
    res.send('server is running');
});

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

