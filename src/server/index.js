const express = require('express');
const http = require('http');
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
});
const { attachChatServer } = require('./chatserver.cjs');
const { attachFaceServer } = require('./modules/facial_recog/facialrecogserver.js');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

attachChatServer(server);
attachFaceServer(app);

app.get('/', (req, res) => {
    res.send('server is running');
});

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

