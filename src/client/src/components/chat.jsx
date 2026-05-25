import React, { useEffect, useRef, useState } from 'react';
import ChatBubble from "./chatbubble.jsx";
import ChatInput from './ChatInput.jsx';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';

const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || 'ws://localhost:3000';

export default function Chat() {
    const socketRef = useRef(null);
    const clientIdRef = useRef(crypto.randomUUID());
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
            senderId: clientIdRef.current,
        };

        socketRef.current.send(JSON.stringify(message));
        setMessageInput('');
    };

    return (
        <main className="flex min-h-screen flex-col bg-slate-50 pb-14">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <div>
                    <h1 className="text-lg font-semibold text-slate-950">Event Chat</h1>
                    <p className="text-sm text-slate-500">
                        {isConnected ? 'Connected' : 'Connecting'}
                    </p>
                </div>
                {!isConnected && (
                    <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        <WifiOffRoundedIcon sx={{ fontSize: 16 }} />
                        Offline
                    </div>
                )}
            </header>

            <section className="flex flex-1 flex-col">
                <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-5 lg:px-6">
                    <div className="w-full">
                        {messages.length === 0 ? (
                            <div className="flex min-h-[calc(100vh-250px)] items-center justify-center text-center">
                                <p className="text-base font-medium text-slate-800">No messages yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
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

                <div className="sticky bottom-14 border-t border-slate-200 bg-white">
                    <div className="w-full">
                        <ChatInput
                            value={messageInput}
                            onChange={setMessageInput}
                            onSend={sendmessage}
                            disabled={!isConnected}
                        />
                    </div>
                </div>
            </section>
        </main>
    );
}
