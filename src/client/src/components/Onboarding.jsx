import { Link } from 'react-router-dom';

export default function Onboarding() {
  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Welcome to OpenGlimpse</h1>
        <p>Access your profile, manage users, and continue with event registration.</p>
        <div className="auth-actions">
          <Link className="button" to="/login">Login</Link>
          <Link className="button secondary" to="/signup">Sign Up</Link>
        </div>
      </section>
    </main>
  );
}
