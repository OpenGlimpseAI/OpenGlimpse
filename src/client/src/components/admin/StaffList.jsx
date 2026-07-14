import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

const BADGE_CLASS = {
    admin: 'admin-badge-admin',
    staff: 'admin-badge-staff',
    user: 'admin-badge-user',
};

export default function StaffList({ users, onEdit, onDelete }) {
    if (users.length === 0) {
        return <p className="admin-empty">No users yet.</p>;
    }

    return (
        <ul className="admin-card">
            {users.map((u) => (
                <li key={u.id} className="admin-row">
                    <div className="admin-row-left">
                        <div className="admin-avatar">
                            {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="admin-row-text">
                            <span className="admin-row-name">{u.name}</span>
                            <span className="admin-row-email">{u.email || 'No email'}</span>
                        </div>
                    </div>
                    <div className="admin-row-actions">
                        <span className={`admin-badge ${BADGE_CLASS[u.role] || BADGE_CLASS.user}`}>
                            {u.role}
                        </span>
                        <button className="admin-action-btn" onClick={() => onEdit(u)}>
                            <EditIcon sx={{ fontSize: 18 }} />
                        </button>
                        <button className="admin-action-btn admin-action-delete" onClick={() => onDelete(u)}>
                            <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
}
