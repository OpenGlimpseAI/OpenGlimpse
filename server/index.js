import express from 'express';
import { Server } from 'socket.io'
import http from 'http';

const app = express();
const server = http.createServer(app);
const io = new Server(server)
const port = process.env.PORT;

app.get('/chat',(req, res)=>{
    res.sendFile(__dirname+'/index.html');

});

io.on('connection',(socket)=> {
    socket.on('send-message',(chat)=>{
        io.emit('send-message',chat);
    })
});

server.listen(port, () =>{
    console.log(`Listening on port ${port}`);
})

