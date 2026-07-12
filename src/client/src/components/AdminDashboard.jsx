import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3001/api/user';

function getAuthToken() {
  const raw = localStorage.getItem('authUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw).token;
  } catch {
    return null;
  }
}

const emptyForm = { name: '', email: '', password: '', role: 'participant', birthDate: '' };

export default function AdminDashboard({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const authToken = getAuthToken();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/all`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to load participants');
        return;
      }
      setUsers(data);
    } catch (err) {
      setError('Unable to load participants');
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to create participant');
        return;
      }
      setStatus('Participant created successfully');
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      setError('Create participant failed');
    }
  };

  const handleSelect = (user) => {
    setSelected(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'participant',
      birthDate: user.birthDate || '',
    });
    setStatus('Editing ' + user.name);
    setError('');
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setError('');
    setStatus('');

    try {
      const payload = { targetId: selected.id, name: form.name, email: form.email, birthDate: form.birthDate, role: form.role };
      if (form.password) {
        payload.password = form.password;
      }

      const response = await fetch(API_BASE, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to update participant');
        return;
      }
      setStatus('Participant updated successfully');
      setSelected(null);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      setError('Update failed');
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = window.confirm('Delete this account?');
    if (!confirmed) return;
    setError('');
    setStatus('');

    try {
      const response = await fetch(API_BASE, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetId: userId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to delete participant');
        return;
      }
      setStatus('Participant deleted successfully');
      if (selected?.id === userId) {
        setSelected(null);
        setForm(emptyForm);
      }
      fetchUsers();
    } catch (err) {
      setError('Delete participant failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  return (
    <main className="page-shell">
      <section className="profile-card">
        <header>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {currentUser.name}. Manage participants below.</p>
        </header>

        <div className="dashboard-grid">
          <div className="panel">
            <h2>Participants</h2>
            {error && <p className="error-text">{error}</p>}
            {status && <p className="success-text">{status}</p>}
            <div className="user-list">
              {users.length === 0 ? (
                <p>No participants yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>
                          <button className="button small" type="button" onClick={() => handleSelect(user)}>
                            Edit
                          </button>
                          <button className="button danger small" type="button" onClick={() => handleDelete(user.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="panel">
            <h2>{selected ? 'Edit Participant' : 'Create Participant'}</h2>
            <form onSubmit={selected ? handleUpdate : handleCreate} className="profile-form">
              <label>
                Full Name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={selected ? 'Leave blank to keep current password' : ''}
                  required={!selected}
                />
              </label>
              <label>
                Role
                <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                  <option value="participant">Participant</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label>
                Birth Date
                <input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
              </label>
              <button className="button" type="submit">
                {selected ? 'Update Participant' : 'Create Participant'}
              </button>
              {selected && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setSelected(null);
                    setForm(emptyForm);
                    setStatus('');
                    setError('');
                  }}
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="profile-actions">
          <button className="button secondary" onClick={handleLogout}>Logout</button>
        </div>
      </section>
    </main>
  );
}
