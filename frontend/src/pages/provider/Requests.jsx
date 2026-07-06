import { useEffect, useState } from 'react';
import api from '../../api/axios';

const CHANGE_TYPE_LABELS = {
  end_date: 'Extend / Change End Date',
  start_date: 'Change Start Date',
  role: 'Change Role',
  supervisor: 'Change Supervisor',
  transfer: 'Transfer Company',
  salary: 'Change Salary / Terms',
};

export default function ProviderRequests() {
  const [meetings, setMeetings] = useState([]);
  const [scheduleById, setScheduleById] = useState({});
  const [changeRequests, setChangeRequests] = useState([]);
  const [commentById, setCommentById] = useState({});

  const load = () => api.get('/provider/meetings').then(({ data }) => setMeetings(data));
  const loadChangeRequests = () => api.get('/provider/change-requests').then(({ data }) => setChangeRequests(data));
  useEffect(() => { load(); loadChangeRequests(); }, []);

  const schedule = async (id) => {
    await api.put(`/provider/meetings/${id}/respond`, { scheduledAt: scheduleById[id], status: 'scheduled' });
    load();
  };

  const decline = async (id) => {
    await api.put(`/provider/meetings/${id}/respond`, { status: 'cancelled' });
    load();
  };

  const respondChangeRequest = async (id, decision) => {
    await api.put(`/provider/change-requests/${id}/respond`, { decision, comment: commentById[id] || '' });
    loadChangeRequests();
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title">Placement Change Requests</h3>
        {changeRequests.length === 0 ? <div className="empty-state">No change requests</div> : changeRequests.map((cr) => (
          <div key={cr.id} className="list-item" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{cr.placement.student.fullName}</strong>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{CHANGE_TYPE_LABELS[cr.requestType] || cr.requestType} — {cr.justification}</div>
                {cr.proposedDetails && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Proposed: {cr.proposedDetails}</div>}
              </div>
              <span className="badge badge-muted">{cr.status.replace('_', ' ')}</span>
            </div>
            {cr.status === 'PENDING_PROVIDER' && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" placeholder="Comment (optional)" value={commentById[cr.id] || ''} onChange={(e) => setCommentById((s) => ({ ...s, [cr.id]: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={() => respondChangeRequest(cr.id, 'approve')}>Approve</button>
                <button className="btn btn-outline btn-sm" onClick={() => respondChangeRequest(cr.id, 'reject')}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

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
    </div>
  );
}
