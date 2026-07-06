import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import ProviderRegister from './pages/ProviderRegister';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProviderConfirm from './pages/ProviderConfirm';
import Messages from './pages/Messages';

import StudentDashboard from './pages/student/Dashboard';
import MyPlacement from './pages/student/MyPlacement';
import SubmitRequest from './pages/student/SubmitRequest';
import StudentReports from './pages/student/Reports';
import StudentVisits from './pages/student/Visits';
import StudentAnnouncements from './pages/student/Announcements';

import TutorDashboard from './pages/tutor/Dashboard';
import TutorPlacements from './pages/tutor/Placements';
import CreatePlacement from './pages/tutor/CreatePlacement';
import EditPlacement from './pages/tutor/EditPlacement';
import TutorVisits from './pages/tutor/Visits';
import ScheduleVisit from './pages/tutor/ScheduleVisit';
import EditVisit from './pages/tutor/EditVisit';
import Providers from './pages/tutor/Providers';
import ProviderMeetings from './pages/tutor/ProviderMeetings';
import TutorRequests from './pages/tutor/Requests';
import TutorReports from './pages/tutor/Reports';
import TutorAtRisk from './pages/tutor/AtRisk';
import TutorAnnouncements from './pages/tutor/Announcements';
import MapView from './pages/tutor/MapView';
import TutorSettings from './pages/tutor/Settings';

import ProviderDashboard from './pages/provider/Dashboard';
import ProviderConfirmList from './pages/provider/Confirm';
import ProviderStudents from './pages/provider/Students';
import ProviderVisits from './pages/provider/Visits';
import ProviderRequests from './pages/provider/Requests';
import ProviderIssues from './pages/provider/Issues';
import ProviderEvaluate from './pages/provider/Evaluate';
import ProviderTerminate from './pages/provider/Terminate';
import ProviderSettings from './pages/provider/Settings';

import DirectorDashboard from './pages/director/Dashboard';
import DirectorPlacements from './pages/director/Placements';
import DirectorAtRisk from './pages/director/AtRisk';
import DirectorFeedback from './pages/director/Feedback';
import DirectorMap from './pages/director/Map';
import DirectorReports from './pages/director/Reports';

import AdminUsers from './pages/admin/Users';
import AdminApproveRegistrations from './pages/admin/ApproveRegistrations';
import AdminPlacements from './pages/admin/Placements';
import AdminSettings from './pages/admin/Settings';
import AdminLogs from './pages/admin/Logs';
import AdminExport from './pages/admin/Export';

