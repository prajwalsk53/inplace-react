import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function DirectorFeedback() {
  const [evaluations, setEvaluations] = useState([]);

  useEffect(() => {
    api.get('/director/feedback').then(({ data }) => setEvaluations(data));
  }, []);

  return (
    <div className="card">
      <h3 className="section-title">Employer Feedback</h3>
      {evaluations.length === 0 ? <div className="empty-state">No evaluations submitted yet</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Company</th><th>Role</th><th>Rating</th><th>Comments</th><th>Evaluated by</th></tr></thead>
            <tbody>
              {evaluations.map((e) => (
                <tr key={e.id}>
                  <td>{e.company.name}</td>
                  <td>{e.placement.roleTitle}</td>
                  <td>{'★'.repeat(e.rating)}{'☆'.repeat(5 - e.rating)}</td>
                  <td>{e.comments || '-'}</td>
                  <td>{e.evaluatedBy.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
