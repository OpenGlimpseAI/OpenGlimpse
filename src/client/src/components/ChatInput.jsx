import SendRoundedIcon from '@mui/icons-material/SendRounded';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

export default function ChatInput({
    value,
    onChange,
    onSend,
    disabled = false,
}) {
    return (
        <form
            className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4"
            onSubmit={(e) => {
                e.preventDefault();
                onSend();
            }}
        >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm transition focus-within:border-sky-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                <textarea
                    className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Type your message..."
                    rows={1}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSend();
                        }
                    }}
                />
                <Tooltip title={disabled ? 'Connecting' : 'Send message'}>
                    <span>
                        <IconButton
                            type="submit"
                            size="small"
                            disabled={disabled || !value.trim()}
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: '#0284c7',
                                color: 'white',
                                '&:hover': { bgcolor: '#0369a1' },
                                '&.Mui-disabled': {
                                    bgcolor: '#e2e8f0',
                                    color: '#94a3b8',
                                },
                            }}
                        >
                            <SendRoundedIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </div>
        </form>
    );
}
