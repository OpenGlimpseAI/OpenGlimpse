import { useState } from 'react';
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

export default function UserDashboard({ currentUser }) {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [birthDate, setBirthDate] = useState(currentUser.birthDate || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const authToken = getAuthToken();

  const handleLogout = () => {
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      const payload = { name, email, birthDate };
      if (password) payload.password = password;

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
        setError(data.error || 'Unable to update profile');
        return;
      }

      localStorage.setItem('authUser', JSON.stringify({ ...currentUser, ...data, token: authToken }));
      setStatus('Profile updated successfully');
      setPassword('');
    } catch (err) {
      setError('Profile update failed');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete your account? This cannot be undone.');
    if (!confirmed) return;

    try {
      const response = await fetch(API_BASE, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Unable to delete account');
        return;
      }

      localStorage.removeItem('authUser');
      navigate('/login');
    } catch (err) {
      setError('Account deletion failed');
    }
  };

  return (
    <main className="page-shell">
      <section className="profile-card">
        <header>
          <h1>Welcome, {currentUser.name}</h1>
          <p>Your account is registered as a normal user.</p>
        </header>

        <form onSubmit={handleSave} className="profile-form">
          <label>
            Full Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Birth Date
            <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          </label>
          <label>
            New Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="error-text">{error}</p>}
          {status && <p className="success-text">{status}</p>}
          <button type="submit" className="button">Save Profile</button>
        </form>

        <div className="profile-actions">
          <button className="button secondary" onClick={handleLogout}>Logout</button>
          <button className="button danger" onClick={handleDelete}>Delete Account</button>
        </div>
      </section>
    </main>
  );
}
