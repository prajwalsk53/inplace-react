import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function DirectorDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/director/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="stat-grid">
      <div className="stat-tile"><div className="label">Total Placements</div><div className="value">{data.totalPlacements}</div></div>
      <div className="stat-tile"><div className="label">Active Placements</div><div className="value">{data.activePlacements}</div></div>
      <div className="stat-tile"><div className="label">Students</div><div className="value">{data.totalStudents}</div></div>
      <div className="stat-tile"><div className="label">Providers</div><div className="value">{data.totalProviders}</div></div>
      <div className="stat-tile"><div className="label">Pending Approvals</div><div className="value">{data.pendingApprovals}</div></div>
      <div className="stat-tile"><div className="label">At Risk</div><div className="value" style={{ color: data.atRiskCount > 0 ? 'var(--danger)' : undefined }}>{data.atRiskCount}</div></div>
    </div>
  );
}
