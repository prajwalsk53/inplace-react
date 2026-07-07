import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../styles/login.css';

const STRENGTH_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'];
const STRENGTH_WIDTHS = ['20%', '40%', '60%', '80%', '100%'];
const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

function passwordStrength(pwd) {
  let strength = 0;
  if (pwd.length >= 8) strength++;
  if (/[A-Z]/.test(pwd)) strength++;
  if (/[a-z]/.test(pwd)) strength++;
  if (/\d/.test(pwd)) strength++;
  if (/[^A-Za-z0-9]/.test(pwd)) strength++;
  return strength;
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', otp: '', fullName: '', academicYear: '', programmeType: '', password: '', confirmPassword: '' });
  const [emailReadOnly, setEmailReadOnly] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpButtonLabel, setOtpButtonLabel] = useState('Send OTP');
  const [emailMsg, setEmailMsg] = useState(null); // { ok, text }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const strength = passwordStrength(form.password);
  const passwordStrong = form.password.length >= 8 && /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) && /\d/.test(form.password);
  const passwordsMatch = form.confirmPassword !== '' && form.password === form.confirmPassword;
  const otpEntered = form.otp.length === 6;
  const canSubmit = otpEntered && passwordStrong && passwordsMatch;

  const sendOtp = async () => {
    setEmailReadOnly(false);
    const email = form.email.trim();
    if (!email) {
      setEmailMsg({ ok: false, text: 'Please enter your email' });
      return;
    }
    if (!/@student\.le\.ac\.uk$/i.test(email)) {
      setEmailMsg({ ok: false, text: 'Must be a Leicester student email (@student.le.ac.uk)' });
      return;
    }
    setOtpSending(true);
    setOtpButtonLabel('Sending...');
    try {
      const { data } = await api.post('/auth/register/send-otp', { email });
      setEmailMsg({ ok: true, text: data.message });
      setOtpVisible(true);
      setEmailReadOnly(true);
      let countdown = 60;
      const interval = setInterval(() => {
        countdown--;
        setOtpButtonLabel(`Resend (${countdown}s)`);
        if (countdown <= 0) {
          clearInterval(interval);
          setOtpSending(false);
          setOtpButtonLabel('Resend OTP');
        }
      }, 1000);
    } catch (err) {
      setEmailMsg({ ok: false, text: err.response?.data?.error || 'Error sending OTP' });
      setOtpSending(false);
      setOtpButtonLabel('Send OTP');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register', { ...form, role: 'STUDENT', recaptchaToken: null });
      setSuccess('Registration successful! Your account is pending admin approval. You will receive an email once approved.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-container">
        <div className="auth-left">
          <Link to="/login" className="back-link" style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
            ← Back to Home
          </Link>
          <div className="illustration">
            <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="180" r="60" fill="#e8a020" />
              <ellipse cx="200" cy="150" rx="40" ry="45" fill="white" />
              <rect x="160" y="240" width="80" height="100" rx="10" fill="#e8a020" />
              <rect x="120" y="280" width="160" height="100" rx="8" fill="#1a2d4d" />
              <rect x="130" y="290" width="140" height="80" rx="4" fill="#10b981" opacity="0.2" />
              <line x1="160" y1="320" x2="240" y2="320" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
              <rect x="300" y="200" width="60" height="80" rx="4" fill="white" transform="rotate(10 330 240)" />
              <line x1="315" y1="220" x2="345" y2="225" stroke="#e8a020" strokeWidth="2" />
              <line x1="315" y1="235" x2="340" y2="239" stroke="#e8a020" strokeWidth="2" />
              <circle cx="100" cy="120" r="35" fill="#10b981" />
              <path d="M85 120 L95 130 L115 105" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>Join InPlace Today</h2>
          <p>Register your account to begin your industrial placement journey at the University of Leicester.</p>
        </div>

        <div className="auth-right">
          <div className="form-header">
            <h1>Create Your Account</h1>
            <p>Already registered? <Link to="/login">Sign in here</Link></p>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={submit}>
            <div className="form-group">
              <label>University Email <span style={{ color: '#e74c3c' }}>*</span></label>
              <div className="otp-group">
                <input type="email" className="form-input" placeholder="your.name@student.le.ac.uk" value={form.email} onChange={update('email')} readOnly={emailReadOnly} required />
                <button type="button" className="btn-send-otp" onClick={sendOtp} disabled={otpSending}>{otpButtonLabel}</button>
              </div>
              {emailMsg && <small className={`status ${emailMsg.ok ? 'ok' : 'err'}`}>{emailMsg.ok ? '✓ ' : '✗ '}{emailMsg.text}</small>}
            </div>

            {otpVisible && (
              <div className="form-group">
                <label>Enter OTP <span style={{ color: '#e74c3c' }}>*</span></label>
                <input type="text" className="form-input" placeholder="Enter 6-digit code" maxLength={6} pattern="[0-9]{6}" value={form.otp} onChange={update('otp')} autoFocus />
                {form.otp.length > 0 && (
                  <small className={`status ${otpEntered ? 'ok' : ''}`}>{otpEntered ? '✓ OTP entered' : ''}</small>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Full Name <span style={{ color: '#e74c3c' }}>*</span></label>
              <input type="text" className="form-input" placeholder="John Smith" value={form.fullName} onChange={update('fullName')} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Academic Year <span style={{ color: '#e74c3c' }}>*</span></label>
                <select className="form-select" value={form.academicYear} onChange={update('academicYear')} required>
                  <option value="">Select year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year (Integrated Masters)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Programme Type <span style={{ color: '#e74c3c' }}>*</span></label>
                <select className="form-select" value={form.programmeType} onChange={update('programmeType')} required>
                  <option value="">Select programme</option>
                  <option value="BSc">BSc (Bachelors)</option>
                  <option value="MEng">MEng (Integrated Masters)</option>
                  <option value="MSc">MSc (Masters)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Password <span style={{ color: '#e74c3c' }}>*</span></label>
              <input type="password" className="form-input" placeholder="Create a strong password" value={form.password} onChange={update('password')} required />
              <div className="password-strength">
                <div className="password-strength-bar" style={{ width: form.password ? STRENGTH_WIDTHS[strength - 1] || '0%' : '0%', background: form.password ? STRENGTH_COLORS[strength - 1] || '#ef4444' : 'transparent' }} />
              </div>
              {form.password && (
                <small className={`status ${strength >= 4 ? 'ok' : 'err'}`}>
                  {strength >= 4 ? `✓ ${STRENGTH_LABELS[strength - 1]}` : '✗ Use 8+ chars, uppercase, lowercase, number & symbol'}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Confirm Password <span style={{ color: '#e74c3c' }}>*</span></label>
              <input type="password" className="form-input" placeholder="Re-enter your password" value={form.confirmPassword} onChange={update('confirmPassword')} required />
              {form.confirmPassword && (
                <small className={`status ${passwordsMatch ? 'ok' : 'err'}`}>{passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}</small>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={!canSubmit || loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="forgot-link-row">
            Registering as an employer? <Link to="/provider-register">Provider registration</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
