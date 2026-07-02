import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ProviderTerminate() {
  const [placements, setPlacements] = useState([]);
  const [reasonById, setReasonById] = useState({});
  const [message, setMessage] = useState(null);

  const load = () => api.get('/provider/placements').then(({ data }) => setPlacements(data.filter((p) => ['ACTIVE', 'APPROVED'].includes(p.status))));
  useEffect(() => { load(); }, []);

  const flag = async (id) => {
    await api.post(`/provider/placements/${id}/flag-termination`, { reason: reasonById[id] || '' });
    setMessage('Termination request sent to the tutor for review.');
    load();
  };

  return (
    <div className="card">
      <h3 className="section-title">Flag a Placement for Termination</h3>
      <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 14 }}>
        This raises a request with the student's tutor, who will review and confirm termination.
      </p>
      {message && <div className="success-banner">{message}</div>}
      {placements.length === 0 ? <div className="empty-state">No active placements</div> : placements.map((p) => (
        <div key={p.id} className="list-item" style={{ display: 'block' }}>
          <strong>{p.student.fullName}</strong> — {p.roleTitle}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <input
              placeholder="Reason"
              value={reasonById[p.id] || ''}
              onChange={(e) => setReasonById((r) => ({ ...r, [p.id]: e.target.value }))}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
            <button className="btn btn-danger btn-sm" onClick={() => flag(p.id)}>Flag for termination</button>
          </div>
        </div>
      ))}
    </div>
  );
}