const dashboardRoute = {
  STUDENT: '/student/dashboard',
  TUTOR: '/tutor/dashboard',
  PROVIDER: '/provider/dashboard',
  DIRECTOR: '/director/dashboard',
  ADMIN: '/admin/users',
};

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardRoute[user.role] || '/login'} replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={dashboardRoute[user.role]} replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={dashboardRoute[user.role]} replace />} />
      <Route path="/provider-register" element={!user ? <ProviderRegister /> : <Navigate to={dashboardRoute[user.role]} replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/provider-confirm/:token" element={<ProviderConfirm />} />
      <Route path="/" element={<Navigate to={user ? dashboardRoute[user.role] : '/login'} replace />} />

      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

      {/* Student */}
      <Route path="/student/dashboard" element={<ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/my-placement" element={<ProtectedRoute roles={['STUDENT']}><MyPlacement /></ProtectedRoute>} />
      <Route path="/student/submit-request" element={<ProtectedRoute roles={['STUDENT']}><SubmitRequest /></ProtectedRoute>} />
      <Route path="/student/reports" element={<ProtectedRoute roles={['STUDENT']}><StudentReports /></ProtectedRoute>} />
      <Route path="/student/visits" element={<ProtectedRoute roles={['STUDENT']}><StudentVisits /></ProtectedRoute>} />
      <Route path="/student/announcements" element={<ProtectedRoute roles={['STUDENT']}><StudentAnnouncements /></ProtectedRoute>} />

      {/* Tutor */}
      <Route path="/tutor/dashboard" element={<ProtectedRoute roles={['TUTOR']}><TutorDashboard /></ProtectedRoute>} />
      <Route path="/tutor/placements" element={<ProtectedRoute roles={['TUTOR']}><TutorPlacements /></ProtectedRoute>} />
      <Route path="/tutor/create-placement" element={<ProtectedRoute roles={['TUTOR']}><CreatePlacement /></ProtectedRoute>} />
      <Route path="/tutor/placements/:id/edit" element={<ProtectedRoute roles={['TUTOR']}><EditPlacement /></ProtectedRoute>} />
      <Route path="/tutor/visits" element={<ProtectedRoute roles={['TUTOR']}><TutorVisits /></ProtectedRoute>} />
      <Route path="/tutor/schedule-visit" element={<ProtectedRoute roles={['TUTOR']}><ScheduleVisit /></ProtectedRoute>} />
      <Route path="/tutor/edit-visit/:id" element={<ProtectedRoute roles={['TUTOR']}><EditVisit /></ProtectedRoute>} />
      <Route path="/tutor/providers" element={<ProtectedRoute roles={['TUTOR']}><Providers /></ProtectedRoute>} />
      <Route path="/tutor/provider-meetings" element={<ProtectedRoute roles={['TUTOR']}><ProviderMeetings /></ProtectedRoute>} />
      <Route path="/tutor/requests" element={<ProtectedRoute roles={['TUTOR']}><TutorRequests /></ProtectedRoute>} />
      <Route path="/tutor/reports" element={<ProtectedRoute roles={['TUTOR']}><TutorReports /></ProtectedRoute>} />
      <Route path="/tutor/at-risk" element={<ProtectedRoute roles={['TUTOR']}><TutorAtRisk /></ProtectedRoute>} />
      <Route path="/tutor/announcements" element={<ProtectedRoute roles={['TUTOR']}><TutorAnnouncements /></ProtectedRoute>} />
      <Route path="/tutor/map-view" element={<ProtectedRoute roles={['TUTOR']}><MapView /></ProtectedRoute>} />
      <Route path="/tutor/settings" element={<ProtectedRoute roles={['TUTOR']}><TutorSettings /></ProtectedRoute>} />

      {/* Provider */}
      <Route path="/provider/dashboard" element={<ProtectedRoute roles={['PROVIDER']}><ProviderDashboard /></ProtectedRoute>} />
      <Route path="/provider/confirm" element={<ProtectedRoute roles={['PROVIDER']}><ProviderConfirmList /></ProtectedRoute>} />
      <Route path="/provider/students" element={<ProtectedRoute roles={['PROVIDER']}><ProviderStudents /></ProtectedRoute>} />
      <Route path="/provider/visits" element={<ProtectedRoute roles={['PROVIDER']}><ProviderVisits /></ProtectedRoute>} />
      <Route path="/provider/requests" element={<ProtectedRoute roles={['PROVIDER']}><ProviderRequests /></ProtectedRoute>} />
      <Route path="/provider/issues" element={<ProtectedRoute roles={['PROVIDER']}><ProviderIssues /></ProtectedRoute>} />
      <Route path="/provider/evaluate" element={<ProtectedRoute roles={['PROVIDER']}><ProviderEvaluate /></ProtectedRoute>} />
      <Route path="/provider/terminate" element={<ProtectedRoute roles={['PROVIDER']}><ProviderTerminate /></ProtectedRoute>} />
      <Route path="/provider/settings" element={<ProtectedRoute roles={['PROVIDER']}><ProviderSettings /></ProtectedRoute>} />

      {/* Director */}
      <Route path="/director/dashboard" element={<ProtectedRoute roles={['DIRECTOR']}><DirectorDashboard /></ProtectedRoute>} />
      <Route path="/director/placements" element={<ProtectedRoute roles={['DIRECTOR']}><DirectorPlacements /></ProtectedRoute>} />
      <Route path="/director/at-risk" element={<ProtectedRoute roles={['DIRECTOR']}><DirectorAtRisk /></ProtectedRoute>} />
      <Route path="/director/feedback" element={<ProtectedRoute roles={['DIRECTOR']}><DirectorFeedback /></ProtectedRoute>} />
      <Route path="/director/map" element={<ProtectedRoute roles={['DIRECTOR']}><DirectorMap /></ProtectedRoute>} />
      <Route path="/director/reports" element={<ProtectedRoute roles={['DIRECTOR']}><DirectorReports /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/approve-registrations" element={<ProtectedRoute roles={['ADMIN']}><AdminApproveRegistrations /></ProtectedRoute>} />
      <Route path="/admin/placements" element={<ProtectedRoute roles={['ADMIN']}><AdminPlacements /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute roles={['ADMIN']}><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/logs" element={<ProtectedRoute roles={['ADMIN']}><AdminLogs /></ProtectedRoute>} />
      <Route path="/admin/export" element={<ProtectedRoute roles={['ADMIN']}><AdminExport /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={user ? dashboardRoute[user.role] : '/login'} replace />} />
    </Routes>
  );
}
