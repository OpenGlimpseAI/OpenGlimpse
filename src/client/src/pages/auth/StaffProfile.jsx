import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { updateStaffProfile, deleteStaffAccount } from '../../services/api.js';

function getAuthStaff() {
  const raw = localStorage.getItem('authStaff');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function StaffProfile() {
  const navigate = useNavigate();
  const currentStaff = getAuthStaff();

  const [name, setName] = useState(currentStaff?.name || '');
  const [email, setEmail] = useState(currentStaff?.email || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  if (!currentStaff) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('authStaff');
    navigate('/login');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      const payload = { name, email };
      if (password) payload.password = password;

      const data = await updateStaffProfile(payload, currentStaff.token);
      localStorage.setItem('authStaff', JSON.stringify({ ...currentStaff, ...data, token: currentStaff.token }));
      setStatus('Profile updated successfully');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Profile update failed');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete your account? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteStaffAccount({}, currentStaff.token);
      localStorage.removeItem('authStaff');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Account deletion failed');
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header>
          <h1>Welcome, {currentStaff.name}</h1>
          <p>Your account role is {currentStaff.role}.</p>
        </header>

        <form onSubmit={handleSave} className="auth-form">
          <label>
            Full Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            New Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="auth-error-text">{error}</p>}
          {status && <p className="auth-success-text">{status}</p>}
          <button type="submit" className="auth-button">Save Profile</button>
        </form>

        <div className="auth-actions">
          <button className="auth-button auth-button-secondary" onClick={handleLogout}>Logout</button>
          <button className="auth-button auth-button-danger" onClick={handleDelete}>Delete Account</button>
        </div>
        {currentStaff.role === 'staff' && (
          <p className="auth-small-note">
            <Link to="/staff">Manage participants</Link>
          </p>
        )}
      </section>
    </main>
  );
}
