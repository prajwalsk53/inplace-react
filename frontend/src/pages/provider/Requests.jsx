import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const CHANGE_TYPE_LABELS = {
  end_date: 'Change End Date',
  start_date: 'Change Start Date',
  role: 'Change Role',
  supervisor: 'Change Supervisor',
  salary: 'Change Salary / Terms',
  transfer: 'Transfer Company',
};
const STATUS_BADGE = { AWAITING_PROVIDER: 'pending', AWAITING_TUTOR: 'review', APPROVED: 'approved', ACTIVE: 'approved', REJECTED: 'rejected' };
const CR_BADGE = { PENDING_PROVIDER: 'pending', PENDING_TUTOR: 'review', APPROVED: 'approved', REJECTED: 'rejected' };

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProviderRequests() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = Number(searchParams.get('id')) || null;

  const [requests, setRequests] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [flash, setFlash] = useState(null);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [crTarget, setCrTarget] = useState(null);
  const [crComment, setCrComment] = useState('');

  const load = () => api.get('/provider/placements').then(({ data }) => setRequests(data));
  const loadChangeRequests = () => api.get('/provider/change-requests').then(({ data }) => setChangeRequests(data));
  useEffect(() => { load(); loadChangeRequests(); }, []);

  const pendingCount = requests.filter((r) => r.status === 'AWAITING_PROVIDER').length;
  const approvedCount = requests.filter((r) => ['APPROVED', 'ACTIVE'].includes(r.status)).length;
  const activeCount = requests.filter((r) => r.status === 'ACTIVE').length;
  const pendingChangeCount = changeRequests.filter((cr) => cr.status === 'PENDING_PROVIDER').length;

  const confirmApprove = async () => {
    await api.post(`/provider/placements/${approveTarget.id}/confirm`, { decision: 'approve' });
    setApproveTarget(null);
    setFlash({ type: 'success', msg: 'Placement approved! The tutor and student have been notified.' });
    load();
  };

  const confirmReject = async () => {
    await api.post(`/provider/placements/${rejectTarget.id}/confirm`, { decision: 'reject', reason: rejectReason });
    setRejectTarget(null);
    setFlash({ type: 'danger', msg: 'Placement request rejected. The student and tutor have been notified.' });
    load();
  };

  const submitFeedback = async () => {
    await api.post(`/provider/placements/${feedbackTarget.id}/feedback`, { feedback: feedbackText });
    setFeedbackTarget(null);
    setFlash({ type: 'success', msg: '✅ Feedback submitted successfully!' });
    load();
  };

  const confirmCr = async () => {
    await api.put(`/provider/change-requests/${crTarget.cr.id}/respond`, { decision: crTarget.action, comment: crComment });
    setCrTarget(null);
    setFlash({ type: crTarget.action === 'approve' ? 'success' : 'danger', msg: crTarget.action === 'approve' ? 'Change request approved and forwarded to the tutor for final review.' : 'Change request rejected. The student has been notified.' });
    loadChangeRequests();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Pending Approval</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--warning)' }}>{pendingCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Total Requests</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--navy)' }}>{requests.length}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Approved</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--success)' }}>{approvedCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Active Placements</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--info)' }}>{activeCount}</h3>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><h3>📋 All Placement Requests</h3></div>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ color: 'var(--muted)' }}>No placement requests yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Role</th><th>Dates</th><th>Year/Programme</th><th>Tutor</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={highlightId === req.id ? { background: 'var(--cream)' } : undefined}>
                    <td>
                      <div className="avatar-cell">
                        <div className="avatar">{req.student.avatarInitials || '??'}</div>
                        <div><h4>{req.student.fullName}</h4><p>{req.student.email}</p></div>
                      </div>
                    </td>
                    <td><span className="type-chip">{req.roleTitle || 'Not specified'}</span></td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8125rem' }}>
                      {fmtDate(req.startDate)}<br /><span style={{ color: 'var(--muted)' }}>to</span><br />{fmtDate(req.endDate)}
                    </td>
                    <td>
                      {req.student.academicYear || 'N/A'}<br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{req.student.programmeType || ''}</span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{req.tutor?.fullName || 'Unassigned'}</td>
                    <td><span className={`badge badge-${STATUS_BADGE[req.status] || 'open'}`}>{titleCase(req.status)}</span></td>
                    <td>
                      {req.status === 'AWAITING_PROVIDER' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-success btn-sm" onClick={() => setApproveTarget(req)}>✓ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setRejectTarget(req); setRejectReason(''); }}>✗ Reject</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setFeedbackTarget(req); setFeedbackText(''); }}>💬 Comment</button>
                        </div>
                      ) : req.status === 'REJECTED' && req.providerRejectionReason ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }} title={req.providerRejectionReason}>Rejected</span>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/provider/view-placement/${req.id}`)}>View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: '2rem' }}>
        <div className="panel-header">
          <div><h3>🔄 Placement Change Requests</h3><p>Students requesting changes to approved placements at your company</p></div>
          {pendingChangeCount > 0 && <span className="badge badge-pending">{pendingChangeCount} Pending</span>}
        </div>
        {changeRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔄</div>
            <p style={{ color: 'var(--muted)' }}>No change requests yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Change Type</th><th>Justification</th><th>Proposed Details</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {changeRequests.map((cr) => (
                  <tr key={cr.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{cr.placement.student.fullName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{cr.placement.student.email}</div>
                    </td>
                    <td><span className="type-chip">{CHANGE_TYPE_LABELS[cr.requestType] || titleCase(cr.requestType)}</span></td>
                    <td style={{ maxWidth: 200, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{cr.justification}</td>
                    <td style={{ maxWidth: 180, fontSize: '0.875rem', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{cr.proposedDetails || '—'}</td>
                    <td><span className={`badge badge-${CR_BADGE[cr.status]}`}>{titleCase(cr.status)}</span></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{fmtDate(cr.createdAt)}</td>
                    <td>
                      {cr.status === 'PENDING_PROVIDER' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-success btn-sm" onClick={() => { setCrTarget({ cr, action: 'approve' }); setCrComment(''); }}>✓ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setCrTarget({ cr, action: 'reject' }); setCrComment(''); }}>✗ Reject</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{cr.providerComment || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {approveTarget && (
        <div className="modal-backdrop" onClick={() => setApproveTarget(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>✅ Approve Placement</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You are about to approve {approveTarget.student.fullName}'s placement request. This will be forwarded to the tutor for final approval.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setApproveTarget(null)}>Cancel</button>
              <button className="btn btn-success" onClick={confirmApprove}>✓ Confirm Approval</button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="modal-backdrop" onClick={() => setRejectTarget(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>✗ Reject Placement Request</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Rejecting request for: {rejectTarget.student.fullName}</p>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Reason for rejection <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>(optional)</span></label>
              <textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this placement cannot be accommodated…" />
              <small style={{ color: 'var(--muted)' }}>This will be shared with the student and their tutor.</small>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmReject}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {feedbackTarget && (
        <div className="modal-backdrop" onClick={() => setFeedbackTarget(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>💬 Provide Feedback</h3>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Feedback / Comments</label>
              <textarea rows={5} required value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Share your thoughts about this placement request..." />
              <small style={{ color: 'var(--muted)' }}>This will be shared with the student and their tutor.</small>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setFeedbackTarget(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!feedbackText.trim()} onClick={submitFeedback}>Submit Feedback</button>
            </div>
          </div>
        </div>
      )}

      {crTarget && (
        <div className="modal-backdrop" onClick={() => setCrTarget(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: crTarget.action === 'approve' ? 'var(--navy)' : 'var(--danger)', marginBottom: '1.5rem' }}>
              {crTarget.action === 'approve' ? '✅ Approve Change Request' : '❌ Reject Change Request'}
            </h3>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Comment (optional)</label>
              <textarea rows={4} value={crComment} onChange={(e) => setCrComment(e.target.value)} placeholder="Add a comment for the student and tutor..." />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setCrTarget(null)}>Cancel</button>
              <button className={`btn ${crTarget.action === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={confirmCr}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
