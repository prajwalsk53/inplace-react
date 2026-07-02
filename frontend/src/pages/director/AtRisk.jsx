import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function DirectorAtRisk() {
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    api.get('/director/at-risk').then(({ data }) => setPlacements(data));
  }, []);

  return (
    <div className="card">
      <h3 className="section-title">At-Risk Placements</h3>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
        Active placements with no visit completed in the last 60 days.
      </p>
      {placements.length === 0 ? <div className="empty-state">No at-risk placements — great news</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Tutor</th><th>Company</th><th>Last Visit</th></tr></thead>
            <tbody>
              {placements.map((p) => (
                <tr key={p.id}>
                  <td>{p.student.fullName}</td>
                  <td>{p.tutor?.fullName || '-'}</td>
                  <td>{p.company.name}</td>
                  <td>{p.visits[0] ? new Date(p.visits[0].scheduledAt).toLocaleDateString('en-GB') : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
