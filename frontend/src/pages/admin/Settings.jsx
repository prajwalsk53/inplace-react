import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => setSettings(data));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/admin/settings', settings);
      setMessage('Settings saved.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h3 className="section-title">System Settings</h3>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
        reCAPTCHA verification on login/registration is skipped automatically until keys are set here.
      </p>
      {message && <div className="success-banner">{message}</div>}
      <form onSubmit={save}>
        <div className="field">
          <label>reCAPTCHA site key</label>
          <input value={settings.RECAPTCHA_SITE_KEY || ''} onChange={(e) => setSettings((s) => ({ ...s, RECAPTCHA_SITE_KEY: e.target.value }))} />
        </div>
        <div className="field">
          <label>reCAPTCHA secret key</label>
          <input value={settings.RECAPTCHA_SECRET_KEY || ''} onChange={(e) => setSettings((s) => ({ ...s, RECAPTCHA_SECRET_KEY: e.target.value }))} />
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
      </form>
    </div>
  );
}
