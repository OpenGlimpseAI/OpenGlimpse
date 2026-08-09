const { io } = require('../../src/client/node_modules/socket.io-client');
const { ctx, BASE_URL } = require('./helpers');

function connectChat(token) {
    return new Promise((resolve) => {
        const socket = io(`${BASE_URL}/chat`, {
            transports: ['websocket'],
            auth: token ? { token } : {},
            reconnection: false,
        });
        socket.on('connect', () => resolve({ socket, error: null }));
        socket.on('connect_error', (err) => resolve({ socket, error: err.message }));
    });
}

function waitForEvent(socket, event, predicate = () => true, timeoutMs = 30000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            socket.off(event, handler);
            resolve(null);
        }, timeoutMs);
        function handler(payload) {
            if (predicate(payload)) {
                clearTimeout(timer);
                socket.off(event, handler);
                resolve(payload);
            }
        }
        socket.on(event, handler);
    });
}

function disconnect(socket) {
    if (socket) socket.close();
}

async function testChatNoToken() {
    console.log('--- /chat connect (no token) ---');

    const { socket, error } = await connectChat(null);
    disconnect(socket);

    const success = !!error && error.includes('Authentication required');
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testChatInvalidToken() {
    console.log('--- /chat connect (invalid token) ---');

    const { socket, error } = await connectChat('not-a-real-token');
    disconnect(socket);

    const success = !!error;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testChatbotConfig() {
    console.log('--- /chat connect (chatbot config) ---');

    const { socket, error } = await connectChat(ctx.staffToken);
    if (error) {
        console.log('Error:', error);
        disconnect(socket);
        console.log('FAIL\n');
        return false;
    }

    const config = await waitForEvent(socket, 'chatbot:config');
    disconnect(socket);

    console.log('Config:', JSON.stringify(config));
    const success = !!config && !!config.userId && config.trigger === '@assistant';
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testChatMessageNoTrigger() {
    console.log('--- /chat message (no trigger) ---');

    const { socket, error } = await connectChat(ctx.staffToken);
    if (error) {
        console.log('Error:', error);
        disconnect(socket);
        console.log('FAIL\n');
        return false;
    }

    socket.emit('chat:join', ctx.testProgrammeId);
    socket.emit('message', { text: 'hello from ryan test' });

    const message = await waitForEvent(
        socket,
        'message',
        (payload) => payload.message?.text === 'hello from ryan test' && payload.message?.senderId === ctx.staffUserId
    );
    disconnect(socket);

    const success = !!message;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testChatbotTrigger() {
    console.log('--- /chat message (chatbot trigger) ---');

    const { socket, error } = await connectChat(ctx.staffToken);
    if (error) {
        console.log('Error:', error);
        disconnect(socket);
        console.log('FAIL\n');
        return false;
    }

    const config = await waitForEvent(socket, 'chatbot:config');
    if (!config) {
        disconnect(socket);
        console.log('FAIL: No chatbot config\n');
        return false;
    }

    socket.emit('chat:join', ctx.testProgrammeId);
    socket.emit('message', { text: `${config.trigger} how many delegates are in this programme?` });

    const typing = await waitForEvent(socket, 'chatbot:typing', (p) => p.senderId === config.userId);
    const reply = await waitForEvent(
        socket,
        'message',
        (payload) => payload.message?.senderId === config.userId
    );

    console.log('Typing event:', typing ? 'received' : 'missing');
    console.log('Bot reply:', JSON.stringify(reply?.message?.text?.slice(0, 200)));
    disconnect(socket);

    const success = !!typing && !!reply && !!reply.message?.text;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['/chat connect (no token)', testChatNoToken],
    ['/chat connect (invalid token)', testChatInvalidToken],
    ['/chat connect (chatbot config)', testChatbotConfig],
    ['/chat message (no trigger)', testChatMessageNoTrigger],
    ['/chat message (chatbot trigger)', testChatbotTrigger],
];
