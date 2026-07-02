import { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUSES = ['SUBMITTED', 'AWAITING_PROVIDER', 'AWAITING_TUTOR', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'TERMINATED'];

export default function AdminPlacements() {
  const [placements, setPlacements] = useState([]);
  const [tutors, setTutors] = useState([]);

  const load = () => api.get('/admin/placements').then(({ data }) => setPlacements(data));
  useEffect(() => {
    load();
    api.get('/admin/users', { params: { role: 'TUTOR' } }).then(({ data }) => setTutors(data));
  }, []);

  const updatePlacement = async (id, patch) => {
    await api.put(`/admin/placements/${id}`, patch);
    load();
  };

  return (
    <div className="card">
      <h3 className="section-title">All Placements</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Company</th><th>Tutor</th><th>Status</th></tr></thead>
          <tbody>
            {placements.map((p) => (
              <tr key={p.id}>
                <td>{p.student.fullName}</td>
                <td>{p.company.name}</td>
                <td>
                  <select value={p.tutorId || ''} onChange={(e) => updatePlacement(p.id, { tutorId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {tutors.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </select>
                </td>
                <td>
                  <select value={p.status} onChange={(e) => updatePlacement(p.id, { status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
