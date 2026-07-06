import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = {
  STUDENT: [
    ['/student/dashboard', '📊', 'Dashboard'],
    ['/student/my-placement', '💼', 'My Placement'],
    ['/student/submit-request', '📝', 'Submit Request'],
    ['/student/reports', '📄', 'Reports'],
    ['/student/visits', '📅', 'Visits'],
    ['/student/announcements', '📢', 'Announcements'],
    ['/messages', '💬', 'Messages'],
  ],
  TUTOR: [
    ['/tutor/dashboard', '📊', 'Dashboard'],
    ['/tutor/placements', '👥', 'All Placements'],
    ['/tutor/create-placement', '➕', 'Create Placement'],
    ['/tutor/visits', '📅', 'Visits'],
    ['/tutor/schedule-visit', '🗓️', 'Schedule Visit'],
    ['/tutor/providers', '🏢', 'Providers'],
    ['/tutor/provider-meetings', '🤝', 'Provider Meetings'],
    ['/tutor/requests', '📥', 'Authorisation Requests'],
    ['/tutor/reports', '📄', 'Reports'],
    ['/tutor/at-risk', '⚠️', 'At-Risk Students'],
    ['/tutor/announcements', '📢', 'Announcements'],
    ['/tutor/map-view', '🗺️', 'Map View'],
    ['/messages', '💬', 'Messages'],
    ['/tutor/settings', '⚙️', 'Settings'],
  ],
  PROVIDER: [
    ['/provider/dashboard', '🏠', 'Dashboard'],
    ['/provider/requests', '📋', 'Auth Requests'],
    ['/provider/students', '👥', 'My Students'],
    ['/provider/visits', '🗓', 'Scheduled Visits'],
    ['/messages', '💬', 'Messages'],
    ['/provider/evaluate', '⭐', 'Evaluations'],
    ['/provider/issues', '⚠️', 'Report Issue'],
    ['/provider/terminate', '📢', 'Notify Change'],
    ['/provider/opportunities', '💼', 'Opportunities'],
    ['/provider/settings', '⚙️', 'Company Details'],
  ],
  DIRECTOR: [
    ['/director/dashboard', '📊', 'Dashboard'],
    ['/director/placements', '💼', 'Placements'],
    ['/director/at-risk', '⚠️', 'At Risk'],
    ['/director/feedback', '⭐', 'Employer Feedback'],
    ['/director/map', '🗺️', 'Map'],
    ['/director/reports', '📈', 'Reports'],
  ],
  ADMIN: [
    ['/admin/dashboard', '🏠', 'Dashboard'],
    ['/admin/approve-registrations', '📝', 'Registration Approvals'],
    ['/admin/users', '👥', 'Manage Users'],
    ['/admin/placements', '🏢', 'All Placements'],
    ['/admin/settings', '⚙️', 'Settings'],
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const items = NAV[user?.role] || [];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">InPlace</div>
      <nav className="sidebar-nav">
        {items.map(([to, icon, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
