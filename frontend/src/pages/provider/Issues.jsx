import { useEffect, useState } from 'react';
import api from '../../api/axios';

const SEVERITY_BADGE = { low: 'badge-muted', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' };

export default function ProviderIssues() {
  const [issues, setIssues] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [form, setForm] = useState({ placementId: '', title: '', description: '', severity: 'medium' });
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/provider/issues').then(({ data }) => setIssues(data));
  useEffect(() => {
    load();
    api.get('/provider/placements').then(({ data }) => setPlacements(data.filter((p) => ['ACTIVE', 'APPROVED'].includes(p.status))));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/provider/issues', form);
      setForm({ placementId: '', title: '', description: '', severity: 'medium' });
      load();
    } finally {
      setLoading(false);
    }
  };

  const resolve = async (id) => {
    await api.put(`/provider/issues/${id}`, { status: 'resolved' });
    load();
  };

  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="section-title">Raise an Issue</h3>
        <form onSubmit={submit}>
          <div className="field">
            <label>Placement</label>
            <select value={form.placementId} onChange={(e) => setForm((f) => ({ ...f, placementId: e.target.value }))} required>
              <option value="">Select a placement</option>
              {placements.map((p) => <option key={p.id} value={p.id}>{p.student.fullName}</option>)}
            </select>
          </div>
          <div className="field"><label>Title</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
          <div className="field"><label>Description</label><textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required /></div>
          <div className="field">
            <label>Severity</label>
            <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Raise issue'}</button>
        </form>
      </div>
      <div className="card">
        <h3 className="section-title">Issues</h3>
        {issues.length === 0 ? <div className="empty-state">No issues raised</div> : issues.map((i) => (
          <div key={i.id} className="list-item" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{i.title}</strong> — {i.placement.student.fullName}
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{i.description}</div>
              </div>
              <span className={`badge ${SEVERITY_BADGE[i.severity]}`}>{i.severity}</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-muted">{i.status}</span>
              {i.status !== 'resolved' && i.status !== 'closed' && <button className="btn btn-outline btn-sm" onClick={() => resolve(i.id)}>Mark resolved</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
