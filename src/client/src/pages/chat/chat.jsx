import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import ChatBubble from "./ChatBubble.jsx";
import ChatInput from './ChatInput.jsx';
import WifiRounded from '@mui/icons-material/WifiRounded'
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded'
import { useConnectivity } from '../../hooks/useConnectivity';
const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || '';

function getAuthUser() {
    try {
        return JSON.parse(localStorage.getItem('authUser'));
    } catch {
        return null;
    }
}

export default function Chat() {
    const { isOnline } = useConnectivity();
    const socketRef = useRef(null);
    const authUser = useRef(getAuthUser());
    const clientIdRef = useRef(authUser.current?.id);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = authUser.current?.token;
        if (!token) return;

        const socket = io(`${CHAT_SERVER_URL}/chat`, {
            auth: { token },
            transports: ['websocket'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected');
            setIsConnected(true);
        });

        socket.on('history', (payload) => {
            setMessages(payload.messages);
        });

        socket.on('message', (payload) => {
            setMessages((current) => [...current, payload.message]);
        });

        socket.on('error', (payload) => {
            console.error(payload.text);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const sendmessage = async () => {
        const text = messageInput.trim();

        if (!text) {
            return;
        }

        if (!socketRef.current?.connected) {
            return;
        }

        try {
            socketRef.current.emit('message', { text });
            setMessageInput('');
        } catch (error) {
            console.error(error.message);
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
                            disabled={!isOnline}
                            placeholder={isOnline ? 'Type your message...' : 'Chat unavailable while offline'}
                        />
                    </div>
                </div>
            </section>
        </main>
    );
}
