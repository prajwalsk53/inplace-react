import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const STEPS = [
  { label: 'Submitted', icon: '✓' },
  { label: 'Provider Confirmed', icon: '✓' },
  { label: 'Tutor Review', icon: '▶' },
  { label: 'Approved', icon: '★' },
];

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateShort = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/student/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="loading-screen">Loading...</div>;

  const { placement, latestRequest, currentStep, reportCount, nextVisit, unreadMessages, unreadAnnouncements, interimDue, finalDue, progressPct, daysToEnd } = data;

  const badgeClass = (status) => (['APPROVED', 'ACTIVE', 'COMPLETED'].includes(status) ? 'badge-approved' : ['REJECTED', 'TERMINATED'].includes(status) ? 'badge-rejected' : 'badge-warning');

  const today = new Date();
  const finalSubmitted = reportCount >= 2;
  const finalIsPast = finalDue && today > new Date(finalDue);
  const finalUrgent = finalDue && !finalIsPast && Math.round((new Date(finalDue) - today) / 86400000) <= 30;
  const interimSubmitted = reportCount >= 1;
  const interimIsPast = interimDue && today > new Date(interimDue);

  return (
    <div>
      {unreadAnnouncements.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#0c1b33,#1a2d4d)', borderRadius: 'var(--radius)', padding: '1.25rem 1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
          <span style={{ fontSize: '2rem', flexShrink: 0, marginTop: '0.1rem' }}>📢</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 700, color: 'white', fontSize: '0.9375rem' }}>
                {unreadAnnouncements.length} new announcement{unreadAnnouncements.length > 1 ? 's' : ''} from your placement team
              </p>
              <Link to="/student/announcements" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 500 }}>View all →</Link>
            </div>
            {unreadAnnouncements.map((ann) => (
              <Link key={ann.id} to="/student/announcements" style={{ display: 'block', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.5rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{ann.authorName} · {fmtDateShort(ann.createdAt)}</span>
                </div>
                <p style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{ann.title}</p>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.body}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">🏢</span>
          <h3>{placement ? 'Active' : 'None'}</h3>
          <p>Placement Status</p>
          <div className={`stat-trend ${placement ? 'trend-up' : 'trend-neutral'}`}>
            {placement ? `✓ ${placement.company.name}` : 'No active placement yet'}
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📄</span>
          <h3>{reportCount}/2</h3>
          <p>Reports Submitted</p>
          <div className="stat-trend trend-neutral">
            {reportCount >= 2 ? 'All reports submitted ✓' : finalDue ? `Final due ${fmtDate(finalDue)}` : 'No deadlines set yet'}
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🗓</span>
          <h3>{nextVisit ? fmtDateShort(nextVisit.scheduledAt) : 'None'}</h3>
          <p>Next Visit</p>
          <div className="stat-trend trend-up">
            {nextVisit ? `${nextVisit.visitType.replace('_', ' ')} · ${fmtTime(nextVisit.scheduledAt)}` : 'No upcoming visits'}
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💬</span>
          <h3>{unreadMessages}</h3>
          <p>Unread Messages</p>
          <div className="stat-trend trend-neutral">{unreadMessages > 0 ? 'From your tutor' : 'All caught up!'}</div>
        </div>
      </div>

      <div className="quick-actions">
        <div className="quick-action" onClick={() => navigate('/student/my-placement')}>
          <div className="qa-icon">🏢</div>
          <div className="qa-label">My Placement</div>
          <div className="qa-desc">View full details</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/student/submit-request')}>
          <div className="qa-icon">📋</div>
          <div className="qa-label">New Request</div>
          <div className="qa-desc">Submit authorisation</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/student/reports')}>
          <div className="qa-icon">📄</div>
          <div className="qa-label">Submit Report</div>
          <div className="qa-desc">{reportCount < 2 ? 'Upload placement report' : 'All reports submitted'}</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/messages')}>
          <div className="qa-icon">💬</div>
          <div className="qa-label">Messages</div>
          <div className="qa-desc">{unreadMessages > 0 ? `${unreadMessages} unread` : 'No new messages'}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>Request Status Tracker</h3>
            {latestRequest && (
              <span className={`badge ${badgeClass(latestRequest.status)}`}>{latestRequest.status.replace(/_/g, ' ')}</span>
            )}
          </div>
          <div className="panel-body">
            {latestRequest ? (
              <>
                <div className="status-track">
                  {STEPS.map((step, i) => {
                    const cls = i < currentStep ? 'done' : i === currentStep ? 'active' : '';
                    return (
                      <div className={`status-step ${cls}`} key={step.label}>
                        <div className="step-circle">{cls === 'done' ? '✓' : cls === 'active' ? step.icon : ''}</div>
                        <div className="step-label">{step.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  {latestRequest.status === 'SUBMITTED' || latestRequest.status === 'AWAITING_PROVIDER' ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Waiting for <strong style={{ color: 'var(--text)' }}>{latestRequest.companyName}</strong> to confirm your placement details.</p>
                  ) : latestRequest.status === 'AWAITING_TUTOR' ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Your request is with your <strong style={{ color: 'var(--text)' }}>Placement Tutor</strong> for final approval. You'll be notified by email when a decision is made.</p>
                  ) : latestRequest.status === 'APPROVED' || latestRequest.status === 'ACTIVE' ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--success)' }}>🎉 Your placement at <strong>{latestRequest.companyName}</strong> has been approved!</p>
                  ) : latestRequest.status === 'REJECTED' ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>Your request was not approved. Please check your messages for feedback from your tutor.</p>
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Placement status: {latestRequest.status.replace(/_/g, ' ')}.</p>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>You haven't submitted a placement request yet.</p>
                <Link to="/student/submit-request" className="btn btn-primary">Submit a Request →</Link>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Upcoming Deadlines</h3>
            <Link to="/student/reports" className="btn btn-ghost btn-sm">View Reports →</Link>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {placement ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: finalSubmitted ? 'var(--success-bg)' : finalUrgent ? 'var(--danger-bg)' : 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', border: `1px solid ${finalSubmitted ? '#6ee7b7' : finalUrgent ? '#fca5a5' : '#fcd34d'}` }}>
                    <span style={{ fontSize: '1.5rem' }}>{finalSubmitted ? '✅' : '📄'}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Final Placement Report</p>
                      <p style={{ fontSize: '0.8125rem', color: finalSubmitted ? 'var(--success)' : finalUrgent ? 'var(--danger)' : 'var(--warning)' }}>
                        {finalSubmitted ? 'Submitted ✓' : finalIsPast ? `OVERDUE — was due ${fmtDate(finalDue)}` : `Due ${fmtDate(finalDue)}`}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: interimSubmitted ? 'var(--success-bg)' : interimIsPast ? 'var(--danger-bg)' : 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', border: `1px solid ${interimSubmitted ? '#6ee7b7' : interimIsPast ? '#fca5a5' : '#fcd34d'}` }}>
                    <span style={{ fontSize: '1.5rem' }}>{interimSubmitted ? '✅' : '📋'}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Interim Report</p>
                      <p style={{ fontSize: '0.8125rem', color: interimSubmitted ? 'var(--success)' : interimIsPast ? 'var(--danger)' : 'var(--warning)' }}>
                        {interimSubmitted ? 'Submitted · Marked as reviewed ✓' : interimIsPast ? `OVERDUE — was due ${fmtDate(interimDue)}` : `Due ${fmtDate(interimDue)}`}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid #bae6fd' }}>
                    <span style={{ fontSize: '1.5rem' }}>🗓</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Placement End Date</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--info)' }}>{fmtDate(placement.endDate)} · {daysToEnd} days remaining</p>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📅</div>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9375rem' }}>No deadlines yet. Submit a placement request to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {placement && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Placement at {placement.company.name}</h3>
              <p>{placement.company.address} · {fmtDate(placement.startDate)} → {fmtDate(placement.endDate)}</p>
            </div>
            <Link to="/student/my-placement" className="btn btn-ghost btn-sm">View Full Details →</Link>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div className="progress-bar" style={{ height: 12 }}>
                  <div className="progress-fill" style={{ width: `${progressPct}%`, height: '100%' }} />
                </div>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>{progressPct}% Complete</div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              {(() => {
                const start = new Date(placement.startDate);
                const end = new Date(placement.endDate);
                const total = Math.round(((end - start) / 86400000 / 30) * 10) / 10;
                if (today < start) return `Starts ${fmtDate(placement.startDate)} · ${total}-month placement`;
                if (today > end) return `Completed · ${total}-month placement`;
                const elapsed = Math.round(((today - start) / 86400000 / 30) * 10) / 10;
                return `${elapsed} months completed of a ${total}-month placement`;
              })()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
