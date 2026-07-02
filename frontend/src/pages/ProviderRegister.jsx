import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ProviderRegister() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    companyName: '', companyAddress: '', companySector: '', contactPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register', { ...form, role: 'PROVIDER', recaptchaToken: null });
      setSuccess('Registration received. You will be able to sign in once an admin approves your account.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="brand">InPlace</div>
        <h1>Provider registration</h1>
        <p className="subtitle">Register your organisation to host student placements</p>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Your name</label>
            <input value={form.fullName} onChange={update('fullName')} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={update('email')} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={update('password')} required minLength={6} />
          </div>
          <div className="field">
            <label>Company name</label>
            <input value={form.companyName} onChange={update('companyName')} required />
          </div>
          <div className="field">
            <label>Company address</label>
            <input value={form.companyAddress} onChange={update('companyAddress')} />
          </div>
          <div className="field">
            <label>Sector</label>
            <input value={form.companySector} onChange={update('companySector')} placeholder="e.g. Technology" />
          </div>
          <div className="field">
            <label>Contact phone</label>
            <input value={form.contactPhone} onChange={update('contactPhone')} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Submitting...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
