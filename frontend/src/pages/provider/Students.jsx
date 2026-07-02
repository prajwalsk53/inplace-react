import { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_BADGE = {
  SUBMITTED: 'badge-muted', AWAITING_PROVIDER: 'badge-warning', AWAITING_TUTOR: 'badge-warning',
  APPROVED: 'badge-info', ACTIVE: 'badge-success', COMPLETED: 'badge-success',
  REJECTED: 'badge-danger', TERMINATED: 'badge-danger',
};

export default function ProviderStudents() {
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    api.get('/provider/placements').then(({ data }) => setPlacements(data));
  }, []);

  return (
    <div className="card">
      <h3 className="section-title">Students</h3>
      {placements.length === 0 ? <div className="empty-state">No students placed with you yet</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Role</th><th>Tutor</th><th>Status</th></tr></thead>
            <tbody>
              {placements.map((p) => (
                <tr key={p.id}>
                  <td>{p.student.fullName} <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.student.email}</div></td>
                  <td>{p.roleTitle}</td>
                  <td>{p.tutor?.fullName || '-'}</td>
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
