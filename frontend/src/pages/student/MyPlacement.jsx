import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const fmtDateLong = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const CHANGE_TYPE_LABELS = {
  end_date: 'Extend / Change End Date',
  start_date: 'Change Start Date',
  role: 'Change Role',
  supervisor: 'Change Supervisor',
  transfer: 'Transfer Company',
  salary: 'Change Salary / Terms',
};

const STATUS_BADGE = { PENDING_PROVIDER: 'badge-pending', PENDING_TUTOR: 'badge-review', APPROVED: 'badge-approved', REJECTED: 'badge-rejected' };
const STATUS_LABEL = { PENDING_PROVIDER: 'Pending Provider', PENDING_TUTOR: 'Pending Tutor', APPROVED: 'Approved', REJECTED: 'Rejected' };

const DOC_CATEGORIES = [
  ['offer_letter', 'Offer Letter'],
  ['job_description', 'Job Description'],
  ['interim_report', 'Interim Report'],
  ['final_report', 'Final Report'],
  ['other', 'Other'],
];

export default function MyPlacement() {
  const [placement, setPlacement] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);

  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  const [weekLabel, setWeekLabel] = useState('');
  const [reflectionContent, setReflectionContent] = useState('');
  const [docCategory, setDocCategory] = useState('offer_letter');
  const [docFile, setDocFile] = useState(null);
  const [changeType, setChangeType] = useState('');
  const [justification, setJustification] = useState('');
  const [proposedDetails, setProposedDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [changeError, setChangeError] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const load = () => {
    api.get('/student/placement').then(({ data }) => setPlacement(data)).catch(() => setNotFound(true));
    api.get('/student/documents').then(({ data }) => setDocuments(data));
    api.get('/student/reflections').then(({ data }) => setReflections(data));
    api.get('/student/change-requests').then(({ data }) => setChangeRequests(data));
  };
  useEffect(() => { load(); }, []);

  let progressPct = 0, monthsElapsed = 0, monthsTotal = 0;
  if (placement) {
    const start = new Date(placement.startDate);
    const end = new Date(placement.endDate);
    const today = new Date();
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const elapsedDays = Math.round((today - start) / 86400000);
    progressPct = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
    monthsElapsed = Math.max(0, Math.round((elapsedDays / 30) * 10) / 10);
    monthsTotal = Math.round((totalDays / 30) * 10) / 10;
  }

  const submitReflection = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/student/reflections', { title: weekLabel, content: reflectionContent });
      setWeekLabel(''); setReflectionContent(''); setShowReflectionModal(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const uploadDocument = async (e) => {
    e.preventDefault();
    if (!docFile) return;
    setSubmitting(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', docFile);
    formData.append('category', docCategory);
    try {
      await api.post('/student/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocFile(null); setShowUploadModal(false);
      load();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Could not upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const submitChangeRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setChangeError(null);
    try {
      await api.post('/student/change-requests', { requestType: changeType, details: justification, proposedDetails });
      setChangeType(''); setJustification(''); setProposedDetails(''); setShowChangeModal(false);
      load();
    } catch (err) {
      setChangeError(err.response?.data?.error || 'Could not submit change request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!placement && !notFound) return <div className="loading-screen">Loading...</div>;

  if (notFound) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏢</div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>
            No Active Placement
          </h3>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>
            You don't have an approved placement yet. Submit an authorisation request to get started.
          </p>
          <Link to="/student/submit-request" className="btn btn-primary">Submit a Request →</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <div>
            <h3>Current Placement</h3>
            <p>Effective from {fmtDateLong(placement.startDate)}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="badge badge-approved">{placement.status === 'ACTIVE' ? 'Active' : 'Approved'}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowChangeModal(true)}>Request Change</button>
          </div>
        </div>

        <div className="panel-body">
          <div className="info-grid" style={{ marginBottom: '2rem' }}>
            <div className="info-item"><label>Company</label><p>{placement.company.name}</p></div>
            <div className="info-item"><label>Role</label><p>{placement.roleTitle || 'N/A'}</p></div>
            <div className="info-item"><label>Location</label><p>{placement.company.address || 'N/A'}</p></div>
            <div className="info-item"><label>Start Date</label><p>{fmtDateLong(placement.startDate)}</p></div>
            <div className="info-item"><label>End Date</label><p>{fmtDateLong(placement.endDate)}</p></div>
            <div className="info-item"><label>Salary</label><p>{placement.salary || 'Not specified'}</p></div>
            <div className="info-item"><label>Supervisor</label><p>{placement.supervisorName || 'N/A'}</p></div>
            <div className="info-item">
              <label>Supervisor Email</label>
              <p>{placement.supervisorEmail ? <a href={`mailto:${placement.supervisorEmail}`} style={{ color: 'var(--navy)', textDecoration: 'none' }}>{placement.supervisorEmail}</a> : 'N/A'}</p>
            </div>
            <div className="info-item"><label>Placement Tutor</label><p>{placement.tutor?.fullName || 'Not assigned'}</p></div>
          </div>

          <div className="divider" />

          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Placement Progress</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${progressPct}%`, height: '100%' }} />
              </div>
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>{progressPct}% Complete</div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{monthsElapsed} months completed of {monthsTotal}-month placement</p>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>Documents</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUploadModal(true)}>Upload New</button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
                <p style={{ color: 'var(--muted)' }}>No documents uploaded yet.</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.125rem 2rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--info-bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                      {(doc.category || 'other').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} · Uploaded {fmtDate(doc.createdAt)}
                    </p>
                  </div>
                  <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${doc.filePath}`} download target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">⬇ Download</a>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Weekly Reflection Log</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowReflectionModal(true)}>+ Add Entry</button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {reflections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📝</div>
                <p style={{ color: 'var(--muted)' }}>No reflections logged yet.<br />Start recording your weekly progress!</p>
              </div>
            ) : (
              reflections.slice(0, 5).map((r) => (
                <div key={r.id} style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    {r.title} · {fmtDate(r.createdAt)}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header">
          <div>
            <h3>Change Requests</h3>
            <p>History of placement change requests you have submitted</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowChangeModal(true)}>+ New Request</button>
        </div>

        {changeRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔄</div>
            <p style={{ color: 'var(--muted)' }}>No change requests submitted yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type of Change</th><th>Justification</th><th>Proposed Details</th><th>Status</th><th>Submitted</th><th>Comments</th></tr>
              </thead>
              <tbody>
                {changeRequests.map((cr) => (
                  <tr key={cr.id}>
                    <td><span className="type-chip">{CHANGE_TYPE_LABELS[cr.requestType] || cr.requestType.replace(/_/g, ' ')}</span></td>
                    <td style={{ maxWidth: 220, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{cr.justification}</td>
                    <td style={{ maxWidth: 180, fontSize: '0.875rem', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{cr.proposedDetails || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[cr.status]}`}>{STATUS_LABEL[cr.status]}</span></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{fmtDate(cr.createdAt)}</td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {cr.providerComment && <p><strong>Provider:</strong> {cr.providerComment}</p>}
                      {cr.tutorComment && <p><strong>Tutor:</strong> {cr.tutorComment}</p>}
                      {!cr.providerComment && !cr.tutorComment && <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReflectionModal && (
        <div className="modal-backdrop" onClick={() => setShowReflectionModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Add Weekly Reflection</h3>
            <form onSubmit={submitReflection}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Week Label (e.g. "Week 12 · Mar 18")</label>
                <input type="text" value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} placeholder="Week 12 · Mar 18" required />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>What did you work on this week?</label>
                <textarea rows={5} value={reflectionContent} onChange={(e) => setReflectionContent(e.target.value)} placeholder="Describe your tasks, learnings, and challenges..." required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReflectionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-backdrop" onClick={() => { setShowUploadModal(false); setUploadError(null); }}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Upload Document</h3>
            {uploadError && <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>{uploadError}</div>}
            <form onSubmit={uploadDocument}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Document Type</label>
                <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                  {DOC_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>File (PDF, max 10 MB)</label>
                <label className="upload-zone" htmlFor="docFileInput">
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📎</div>
                  <p><strong>Click to choose file</strong> or drag and drop</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>PDF only · max 10 MB</p>
                </label>
                <input id="docFileInput" type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => setDocFile(e.target.files[0])} />
                {docFile && <p style={{ fontSize: '0.875rem', color: 'var(--success)', marginTop: '0.5rem' }}>{docFile.name}</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowUploadModal(false); setUploadError(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !docFile}>{submitting ? 'Uploading...' : 'Upload →'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChangeModal && (
        <div className="modal-backdrop" onClick={() => { setShowChangeModal(false); setChangeError(null); }}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>Request Placement Change</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Your request will be sent to your tutor for review.
            </p>
            {changeError && <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>{changeError}</div>}
            <form onSubmit={submitChangeRequest}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Type of Change <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select value={changeType} onChange={(e) => setChangeType(e.target.value)} required>
                  <option value="">— Select change type —</option>
                  {Object.entries(CHANGE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Justification <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Explain why this change is needed..." required />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Proposed New Details</label>
                <textarea rows={3} value={proposedDetails} onChange={(e) => setProposedDetails(e.target.value)} placeholder="e.g., New end date: 30 June 2026 / New supervisor: Jane Smith (jane@company.com)" />
                <small style={{ color: 'var(--muted)' }}>Provide the specific new values you are requesting.</small>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowChangeModal(false); setChangeError(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Change Request →'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
