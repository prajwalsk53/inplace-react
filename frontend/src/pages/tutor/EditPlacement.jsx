import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function EditPlacement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [placement, setPlacement] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = () => api.get(`/tutor/placements/${id}`).then(({ data }) => {
    setPlacement(data);
    setForm({
      roleTitle: data.roleTitle, jobDescription: data.jobDescription || '',
      startDate: data.startDate ? data.startDate.slice(0, 10) : '', endDate: data.endDate ? data.endDate.slice(0, 10) : '',
      salary: data.salary || '', workingPattern: data.workingPattern || '',
      supervisorName: data.supervisorName || '', supervisorEmail: data.supervisorEmail || '', supervisorPhone: data.supervisorPhone || '',
      status: data.status,
    });
  });
  useEffect(() => { load(); }, [id]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/tutor/placements/${id}`, form);
      setMessage('Placement updated.');
      load();
    } finally {
      setSaving(false);
    }
  };

  const terminate = async () => {
    if (!confirm('Terminate this placement?')) return;
    const reason = prompt('Reason for termination:') || '';
    await api.post(`/tutor/placements/${id}/terminate`, { reason });
    navigate('/tutor/placements');
  };

  if (!placement || !form) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="section-title">Edit Placement — {placement.student.fullName}</h3>
        {message && <div className="success-banner">{message}</div>}
        <form onSubmit={save}>
          <div className="field"><label>Role title</label><input value={form.roleTitle} onChange={update('roleTitle')} required /></div>
          <div className="field"><label>Job description</label><textarea rows={3} value={form.jobDescription} onChange={update('jobDescription')} /></div>
          <div className="grid-2">
            <div className="field"><label>Start date</label><input type="date" value={form.startDate} onChange={update('startDate')} /></div>
            <div className="field"><label>End date</label><input type="date" value={form.endDate} onChange={update('endDate')} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Salary</label><input type="number" value={form.salary} onChange={update('salary')} /></div>
            <div className="field"><label>Working pattern</label><input value={form.workingPattern} onChange={update('workingPattern')} /></div>
          </div>
          <div className="field"><label>Supervisor name</label><input value={form.supervisorName} onChange={update('supervisorName')} /></div>
          <div className="grid-2">
            <div className="field"><label>Supervisor email</label><input value={form.supervisorEmail} onChange={update('supervisorEmail')} /></div>
            <div className="field"><label>Supervisor phone</label><input value={form.supervisorPhone} onChange={update('supervisorPhone')} /></div>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={update('status')}>
              {['SUBMITTED', 'AWAITING_PROVIDER', 'AWAITING_TUTOR', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'TERMINATED'].map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            <button type="button" className="btn btn-danger" onClick={terminate}>Terminate</button>
          </div>
        </form>
      </div>

      <div>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="section-title">Visits ({placement.visits.length})</h3>
          {placement.visits.length === 0 ? <div className="empty-state">No visits yet</div> : placement.visits.map((v) => (
            <div key={v.id} className="list-item">
              <div>{new Date(v.scheduledAt).toLocaleDateString('en-GB')} — {v.visitType.replace('_', ' ')}</div>
              <span className="badge badge-muted">{v.status}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="section-title">Reflections ({placement.reflections.length})</h3>
          {placement.reflections.length === 0 ? <div className="empty-state">None yet</div> : placement.reflections.map((r) => (
            <div key={r.id} className="list-item"><div>{r.title}</div><span className="badge badge-muted">{r.status}</span></div>
          ))}
        </div>
        <div className="card">
          <h3 className="section-title">Change Requests ({placement.changeRequests.length})</h3>
          {placement.changeRequests.length === 0 ? <div className="empty-state">None yet</div> : placement.changeRequests.map((r) => (
            <div key={r.id} className="list-item"><div>{r.requestType.replace('_', ' ')}</div><span className="badge badge-muted">{r.status}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
