import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE = 'http://localhost:3001/api/user';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, birthDate }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to sign up');
        return;
      }

      setMessage('Account created. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setError('Signup request failed');
    }
  };

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Admin Sign Up</h1>
        <p className="small-note">Create an admin account to manage the application</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Full Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Birth Date
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <button className="button" type="submit">Create Account</button>
        </form>
        <p className="small-note">
          Already registered? <Link to="/login">Login</Link>.
        </p>
      </section>
    </main>
  );
}
