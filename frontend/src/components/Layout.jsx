import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/student/dashboard': ['Dashboard', 'Welcome back'],
  '/student/my-placement': ['My Placement', 'Your current placement details'],
  '/student/submit-request': ['Submit Request', 'Raise a change request with your tutor'],
  '/student/reports': ['Reports', 'Submit your interim and final placement reports'],
  '/student/visits': ['Visits', 'Your scheduled tutor visits'],
  '/student/announcements': ['Announcements', 'Messages from your placement team'],

  '/tutor/dashboard': ['Dashboard', 'Tutor overview'],
  '/tutor/placements': ['Placements', 'Placements you manage'],
  '/tutor/create-placement': ['Create Placement', 'Set up a new student placement'],
  '/tutor/visits': ['Visits', 'Manage placement visits'],
  '/tutor/schedule-visit': ['Schedule Visit', 'Book a new placement visit'],
  '/tutor/providers': ['Providers', 'Employer directory'],
  '/tutor/provider-meetings': ['Provider Meetings', 'Meetings with placement providers'],
  '/tutor/requests': ['Requests', 'Placement change requests'],
  '/tutor/reports': ['Reflections & Reports', 'Review student submissions'],
  '/tutor/announcements': ['Announcements', 'Post placement updates'],
  '/tutor/map-view': ['Map View', 'Placements by location'],
  '/tutor/settings': ['Settings', 'Your preferences'],

  '/provider/dashboard': ['Dashboard', 'Employer overview'],
  '/provider/confirm': ['Confirm Placements', 'Placements awaiting your confirmation'],
  '/provider/students': ['Students', 'Students placed with your organisation'],
  '/provider/visits': ['Visits', 'Tutor visits at your organisation'],
  '/provider/requests': ['Meeting Requests', 'Tutor meeting requests'],
  '/provider/issues': ['Issues', 'Workplace issues'],
  '/provider/evaluate': ['Evaluate', 'Evaluate student performance'],
  '/provider/terminate': ['Terminate', 'Flag a placement for termination'],
  '/provider/settings': ['Settings', 'Your organisation details'],

  '/director/dashboard': ['Dashboard', 'Programme overview'],
  '/director/placements': ['Placements', 'All placements'],
  '/director/at-risk': ['At Risk', 'Placements needing attention'],
  '/director/feedback': ['Employer Feedback', 'Provider evaluations'],
  '/director/map': ['Map', 'Placements by location'],
  '/director/reports': ['Reports', 'Programme analytics'],

  '/admin/users': ['Users', 'Manage all users'],
  '/admin/approve-registrations': ['Approve Registrations', 'Pending account approvals'],
  '/admin/placements': ['Placements', 'All placements'],
  '/admin/settings': ['Settings', 'System configuration'],
  '/admin/logs': ['Audit Logs', 'System activity'],
  '/admin/export': ['Export', 'Download placement data'],

  '/messages': ['Messages', 'Your conversations'],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [title, subtitle] = pageTitles[location.pathname] || ['InPlace', ''];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <div>
            <h2>{title}</h2>
            <div className="subtitle">{subtitle}</div>
          </div>
          <div className="topbar-user">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.fullName}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.role?.toLowerCase()}</div>
            </div>
            <div className="avatar">{user?.avatarInitials}</div>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout} title="Log out">
              Log out
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
