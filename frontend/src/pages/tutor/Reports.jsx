import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtMonthYear = (d) => new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const fmtSize = (bytes) => (bytes ? `${Math.round(bytes / 1024)} KB` : '—');

const STATUS_BADGE = { approved: 'approved', revision_needed: 'open', pending_review: 'pending', pending: 'pending' };
const STATUS_LABEL = { approved: 'Approved', revision_needed: 'Needs Revision', pending_review: 'Pending Review', pending: 'Pending Review' };

export default function TutorReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('reports');
  const [reflections, setReflections] = useState([]);
  const [feedbackById, setFeedbackById] = useState({});

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ interimPending: 0, interimApproved: 0, finalPending: 0, finalApproved: 0, revisionNeeded: 0 });
  const [missing, setMissing] = useState([]);
  const [flash, setFlash] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [feedbackView, setFeedbackView] = useState(null);
  const [reminderTarget, setReminderTarget] = useState(null);

  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const loadReflections = () => api.get('/tutor/reflections').then(({ data }) => setReflections(data.reflections));
  const loadReports = () => api.get('/tutor/reports', { params: { type, status, search } }).then(({ data }) => {
    setReports(data.reports);
    setStats(data.stats);
    setMissing(data.missing);
  });

  useEffect(() => { loadReflections(); }, []);
  useEffect(() => { loadReports(); }, [type, status, search]);

  const giveReflectionFeedback = async (id) => {
    await api.put(`/tutor/reflections/${id}/feedback`, { tutorFeedback: feedbackById[id] || '' });
    loadReflections();
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (type) next.set('type', type);
    if (status) next.set('status', status);
    if (searchInput) next.set('search', searchInput);
    setSearchParams(next);
  };

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  const submitReview = async (action) => {
    const { data } = await api.post(`/tutor/reports/${reviewTarget.id}/review`, { action, feedback: reviewFeedback });
    setReviewTarget(null);
    setFlash({ type: action === 'approved' ? 'success' : 'warning', msg: data.message });
    loadReports();
  };

  const submitReminder = async (missingTypes) => {
    try {
      const { data } = await api.post('/tutor/reports/remind', {
        studentId: reminderTarget.studentId, studentEmail: reminderTarget.studentEmail, studentName: reminderTarget.studentName, missingTypes,
      });
      setFlash({ type: 'success', msg: data.message });
    } catch (err) {
      setFlash({ type: 'danger', msg: err.response?.data?.error || 'Could not send reminder' });
    }
    setReminderTarget(null);
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type === 'warning' ? 'warning' : flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <div className={`tab${tab === 'reports' ? ' active' : ''}`} onClick={() => setTab('reports')} style={{ cursor: 'pointer' }}>Reports</div>
        <div className={`tab${tab === 'reflections' ? ' active' : ''}`} onClick={() => setTab('reflections')} style={{ cursor: 'pointer' }}>Reflections</div>
      </div>

      {tab === 'reflections' ? (
        <div className="card">
          {reflections.length === 0 ? <div className="empty-state">No reflections submitted yet</div> : reflections.map((r) => (
            <div key={r.id} className="list-item" style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>{r.student.fullName}</strong> — {r.title} {r.weekNumber && `(Week ${r.weekNumber})`}</div>
                <span className="badge badge-muted">{r.status}</span>
              </div>
              <p style={{ marginTop: 6, fontSize: 14 }}>{r.content}</p>
              {r.tutorFeedback ? (
                <div style={{ fontSize: 13, marginTop: 6, background: 'var(--cream)', padding: 8, borderRadius: 8 }}>Your feedback: {r.tutorFeedback}</div>
              ) : (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <input placeholder="Feedback" value={feedbackById[r.id] || ''} onChange={(e) => setFeedbackById((f) => ({ ...f, [r.id]: e.target.value }))} style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => giveReflectionFeedback(r.id)}>Send</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Interim Reports</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--navy)' }}>{stats.interimApproved}</h3>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>approved</span>
              </div>
              {stats.interimPending > 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--warning)', marginTop: '0.5rem' }}>{stats.interimPending} pending review</p>}
            </div>
            <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Final Reports</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--navy)' }}>{stats.finalApproved}</h3>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>approved</span>
              </div>
              {stats.finalPending > 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--warning)', marginTop: '0.5rem' }}>{stats.finalPending} pending review</p>}
            </div>
            <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Revisions Requested</p>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: stats.revisionNeeded > 0 ? 'var(--warning)' : 'var(--navy)' }}>{stats.revisionNeeded}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.5rem' }}>awaiting resubmission</p>
            </div>
            <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Missing Reports</p>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: missing.length > 0 ? 'var(--danger)' : 'var(--navy)' }}>{missing.length}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.5rem' }}>students overdue</p>
            </div>
          </div>

          <form onSubmit={submitSearch} style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="🔍 Search by student or company..." style={{ minWidth: 280 }} />
            <select value={type} onChange={(e) => updateFilter('type', e.target.value)}>
              <option value="">All Report Types</option>
              <option value="interim_report">Interim Reports</option>
              <option value="final_report">Final Reports</option>
            </select>
            <select value={status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="revision_needed">Needs Revision</option>
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
              {(search || type || status) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setSearchParams({}); }}>✕ Clear</button>}
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </div>
          </form>

          <div className="panel">
            <div className="panel-header"><h3>{reports.length} Report{reports.length !== 1 ? 's' : ''}</h3></div>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>No reports found.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Company</th><th>Report Type</th><th>Submitted</th><th>File Size</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="avatar-cell">
                            <div className="avatar">{r.uploadedBy.avatarInitials || '??'}</div>
                            <div><h4>{r.uploadedBy.fullName}</h4><p>{r.uploadedBy.email}</p></div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.placement.company.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}><span className="type-chip" style={{ padding: '0.15rem 0.5rem' }}>{r.placement.roleTitle || 'N/A'}</span></div>
                        </td>
                        <td><span className={`badge badge-${r.category === 'interim_report' ? 'review' : 'approved'}`}>{r.category === 'interim_report' ? 'Interim' : 'Final'}</span></td>
                        <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8125rem', color: 'var(--muted)' }}>{fmtDate(r.createdAt)}</td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{fmtSize(r.fileSize)}</td>
                        <td><span className={`badge badge-${STATUS_BADGE[r.status] || 'pending'}`}>{STATUS_LABEL[r.status] || 'Pending'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${r.filePath}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">⬇ Download</a>
                            {(r.status === 'pending' || r.status === 'pending_review') && (
                              <button className="btn btn-primary btn-sm" onClick={() => { setReviewTarget(r); setReviewFeedback(''); }}>Review</button>
                            )}
                            {r.reviewerFeedback && (
                              <button className="btn btn-ghost btn-sm" onClick={() => setFeedbackView(r)}>View Feedback</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {missing.length > 0 && (
            <div className="panel" style={{ marginTop: '1.5rem' }}>
              <div className="panel-header"><div><h3>⚠️ Missing Reports ({missing.length})</h3><p>Students who haven't submitted one or more reports</p></div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Company</th><th>Placement Period</th><th>Missing</th><th>Action</th></tr></thead>
                  <tbody>
                    {missing.map((m) => (
                      <tr key={m.studentId}>
                        <td>{m.studentName}</td>
                        <td>{m.companyName}</td>
                        <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8125rem' }}>{fmtMonthYear(m.startDate)} → {fmtMonthYear(m.endDate)}</td>
                        <td>
                          {!m.interimSubmitted && <span className="badge badge-open" style={{ marginRight: 4 }}>Interim</span>}
                          {!m.finalSubmitted && <span className="badge badge-rejected">Final</span>}
                        </td>
                        <td><button className="btn btn-primary btn-sm" onClick={() => setReminderTarget(m)}>📧 Send Reminder</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {reviewTarget && (
        <div className="modal-backdrop" onClick={() => setReviewTarget(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>Review Report</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{reviewTarget.uploadedBy.fullName} — {reviewTarget.category === 'interim_report' ? 'Interim' : 'Final'} Report</p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Feedback for student</label>
              <textarea rows={5} value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder="Provide constructive feedback on the report quality, structure, reflection depth..." style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setReviewTarget(null)}>Cancel</button>
              <button className="btn btn-warning" onClick={() => submitReview('revision_needed')}>Request Revisions</button>
              <button className="btn btn-success" onClick={() => submitReview('approved')}>✓ Approve</button>
            </div>
          </div>
        </div>
      )}

      {feedbackView && (
        <div className="modal-backdrop" onClick={() => setFeedbackView(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>Your Feedback</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{feedbackView.uploadedBy.fullName}</p>
            <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', border: '1px solid var(--border)', fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {feedbackView.reviewerFeedback}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setFeedbackView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {reminderTarget && (
        <div className="modal-backdrop" onClick={() => setReminderTarget(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>📧 Send Report Reminder</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {reminderTarget.studentName} — Missing: {[!reminderTarget.interimSubmitted && 'Interim', !reminderTarget.finalSubmitted && 'Final'].filter(Boolean).join(' & ')} Report{(!reminderTarget.interimSubmitted && !reminderTarget.finalSubmitted) ? 's' : ''}
            </p>
            <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text)' }}>
              An email reminder will be sent to the student asking them to submit their missing report(s).
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setReminderTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => submitReminder([!reminderTarget.interimSubmitted && 'interim', !reminderTarget.finalSubmitted && 'final'].filter(Boolean))}>
                Send Reminder Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
