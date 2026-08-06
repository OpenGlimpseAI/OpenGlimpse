import { useState, useRef, useEffect } from 'react';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

const MENTION_SUGGESTIONS = [
    { trigger: '@assistant', label: 'AI Assistant', description: 'Ask the chatbot' },
];

export default function ChatInput({
    value,
    onChange,
    onSend,
    disabled = false,
    placeholder = 'Type your message...',
    staffList = [],
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef(null);

    const allSuggestions = [
        ...MENTION_SUGGESTIONS,
        ...staffList.map(s => ({
            trigger: `@${s.enName}`,
            label: s.enName,
            description: 'Staff member',
        })),
    ];

    useEffect(() => {
        const text = value;
        const cursorPos = textareaRef.current?.selectionStart || text.length;
        const textBeforeCursor = text.slice(0, cursorPos);
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            const query = match[1].toLowerCase();
            const filtered = allSuggestions.filter(s =>
                s.trigger.toLowerCase().includes(`@${query}`)
            );
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
            setSelectedIndex(0);
        } else {
            setShowSuggestions(false);
        }
    }, [value, staffList]);

    const insertSuggestion = (trigger) => {
        const text = value;
        const cursorPos = textareaRef.current?.selectionStart || text.length;
        const textBeforeCursor = text.slice(0, cursorPos);
        const textAfterCursor = text.slice(cursorPos);
        const newTextBefore = textBeforeCursor.replace(/@\w*$/, `${trigger} `);
        onChange(newTextBefore + textAfterCursor);
        setShowSuggestions(false);
        textareaRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertSuggestion(suggestions[selectedIndex].trigger);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <form
            className="chat-input-form"
            onSubmit={(e) => {
                e.preventDefault();
                onSend();
            }}
        >
            <div className="chat-input-box-relative">
                {showSuggestions && suggestions.length > 0 && (
                    <div className="chat-mention-dropdown">
                        {suggestions.map((s, i) => (
                            <button
                                key={s.trigger}
                                type="button"
                                className={`chat-mention-item ${i === selectedIndex ? 'chat-mention-item-selected' : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    insertSuggestion(s.trigger);
                                }}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <span className="chat-mention-trigger">{s.trigger}</span>
                                <span className="chat-mention-desc">{s.description}</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="chat-input-box">
                    <textarea
                        ref={textareaRef}
                        className="chat-input-field"
                        placeholder={placeholder}
                        rows={1}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Tooltip title={disabled ? 'Connecting' : 'Send message'}>
                        <span>
                            <IconButton
                                type="submit"
                                size="small"
                                className="chat-send-button"
                                disabled={disabled || !value.trim()}
                            >
                                <SendRoundedIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </div>
            </div>
        </form>
    );
}
