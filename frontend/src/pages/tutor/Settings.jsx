import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function TutorSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/tutor/settings').then(({ data }) => setSettings(data));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/tutor/settings', settings);
      setMessage('Settings saved.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 className="section-title">Preferences</h3>
      {message && <div className="success-banner">{message}</div>}
      <form onSubmit={save}>
        <div className="field">
          <label>Visit reminder (days before)</label>
          <input type="number" value={settings.visitReminderDays} onChange={(e) => setSettings((s) => ({ ...s, visitReminderDays: Number(e.target.value) }))} />
        </div>
        <div className="field">
          <label>
            <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => setSettings((s) => ({ ...s, emailNotifications: e.target.checked }))} /> Email notifications
          </label>
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
      </form>
    </div>
  );
}
