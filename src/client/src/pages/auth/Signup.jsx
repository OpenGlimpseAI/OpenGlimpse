import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authSignup } from '../../services/api.js';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await authSignup({ name, email, password });
      setMessage('Account created. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setError(err.message || 'Signup failed');
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Staff Sign Up</h1>
        <p className="auth-small-note">Create a staff account to manage the application</p>
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
          {error && <p className="auth-error-text">{error}</p>}
          {message && <p className="auth-success-text">{message}</p>}
          <button className="auth-button" type="submit">Sign Up</button>
        </form>
        <p className="auth-small-note">
          Already have an account? <a href="/login">Login</a>
        </p>
      </section>
    </main>
  );
}
