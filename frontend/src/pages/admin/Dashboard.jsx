import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const fmtDateTime = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setData(data));
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const backup = async () => {
    if (!window.confirm('Backup database now?')) return;
    const { data } = await api.get('/admin/backup', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inplace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!data) return <div className="loading-screen">Loading...</div>;
  const r = data.usersByRole;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <h3>{data.totalUsers}</h3>
          <p>Total Users</p>
          <div className="stat-trend trend-up">{r.student || 0} students, {r.tutor || 0} tutors</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏢</span>
          <h3>{data.activePlacements}</h3>
          <p>Active Placements</p>
          <div className="stat-trend trend-up">Currently running</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏭</span>
          <h3>{data.totalCompanies}</h3>
          <p>Registered Companies</p>
          <div className="stat-trend trend-neutral">Partner organizations</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💾</span>
          <h3>{data.dbSizeMb} MB</h3>
          <p>Database Size</p>
          <div className="stat-trend trend-neutral">Postgres (Neon)</div>
        </div>
      </div>

      <div className="quick-actions">
        <div className="quick-action" onClick={() => navigate('/admin/users')}>
          <div className="qa-icon">👥</div>
          <div className="qa-label">Manage Users</div>
          <div className="qa-desc">{data.totalUsers} total</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/admin/settings')}>
          <div className="qa-icon">⚙️</div>
          <div className="qa-label">System Settings</div>
          <div className="qa-desc">Configure system</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/admin/logs')}>
          <div className="qa-icon">📊</div>
          <div className="qa-label">Audit Logs</div>
          <div className="qa-desc">View activity</div>
        </div>
        <div className="quick-action" onClick={backup}>
          <div className="qa-icon">💾</div>
          <div className="qa-label">Backup</div>
          <div className="qa-desc">Export database</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>User Breakdown</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/users')}>Manage →</button>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[['Students', 'student', 'Active accounts'], ['Placement Tutors', 'tutor', 'Staff accounts'], ['Placement Providers', 'provider', 'Company accounts'], ['Administrators', 'admin', 'Admin accounts']].map(([label, key, sub]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{sub}</p>
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: 'var(--navy)' }}>{r[key] || 0}</h3>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Recent Activity</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/logs')}>View All →</button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {data.recentActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <p style={{ color: 'var(--muted)' }}>No activity logged yet</p>
              </div>
            ) : (
              data.recentActivity.map((log) => (
                <div key={log.id} style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📝</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{log.fullName}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
                        {log.action}{log.tableAffected ? ` — ${log.tableAffected}` : ''}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{fmtDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><h3>System Health</h3></div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.25rem' }}>
            <div style={{ textAlign: 'center', padding: '1.25rem', background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid #6ee7b7' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
              <p style={{ fontWeight: 600, color: 'var(--success)' }}>Database Online</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{data.dbSizeMb} MB used</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1.25rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid #bae6fd' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</p>
              <p style={{ fontWeight: 600, color: 'var(--info)' }}>Security</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Password encryption active</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1.25rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid #bae6fd' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏰</p>
              <p style={{ fontWeight: 600, color: 'var(--info)' }}>Server Time</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{fmtDateTime(now)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
