import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function TutorRequests() {
  const [requests, setRequests] = useState([]);
  const [notesById, setNotesById] = useState({});

  const load = () => api.get('/tutor/requests').then(({ data }) => setRequests(data));
  useEffect(() => { load(); }, []);

  const respond = async (id, decision) => {
    await api.post(`/tutor/requests/${id}/respond`, { decision, reviewNotes: notesById[id] || '' });
    load();
  };

  return (
    <div className="card">
      <h3 className="section-title">Change Requests</h3>
      {requests.length === 0 ? <div className="empty-state">No requests to review</div> : requests.map((r) => (
        <div key={r.id} className="list-item" style={{ display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{r.placement.student.fullName}</strong> — {r.requestType.replace('_', ' ')}
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{r.details}</div>
            </div>
            <span className="badge badge-muted">{r.status}</span>
          </div>
          {r.status === 'PENDING' && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <input
                placeholder="Review note (optional)"
                value={notesById[r.id] || ''}
                onChange={(e) => setNotesById((n) => ({ ...n, [r.id]: e.target.value }))}
                style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => respond(r.id, 'approve')}>Approve</button>
              <button className="btn btn-danger btn-sm" onClick={() => respond(r.id, 'reject')}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
