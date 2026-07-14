import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import StaffList from '../../components/admin/StaffList';
import StaffForm from '../../components/admin/StaffForm';
//temp list for frontend tests
const MOCK_STAFF = [
    { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' },
    { id: '2', name: 'John Staff', email: 'john@example.com', role: 'staff' },
];

export default function AdminPage() {
    const [staff, setStaff] = useState(MOCK_STAFF);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);

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
        setStaff((prev) => prev.filter((s) => s.id !== member.id));
    };

    const handleSave = (data) => {
        if (editing) {
            setStaff((prev) =>
                prev.map((s) => (s.id === editing.id ? { ...s, name: data.name, email: data.email, role: data.role } : s))
            );
        } else {
            const newMember = {
                id: String(Date.now()),
                name: data.name,
                email: data.email,
                role: data.role,
            };
            setStaff((prev) => [...prev, newMember]);
        }
        setFormOpen(false);
    };

    return (
        <main className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Staff Management</h1>
                <button className="admin-add-btn" onClick={handleAdd}>
                    <AddIcon sx={{ fontSize: 18 }} />
                    Add Staff
                </button>
            </header>
            <div className="admin-list-shell">
                <StaffList staff={staff} onEdit={handleEdit} onDelete={handleDelete} />
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
