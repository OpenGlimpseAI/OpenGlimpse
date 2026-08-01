const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ReactionBar({ onReact }) {
    return (
        <div className="chat-reaction-bar">
            {QUICK_EMOJIS.map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    className="chat-reaction-option"
                    onClick={(e) => {
                        e.stopPropagation();
                        onReact(emoji);
                    }}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}
