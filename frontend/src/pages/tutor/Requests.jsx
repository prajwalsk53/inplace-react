import { Fragment, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const TABS = [
  ['', 'All'],
  ['AWAITING_TUTOR', 'Awaiting Approval'],
  ['APPROVED', 'Approved'],
  ['ACTIVE', 'Active'],
  ['REJECTED', 'Rejected'],
];

const STATUS_BADGE = {
  APPROVED: 'approved', REJECTED: 'rejected', SUBMITTED: 'open', AWAITING_PROVIDER: 'open', AWAITING_TUTOR: 'review',
};

const CHANGE_TYPE_LABELS = {
  end_date: 'Change End Date',
  start_date: 'Change Start Date',
  role: 'Change Role',
  supervisor: 'Change Supervisor',
  salary: 'Change Salary / Terms',
  transfer: 'Transfer Company',
};

const CR_BADGE = { PENDING_PROVIDER: 'open', PENDING_TUTOR: 'review', APPROVED: 'approved', REJECTED: 'rejected' };

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function TutorRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({});
  const [changeRequests, setChangeRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [flash, setFlash] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const [approveTarget, setApproveTarget] = useState(null);
  const [approveComment, setApproveComment] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [crTarget, setCrTarget] = useState(null); // { cr, action }
  const [crComment, setCrComment] = useState('');

  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const load = () => api.get('/tutor/placement-requests', { params: { status, search } }).then(({ data }) => {
    setRequests(data.requests);
    setCounts(data.counts);
  });
  const loadChangeRequests = () => api.get('/tutor/requests').then(({ data }) => setChangeRequests(data));
  useEffect(() => { load(); }, [status, search]);
  useEffect(() => { loadChangeRequests(); }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (status) next.set('status', status);
    if (searchInput) next.set('search', searchInput);
    setSearchParams(next);
  };

  const changeTab = (val) => {
    const next = new URLSearchParams();
    if (val) next.set('status', val);
    if (search) next.set('search', search);
    setSearchParams(next);
  };

  const confirmApprove = async () => {
    const { data } = await api.post(`/tutor/placement-requests/${approveTarget.id}/respond`, { decision: 'approved', comments: approveComment });
    setApproveTarget(null);
    setFlash({ type: 'success', msg: data.message });
    load();
  };

  const confirmReject = async () => {
    const { data } = await api.post(`/tutor/placement-requests/${rejectTarget.id}/respond`, { decision: 'rejected', comments: rejectComment });
    setRejectTarget(null);
    setFlash({ type: 'danger', msg: data.message });
    load();
  };

  const confirmCr = async () => {
    const { data } = await api.post(`/tutor/requests/${crTarget.cr.id}/respond`, { decision: crTarget.action, comment: crComment });
    setCrTarget(null);
    setFlash({ type: crTarget.action === 'approve' ? 'success' : 'danger', msg: data.message });
    loadChangeRequests();
  };

  const pendingChangeTutor = changeRequests.filter((cr) => cr.status === 'PENDING_TUTOR').length;
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(([val, label]) => {
          const active = status === val;
          const cnt = val ? (counts[val] || 0) : totalCount;
          return (
            <button
              key={val || 'all'}
              onClick={() => changeTab(val)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
                borderRadius: 50, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: active ? 'var(--navy)' : 'var(--white)', color: active ? 'var(--white)' : 'var(--muted)',
                border: `2px solid ${active ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              {label}
              <span style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--cream)', color: active ? 'var(--white)' : 'var(--text)', padding: '0.1rem 0.5rem', borderRadius: 50, fontSize: '0.75rem' }}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={submitSearch} style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="🔍 Search student name, company, city..." style={{ minWidth: 300 }} />
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
        {(search || status) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setSearchParams({}); }}>✕ Clear</button>}
      </form>

      <div className="panel">
        <div className="panel-header">
          <div><h3>{requests.length} Request{requests.length !== 1 ? 's' : ''}</h3><p>{status ? titleCase(status) : 'All statuses'}</p></div>
        </div>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ color: 'var(--muted)' }}>No requests found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Company</th><th>Role</th><th>Dates</th><th>Docs</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <Fragment key={req.id}>
                    <tr>
                      <td>
                        <div className="avatar-cell">
                          <div className="avatar">{req.student.avatarInitials || '??'}</div>
                          <div><h4>{req.student.fullName}</h4><p>{req.student.email}</p></div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{req.company.name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{req.company.city || ''}{req.company.sector ? ` · ${req.company.sector}` : ''}</div>
                      </td>
                      <td><span className="type-chip">{req.roleTitle || 'N/A'}</span></td>
                      <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8125rem', color: 'var(--muted)' }}>
                        {req.startDate ? fmtDate(req.startDate) : ''}<br />→ {req.endDate ? fmtDate(req.endDate) : ''}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: req._count.documents > 0 ? 'var(--success)' : 'var(--muted)' }}>
                          {req._count.documents > 0 ? `📎 ${req._count.documents}` : '—'}
                        </span>
                      </td>
                      <td><span className={`badge badge-${STATUS_BADGE[req.status] || 'pending'}`}>{titleCase(req.status)}</span></td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{fmtDate(req.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>View</button>
                          {req.status === 'AWAITING_TUTOR' && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => { setApproveTarget(req); setApproveComment(''); }}>✓ Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setRejectTarget(req); setRejectComment(''); }}>✗ Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === req.id && (
                      <tr>
                        <td colSpan={8} style={{ background: 'var(--cream)', padding: '1.5rem 2rem' }}>
                          <div className="info-grid" style={{ marginBottom: '1rem' }}>
                            <div className="info-item"><label>Supervisor</label><p>{req.supervisorName || 'N/A'}</p></div>
                            <div className="info-item"><label>Supervisor Email</label><p>{req.supervisorEmail || 'N/A'}</p></div>
                            <div className="info-item"><label>Salary</label><p>{req.salary || 'Not stated'}</p></div>
                            <div className="info-item"><label>Working Pattern</label><p>{req.workingPattern || 'N/A'}</p></div>
                            {req.tutorComments && <div className="info-item"><label>Tutor Comments</label><p>{req.tutorComments}</p></div>}
                          </div>
                          {req.jobDescription && (
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Job Description</p>
                              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{req.jobDescription}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: '2rem' }}>
        <div className="panel-header">
          <div><h3>🔄 Placement Change Requests</h3><p>Students requesting changes to approved placements</p></div>
          {pendingChangeTutor > 0 && <span className="badge badge-review">{pendingChangeTutor} Awaiting You</span>}
        </div>

        {changeRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔄</div>
            <p style={{ color: 'var(--muted)' }}>No change requests submitted yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Company</th><th>Change Type</th><th>Justification</th><th>Proposed Details</th><th>Provider Comment</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {changeRequests.map((cr) => (
                  <tr key={cr.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{cr.placement.student.fullName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{cr.placement.student.email}</div>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{cr.placement.company.name}</td>
                    <td><span className="type-chip">{CHANGE_TYPE_LABELS[cr.requestType] || titleCase(cr.requestType)}</span></td>
                    <td style={{ maxWidth: 180, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{cr.justification}</td>
                    <td style={{ maxWidth: 160, fontSize: '0.875rem', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{cr.proposedDetails || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{cr.providerComment || '—'}</td>
                    <td><span className={`badge badge-${CR_BADGE[cr.status]}`}>{titleCase(cr.status)}</span></td>
                    <td>
                      {cr.status === 'PENDING_TUTOR' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-success btn-sm" onClick={() => { setCrTarget({ cr, action: 'approve' }); setCrComment(''); }}>✓ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setCrTarget({ cr, action: 'reject' }); setCrComment(''); }}>✗ Reject</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{cr.tutorComment || '—'}</span>
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
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>✅ Approve Placement</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You are about to approve {approveTarget.student.fullName}'s placement at {approveTarget.company.name}.
            </p>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Comments for student (optional)</label>
              <textarea rows={3} value={approveComment} onChange={(e) => setApproveComment(e.target.value)} placeholder="e.g., Approved — all details verified. Good luck with your placement!" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setApproveTarget(null)}>Cancel</button>
              <button className="btn btn-success" onClick={confirmApprove}>✓ Confirm Approval</button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="modal-backdrop" onClick={() => setRejectTarget(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>✗ Reject Request</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You are about to reject {rejectTarget.student.fullName}'s placement request. This action will notify the student.
            </p>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Reason for rejection <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea rows={4} required value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Explain clearly why this request is being rejected and what the student should do next..." style={{ borderColor: '#fca5a5', background: '#fff8f8' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={!rejectComment.trim()} onClick={confirmReject}>✗ Confirm Rejection</button>
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
              <label>Comment for student (optional)</label>
              <textarea rows={4} value={crComment} onChange={(e) => setCrComment(e.target.value)} placeholder="Add a note for the student..." />
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
