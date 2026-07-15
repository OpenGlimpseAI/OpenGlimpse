import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile, deleteUserAccount } from '../../services/api.js';

function getAuthUser() {
  const raw = localStorage.getItem('authUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function StaffProfile() {
  const navigate = useNavigate();
  const currentUser = getAuthUser();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      const payload = { name, email };
      if (password) payload.password = password;

      const data = await updateUserProfile(payload, currentUser.token);
      localStorage.setItem('authUser', JSON.stringify({ ...currentUser, ...data, token: currentUser.token }));
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
      await deleteUserAccount({}, currentUser.token);
      localStorage.removeItem('authUser');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Account deletion failed');
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header>
          <h1>Welcome, {currentUser.name}</h1>
          <p>Your account role is {currentUser.role}.</p>
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
      </section>
    </main>
  );
}
