import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function EditVisit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/tutor/visits/${id}`).then(({ data }) => {
      setVisit(data);
      const d = new Date(data.scheduledAt);
      setForm({
        visitDate: d.toISOString().slice(0, 10),
        visitTime: d.toTimeString().slice(0, 5),
        visitType: data.visitType,
        location: data.location || '',
        meetingLink: data.meetingLink || '',
        notes: data.notes || '',
      });
    });
  }, [id]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.put(`/tutor/visits/${id}`, form);
      navigate('/tutor/visits?success=updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update visit');
    } finally {
      setSaving(false);
    }
  };

  if (!visit || !form) return <div className="loading-screen">Loading...</div>;

  const badgeClass = visit.status === 'confirmed' ? 'approved' : visit.status === 'cancelled' ? 'rejected' : 'pending';

  return (
    <div>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '1.25rem 2rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 500 }}>⚠️ {error}</p>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Edit Visit</h3>
            <p>{visit.placement.student.fullName} — {visit.placement.company.name}, {visit.placement.company.city || ''}</p>
          </div>
          <span className={`badge badge-${badgeClass}`}>{visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}</span>
        </div>

        <div className="panel-body">
          <form onSubmit={submit}>
            <div className="form-grid" style={{ marginBottom: '2rem' }}>
              <div className="form-group">
                <label>Visit Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="date" required min={new Date().toISOString().slice(0, 10)} value={form.visitDate} onChange={update('visitDate')} />
              </div>
              <div className="form-group">
                <label>Visit Time <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="time" required value={form.visitTime} onChange={update('visitTime')} />
              </div>

              <div className="form-group full-col">
                <label>Visit Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select value={form.visitType} onChange={update('visitType')} required>
                  <option value="physical">📍 Physical (In-person at company)</option>
                  <option value="virtual">🖥 Virtual (Online meeting)</option>
                </select>
              </div>

              {form.visitType === 'physical' ? (
                <div className="form-group full-col">
                  <label>Location / Company Address</label>
                  <input type="text" placeholder="e.g., Dyson Ltd, Malmesbury" value={form.location} onChange={update('location')} />
                </div>
              ) : (
                <div className="form-group full-col">
                  <label>Meeting Link (Teams / Zoom)</label>
                  <input type="url" placeholder="https://teams.microsoft.com/..." value={form.meetingLink} onChange={update('meetingLink')} />
                </div>
              )}

              <div className="form-group full-col">
                <label>Notes / Agenda</label>
                <textarea rows={4} placeholder="What will be discussed during this visit?" value={form.notes} onChange={update('notes')} />
              </div>
            </div>

            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                Originally scheduled: {new Date(visit.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href="/tutor/visits" className="btn btn-ghost">← Back</a>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
