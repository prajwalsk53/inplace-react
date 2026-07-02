import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_BADGE = {
  SUBMITTED: 'badge-muted', AWAITING_PROVIDER: 'badge-warning', AWAITING_TUTOR: 'badge-warning',
  APPROVED: 'badge-info', ACTIVE: 'badge-success', COMPLETED: 'badge-success',
  REJECTED: 'badge-danger', TERMINATED: 'badge-danger',
};

export default function TutorPlacements() {
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    api.get('/tutor/placements').then(({ data }) => setPlacements(data));
  }, []);

  return (
    <div className="card">
      <h3 className="section-title">Your Placements</h3>
      {placements.length === 0 ? <div className="empty-state">No placements yet. <Link to="/tutor/create-placement">Create one</Link></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Company</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {placements.map((p) => (
                <tr key={p.id}>
                  <td>{p.student.fullName}</td>
                  <td>{p.company.name}</td>
                  <td>{p.roleTitle}</td>
                  <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status.replace('_', ' ')}</span></td>
                  <td><Link to={`/tutor/placements/${p.id}/edit`} className="btn btn-outline btn-sm">Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
