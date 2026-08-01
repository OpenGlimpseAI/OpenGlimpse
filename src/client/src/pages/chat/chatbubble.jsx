import { useEffect, useRef, useState } from 'react';
import ReactionBar from './ReactionBar.jsx';

const LONG_PRESS_DELAY = 400;
const MOVE_TOLERANCE = 10;

export default function ChatBubble({ message, isOwn, isAdmin, onReact, currentUserId }) {
    const [showBar, setShowBar] = useState(false);
    const longPressRef = useRef(null);
    const startPointRef = useRef(null);
    const rowRef = useRef(null);

    const cancelLongPress = () => {
        if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
        }
    };

    const startLongPress = (e) => {
        if (e.pointerType === 'mouse') return;
        startPointRef.current = { x: e.clientX, y: e.clientY };
        cancelLongPress();
        longPressRef.current = setTimeout(() => {
            setShowBar(true);
            longPressRef.current = null;
        }, LONG_PRESS_DELAY);
    };

    const handlePointerMove = (e) => {
        if (!startPointRef.current) return;
        const dx = e.clientX - startPointRef.current.x;
        const dy = e.clientY - startPointRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > MOVE_TOLERANCE) cancelLongPress();
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (rowRef.current && !rowRef.current.contains(e.target)) {
                setShowBar(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
            cancelLongPress();
        };
    }, []);

    const reactions = message.reactions || [];
    const handleReact = (emoji) => onReact(message.id, emoji);

    return (
        <div
            ref={rowRef}
            className={`chat-bubble-row ${isOwn ? 'chat-bubble-row-own' : 'chat-bubble-row-other'}`}
            onMouseEnter={() => setShowBar(true)}
            onMouseLeave={() => setShowBar(false)}
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerMove={handlePointerMove}
        >
            <div className="chat-bubble-container">
                {showBar && <ReactionBar onReact={handleReact} />}
                <div
                    className={`chat-bubble ${isOwn ? 'chat-bubble-own' : 'chat-bubble-other'}${isAdmin ? ' chat-bubble-admin' : ''}`}
                >
                    <p className="chat-bubble-text">{message.text}</p>
                    <p className={`chat-bubble-time ${isOwn ? 'chat-bubble-time-own' : 'chat-bubble-time-other'}${isAdmin ? ' chat-bubble-time-admin' : ''}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>
                {reactions.length > 0 && (
                    <div className="chat-reactions">
                        {reactions.map((r) => {
                            const reactedByMe = r.userIds.includes(currentUserId);
                            return (
                                <button
                                    key={r.emoji}
                                    type="button"
                                    className={`chat-reaction ${reactedByMe ? 'chat-reaction-mine' : ''}`}
                                    onClick={() => handleReact(r.emoji)}
                                >
                                    <span>{r.emoji}</span>
                                    <span>{r.userIds.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
