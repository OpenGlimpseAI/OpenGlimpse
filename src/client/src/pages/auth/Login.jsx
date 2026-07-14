import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { staffLogin } from '../../services/api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const data = await staffLogin({ email, password });
      localStorage.setItem('authStaff', JSON.stringify(data));
      navigate('/dashboard');
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
          New here? <Link to="/signup">Create an account</Link>.
        </p>
      </section>
    </main>
  );
}
