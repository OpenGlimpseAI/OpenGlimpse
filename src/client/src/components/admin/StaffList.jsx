import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

export default function StaffList({ staff, onEdit, onDelete }) {
    if (staff.length === 0) {
        return <p className="admin-empty">No staff members yet.</p>;
    }

    return (
        <ul className="admin-card">
            {staff.map((s) => (
                <li key={s.id} className="admin-row">
                    <div className="admin-row-left">
                        <div className="admin-avatar">
                            {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="admin-row-text">
                            <span className="admin-row-name">{s.name}</span>
                            <span className="admin-row-email">{s.email}</span>
                        </div>
                    </div>
                    <div className="admin-row-actions">
                        <span className={`admin-badge ${s.role === 'admin' ? 'admin-badge-admin' : 'admin-badge-staff'}`}>
                            {s.role}
                        </span>
                        <button className="admin-action-btn" onClick={() => onEdit(s)}>
                            <EditIcon sx={{ fontSize: 18 }} />
                        </button>
                        <button className="admin-action-btn admin-action-delete" onClick={() => onDelete(s)}>
                            <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
}
