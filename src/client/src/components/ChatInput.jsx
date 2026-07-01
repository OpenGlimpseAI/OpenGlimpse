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
            className="chat-input-form"
            onSubmit={(e) => {
                e.preventDefault();
                onSend();
            }}
        >
            <div className="chat-input-box">
                <textarea
                    className="chat-input-field"
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
                            className="chat-send-button"
                            disabled={disabled || !value.trim()}
                        >
                            <SendRoundedIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </div>
        </form>
    );
}
