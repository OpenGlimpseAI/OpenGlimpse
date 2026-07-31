const { Messages } = require('../../database/dbcrudmethods');
const { parseToken } = require('../auth/authRoutes');
const { user } = require('../../database/db.cjs');

function formatpayload(row, senderRole) {
    return {
        text: row.content ?? row.text,
        timestamp: row.timestamp,
        senderId: row.senderId,
        senderRole: senderRole || null,
    };
}

function attachChatServer(io) {
    const chat = io.of('/chat');

    chat.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const payload = parseToken(token);
            if (!payload?.id) {
                return next(new Error('Invalid token'));
            }

            const currentUser = await user.findByPk(payload.id);
            if (!currentUser) {
                return next(new Error('Invalid user'));
            }

            socket.userId = currentUser.id;
            socket.userRole = currentUser.role;
            next();
        } catch (err) {
            next(new Error('Authentication failed'));
        }
    });

    chat.on('connection', (socket) => {
        console.log(`Chat user connected: ${socket.userId}`);

        (async () => {
            const history = await Messages.read();
            const senderIds = [...new Set(history.map((m) => m.senderId))];
            const senders = await user.findAll({ where: { id: senderIds }, attributes: ['id', 'role'] });
            const roleById = Object.fromEntries(senders.map((u) => [u.id, u.role]));
            socket.emit('history', {
                messages: history.map((m) => formatpayload(m, roleById[m.senderId])),
            });
        })().catch((err) => {
            console.error('Chat history could not be loaded', err);
            socket.emit('error', { text: 'Chat history could not be found' });
        });

        socket.on('message', async (data) => {
            try {
                const text = typeof data?.text === 'string' ? data.text.trim() : '';

                if (!text || text.length > 1000) {
                    return socket.emit('error', { text: 'invalid message' });
                }

                const savedMessage = await Messages.create({
                    content: text,
                    timestamp: new Date(),
                    senderId: socket.userId,
                });

                chat.emit('message', {
                    message: formatpayload(savedMessage.toJSON(), socket.userRole),
                });
            } catch (error) {
                console.error('Failed to save chat message', error);
                socket.emit('error', { text: 'invalid message format' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`Chat user disconnected: ${socket.userId}`);
        });
    });

    return chat;
}

module.exports = { attachChatServer };
