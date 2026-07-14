import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { staffSignup } from '../../services/api.js';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await staffSignup({ name, email, password });
      setMessage('Account created. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setError(err.message || 'Unable to sign up');
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
          <button className="auth-button" type="submit">Create Account</button>
        </form>
        <p className="auth-small-note">
          Already registered? <Link to="/login">Login</Link>.
        </p>
      </section>
    </main>
  );
}
