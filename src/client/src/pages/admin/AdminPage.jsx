import { useState, useMemo } from 'react';
import AddIcon from '@mui/icons-material/Add';
import StaffList from '../../components/admin/StaffList';
import StaffForm from '../../components/admin/StaffForm';

const ROLE_ORDER = { admin: 0, staff: 1, user: 2 };

const MOCK_USERS = [
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
    { id: '2', name: 'John Staff', email: 'john@example.com', role: 'staff' },
    { id: '3', name: 'Jane Staff', email: 'jane@example.com', role: 'staff' },
    { id: '4', name: 'Dwayne Johnson', email: null, role: 'user' },
    { id: '5', name: 'Ryan Reynolds', email: null, role: 'user' },
    { id: '6', name: 'Zendaya', email: null, role: 'user' },
];

export default function AdminPage() {
    const [users, setUsers] = useState(MOCK_USERS);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);

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
