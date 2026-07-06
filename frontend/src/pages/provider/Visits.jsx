import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const fmtDay = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit' });
const fmtMonth = (d) => new Date(d).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
const fmtWeekday = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
const isUpcoming = (d) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(d) >= today;
};

const STATUS_INFO = {
  scheduled: ['pending', 'Scheduled'],
  proposed: ['pending', 'Scheduled'],
  confirmed: ['approved', 'Confirmed'],
  completed: ['approved', 'Completed'],
  cancelled: ['rejected', 'Cancelled'],
  rescheduled: ['review', 'Reschedule Pending'],
};

export default function ProviderVisits() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [flash, setFlash] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  const load = () => api.get('/provider/visits').then(({ data }) => setVisits(data));
  useEffect(() => { load(); }, []);

  const upcoming = useMemo(() => visits.filter((v) => isUpcoming(v.scheduledAt)), [visits]);
  const past = useMemo(() => visits.filter((v) => !isUpcoming(v.scheduledAt)), [visits]);
  const thisMonthCount = useMemo(() => {
    const key = new Date().toISOString().slice(0, 7);
    return upcoming.filter((v) => v.scheduledAt.slice(0, 7) === key).length;
  }, [upcoming]);
  const completedCount = useMemo(() => past.filter((v) => v.status === 'completed').length, [past]);

  const respond = async (visit, action) => {
    await api.put(`/provider/visits/${visit.id}/respond`, { action });
    setFlash({ type: action === 'confirm' ? 'success' : 'danger', msg: action === 'confirm' ? 'Visit confirmed. The tutor has been notified.' : 'Visit declined. Please contact the tutor to arrange an alternative.' });
    load();
  };

  const submitReschedule = async () => {
    if (!proposedDate || !proposedTime) return;
    await api.put(`/provider/visits/${rescheduleTarget.id}/respond`, { action: 'reschedule', proposedDate, proposedTime, notes: rescheduleNotes });
    setRescheduleTarget(null);
    setFlash({ type: 'success', msg: 'Reschedule proposal submitted. The tutor will be notified.' });
    load();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Upcoming Visits</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--info)' }}>{upcoming.length}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>This Month</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--navy)' }}>{thisMonthCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Completed</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--success)' }}>{completedCount}</h3>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header"><div><h3>📅 Upcoming Visits</h3><p>Scheduled tutor visits to your workplace</p></div></div>
        {upcoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <p style={{ color: 'var(--muted)' }}>No upcoming visits scheduled.</p>
          </div>
        ) : (
          <div className="visit-grid" style={{ padding: '2rem' }}>
            {upcoming.map((v) => {
              const isPM = v.recordType === 'provider_meeting';
              const [badgeClass, badgeLabel] = STATUS_INFO[v.status] || ['open', v.status];
              const tutorName = isPM ? v.requestedBy.fullName : v.tutor.fullName;
              const tutorEmail = isPM ? v.requestedBy.email : v.tutor.email;
              return (
                <div className="visit-card" key={`${v.recordType}-${v.id}`}>
                  <div className="visit-date-block">
                    <div className="date-box">
                      <div className="day">{fmtDay(v.scheduledAt)}</div>
                      <div className="month">{fmtMonth(v.scheduledAt)}</div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{fmtWeekday(v.scheduledAt)}</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{fmtTime(v.scheduledAt)}{v.durationHours ? ` · ${v.durationHours}h` : ''}</p>
                    </div>
                  </div>
                  <div className="visit-meta">
                    {isPM ? (
                      <>
                        <div className="visit-meta-row"><span>🤝</span><strong>Meeting with:</strong> {v.contactName || 'Provider Contact'}</div>
                        <div className="visit-meta-row"><span>👨‍🏫</span><strong>Tutor:</strong> {tutorName}</div>
                      </>
                    ) : (
                      <>
                        <div className="visit-meta-row"><span>👨‍🎓</span><strong>Student:</strong> {v.placement.student.fullName}</div>
                        <div className="visit-meta-row"><span>👨‍🏫</span><strong>Tutor:</strong> {tutorName}</div>
                        <div className="visit-meta-row"><span>💼</span><strong>Role:</strong> {v.placement.roleTitle}</div>
                      </>
                    )}
                    {v.location && <div className="visit-meta-row"><span>📍</span><strong>Location:</strong> {v.location}</div>}
                    {v.meetingLink && <div className="visit-meta-row"><span>🔗</span><strong>Link:</strong> <a href={v.meetingLink} target="_blank" rel="noopener noreferrer">Join Meeting</a></div>}
                  </div>
                  {(isPM ? v.agenda : v.notes) && (
                    <div style={{ padding: '0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        <strong>{isPM ? 'Agenda' : 'Purpose'}:</strong><br />{isPM ? v.agenda : v.notes}
                      </p>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span className={`badge badge-${badgeClass}`}>{badgeLabel}</span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {!isPM && v.status === 'scheduled' ? (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => respond(v, 'confirm')}>✓ Confirm</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setRescheduleTarget(v); setProposedDate(''); setProposedTime(''); setRescheduleNotes(''); }}>📅 Reschedule</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Decline this visit?')) respond(v, 'decline'); }}>✗ Decline</button>
                        </>
                      ) : (
                        <a href={`mailto:${tutorEmail}`} className="btn btn-ghost btn-sm">📧 Contact Tutor</a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="panel">
          <div className="panel-header"><h3>📋 Past Visits & Meetings</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Contact / Student</th><th>Tutor</th><th>Purpose / Agenda</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {past.slice(0, 10).map((v) => {
                  const isPM = v.recordType === 'provider_meeting';
                  const [badgeClass, badgeLabel] = isPM
                    ? (v.status === 'completed' ? ['approved', 'Completed'] : v.status === 'cancelled' ? ['rejected', 'Cancelled'] : ['open', v.status])
                    : (STATUS_INFO[v.status] || ['open', v.status]);
                  const tutorName = isPM ? v.requestedBy.fullName : v.tutor.fullName;
                  const tutorEmail = isPM ? v.requestedBy.email : v.tutor.email;
                  return (
                    <tr key={`${v.recordType}-${v.id}`}>
                      <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.875rem' }}>
                        {fmtDate(v.scheduledAt)}<br /><span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{fmtTime(v.scheduledAt)}</span>
                      </td>
                      <td>
                        <div className="avatar-cell">
                          <div className="avatar" style={{ width: 32, height: 32 }}>{isPM ? (v.contactName || 'P').slice(0, 2).toUpperCase() : v.placement.student.avatarInitials}</div>
                          <div>
                            <h4 style={{ fontSize: '0.875rem' }}>{isPM ? (v.contactName || 'Provider Contact') : v.placement.student.fullName}</h4>
                            {isPM && <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Tutor meeting</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>{tutorName}</td>
                      <td style={{ maxWidth: 200 }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(isPM ? v.agenda : v.notes) || 'General check-in'}
                        </p>
                      </td>
                      <td><span className={`badge badge-${badgeClass}`}>{badgeLabel}</span></td>
                      <td>
                        {!isPM ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/provider/view-visit/${v.id}`)}>View Details</button>
                        ) : (
                          <a href={`mailto:${tutorEmail}`} className="btn btn-ghost btn-sm">📧 Tutor</a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rescheduleTarget && (
        <div className="modal-backdrop" onClick={() => setRescheduleTarget(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>📅 Propose Alternative Date</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Proposed Date <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="date" required min={new Date().toISOString().slice(0, 10)} value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Proposed Time <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="time" required value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Notes <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>(optional)</span></label>
              <textarea rows={3} value={rescheduleNotes} onChange={(e) => setRescheduleNotes(e.target.value)} placeholder="Reason for reschedule or any constraints…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setRescheduleTarget(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!proposedDate || !proposedTime} onClick={submitReschedule}>Send Proposal →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
