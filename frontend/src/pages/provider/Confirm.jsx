import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ProviderConfirmList() {
  const [placements, setPlacements] = useState([]);

  const load = () => api.get('/provider/placements').then(({ data }) => setPlacements(data.filter((p) => p.status === 'AWAITING_PROVIDER')));
  useEffect(() => { load(); }, []);

  const respond = async (id, decision) => {
    await api.post(`/provider/placements/${id}/confirm`, { decision });
    load();
  };

  return (
    <div className="card">
      <h3 className="section-title">Placements Awaiting Your Confirmation</h3>
      {placements.length === 0 ? <div className="empty-state">Nothing pending confirmation</div> : placements.map((p) => (
        <div key={p.id} className="list-item">
          <div>
            <strong>{p.student.fullName}</strong> — {p.roleTitle}
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.student.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => respond(p.id, 'approve')}>Confirm</button>
            <button className="btn btn-danger btn-sm" onClick={() => respond(p.id, 'reject')}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
