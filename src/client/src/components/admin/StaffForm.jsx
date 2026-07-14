import { useState, useEffect } from 'react';

export default function StaffForm({ open, onClose, onSave, initial }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('staff');

    const isEditing = !!initial;
    const needsCreds = role === 'admin' || role === 'staff';

    useEffect(() => {
        if (initial) {
            setName(initial.name);
            setEmail(initial.email || '');
            setRole(initial.role);
            setPassword('');
        } else {
            setName('');
            setEmail('');
            setPassword('');
            setRole('staff');
        }
    }, [initial, open]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, email, password, role });
    };

    return (
        <div className="admin-form-backdrop" onClick={onClose}>
            <div className="admin-form-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="admin-form-handle" />
                <h2 className="admin-form-title">{isEditing ? 'Edit User' : 'Add User'}</h2>
                <form className="admin-form-fields" onSubmit={handleSubmit}>
                    <div className="admin-form-field">
                        <label className="admin-form-label">Name</label>
                        <input
                            className="admin-form-input"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="admin-form-field">
                        <label className="admin-form-label">Role</label>
                        <select
                            className="admin-form-select"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="user">User</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    {needsCreds && (
                        <div className="admin-form-field">
                            <label className="admin-form-label">Email</label>
                            <input
                                className="admin-form-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    {needsCreds && !isEditing && (
                        <div className="admin-form-field">
                            <label className="admin-form-label">Password</label>
                            <input
                                className="admin-form-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="admin-form-actions">
                        <button type="button" className="admin-form-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="admin-form-save">{isEditing ? 'Save' : 'Add'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
