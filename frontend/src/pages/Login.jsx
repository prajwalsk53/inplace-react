import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'student@inplace.com' },
  { role: 'Tutor', email: 'tutor@inplace.com' },
  { role: 'Provider', email: 'provider@inplace.com' },
  { role: 'Director', email: 'director@inplace.com' },
  { role: 'Admin', email: 'admin@inplace.com' },
];

const dashboardRoute = {
  STUDENT: '/student/dashboard',
  TUTOR: '/tutor/dashboard',
  PROVIDER: '/provider/dashboard',
  DIRECTOR: '/director/dashboard',
  ADMIN: '/admin/users',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password, null);
      navigate(dashboardRoute[user.role] || '/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">InPlace</div>
        <h1>Sign in</h1>
        <p className="subtitle">Placement management for students, tutors and providers</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <div className="auth-footer">
          No account? <Link to="/register">Register as student/tutor</Link> · <Link to="/provider-register">Register as provider</Link>
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Demo accounts (password: "password")</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => { setEmail(acc.email); setPassword('password'); }}
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
