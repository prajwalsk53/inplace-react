import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ProviderMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/tutor/provider-meetings').then(({ data }) => setMeetings(data));
  useEffect(() => {
    load();
    api.get('/tutor/providers').then(({ data }) => setCompanies(data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/tutor/provider-meetings', { companyId, purpose, scheduledAt: scheduledAt || undefined });
      setPurpose(''); setScheduledAt(''); setCompanyId('');
      load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="section-title">Request a Meeting</h3>
        <form onSubmit={submit}>
          <div className="field">
            <label>Company</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
              <option value="">Select a company</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Purpose</label><input value={purpose} onChange={(e) => setPurpose(e.target.value)} required /></div>
          <div className="field"><label>Proposed date/time (optional)</label><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Requesting...' : 'Request meeting'}</button>
        </form>
      </div>
      <div className="card">
        <h3 className="section-title">Your Meetings</h3>
        {meetings.length === 0 ? <div className="empty-state">No meetings requested yet</div> : meetings.map((m) => (
          <div key={m.id} className="list-item">
            <div>
              <div style={{ fontWeight: 600 }}>{m.company.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{m.purpose}</div>
              {m.scheduledAt && <div style={{ fontSize: 13 }}>{new Date(m.scheduledAt).toLocaleString('en-GB')}</div>}
            </div>
            <span className="badge badge-muted">{m.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
