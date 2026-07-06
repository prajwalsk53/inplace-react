import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDay = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit' });
const fmtMonth = (d) => new Date(d).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/provider/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="loading-screen">Loading...</div>;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📋</span>
          <h3>{data.pendingRequests}</h3>
          <p>Pending Authorizations</p>
          <div className={`stat-trend ${data.pendingRequests > 0 ? 'trend-neutral' : 'trend-up'}`}>
            {data.pendingRequests > 0 ? 'Requires your confirmation' : 'All clear!'}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <h3>{data.activePlacements}</h3>
          <p>Active Students</p>
          <div className="stat-trend trend-up">Currently on placement</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🗓</span>
          <h3>{data.upcomingVisits}</h3>
          <p>Upcoming Visits</p>
          <div className="stat-trend trend-neutral">Scheduled visits</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💬</span>
          <h3>{data.unreadCount}</h3>
          <p>Unread Messages</p>
          <div className="stat-trend trend-neutral">{data.unreadCount > 0 ? 'From tutors' : 'All caught up!'}</div>
        </div>
      </div>

      <div className="quick-actions">
        <div className="quick-action" onClick={() => navigate('/provider/requests')}>
          <div className="qa-icon">📋</div>
          <div className="qa-label">Auth Requests</div>
          <div className="qa-desc">{data.pendingRequests} pending</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/provider/students')}>
          <div className="qa-icon">👥</div>
          <div className="qa-label">My Students</div>
          <div className="qa-desc">{data.activePlacements} active</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/provider/visits')}>
          <div className="qa-icon">🗓</div>
          <div className="qa-label">Visits</div>
          <div className="qa-desc">View schedule</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/provider/settings')}>
          <div className="qa-icon">⚙️</div>
          <div className="qa-label">Company Details</div>
          <div className="qa-desc">Update info</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>Pending Authorization Requests</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/provider/requests')}>View All →</button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {data.pendingList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                <p style={{ color: 'var(--muted)' }}>No pending requests</p>
              </div>
            ) : (
              data.pendingList.map((req) => (
                <div key={req.id} style={{ padding: '1.125rem 2rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div className="avatar">{req.student.avatarInitials || '??'}</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{req.student.fullName}</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                        {req.roleTitle || 'N/A'} · {fmtDate(req.startDate)} - {fmtDate(req.endDate)}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/provider/requests?id=${req.id}`)}>Review →</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Upcoming Visits</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/provider/visits')}>View All →</button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {data.visitsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗓</div>
                <p style={{ color: 'var(--muted)' }}>No upcoming visits</p>
              </div>
            ) : (
              data.visitsList.map((v) => (
                <div key={v.id} style={{ padding: '1.125rem 2rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                    <div className="date-box" style={{ width: 50, height: 50 }}>
                      <div className="day" style={{ fontSize: '1rem' }}>{fmtDay(v.scheduledAt)}</div>
                      <div className="month" style={{ fontSize: '0.65rem' }}>{fmtMonth(v.scheduledAt)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{v.placement.student.fullName}</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                        {fmtTime(v.scheduledAt)} · {v.visitType.charAt(0).toUpperCase() + v.visitType.slice(1)} · {v.tutor?.fullName || 'Tutor'}
                      </p>
                      <span className={`badge badge-${v.status === 'confirmed' ? 'approved' : 'pending'}`} style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>
                        {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
