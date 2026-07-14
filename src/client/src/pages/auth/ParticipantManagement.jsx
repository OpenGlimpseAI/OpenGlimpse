import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStaff, createStaffAccount, updateStaffProfile, deleteStaffAccount } from '../../services/api.js';

function getAuthStaff() {
  const raw = localStorage.getItem('authStaff');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const emptyForm = { name: '', email: '', password: '', role: 'participant' };

export default function ParticipantManagement() {
  const navigate = useNavigate();
  const currentStaff = getAuthStaff();

  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  if (!currentStaff) {
    navigate('/login');
    return null;
  }
  if (currentStaff.role !== 'staff') {
    navigate('/profile');
    return null;
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await getAllStaff(currentStaff.token);
      setAccounts(data);
    } catch (err) {
      setError(err.message || 'Unable to load accounts');
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      await createStaffAccount(form, currentStaff.token);
      setStatus('Account created successfully');
      setForm(emptyForm);
      fetchAccounts();
    } catch (err) {
      setError(err.message || 'Create account failed');
    }
  };

  const handleSelect = (account) => {
    setSelected(account);
    setForm({
      name: account.name || '',
      email: account.email || '',
      password: '',
      role: account.role || 'participant',
    });
    setStatus('Editing ' + account.name);
    setError('');
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setError('');
    setStatus('');

    try {
      const payload = { targetId: selected.id, name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;

      await updateStaffProfile(payload, currentStaff.token);
      setStatus('Account updated successfully');
      setSelected(null);
      setForm(emptyForm);
      fetchAccounts();
    } catch (err) {
      setError(err.message || 'Update failed');
    }
  };

  const handleDelete = async (accountId) => {
    const confirmed = window.confirm('Delete this account?');
    if (!confirmed) return;
    setError('');
    setStatus('');

    try {
      await deleteStaffAccount({ targetId: accountId }, currentStaff.token);
      setStatus('Account deleted successfully');
      if (selected?.id === accountId) {
        setSelected(null);
        setForm(emptyForm);
      }
      fetchAccounts();
    } catch (err) {
      setError(err.message || 'Delete account failed');
    }
  };

  const handleCancelEdit = () => {
    setSelected(null);
    setForm(emptyForm);
    setStatus('');
    setError('');
  };

  return (
    <main className="staff-mgmt-page">
      <header className="staff-mgmt-header">
        <h1>Participant Management</h1>
        <p>Welcome back, {currentStaff.name}. Manage participant and staff accounts below.</p>
      </header>

      {error && <p className="auth-error-text">{error}</p>}
      {status && <p className="auth-success-text">{status}</p>}

      <div className="staff-mgmt-grid">
        <section className="staff-mgmt-panel staff-mgmt-panel-main">
          <h2>Accounts</h2>
          {accounts.length === 0 ? (
            <p className="auth-small-note">No accounts yet.</p>
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td>
                    <td>{account.email}</td>
                    <td>{account.role}</td>
                    <td>
                      <button className="auth-button auth-button-secondary" type="button" onClick={() => handleSelect(account)}>
                        Edit
                      </button>
                      <button className="auth-button auth-button-danger" type="button" onClick={() => handleDelete(account.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="staff-mgmt-panel staff-mgmt-panel-form">
          <h2>{selected ? 'Edit Account' : 'Create Account'}</h2>
          <form onSubmit={selected ? handleUpdate : handleCreate} className="auth-form">
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
                <option value="staff">Staff</option>
              </select>
            </label>
            <button className="auth-button" type="submit">
              {selected ? 'Update Account' : 'Create Account'}
            </button>
            {selected && (
              <button type="button" className="auth-button auth-button-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
