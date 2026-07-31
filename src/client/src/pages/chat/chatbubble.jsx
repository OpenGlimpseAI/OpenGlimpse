export default function ChatBubble({ message, isOwn, isAdmin }) {
    return (
        <div className={`chat-bubble-row ${isOwn ? 'chat-bubble-row-own' : 'chat-bubble-row-other'}`}>
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
        </div>
    );
}
