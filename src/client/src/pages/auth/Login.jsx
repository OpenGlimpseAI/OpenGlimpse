import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authLogin } from '../../services/api.js';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const data = await authLogin({ email, password });
      localStorage.setItem('authUser', JSON.stringify(data));
      navigate('/');
    } catch (err) {
      setError(err.message || 'Unable to login');
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Login</h1>
        <form onSubmit={handleSubmit} className="auth-form">
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
          <button className="auth-button" type="submit">Login</button>
        </form>
        <p className="auth-small-note">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </section>
    </main>
  );
}
