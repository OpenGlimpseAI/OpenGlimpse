import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import ChatBubble from './chatbubble.jsx';
import ChatInput from './ChatInput.jsx';
import WifiRounded from '@mui/icons-material/WifiRounded'
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import { useConnectivity } from '../../hooks/useConnectivity';
import { getProgrammes, getUsers } from '../../services/api';
import { resolveProgramme, saveProgrammeId } from '../../hooks/useProgramme';
const CHAT_SERVER_URL = import.meta.env.PROD ? (import.meta.env.VITE_CHAT_SERVER_URL || '') : '';
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
    const [staffList, setStaffList] = useState([]);
    const scrollRef = useRef(null);
    const isAtBottomRef = useRef(true);
    const initialLoadDoneRef = useRef(false);
    const forceScrollRef = useRef(false);
    const programmeIdRef = useRef(null);
    programmeIdRef.current = programmeId;
    const [showJumpToBottom, setShowJumpToBottom] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        if (!scrollRef.current) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
                }
            });
        });
    }, []);

    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        isAtBottomRef.current = atBottom;
        setShowJumpToBottom(!atBottom);
        setUnreadCount(current => (atBottom ? 0 : current));
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

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
                setProgrammeId(resolveProgramme(list));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        getUsers()
            .then((list) => setStaffList(list))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!socketRef.current?.connected) return;
        if (programmeId) {
            socketRef.current.emit('chat:join', programmeId);
        } else {
            socketRef.current.emit('chat:leave');
        }
        setMessages([]);
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
            if (payload.programmeId && payload.programmeId !== programmeIdRef.current) return;
            setMessages(payload.messages);
        });

        socket.on('message', (payload) => {
            if (payload.programmeId && payload.programmeId !== programmeIdRef.current) return;
            setMessages((current) => [...current, payload.message]);
        });

        socket.on('reaction:update', (payload) => {
            setMessages((current) =>
                current.map((m) =>
                    m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m
                )
            );
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

    useEffect(() => {
        initialLoadDoneRef.current = false;
        isAtBottomRef.current = true;
        setUnreadCount(0);
        setShowJumpToBottom(false);
        setMessages([]);
    }, [programmeId]);

    useEffect(() => {
        const totalMessages = messages.length;
        if (totalMessages === 0) return;

        if (!initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            scrollToBottom('auto');
        } else if (forceScrollRef.current) {
            forceScrollRef.current = false;
            setUnreadCount(0);
            scrollToBottom('auto');
        } else if (isAtBottomRef.current) {
            scrollToBottom('auto');
        } else {
            setUnreadCount(c => c + 1);
        }
    }, [messages, scrollToBottom]);

    const sendmessage = async () => {
        const text = messageInput.trim();

        if (!text) {
            return;
        }

        if (!socketRef.current?.connected) {
            return;
        }

        if (!programmeId) {
            return;
        }

        try {
            forceScrollRef.current = true;
            socketRef.current.emit('message', { text });
            setMessageInput('');
        } catch (error) {
            forceScrollRef.current = false;
            console.error(error.message);
        }
    };

    const reactToMessage = (messageId, emoji) => {
        if (!socketRef.current?.connected) return;
        socketRef.current.emit('react', { messageId, emoji });
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
                            onChange={(e) => { saveProgrammeId(e.target.value || null); setProgrammeId(e.target.value || null); }}
                            className="text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        >
                            <option value="">Select programme</option>
                            {programmes.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <section className="chat-layout">
                <div className="chat-scroll" ref={scrollRef}>
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
                                        isAdmin={message.senderRole === 'staff'}
                                        onReact={reactToMessage}
                                        currentUserId={clientIdRef.current}
                                        isBot={chatbotConfig && message.senderId === chatbotConfig.userId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {showJumpToBottom && (
                        <button
                            type="button"
                            className="chat-jump-bottom"
                            onClick={() => {
                                isAtBottomRef.current = true;
                                setUnreadCount(0);
                                setShowJumpToBottom(false);
                                scrollToBottom('auto');
                            }}
                        >
                            <KeyboardArrowDownRounded fontSize="small" />
                            {unreadCount > 0 && (
                                <span className="chat-jump-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                            )}
                        </button>
                    )}
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
                            staffList={staffList}
                        />
                    </div>
                </div>
            </section>
        </main>
    );
}
