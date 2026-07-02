import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

const DEMO_ACCOUNTS = [
  { icon: '🛡️', role: 'Admin', email: 'admin@inplace.com' },
  { icon: '👩‍🏫', role: 'Tutor', email: 'tutor@inplace.com' },
  { icon: '🏢', role: 'Provider', email: 'provider@inplace.com' },
  { icon: '🎓', role: 'Director', email: 'director@inplace.com' },
  { icon: '🧑‍🎓', role: 'Student', email: 'student@inplace.com' },
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
  const [showPassword, setShowPassword] = useState(false);
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

  const fillDemoLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password');
  };

  const isPending = error?.toLowerCase().includes('pending');

  return (
    <div className="login-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="illustration">
            <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M200 100 L280 130 L280 220 Q280 280 200 320 Q120 280 120 220 L120 130 Z" fill="#e8a020" opacity="0.2" />
              <path d="M200 120 L260 140 L260 210 Q260 260 200 290 Q140 260 140 210 L140 140 Z" fill="#e8a020" />
              <path d="M170 200 L190 220 L230 170" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="100" cy="120" r="20" fill="white" opacity="0.1" />
              <circle cx="300" cy="280" r="30" fill="white" opacity="0.1" />
              <circle cx="320" cy="150" r="15" fill="white" opacity="0.15" />
            </svg>
          </div>
          <h2>Welcome Back!</h2>
          <p>Sign in to access your placement management dashboard and continue your professional journey.</p>
        </div>

        <div className="auth-right">
          <div className="form-header">
            <h1>Sign In</h1>
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
          </div>

          {error && <div className={`alert ${isPending ? 'alert-warning' : 'alert-danger'}`}>{error}</div>}

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="your.name@student.le.ac.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="forgot-link-row">
              <Link to="/forgot-password">Forgot your password?</Link>
            </div>
          </form>

          <div className="demo-section">
            <div className="demo-heading">Demo Accounts — click to fill</div>
            <div className="demo-grid">
              {DEMO_ACCOUNTS.map((demo) => (
                <button key={demo.email} type="button" className="demo-item" onClick={() => fillDemoLogin(demo.email)}>
                  <div className="demo-avatar">{demo.icon}</div>
                  <div className="demo-info">
                    <div className="demo-role">{demo.role}</div>
                    <div className="demo-email">{demo.email}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
