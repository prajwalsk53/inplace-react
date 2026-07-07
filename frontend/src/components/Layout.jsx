import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/student/dashboard': ['Dashboard', null],
  '/student/my-placement': ['My Placement', 'Your current placement details'],
  '/student/submit-request': ['Submit Request', 'New Placement Authorisation Request'],
  '/student/reports': ['Reports', 'Submit your interim and final placement reports'],
  '/student/visits': ['Visits', 'Your scheduled tutor visits'],
  '/student/announcements': ['Announcements', 'Messages from your placement team'],

  '/tutor/dashboard': ['Dashboard', null],
  '/tutor/placements': ['All Placements', 'View and manage all student placements'],
  '/tutor/create-placement': ['Add Placement', 'Create a placement record on behalf of a student'],
  '/tutor/visits': ['Visits', 'Manage placement visits'],
  '/tutor/schedule-visit': ['Schedule Visit', 'Book a new placement visit'],
  '/tutor/providers': ['Provider Directory', 'Manage placement companies and providers'],
  '/tutor/provider-meetings': ['Provider Meetings', 'Schedule and manage meetings with placement providers'],
  '/tutor/requests': ['Authorisation Requests', 'Review and action student placement requests'],
  '/tutor/reports': ['Student Reports', 'Review and approve placement reports'],
  '/tutor/at-risk': ['At-Risk Students', 'Flag and monitor students needing attention'],
  '/tutor/announcements': ['Announcements', 'Post placement updates'],
  '/tutor/map-view': ['Placement Map', 'View all placement locations and plan visits'],
  '/tutor/settings': ['Cycle Settings', 'Academic year, report deadlines and configuration'],

  '/provider/dashboard': ['Dashboard', 'Manage placement authorizations'],
  '/provider/requests': ['Authorization Requests', 'Review and respond to placement requests'],
  '/provider/students': ['My Students', 'Students currently placed at your company'],
  '/provider/visits': ['Scheduled Visits', 'Upcoming tutor visits to your workplace'],
  '/provider/evaluate': ['Student Evaluations', 'Submit performance feedback for your placement students'],
  '/provider/issues': ['Report an Issue', 'Raise concerns or issues about a student placement'],
  '/provider/terminate': ['Placement Notifications', 'Report early terminations or significant placement changes'],
  '/provider/opportunities': ['Placement Opportunities', 'Post and manage available placement roles for future students'],
  '/provider/settings': ['Company Details', 'Update your company information'],

  '/director/dashboard': ['Programme Director Dashboard', 'Read-only oversight of the placement year programme'],
  '/director/placements': ['Placement Statistics', 'Aggregate placement data by sector, region and company'],
  '/director/at-risk': ['At-Risk Students', 'Read-only view of flagged students requiring attention'],
  '/director/feedback': ['Employer Feedback', 'Summary of provider performance evaluations'],
  '/director/map': ['Placement Map', 'Geographic view of all active placement locations'],
  '/director/reports': ['Reports & Exports', 'Download data exports and summary reports'],

  '/admin/dashboard': ['System Administration', 'Manage users, settings and system health'],
  '/admin/users': ['User Management', 'Create, edit and manage user accounts'],
  '/admin/approve-registrations': ['Registration Approvals', 'Review and approve student registrations'],
  '/admin/placements': ['All Placements', 'Overview of all student placements'],
  '/admin/settings': ['Settings', 'API & email configuration'],
  '/admin/logs': ['Audit Logs', 'System activity and audit trail'],

  '/messages': ['Messages', 'Your conversations'],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [title, staticSubtitle] = pageTitles[location.pathname] || ['InPlace', ''];
  const isWelcomeDashboard = location.pathname === '/student/dashboard' || location.pathname === '/tutor/dashboard' || location.pathname === '/messages';
  const subtitle = isWelcomeDashboard ? `Welcome back, ${user?.fullName?.split(' ')[0] || ''}` : staticSubtitle;

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
