import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import ChatBubble from "./ChatBubble.jsx";
import ChatInput from './ChatInput.jsx';
import WifiRounded from '@mui/icons-material/WifiRounded'
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded'
import { useConnectivity } from '../../hooks/useConnectivity';
import { getProgrammes } from '../../services/api';
const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || '';
const CHATBOT_TRIGGER = import.meta.env.VITE_CHATBOT_TRIGGER || '@assistant';

function getAuthUser() {
    try {
        return JSON.parse(localStorage.getItem('authUser'));
    } catch {
        return null;
    }
}

export default function Chat() {
    const navigate = useNavigate();
    const { isOnline } = useConnectivity();
    const redirectedRef = useRef(false);
    const socketRef = useRef(null);
    const authUser = useRef(getAuthUser());
    const clientIdRef = useRef(authUser.current?.id);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [programmes, setProgrammes] = useState([]);
    const [programmeId, setProgrammeId] = useState(null);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [chatbotConfig, setChatbotConfig] = useState(null);

    useEffect(() => {
        if (!isOnline && !redirectedRef.current) {
            redirectedRef.current = true;
            navigate('/profile');
        }
        if (isOnline) {
            redirectedRef.current = false;
        }
    }, [isOnline, navigate]);

    useEffect(() => {
        getProgrammes()
            .then((list) => {
                setProgrammes(list);
                if (list.length === 1) setProgrammeId(list[0].id);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (socketRef.current?.connected && programmeId) {
            socketRef.current.emit('chat:join', programmeId);
        }
    }, [programmeId, isConnected]);

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

        socket.on('chatbot:typing', () => {
            setIsBotTyping(true);
        });

        socket.on('chatbot:stop', () => {
            setIsBotTyping(false);
        });

        socket.on('chatbot:config', (config) => {
            setChatbotConfig(config);
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

    const currentProgramme = programmes.find(p => p.id === programmeId);

    return (
        <main className="chat-page">
            <header className="chat-header">
                <div className="flex items-center gap-3">
                    <h1 className="chat-title">Event Chat</h1>
                    <div className="relative">
                        <select
                            value={programmeId || ''}
                            onChange={(e) => setProgrammeId(e.target.value || null)}
                            className="text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        >
                            <option value="">Select programme</option>
                            {programmes.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
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
                                        isBot={chatbotConfig && message.senderId === chatbotConfig.userId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="chat-composer-shell">
                    {isBotTyping && (
                        <div className="px-4 py-2 text-sm text-slate-500 italic">
                            AI Assistant is typing...
                        </div>
                    )}
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
