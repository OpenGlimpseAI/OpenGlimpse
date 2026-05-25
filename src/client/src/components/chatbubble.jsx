export default function ChatBubble({ message, isOwn }) {
    return (
        <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm ${
                    isOwn
                        ? 'rounded-br-md bg-sky-600 text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                }`}
            >
                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                <p className={`mt-1 text-[11px] ${isOwn ? 'text-sky-100' : 'text-slate-400'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </p>
            </div>
        </div>
    );
}
