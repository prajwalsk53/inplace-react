import { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_BADGE = {
  SUBMITTED: 'badge-muted', AWAITING_PROVIDER: 'badge-warning', AWAITING_TUTOR: 'badge-warning',
  APPROVED: 'badge-info', ACTIVE: 'badge-success', COMPLETED: 'badge-success',
  REJECTED: 'badge-danger', TERMINATED: 'badge-danger',
};

export default function DirectorPlacements() {
  const [placements, setPlacements] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/director/placements', { params: { status: status || undefined } }).then(({ data }) => setPlacements(data));
  }, [status]);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="section-title" style={{ marginBottom: 0 }}>All Placements</h3>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_BADGE).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      {placements.length === 0 ? <div className="empty-state">No placements found</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Tutor</th><th>Company</th><th>Sector</th><th>Status</th></tr></thead>
            <tbody>
              {placements.map((p) => (
                <tr key={p.id}>
                  <td>{p.student.fullName}</td>
                  <td>{p.tutor?.fullName || '-'}</td>
                  <td>{p.company.name}</td>
                  <td>{p.company.sector || '-'}</td>
                  <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
