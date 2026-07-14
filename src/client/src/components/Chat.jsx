import React, { useEffect, useRef, useState } from 'react';
import ChatBubble from "./ChatBubble.jsx";
import ChatInput from './ChatInput.jsx';
import WifiRounded from '@mui/icons-material/WifiRounded'
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';
const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || 'ws://localhost:3001';

export default function Chat() {
    const socketRef = useRef(null);
    const clientIdRef = useRef(localStorage.getItem("chatClientId") || crypto.randomUUID());
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        localStorage.setItem("chatClientId",clientIdRef.current);
        const socket = new WebSocket(CHAT_SERVER_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('Connected');
            setIsConnected(true);
        };

        socket.onmessage = (e) => {
            const payload = JSON.parse(e.data);

            if (payload.type === 'history') {
                setMessages(payload.messages)
                return;
            }
            if (payload.type === 'message') {
                setMessages((current) => [...current,payload.message]);
                return;
            }
            if (payload.type === 'error') {
                console.error(payload.text)
            }
        };

        socket.onclose = () => {
            setIsConnected(false);
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, []);

    const sendmessage = async () => {
        const text = messageInput.trim();
        const message = {
            text,
            timestamp: new Date().toISOString(),
            senderId: clientIdRef.current,
        };

        if (!text) {
            return;
        }

        if (socketRef.current?.readyState !== WebSocket.OPEN) {
            try {
                setMessages((current) => [...current, message]);
            } catch (err) {
                console.error(err.message);
            } finally {
                setMessageInput('');
            }

            return;
        }

        try {
            socketRef.current.send(JSON.stringify(message));
        } catch (error) {
            setMessages((current) => [...current, message]);
            console.error(error.message);
        } finally {
            setMessageInput('');
        }
    };

    return (
        <main className="chat-page">
            <header className="chat-header">
                <div>
                    <h1 className="chat-title">Event Chat</h1>

                </div>
                {!isConnected && (
                    <div className="chat-offline-pill">
                        <WifiOffRoundedIcon sx={{ fontSize: 16 }} />
                        Offline
                    </div>
                )}
                {isConnected && (
                    <div className="chat-online-pill">
                        <WifiRounded sx={{fontSize: 16}} />
                        Online
                    </div>
                )}
            </header>

            <section className="chat-layout">
                <div className="chat-scroll">
                    <div className="chat-content">
                        {messages.length === 0 ? (
                            <div className="chat-empty">
                                <p className="chat-empty-text">No messages yet</p>
                            </div>
                        ) : (
                            <div className="chat-message-list">
                                {messages.map((message, i) => (
                                    <ChatBubble
                                        key={`${message.timestamp}-${i}`}
                                        message={message}
                                        isOwn={message.senderId === clientIdRef.current}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="chat-composer-shell">
                    <div className="chat-content">
                        <ChatInput
                            value={messageInput}
                            onChange={setMessageInput}
                            onSend={sendmessage}
                        />
                    </div>
                </div>
            </section>
        </main>
    );
}
