import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function AdminApproveRegistrations() {
  const [users, setUsers] = useState([]);
  const [reasonById, setReasonById] = useState({});

  const load = () => api.get('/admin/registrations').then(({ data }) => setUsers(data));
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await api.post(`/admin/registrations/${id}/approve`);
    load();
  };
  const reject = async (id) => {
    await api.post(`/admin/registrations/${id}/reject`, { reason: reasonById[id] || '' });
    load();
  };

  return (
    <div className="card">
      <h3 className="section-title">Pending Registrations</h3>
      {users.length === 0 ? <div className="empty-state">No pending registrations</div> : users.map((u) => (
        <div key={u.id} className="list-item" style={{ display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{u.fullName}</strong> <span style={{ textTransform: 'capitalize', color: 'var(--muted)' }}>({u.role.toLowerCase()})</span>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{u.email}</div>
              {u.company && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Company: {u.company.name}</div>}
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <input
              placeholder="Rejection reason (if rejecting)"
              value={reasonById[u.id] || ''}
              onChange={(e) => setReasonById((r) => ({ ...r, [u.id]: e.target.value }))}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => approve(u.id)}>Approve</button>
            <button className="btn btn-danger btn-sm" onClick={() => reject(u.id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
