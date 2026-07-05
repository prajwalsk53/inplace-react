import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtSize = (bytes) => (bytes ? `${Math.round(bytes / 1024)} KB` : '');

function statusBadge(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'reviewed' || s === 'approved') return ['badge-approved', 'Reviewed'];
  if (s === 'rejected') return ['badge-rejected', 'Rejected'];
  if (s === 'pending') return ['badge-pending', 'Pending'];
  return ['badge-open', s.charAt(0).toUpperCase() + s.slice(1) || 'Submitted'];
}

function ReportUploadSection({ label, report, due, reportType, onUploaded }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('reportType', reportType);
    try {
      await api.post('/student/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h4 style={{ marginBottom: '0.75rem' }}>Submit {label}</h4>
      {report ? (
        <div style={{ background: 'var(--success-bg)', border: '1px solid #6ee7b7', borderRadius: 'var(--radius-sm)', padding: '1.25rem 1.5rem' }}>
          <p style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.25rem' }}>✅ {label} already submitted</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>You can download it from the table above.</p>
        </div>
      ) : (
        <form onSubmit={submit}>
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
          <label className="upload-zone" htmlFor={`${reportType}File`} style={{ display: 'block' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📤</div>
            <p><strong>Click to upload your {label.toLowerCase()}</strong></p>
            <p>PDF format, maximum 15 MB</p>
          </label>
          <input
            ref={inputRef}
            id={`${reportType}File`}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          {file && <div style={{ marginTop: '0.875rem', color: 'var(--muted)', fontSize: '0.875rem' }}>Selected: {file.name} ({Math.round(file.size / 1024)} KB)</div>}
          {due && !file && <div style={{ marginTop: '0.875rem', color: 'var(--muted)', fontSize: '0.875rem' }}>Due {fmtDate(due)}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }}>Clear</button>
            <button type="submit" className="btn btn-primary" disabled={!file || submitting}>{submitting ? 'Submitting...' : `Submit ${label} →`}</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function StudentReports() {
  const [data, setData] = useState(null);
  const uploadsRef = useRef(null);

  const load = () => api.get('/student/reports').then(({ data }) => setData(data));
  useEffect(() => { load(); }, []);

  const scrollToUploads = () => uploadsRef.current?.scrollIntoView({ behavior: 'smooth' });

  if (!data) return <div className="loading-screen">Loading...</div>;

  const { hasPlacement, interimDue, finalDue, interimReport, finalReport, summary } = data;

  const renderReportRow = (label, report, due) => {
    const [badgeCls, badgeLabel] = statusBadge(report?.status);
    return (
      <tr>
        <td>
          <div style={{ fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
            {report ? `PDF · ${fmtSize(report.fileSize)}` : due ? `Due ${fmtDate(due)}` : 'Not available yet'}
          </div>
        </td>
        <td><span className="type-chip">{label.replace(' Placement Report', '')}</span></td>
        <td style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          {report ? fmtDate(report.submittedAt) : 'Not yet submitted'}
        </td>
        <td><span className={`badge ${badgeCls}`}>{badgeLabel}</span></td>
        <td>
          {report ? (
            <a className="btn btn-ghost btn-sm" href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${report.filePath}`} target="_blank" rel="noreferrer">⬇ Download</a>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={scrollToUploads}>Submit</button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>My Reports</h3>
            <button className="btn btn-primary btn-sm" onClick={scrollToUploads}>+ Submit Report</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Report</th><th>Type</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {renderReportRow('Interim Placement Report', interimReport, interimDue)}
                {renderReportRow('Final Placement Report', finalReport, finalDue)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Report Submission Status</h3></div>
          <div className="panel-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>Submitted & Reviewed</span>
              <span className="badge badge-approved">{summary.reviewed}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>Submitted — Awaiting Review</span>
              <span className="badge badge-open">{summary.pending}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>Overdue</span>
              <span className="badge badge-rejected">{summary.overdue}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0' }}>
              <span style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>Upcoming (&gt; 30 days)</span>
              <span className="badge badge-pending">{summary.upcoming}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" ref={uploadsRef}>
        <div className="panel-header"><h3>Submit Reports</h3></div>
        <div className="panel-body">
          {!hasPlacement ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
              <p style={{ color: 'var(--muted)' }}>No active placement yet. Reports will be enabled once your placement is approved.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.75rem' }}>
                <ReportUploadSection label="Interim Report" report={interimReport} due={interimDue} reportType="interim" onUploaded={load} />
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
              <ReportUploadSection label="Final Report" report={finalReport} due={finalDue} reportType="final" onUploaded={load} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
