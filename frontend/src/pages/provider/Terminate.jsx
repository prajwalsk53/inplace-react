import { useEffect, useState } from 'react';
import api from '../../api/axios';

const TYPE_LABELS = {
  early_termination: '🔴 Early Termination',
  supervisor_change: '👤 Supervisor Change',
  role_change: '💼 Role Change',
  location_change: '📍 Location Change',
  contract_extension: '📅 Contract Extension',
  other: '📝 Other',
};
const STATUS_BADGE = { acknowledged: 'review', actioned: 'approved', pending: 'pending' };
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const EMPTY_FORM = { placementId: '', notificationType: '', effectiveDate: '', reason: '', details: '' };

export default function ProviderTerminate() {
  const [placements, setPlacements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [flash, setFlash] = useState(null);

  const load = () => api.get('/provider/notifications').then(({ data }) => setNotifications(data));
  useEffect(() => {
    load();
    api.get('/provider/placements').then(({ data }) => setPlacements(data.filter((p) => ['ACTIVE', 'APPROVED'].includes(p.status))));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const isTermination = form.notificationType === 'early_termination';
    await api.post('/provider/notifications', form);
    setForm(EMPTY_FORM);
    setShowModal(false);
    setFlash({
      type: 'success',
      msg: isTermination ? 'Early termination recorded. The student and tutor have been notified.' : 'Change notification submitted. The tutor and student have been notified.',
    });
    load();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <div className="panel">
            <div className="panel-header">
              <div><h3>Placement Notifications</h3><p>Terminations and significant changes submitted</p></div>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}>+ Notify Change</button>
            </div>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                <p style={{ color: 'var(--muted)' }}>No notifications submitted yet.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Type</th><th>Effective</th><th>Reason</th><th>Status</th><th>Submitted</th></tr></thead>
                  <tbody>
                    {notifications.map((n) => (
                      <tr key={n.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{n.placement.student.fullName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{n.placement.roleTitle || ''}</div>
                        </td>
                        <td style={{ fontSize: '0.875rem', fontWeight: 500 }}>{TYPE_LABELS[n.notificationType] || n.notificationType}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{n.effectiveDate ? fmtDate(n.effectiveDate) : '—'}</td>
                        <td style={{ maxWidth: 180, fontSize: '0.8125rem', color: 'var(--muted)' }}>
                          {n.reason.length > 80 ? `${n.reason.slice(0, 80)}…` : n.reason}
                        </td>
                        <td><span className={`badge badge-${STATUS_BADGE[n.status] || 'pending'}`}>{n.status.charAt(0).toUpperCase() + n.status.slice(1)}</span></td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{fmtDate(n.createdAt)}</td>
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
            <div className="panel-header"><h3>Notification Types</h3></div>
            <div className="panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div><strong style={{ color: 'var(--navy)' }}>🔴 Early Termination</strong><br /><span style={{ color: 'var(--muted)' }}>Placement ending before the agreed end date. Student status will be updated automatically.</span></div>
                <div><strong style={{ color: 'var(--navy)' }}>👤 Supervisor Change</strong><br /><span style={{ color: 'var(--muted)' }}>The student's day-to-day supervisor has changed.</span></div>
                <div><strong style={{ color: 'var(--navy)' }}>💼 Role Change</strong><br /><span style={{ color: 'var(--muted)' }}>Student's responsibilities or job title has significantly changed.</span></div>
                <div><strong style={{ color: 'var(--navy)' }}>📍 Location Change</strong><br /><span style={{ color: 'var(--muted)' }}>Student is now working from a different site or remotely.</span></div>
                <div><strong style={{ color: 'var(--navy)' }}>📅 Contract Extension</strong><br /><span style={{ color: 'var(--muted)' }}>Placement end date has been extended beyond originally agreed.</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Submit Placement Notification</h3>
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
                  <label>Notification Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select required value={form.notificationType} onChange={(e) => setForm((f) => ({ ...f, notificationType: e.target.value }))}>
                    <option value="">— Select —</option>
                    {Object.entries(TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Effective Date</label>
                  <input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
                </div>
              </div>

              {form.notificationType === 'early_termination' && (
                <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                  <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.25rem' }}>⚠️ Early Termination</p>
                  <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>
                    This will mark the placement as terminated in the system. The student's tutor and the student will both be notified immediately.
                  </p>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea rows={4} required value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Explain the reason for this notification…" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Additional Details <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>(optional)</span></label>
                <textarea rows={2} value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} placeholder="Any other relevant information…" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Notification →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
