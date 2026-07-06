import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import api from '../../api/axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Tooltip, Legend);

const NAVY = '#0c1b33';
const GOLD = '#e8a020';

export default function TutorDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    api.get('/tutor/dashboard').then(({ data }) => setSummary(data));
  }, []);

  useEffect(() => {
    const refresh = () => {
      api.get('/tutor/dashboard-metrics').then(({ data }) => {
        setMetrics(data.charts);
        setLastUpdated(new Date(data.ts));
      }).catch(() => {});
    };
    refresh();
    intervalRef.current = setInterval(refresh, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (!summary) return <div className="loading-screen">Loading...</div>;

  const statusData = metrics && {
    labels: metrics.status.map((s) => s.status.replace('_', ' ')),
    datasets: [{ data: metrics.status.map((s) => s.cnt), backgroundColor: metrics.status.map((_, i) => (i % 2 === 0 ? NAVY : GOLD)) }],
  };
  const cityData = metrics && {
    labels: metrics.city.map((c) => c.city),
    datasets: [{ data: metrics.city.map((c) => c.cnt), backgroundColor: NAVY }],
  };
  const reflectionData = metrics && {
    labels: metrics.reflectionTrend.map((r) => r.week),
    datasets: [{ data: metrics.reflectionTrend.map((r) => r.cnt), borderColor: NAVY, pointBackgroundColor: GOLD, fill: false, tension: 0.3 }],
  };
  const visitsData = metrics && {
    labels: metrics.visits.map((v) => v.status.replace('_', ' ')),
    datasets: [{ data: metrics.visits.map((v) => v.cnt), backgroundColor: GOLD }],
  };

  return (
    <div>
      <div className="quick-actions" style={{ marginTop: '0.5rem' }}>
        <div className="quick-action" onClick={() => navigate('/tutor/requests')}>
          <div className="qa-icon">📋</div>
          <div className="qa-label">Auth Requests</div>
          <div className="qa-desc">{summary.pendingRequests} pending review</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/tutor/placements')}>
          <div className="qa-icon">👥</div>
          <div className="qa-label">All Placements</div>
          <div className="qa-desc">{summary.totalActive} active students</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/tutor/visits')}>
          <div className="qa-icon">🗓</div>
          <div className="qa-label">Visit Planner</div>
          <div className="qa-desc">Schedule visits</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/messages')}>
          <div className="qa-icon">💬</div>
          <div className="qa-label">Messages</div>
          <div className="qa-desc">{summary.unreadCount > 0 ? `${summary.unreadCount} unread` : 'No new messages'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(320px,1fr))', gap: '1rem', marginTop: '1.25rem' }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3 style={{ fontSize: '1rem' }}>Placements by Status</h3></div>
          <div className="panel-body" style={{ height: 280 }}>
            {statusData && <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />}
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3 style={{ fontSize: '1rem' }}>Placements by City (Top 8)</h3></div>
          <div className="panel-body" style={{ height: 280 }}>
            {cityData && <Bar data={cityData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3 style={{ fontSize: '1rem' }}>Reflections Trend (Last 12 Weeks)</h3></div>
          <div className="panel-body" style={{ height: 280 }}>
            {reflectionData && <Line data={reflectionData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3 style={{ fontSize: '1rem' }}>Visits by Status</h3></div>
          <div className="panel-body" style={{ height: 280 }}>
            {visitsData && <Bar data={visitsData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
          </div>
        </div>
      </div>

      <small style={{ display: 'block', marginTop: '0.75rem', color: 'var(--muted)' }}>
        Live: {lastUpdated ? `updated ${lastUpdated.toLocaleTimeString()}` : 'loading…'}
      </small>
    </div>
  );
}
