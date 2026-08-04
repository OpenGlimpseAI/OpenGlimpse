const { Messages } = require('../../database/dbcrudmethods');
const { parseToken } = require('../auth/authRoutes');
const { user } = require('../../database/db.cjs');
const { buildProgrammeContext, getChatbotResponse } = require('../chatbot/chatbot');

const CHATBOT_TRIGGER = process.env.VITE_CHATBOT_TRIGGER || '@assistant';

function formatpayload(row) {
    return {
        text: row.content ?? row.text,
        timestamp: row.timestamp,
        senderId: row.senderId,
    };
}

function attachChatServer(io, getChatbotUserId) {
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
            next();
        } catch (err) {
            next(new Error('Authentication failed'));
        }
    });

    chat.on('connection', (socket) => {
        console.log(`Chat user connected: ${socket.userId}`);

        socket.programmeId = null;

        const chatbotUserId = getChatbotUserId();
        if (chatbotUserId) {
            socket.emit('chatbot:config', { userId: chatbotUserId, trigger: CHATBOT_TRIGGER });
        }

        socket.on('chat:join', (programmeId) => {
            socket.programmeId = programmeId;
        });

        (async () => {
            const history = await Messages.read();
            socket.emit('history', {
                messages: history.map(formatpayload),
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
                    message: formatpayload(savedMessage.toJSON()),
                });

                if (text.startsWith(CHATBOT_TRIGGER) && socket.programmeId) {
                    const chatbotUserId = getChatbotUserId();
                    if (!chatbotUserId) return;

                    const userQuery = text.slice(CHATBOT_TRIGGER.length).trim();
                    if (!userQuery) return;

                    chat.emit('chatbot:typing', { senderId: chatbotUserId });

                    try {
                        const context = await buildProgrammeContext(socket.programmeId);
                        if (!context) {
                            chat.emit('chatbot:stop', { senderId: chatbotUserId });
                            return;
                        }

                        const reply = await getChatbotResponse(userQuery, context, chatbotUserId, socket.userId);

                        const botMessage = await Messages.create({
                            content: reply,
                            timestamp: new Date(),
                            senderId: chatbotUserId,
                        });

                        chat.emit('chatbot:stop', { senderId: chatbotUserId });
                        chat.emit('message', {
                            message: formatpayload(botMessage.toJSON()),
                        });
                    } catch (err) {
                        console.error('Chatbot error:', err);
                        chat.emit('chatbot:stop', { senderId: chatbotUserId });
                        chat.emit('error', { text: 'Chatbot could not respond. Please try again.' });
                    }
                }
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
