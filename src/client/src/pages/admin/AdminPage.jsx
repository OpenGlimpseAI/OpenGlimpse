import { useState, useMemo, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import StaffList from '../../components/admin/StaffList';
import StaffForm from '../../components/admin/StaffForm';
import { getUsers } from '../../services/api';

const ROLE_ORDER = { admin: 0, staff: 1, user: 2 };

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const fetchUsers = () => getUsers().then(setUsers).catch(() => setUsers([]));

    useEffect(() => { fetchUsers(); }, []);

    const sortedUsers = useMemo(() =>
        [...users].sort((a, b) => (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2)),
    [users]);

    const handleAdd = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const handleEdit = (member) => {
        setEditing(member);
        setFormOpen(true);
    };

    const handleDelete = (member) => {
        if (!window.confirm(`Remove ${member.name}?`)) return;
        setUsers((prev) => prev.filter((u) => u.id !== member.id));
    };

    const handleSave = (data) => {
        if (editing) {
            setUsers((prev) =>
                prev.map((u) => (u.id === editing.id ? { ...u, name: data.name, email: data.email, role: data.role } : u))
            );
        } else {
            const newMember = {
                id: String(Date.now()),
                name: data.name,
                email: data.email,
                role: data.role,
            };
            setUsers((prev) => [...prev, newMember]);
        }
        setFormOpen(false);
    };

    return (
        <main className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">User Management</h1>
                <button className="admin-add-btn" onClick={handleAdd}>
                    <AddIcon sx={{ fontSize: 18 }} />
                    Add User
                </button>
            </header>
            <div className="admin-list-shell">
                <StaffList users={sortedUsers} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
            <StaffForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSave={handleSave}
                initial={editing}
            />
        </main>
    );
}
