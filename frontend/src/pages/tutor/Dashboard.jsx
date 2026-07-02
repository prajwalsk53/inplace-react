import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function TutorDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/tutor/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="loading-screen">Loading...</div>;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-tile"><div className="label">Total Placements</div><div className="value">{data.totalPlacements}</div></div>
        <div className="stat-tile"><div className="label">Active Placements</div><div className="value">{data.activePlacements}</div></div>
        <div className="stat-tile"><div className="label">Upcoming Visits</div><div className="value">{data.upcomingVisits}</div></div>
        <div className="stat-tile"><div className="label">Pending Requests</div><div className="value">{data.pendingRequests}</div></div>
        <div className="stat-tile"><div className="label">At Risk</div><div className="value" style={{ color: data.atRiskCount > 0 ? 'var(--danger)' : undefined }}>{data.atRiskCount}</div></div>
      </div>
      <div className="grid-2">
        <Link to="/tutor/create-placement" className="card" style={{ display: 'block' }}>
          <h3 className="section-title">Create a placement</h3>
          <p style={{ color: 'var(--muted)' }}>Set up a new placement for a student</p>
        </Link>
        <Link to="/tutor/schedule-visit" className="card" style={{ display: 'block' }}>
          <h3 className="section-title">Schedule a visit</h3>
          <p style={{ color: 'var(--muted)' }}>Book a site visit for one of your placements</p>
        </Link>
      </div>
    </div>
  );
}
