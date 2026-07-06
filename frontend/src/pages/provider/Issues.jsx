import { useEffect, useState } from 'react';
import api from '../../api/axios';

const ISSUE_TYPES = [
  'Attendance / Absence',
  'Attitude / Conduct',
  'Performance Below Expectations',
  'Health & Wellbeing Concern',
  'Communication Breakdown',
  'Workload / Capacity Issue',
  'Safeguarding Concern',
  'Other',
];

const SEVERITY_COLOR = { high: '#dc2626', medium: '#d97706', low: '#059669' };
const STATUS_BADGE = { acknowledged: 'review', resolved: 'approved', open: 'pending' };
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const EMPTY_FORM = { placementId: '', issueType: '', severity: 'medium', description: '', desiredOutcome: '' };

export default function ProviderIssues() {
  const [issues, setIssues] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [flash, setFlash] = useState(null);

  const load = () => api.get('/provider/issues').then(({ data }) => setIssues(data));
  useEffect(() => {
    load();
    api.get('/provider/placements').then(({ data }) => setPlacements(data.filter((p) => ['ACTIVE', 'APPROVED'].includes(p.status))));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/provider/issues', form);
    setForm(EMPTY_FORM);
    setShowModal(false);
    setFlash({ type: 'success', msg: 'Issue reported. The tutor has been notified and will follow up shortly.' });
    load();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <div className="panel">
            <div className="panel-header">
              <div><h3>Reported Issues</h3><p>All concerns raised for your placement students</p></div>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}>+ Report Issue</button>
            </div>
            {issues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                <p style={{ color: 'var(--muted)' }}>No issues reported. Everything looks good!</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Issue</th><th>Severity</th><th>Status</th><th>Reported</th><th>Tutor Response</th></tr></thead>
                  <tbody>
                    {issues.map((iss) => (
                      <tr key={iss.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{iss.placement.student.fullName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{iss.placement.roleTitle || ''}</div>
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>{iss.title}</td>
                        <td><span style={{ fontWeight: 700, color: SEVERITY_COLOR[iss.severity] }}>{iss.severity.charAt(0).toUpperCase() + iss.severity.slice(1)}</span></td>
                        <td><span className={`badge badge-${STATUS_BADGE[iss.status] || 'pending'}`}>{iss.status.charAt(0).toUpperCase() + iss.status.slice(1)}</span></td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{fmtDate(iss.createdAt)}</td>
                        <td style={{ maxWidth: 180, fontSize: '0.8125rem', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{iss.resolutionNotes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <div className="panel">
            <div className="panel-header"><h3>When to Report</h3></div>
            <div className="panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ padding: '0.875rem', borderLeft: '3px solid #dc2626', background: '#fff5f5', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                  <p style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>🔴 High</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Safeguarding concern, serious conduct, immediate risk to student or staff.</p>
                </div>
                <div style={{ padding: '0.875rem', borderLeft: '3px solid #d97706', background: '#fffbeb', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                  <p style={{ fontWeight: 700, color: '#d97706', marginBottom: '0.25rem' }}>🟡 Medium</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Persistent attendance issues, performance well below expectations.</p>
                </div>
                <div style={{ padding: '0.875rem', borderLeft: '3px solid #059669', background: '#f0fdf4', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                  <p style={{ fontWeight: 700, color: '#059669', marginBottom: '0.25rem' }}>🟢 Low</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Minor concerns worth documenting, early conversation starters.</p>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                  All reports are forwarded to the student's tutor. For urgent situations, please also contact the university directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Report an Issue or Concern</h3>
            <form onSubmit={submit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Student / Placement <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select required value={form.placementId} onChange={(e) => setForm((f) => ({ ...f, placementId: e.target.value }))}>
                  <option value="">— Select student —</option>
                  {placements.map((p) => <option key={p.id} value={p.id}>{p.student.fullName}{p.roleTitle ? ` — ${p.roleTitle}` : ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label>Issue Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select required value={form.issueType} onChange={(e) => setForm((f) => ({ ...f, issueType: e.target.value }))}>
                    <option value="">— Select type —</option>
                    {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Severity</label>
                  <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea rows={4} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail. Include dates, incidents, and relevant context." />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Desired Outcome <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>(optional)</span></label>
                <textarea rows={2} value={form.desiredOutcome} onChange={(e) => setForm((f) => ({ ...f, desiredOutcome: e.target.value }))} placeholder="What would you like to happen as a result of raising this?" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Report →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
