import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ProviderRequests() {
  const [meetings, setMeetings] = useState([]);
  const [scheduleById, setScheduleById] = useState({});

  const load = () => api.get('/provider/meetings').then(({ data }) => setMeetings(data));
  useEffect(() => { load(); }, []);

  const schedule = async (id) => {
    await api.put(`/provider/meetings/${id}/respond`, { scheduledAt: scheduleById[id], status: 'scheduled' });
    load();
  };

  const decline = async (id) => {
    await api.put(`/provider/meetings/${id}/respond`, { status: 'cancelled' });
    load();
  };

  return (
    <div className="card">
      <h3 className="section-title">Tutor Meeting Requests</h3>
      {meetings.length === 0 ? <div className="empty-state">No meeting requests</div> : meetings.map((m) => (
        <div key={m.id} className="list-item" style={{ display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{m.requestedBy.fullName}</strong>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{m.agenda}</div>
            </div>
            <span className="badge badge-muted">{m.status}</span>
          </div>
          {m.status === 'requested' && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <input type="datetime-local" onChange={(e) => setScheduleById((s) => ({ ...s, [m.id]: e.target.value }))} />
              <button className="btn btn-primary btn-sm" onClick={() => schedule(m.id)}>Confirm</button>
              <button className="btn btn-outline btn-sm" onClick={() => decline(m.id)}>Decline</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
