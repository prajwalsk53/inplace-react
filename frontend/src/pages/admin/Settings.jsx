import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => setSettings(data));
  }, []);

  const update = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFlash(null);
    try {
      await api.put('/admin/settings', settings);
      setFlash({ type: 'success', msg: 'Settings saved successfully!' });
    } catch (err) {
      setFlash({ type: 'danger', msg: `Error saving settings: ${err.response?.data?.error || ''}` });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="loading-screen">Loading...</div>;

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <form onSubmit={save}>
        <div className="panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div>
              <h3>Gmail SMTP — Email Configuration</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                Used for all outgoing emails (OTP, registration approval, notifications). Requires a Gmail App Password — not your account password.
              </p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="form-group">
                <label>SMTP Host</label>
                <input type="text" value={settings.smtp_host} onChange={update('smtp_host')} placeholder="smtp.gmail.com" />
              </div>
              <div className="form-group">
                <label>SMTP Port</label>
                <input type="number" value={settings.smtp_port} onChange={update('smtp_port')} placeholder="587" />
                <small style={{ color: 'var(--muted)' }}>587 for STARTTLS (recommended)</small>
              </div>
              <div className="form-group">
                <label>Gmail Address (Username)</label>
                <input type="email" value={settings.smtp_user} onChange={update('smtp_user')} placeholder="yourapp@gmail.com" />
              </div>
              <div className="form-group">
                <label>Gmail App Password</label>
                <input type="password" value={settings.smtp_pass} onChange={update('smtp_pass')} placeholder="xxxx xxxx xxxx xxxx" autoComplete="new-password" />
                <small style={{ color: 'var(--muted)' }}>Generate at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)' }}>Google Account → App Passwords</a></small>
              </div>
              <div className="form-group">
                <label>From Email</label>
                <input type="email" value={settings.from_email} onChange={update('from_email')} placeholder="noreply@yourapp.com" />
              </div>
              <div className="form-group">
                <label>From Name</label>
                <input type="text" value={settings.from_name} onChange={update('from_name')} placeholder="InPlace" />
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div>
              <h3>Google reCAPTCHA v2</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                Protects the login page from bots. Get keys at <a href="https://www.google.com/recaptcha/admin/create" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)' }}>google.com/recaptcha</a> — select <strong>reCAPTCHA v2 "I'm not a robot"</strong>.
              </p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Site Key <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(public — used in HTML)</span></label>
                <input type="text" value={settings.recaptcha_site_key} onChange={update('recaptcha_site_key')} placeholder="6Lc..." />
              </div>
              <div className="form-group">
                <label>Secret Key <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(server-side verification)</span></label>
                <input type="password" value={settings.recaptcha_secret_key} onChange={update('recaptcha_secret_key')} placeholder="6Lc..." autoComplete="new-password" />
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div>
              <h3>Google Calendar API</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                Used to sync placement visits and meetings. Get credentials at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)' }}>Google Cloud Console</a> — enable the Calendar API and create an OAuth 2.0 Client ID.
              </p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="form-group">
                <label>API Key</label>
                <input type="password" value={settings.google_calendar_key} onChange={update('google_calendar_key')} placeholder="AIza..." autoComplete="new-password" />
              </div>
              <div className="form-group">
                <label>OAuth Client ID</label>
                <input type="text" value={settings.google_calendar_client_id} onChange={update('google_calendar_client_id')} placeholder="xxxxxxxx.apps.googleusercontent.com" />
              </div>
              <div className="form-group full-col">
                <label>OAuth Client Secret</label>
                <input type="password" value={settings.google_calendar_client_secret} onChange={update('google_calendar_client_secret')} placeholder="GOCSPX-..." autoComplete="new-password" />
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div>
              <h3>Leaflet.js Map — Tile URL</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                The tile layer URL used by the placement map view. Default is OpenStreetMap (free, no key required). Use <code>{'{s}'}</code>, <code>{'{z}'}</code>, <code>{'{x}'}</code>, <code>{'{y}'}</code> placeholders.
              </p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-group">
              <label>Tile URL</label>
              <input type="text" value={settings.leaflet_tile_url} onChange={update('leaflet_tile_url')} placeholder="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.875rem' }} />
              <small style={{ color: 'var(--muted)' }}>Alternatives: CartoDB Light — <code style={{ fontSize: '0.8rem' }}>https://{'{s}'}.basemaps.cartocdn.com/light_all/{'{z}'}/{'{x}'}/{'{y}'}{'{r}'}.png</code></small>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingBottom: '2rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/dashboard')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}
