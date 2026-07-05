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
    ['/tutor/placements', '💼', 'Placements'],
    ['/tutor/create-placement', '➕', 'Create Placement'],
    ['/tutor/visits', '📅', 'Visits'],
    ['/tutor/schedule-visit', '🗓️', 'Schedule Visit'],
    ['/tutor/providers', '🏢', 'Providers'],
    ['/tutor/provider-meetings', '🤝', 'Provider Meetings'],
    ['/tutor/requests', '📥', 'Requests'],
    ['/tutor/reports', '📄', 'Reflections & Reports'],
    ['/tutor/announcements', '📢', 'Announcements'],
    ['/tutor/map-view', '🗺️', 'Map View'],
    ['/messages', '💬', 'Messages'],
    ['/tutor/settings', '⚙️', 'Settings'],
  ],
  PROVIDER: [
    ['/provider/dashboard', '📊', 'Dashboard'],
    ['/provider/confirm', '✅', 'Confirm Placements'],
    ['/provider/students', '🎓', 'Students'],
    ['/provider/visits', '📅', 'Visits'],
    ['/provider/requests', '🤝', 'Meeting Requests'],
    ['/provider/issues', '⚠️', 'Issues'],
    ['/provider/evaluate', '⭐', 'Evaluate'],
    ['/provider/terminate', '🛑', 'Terminate'],
    ['/messages', '💬', 'Messages'],
    ['/provider/settings', '⚙️', 'Settings'],
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
    ['/admin/users', '👥', 'Users'],
    ['/admin/approve-registrations', '✅', 'Approve Registrations'],
    ['/admin/placements', '💼', 'Placements'],
    ['/admin/settings', '⚙️', 'Settings'],
    ['/admin/logs', '🧾', 'Audit Logs'],
    ['/admin/export', '📤', 'Export'],
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
