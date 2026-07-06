import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_MAP = {
  confirmed: ['approved', 'Confirmed'],
  proposed: ['pending', 'Pending Confirmation'],
  rescheduled: ['open', 'Reschedule Requested'],
  cancelled: ['rejected', 'Cancelled'],
};

function statusInfo(status) {
  return STATUS_MAP[status] || ['pending', 'Pending'];
}

export default function TutorVisits() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [visits, setVisits] = useState([]);
  const [flash, setFlash] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [notesTarget, setNotesTarget] = useState(null);
  const [notesValue, setNotesValue] = useState('');
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const filterType = searchParams.get('type') || '';
  const filterDate = searchParams.get('date') || '';

  const load = () => api.get('/tutor/visits').then(({ data }) => setVisits(data));
  useEffect(() => { load(); }, []);

  const filtered = visits.filter((v) => {
    if (filterType && v.visitType !== filterType) return false;
    if (filterDate && v.scheduledAt.slice(0, 10) !== filterDate) return false;
    return true;
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = filtered.filter((v) => v.scheduledAt.slice(0, 10) >= todayStr);
  const past = filtered.filter((v) => v.scheduledAt.slice(0, 10) < todayStr);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  const confirmCancel = async () => {
    await api.post(`/tutor/visits/${cancelTarget.id}/cancel`, { reason: cancelReason });
    setCancelTarget(null);
    setFlash({ type: 'warning', msg: 'Visit cancelled successfully. Student has been notified.' });
    load();
  };

  const saveNotes = async () => {
    await api.put(`/tutor/visits/${notesTarget.id}/notes`, { notes: notesValue });
    setNotesTarget(null);
    setFlash({ type: 'success', msg: '✅ Notes saved.' });
    load();
  };

  const confirmComplete = async () => {
    await api.post(`/tutor/visits/${completeTarget.id}/complete`, { notes: completeNotes });
    setCompleteTarget(null);
    setFlash({ type: 'success', msg: '✅ Visit marked as completed.' });
    load();
  };

  const fmtDay = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit' });
  const fmtMonth = (d) => new Date(d).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

  const VisitCard = ({ v, isPast }) => {
    const [statusClass, statusLabel] = isPast
      ? [v.status === 'completed' ? 'approved' : 'open', v.status.charAt(0).toUpperCase() + v.status.slice(1)]
      : statusInfo(v.status);
    const typeIcon = v.visitType === 'virtual' ? '🖥' : '📍';
    const typeLabel = v.visitType === 'virtual' ? 'Virtual' : 'Physical';

    return (
      <div className="visit-card" style={isPast ? { opacity: 0.8 } : undefined}>
        <div className="visit-date-block">
          <div className="date-box" style={isPast ? { background: '#6b7a8d' } : undefined}>
            <div className="day">{fmtDay(v.scheduledAt)}</div>
            <div className="month">{fmtMonth(v.scheduledAt)}</div>
          </div>
          <div className="visit-date-info">
            <h4>{v.placement.student.fullName}</h4>
            <p>{fmtTime(v.scheduledAt)}</p>
          </div>
        </div>

        <div className="visit-meta">
          <div className="visit-meta-row">🏢 <strong>{v.placement.company.name}, {v.placement.company.city || ''}</strong></div>
          <div className="visit-meta-row">
            {typeIcon} {typeLabel}
            {v.visitType === 'virtual' && v.meetingLink && (<> · <a href={v.meetingLink} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', fontSize: '0.8125rem' }}>Join Link</a></>)}
            {v.visitType === 'physical' && v.location && <> · {v.location}</>}
          </div>
          {!isPast && (
            <div className="visit-meta-row">📧 <a href={`mailto:${v.placement.student.email}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{v.placement.student.email}</a></div>
          )}
          {!isPast && v.placement.roleTitle && (
            <div className="visit-meta-row"><span className="type-chip" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}>{v.placement.roleTitle}</span></div>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <span className={`badge badge-${statusClass}`}>{statusLabel}</span>
        </div>

        {v.notes && (
          <div style={{ background: 'var(--cream)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--muted)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
            📝 {v.notes}
          </div>
        )}

        {!isPast && (
          <div className="visit-actions">
            {v.status === 'confirmed' && (
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setNotesTarget(v); setNotesValue(v.notes || ''); }}>
                Add Notes
              </button>
            )}
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/tutor/edit-visit/${v.id}`)}>
              Edit
            </button>
            {v.status !== 'cancelled' && (
              <button className="btn btn-danger btn-sm" onClick={() => { setCancelTarget(v); setCancelReason(''); }}>✕</button>
            )}
          </div>
        )}

        {isPast && !v.notes && (
          <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '0.875rem', justifyContent: 'center' }} onClick={() => { setCompleteTarget(v); setCompleteNotes(''); }}>
            ✓ Mark as Completed
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      {flash && (
        <div style={{ background: `var(--${flash.type === 'success' ? 'success' : 'warning'}-bg)`, border: `1px solid ${flash.type === 'success' ? '#6ee7b7' : '#fca5a5'}`, borderRadius: 'var(--radius)', padding: '1.25rem 2rem', marginBottom: '1.5rem' }}>
          <p style={{ color: `var(--${flash.type === 'success' ? 'success' : 'warning'})`, fontWeight: 500 }}>{flash.msg}</p>
        </div>
      )}

      <form style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }} onSubmit={(e) => e.preventDefault()}>
        <select value={filterType} onChange={(e) => updateFilter('type', e.target.value)}>
          <option value="">All Visit Types</option>
          <option value="virtual">🖥 Virtual</option>
          <option value="physical">📍 Physical</option>
        </select>
        <input type="date" value={filterDate} onChange={(e) => updateFilter('date', e.target.value)} />
        {(filterType || filterDate) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSearchParams({})}>✕ Clear</button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/tutor/provider-meetings')}>🤝 Provider Meeting</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/tutor/schedule-visit')}>+ Schedule New Visit</button>
        </div>
      </form>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="panel">
          <div className="panel-body" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🗓</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>No Visits Scheduled</h3>
            <p style={{ color: 'var(--muted)', maxWidth: 380, margin: '0 auto 1.5rem' }}>
              You haven't scheduled any placement visits yet. Start by scheduling a visit with one of your students.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/tutor/schedule-visit')}>+ Schedule First Visit</button>
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: 'var(--navy)', marginBottom: '1.25rem' }}>
                Upcoming Visits <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--muted)', marginLeft: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>({upcoming.length})</span>
              </h3>
              <div className="visit-grid">
                {upcoming.map((v) => <VisitCard key={v.id} v={v} isPast={false} />)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: 'var(--navy)', marginBottom: '1.25rem' }}>
                Past Visits <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--muted)', marginLeft: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>({past.length})</span>
              </h3>
              <div className="visit-grid">
                {past.map((v) => <VisitCard key={v.id} v={v} isPast />)}
              </div>
            </div>
          )}
        </>
      )}

      {cancelTarget && (
        <div className="modal-backdrop" onClick={() => setCancelTarget(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>⚠️ Cancel Visit</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Cancel visit with {cancelTarget.placement.student.fullName} on {new Date(cancelTarget.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}? The student will be notified.
            </p>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Reason for cancellation (optional)</label>
              <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g., Student requested reschedule, scheduling conflict..." />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setCancelTarget(null)}>Keep Visit</button>
              <button className="btn btn-danger" onClick={confirmCancel}>✕ Cancel Visit</button>
            </div>
          </div>
        </div>
      )}

      {notesTarget && (
        <div className="modal-backdrop" onClick={() => setNotesTarget(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>Visit Notes</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{notesTarget.placement.student.fullName} · {new Date(notesTarget.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Visit outcome and observations</label>
              <textarea rows={6} value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Record what was discussed, student progress, any concerns or action items..." style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setNotesTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNotes}>Save Notes</button>
            </div>
          </div>
        </div>
      )}

      {completeTarget && (
        <div className="modal-backdrop" onClick={() => setCompleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>✓ Mark Visit as Completed</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Visit notes (optional)</label>
              <textarea rows={5} value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} placeholder="Summary of visit, student progress, any follow-up actions..." style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setCompleteTarget(null)}>Cancel</button>
              <button className="btn btn-success" onClick={confirmComplete}>✓ Mark Completed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
