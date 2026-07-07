import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import '../styles/login.css';

const LEVELS = [
  { pct: '20%', color: '#ef4444', text: 'Very weak' },
  { pct: '40%', color: '#f97316', text: 'Weak' },
  { pct: '60%', color: '#eab308', text: 'Fair' },
  { pct: '80%', color: '#84cc16', text: 'Strong' },
  { pct: '100%', color: '#10b981', text: 'Very strong' },
];

function strengthOf(val) {
  let score = 0;
  if (val.length >= 8) score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  return LEVELS[Math.max(0, score - 1)] || { pct: '0%', color: '#e8dcc8', text: '' };
}

function PasswordField({ label, placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="password-wrapper">
        <input
          type={show ? 'text' : 'password'}
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          minLength={8}
        />
        <button type="button" className="password-toggle" onClick={() => setShow((s) => !s)} aria-label="Toggle password visibility">
          {show ? (
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
  );
}

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get(`/auth/reset-password/${token}`)
      .then(() => setTokenValid(true))
      .catch((err) => {
        setTokenValid(false);
        setError(err.response?.data?.error || 'This password reset link is invalid or has expired. Please request a new one.');
      })
      .finally(() => setChecking(false));
  }, [token]);

  const strength = strengthOf(newPassword);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/reset-password', { token, newPassword, confirmPassword });
      setSuccess(data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-container">
        <div className="auth-left">
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🔒</div>
          </div>
          <h2>New Password</h2>
          <p>Choose a strong password that you haven't used before.</p>
        </div>

        <div className="auth-right">
          <div className="form-header">
            <h1>Reset Password</h1>
            {!checking && !tokenValid && (
              <p><Link to="/forgot-password">Request a new reset link</Link></p>
            )}
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
              {!tokenValid && <><br /><Link to="/forgot-password">Request a new reset link →</Link></>}
            </div>
          )}
          {success && <div className="alert alert-success">{success}</div>}

          {checking ? (
            <div className="loading-screen" style={{ minHeight: 100 }}>Checking link...</div>
          ) : tokenValid && !success ? (
            <form onSubmit={submit}>
              <div>
                <PasswordField label="New Password" placeholder="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <div className="password-strength" style={{ marginTop: '-0.75rem', marginBottom: '0.25rem' }}>
                  <div className="password-strength-bar" style={{ width: newPassword ? strength.pct : '0%', background: newPassword ? strength.color : 'transparent' }} />
                </div>
                {newPassword && <small style={{ display: 'block', marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--muted, #6b7a8d)' }}>{strength.text}</small>}
              </div>

              <PasswordField label="Confirm New Password" placeholder="Repeat your new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Setting password...' : 'Set New Password'}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
