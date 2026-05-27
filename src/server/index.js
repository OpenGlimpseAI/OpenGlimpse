const express = require('express');
const http = require('http');
require('dotenv').config();
const { attachChatServer } = require('./chatserver.cjs');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

attachChatServer(server);

app.get('/', (req, res) => {
    res.send('server is running');
});

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

