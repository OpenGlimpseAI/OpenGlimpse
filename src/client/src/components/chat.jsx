import React, { useEffect, useRef, useState } from 'react';

const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || 'ws://localhost:3000';

export default function Chat() {
    const socketRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = new WebSocket(CHAT_SERVER_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('Connected');
            setIsConnected(true);
        };

        socket.onmessage = (e) => {
            const message = JSON.parse(e.data);
            setMessages((currentMessages) => [...currentMessages, message]);
        };

        socket.onclose = () => {
            setIsConnected(false);
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, []);

    const sendmessage = () => {
        const text = messageInput.trim();

        if (!text || socketRef.current?.readyState !== WebSocket.OPEN) {
            return;
        }

        const message = {
            text,
            timestamp: new Date().toISOString(),
        };

        socketRef.current.send(JSON.stringify(message));
        setMessageInput('');
    };

    return (
        <div>
            <div className="messages">
                {messages.map((message, i) => (
                    <div key={`${message.timestamp}-${i}`} className="message">
                        {message.text}
                    </div>
                ))}
            </div>
            <div className="chatInput">
                <input
                    type="text"
                    placeholder="Your message"
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            sendmessage();
                        }
                    }}
                    value={messageInput}
                />
                <button onClick={sendmessage} disabled={!isConnected}>
                    Send
                </button>
            </div>
        </div>
    );
}
