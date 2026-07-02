import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_BADGE = {
  SUBMITTED: 'badge-muted', AWAITING_PROVIDER: 'badge-warning', AWAITING_TUTOR: 'badge-warning',
  APPROVED: 'badge-info', ACTIVE: 'badge-success', COMPLETED: 'badge-success',
  REJECTED: 'badge-danger', TERMINATED: 'badge-danger',
};

export default function StudentDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/student/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="loading-screen">Loading...</div>;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-tile"><div className="label">Upcoming Visits</div><div className="value">{data.upcomingVisits}</div></div>
        <div className="stat-tile"><div className="label">Unread Messages</div><div className="value">{data.unreadMessages}</div></div>
        <div className="stat-tile"><div className="label">Unread Notifications</div><div className="value">{data.unreadNotifications}</div></div>
        <div className="stat-tile">
          <div className="label">Placement Status</div>
          <div className="value" style={{ fontSize: 18 }}>
            {data.placement ? <span className={`badge ${STATUS_BADGE[data.placement.status]}`}>{data.placement.status.replace('_', ' ')}</span> : 'None yet'}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Your Placement</h3>
        {data.placement ? (
          <div>
            <p><strong>{data.placement.roleTitle}</strong> at {data.placement.company.name}</p>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>{data.placement.company.address}</p>
            {data.placement.tutor && <p style={{ marginTop: 10 }}>Tutor: {data.placement.tutor.fullName}</p>}
            <Link to="/student/my-placement" className="btn btn-outline btn-sm" style={{ marginTop: 16 }}>View details</Link>
          </div>
        ) : (
          <div className="empty-state">You don't have a placement yet. Your tutor will create one for you.</div>
        )}
      </div>
    </div>
  );
}
