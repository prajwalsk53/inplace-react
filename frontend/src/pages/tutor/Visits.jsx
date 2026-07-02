import { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_BADGE = { scheduled: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };

export default function TutorVisits() {
  const [visits, setVisits] = useState([]);
  const [editing, setEditing] = useState(null);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');

  const load = () => api.get('/tutor/visits').then(({ data }) => setVisits(data));
  useEffect(() => { load(); }, []);

  const openEdit = (visit) => {
    setEditing(visit);
    setNotes(visit.notes || '');
    setOutcome(visit.outcome || '');
  };

  const saveNotes = async (e) => {
    e.preventDefault();
    await api.put(`/tutor/visits/${editing.id}/notes`, { notes, outcome, status: 'completed' });
    setEditing(null);
    load();
  };

  const downloadIcs = async (visit) => {
    const { data } = await api.get(`/tutor/visits/${visit.id}/ics`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `visit-${visit.id}.ics`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <h3 className="section-title">Visits</h3>
      {visits.length === 0 ? <div className="empty-state">No visits scheduled</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Student</th><th>Company</th><th>Type</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>{new Date(v.scheduledAt).toLocaleString('en-GB')}</td>
                  <td>{v.placement.student.fullName}</td>
                  <td>{v.placement.company.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{v.visitType.replace('_', ' ')}</td>
                  <td><span className={`badge ${STATUS_BADGE[v.status] || 'badge-muted'}`}>{v.status}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>Add notes</button>
                    <button className="btn btn-outline btn-sm" onClick={() => downloadIcs(v)}>.ics</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">Visit Notes</h3>
            <form onSubmit={saveNotes}>
              <div className="field"><label>Notes</label><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <div className="field"><label>Outcome</label><input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Satisfactory" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary">Save & mark completed</button>
                <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
