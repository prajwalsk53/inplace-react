import { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_BADGE = { scheduled: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };

export default function ProviderVisits() {
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    api.get('/provider/visits').then(({ data }) => setVisits(data));
  }, []);

  return (
    <div className="card">
      <h3 className="section-title">Tutor Visits</h3>
      {visits.length === 0 ? <div className="empty-state">No visits scheduled</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Student</th><th>Tutor</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>{new Date(v.scheduledAt).toLocaleString('en-GB')}</td>
                  <td>{v.placement.student.fullName}</td>
                  <td>{v.tutor.fullName}</td>
                  <td style={{ textTransform: 'capitalize' }}>{v.visitType.replace('_', ' ')}</td>
                  <td><span className={`badge ${STATUS_BADGE[v.status] || 'badge-muted'}`}>{v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
