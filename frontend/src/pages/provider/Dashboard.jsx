import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ProviderDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/provider/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="stat-grid">
      <div className="stat-tile"><div className="label">Current Students</div><div className="value">{data.totalStudents}</div></div>
      <div className="stat-tile"><div className="label">Pending Confirmations</div><div className="value">{data.pendingConfirmations}</div></div>
      <div className="stat-tile"><div className="label">Open Issues</div><div className="value">{data.openIssues}</div></div>
      <div className="stat-tile"><div className="label">Upcoming Visits</div><div className="value">{data.upcomingVisits}</div></div>
    </div>
  );
}
