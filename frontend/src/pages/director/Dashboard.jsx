import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Filler, Tooltip, Legend } from 'chart.js';
import api from '../../api/axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Filler, Tooltip, Legend);

const PALETTE = ['#0c1b33', '#1e3a5f', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626'];
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const STATUS_BADGE = { APPROVED: 'approved', ACTIVE: 'approved', AWAITING_PROVIDER: 'pending', AWAITING_TUTOR: 'pending', REJECTED: 'rejected', TERMINATED: 'rejected' };

export default function DirectorDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/director/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="loading-screen">Loading...</div>;

  const kpis = [
    ['Total Students', data.totalStudents, 'var(--navy)', '👥'],
    ['Active Placements', data.activePlacements, 'var(--success)', '✅'],
    ['Pending Approval', data.pendingApproval, 'var(--warning)', '⏳'],
    ['Approval Rate', `${data.approvalRate}%`, 'var(--info)', '📊'],
    ['Total Visits', data.totalVisits, 'var(--navy)', '🗓'],
    ['Visit Completion', `${data.visitCompletion}%`, 'var(--success)', '📋'],
    ['At-Risk Students', data.atRiskAll, data.atRiskHigh > 0 ? 'var(--danger)' : 'var(--warning)', '⚠️'],
    ['Evaluations Submitted', data.evalCount, 'var(--info)', '⭐'],
  ];

  const sectorData = { labels: data.bySector.map((s) => s.label), datasets: [{ label: 'Active Placements', data: data.bySector.map((s) => s.cnt), backgroundColor: PALETTE, borderRadius: 6 }] };
  const statusData = { labels: data.statusBreakdown.map((s) => titleCase(s.status.toLowerCase())), datasets: [{ data: data.statusBreakdown.map((s) => s.cnt), backgroundColor: PALETTE, hoverOffset: 6 }] };
  const cityData = { labels: data.byCity.map((c) => c.label), datasets: [{ label: 'Placements', data: data.byCity.map((c) => c.cnt), backgroundColor: '#2563eb', borderRadius: 6 }] };
  const yoyData = { labels: data.yoy.map((y) => y.yr), datasets: [{ label: 'Placements', data: data.yoy.map((y) => y.cnt), borderColor: '#0c1b33', backgroundColor: 'rgba(12,27,51,0.08)', borderWidth: 2.5, tension: 0.35, fill: true, pointRadius: 5 }] };

  const maxCompanyCount = data.topCompanies[0]?.cnt || 1;

  return (
    <div>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', padding: '0.875rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>👁</span>
        <p style={{ color: '#1e40af', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>
          You are viewing the <strong>Programme Director Dashboard</strong>. This is a read-only overview — no changes can be made from here.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {kpis.map(([label, value, color, icon]) => (
          <div className="panel" key={label} style={{ marginBottom: 0, padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>{label}</p>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color }}>{value}</h3>
              </div>
              <span style={{ fontSize: '1.75rem', opacity: 0.6 }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3>Placements by Sector</h3></div>
          <div style={{ padding: '1.5rem', height: 260 }}>
            <Bar data={sectorData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
          </div>
        </div>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3>Placement Status Breakdown</h3></div>
          <div style={{ padding: '1.5rem', height: 260 }}>
            <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 12 } } }, cutout: '60%' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3>Top Placement Locations</h3></div>
          <div style={{ padding: '1.5rem', height: 260 }}>
            <Bar data={cityData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
          </div>
        </div>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3>Year-on-Year Placements</h3></div>
          <div style={{ padding: '1.5rem', height: 260 }}>
            <Line data={yoyData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3>Top Placement Companies</h3></div>
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            {data.topCompanies.map((co, i) => (
              <div key={co.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '0.8rem', minWidth: 20 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 500 }}>{co.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{co.cnt}</span>
                <div style={{ width: 80, background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${Math.min(100, Math.round((co.cnt / maxCompanyCount) * 100))}%`, background: 'var(--success)', borderRadius: 4, height: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3>Recent Placement Activity</h3></div>
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            {data.recent.map((r, i) => (
              <div key={i} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy)' }}>{r.studentName}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{r.companyName}{r.roleTitle ? ` · ${r.roleTitle}` : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge badge-${STATUS_BADGE[r.status] || 'open'}`} style={{ fontSize: '0.72rem' }}>{titleCase(r.status.toLowerCase())}</span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ paddingTop: '1rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/director/placements')}>View All Placements →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
