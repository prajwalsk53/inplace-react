import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const DURATIONS = [
  { value: '0.5', label: '30 minutes' },
  { value: '1', label: '1 hour' },
  { value: '1.5', label: '1.5 hours' },
  { value: '2', label: '2 hours' },
  { value: '2.5', label: '2.5 hours' },
  { value: '3', label: '3 hours' },
  { value: '4', label: '4 hours' },
];

export default function ScheduleVisit() {
  const [searchParams] = useSearchParams();
  const [placements, setPlacements] = useState([]);
  const [form, setForm] = useState({
    placementId: searchParams.get('placementId') || '',
    visitDate: '', visitTime: '14:00', duration: '2', visitType: 'physical',
    location: '', meetingLink: '', notes: '',
  });
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/tutor/placements').then(({ data }) => {
      setPlacements([...data].sort((a, b) => a.student.fullName.localeCompare(b.student.fullName)));
    });
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const selected = placements.find((p) => String(p.id) === String(form.placementId));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { data } = await api.post('/tutor/visits', form);
      setSuccess(data.message);
      setForm({ placementId: '', visitDate: '', visitTime: '14:00', duration: '2', visitType: 'physical', location: '', meetingLink: '', notes: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {success && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid #6ee7b7', borderRadius: 'var(--radius)', padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '1.5rem' }}>📅</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '0.5rem' }}>{success}</p>
              <p style={{ color: 'var(--success)', fontSize: '0.875rem', opacity: 0.9 }}>
                The meeting request will appear in both your calendar and the student's calendar. They can Accept or Decline from their email.
              </p>
              <a href="/tutor/visits" className="btn btn-success btn-sm" style={{ marginTop: '1rem' }}>View All Visits →</a>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '1.25rem 2rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 500 }}>⚠️ {error}</p>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div><h3>📅 Schedule New Visit</h3><p>Schedule a placement visit - calendar invites will be sent automatically</p></div>
        </div>
        <div className="panel-body">
          <form onSubmit={submit}>
            <div className="form-grid" style={{ marginBottom: '2rem' }}>
              <div className="form-group full-col">
                <label>Select Student Placement <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select value={form.placementId} onChange={update('placementId')} required>
                  <option value="">-- Choose a student --</option>
                  {placements.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.student.fullName} — {p.roleTitle} at {p.company.name}, {p.company.city || ''}
                    </option>
                  ))}
                </select>
              </div>

              {selected && (
                <div className="form-group full-col">
                  <div style={{ background: 'var(--cream)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                      Calendar Invite Will Be Sent To:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                        {selected.student.fullName.split(' ').map((n) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{selected.student.fullName}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{selected.student.email}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Visit Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="date" required min={new Date().toISOString().slice(0, 10)} value={form.visitDate} onChange={update('visitDate')} />
              </div>
              <div className="form-group">
                <label>Visit Time <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="time" required value={form.visitTime} onChange={update('visitTime')} />
              </div>

              <div className="form-group">
                <label>Duration (hours) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select value={form.duration} onChange={update('duration')} required>
                  {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Visit Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select value={form.visitType} onChange={update('visitType')} required>
                  <option value="physical">📍 Physical (In-person at company)</option>
                  <option value="virtual">🖥 Virtual (Online meeting)</option>
                </select>
              </div>

              {form.visitType === 'physical' ? (
                <div className="form-group full-col">
                  <label>Location / Company Address</label>
                  <input type="text" placeholder="e.g., Rolls-Royce plc, Moor Lane, Derby" value={form.location} onChange={update('location')} />
                </div>
              ) : (
                <div className="form-group full-col">
                  <label>Meeting Link (Teams / Zoom) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="url" required placeholder="https://teams.microsoft.com/..." value={form.meetingLink} onChange={update('meetingLink')} />
                  <small style={{ color: 'var(--muted)' }}>This link will be included in the calendar invite</small>
                </div>
              )}

              <div className="form-group full-col">
                <label>Notes / Agenda</label>
                <textarea rows={4} placeholder="What will be discussed during this visit?" value={form.notes} onChange={update('notes')} />
                <small style={{ color: 'var(--muted)' }}>This will appear in the calendar invite description</small>
              </div>
            </div>

            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>📧 Calendar invite will be sent to student's email</div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href="/tutor/visits" className="btn btn-ghost">← Back</a>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Scheduling...' : '📅 Schedule & Send Invite'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
