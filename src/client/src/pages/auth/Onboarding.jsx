import { Link } from 'react-router-dom';

export default function Onboarding() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Welcome to OpenGlimpse</h1>
        <p>Access your profile, manage staff, and continue with event registration.</p>
        <div className="auth-actions">
          <Link className="auth-button" to="/login">Login</Link>
          <Link className="auth-button auth-button-secondary" to="/signup">Sign Up</Link>
        </div>
      </section>
    </main>
  );
}
