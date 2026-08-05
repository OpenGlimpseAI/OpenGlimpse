import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

export default function ChatBubble({ message, isOwn, isBot }) {
    if (isBot) {
        const html = marked.parse(message.text || '');
        return (
            <div className="chat-bubble-row chat-bubble-row-other">
                <div className="chat-bubble chat-bubble-bot">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-emerald-700">AI Assistant</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">BOT</span>
                    </div>
                    <div className="chat-bubble-text" dangerouslySetInnerHTML={{ __html: html }} />
                    <p className="chat-bubble-time chat-bubble-time-other">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`chat-bubble-row ${isOwn ? 'chat-bubble-row-own' : 'chat-bubble-row-other'}`}>
            <div
                className={`chat-bubble ${isOwn ? 'chat-bubble-own' : 'chat-bubble-other'}`}
            >
                <p className="chat-bubble-text">{message.text}</p>
                <p className={`chat-bubble-time ${isOwn ? 'chat-bubble-time-own' : 'chat-bubble-time-other'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </p>
            </div>
        </div>
    );
}
