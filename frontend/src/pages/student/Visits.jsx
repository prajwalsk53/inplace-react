import { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_BADGE = { scheduled: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };

export default function StudentVisits() {
  const [visits, setVisits] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/student/visits').then(({ data }) => setVisits(data));
  useEffect(() => { load(); }, []);

  const startEdit = (visit) => {
    setEditingId(visit.id);
    setNoteDraft(visit.notes || '');
  };

  const saveNote = async (visitId) => {
    setSaving(true);
    try {
      await api.put(`/student/visits/${visitId}/notes`, { notes: noteDraft });
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 className="section-title">Placement Visits</h3>
      {visits.length === 0 ? <div className="empty-state">No visits scheduled yet</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Tutor</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>{new Date(v.scheduledAt).toLocaleString('en-GB')}</td>
                  <td style={{ textTransform: 'capitalize' }}>{v.visitType.replace('_', ' ')}</td>
                  <td>{v.tutor.fullName}</td>
                  <td><span className={`badge ${STATUS_BADGE[v.status] || 'badge-muted'}`}>{v.status}</span></td>
                  <td style={{ minWidth: 220 }}>
                    {editingId === v.id ? (
                      <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13 }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => saveNote(v.id)}>{saving ? 'Saving...' : 'Save'}</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{v.notes || '-'}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(v)}>Edit</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
