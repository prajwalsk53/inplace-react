import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const RISK_COLORS = { high: '#ef4444', medium: '#f97316', low: '#eab308' };

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function TutorAtRisk() {
  const navigate = useNavigate();
  const [placements, setPlacements] = useState([]);
  const [flash, setFlash] = useState(null);
  const [modal, setModal] = useState(null); // { mode: 'flag'|'update', placement }
  const [riskLevel, setRiskLevel] = useState('medium');
  const [riskNotes, setRiskNotes] = useState('');

  const load = () => api.get('/tutor/placements/at-risk').then(({ data }) => setPlacements(data));
  useEffect(() => { load(); }, []);

  const flagged = placements.filter((p) => p.riskFlag);
  const unflagged = placements.filter((p) => !p.riskFlag);
  const highCount = flagged.filter((p) => p.riskLevel === 'high').length;
  const medCount = flagged.filter((p) => p.riskLevel === 'medium').length;
  const lowCount = flagged.filter((p) => p.riskLevel === 'low').length;

  const openFlag = (p) => { setModal({ mode: 'flag', placement: p }); setRiskLevel('medium'); setRiskNotes(''); };
  const openUpdate = (p) => { setModal({ mode: 'update', placement: p }); setRiskLevel(p.riskLevel || 'medium'); setRiskNotes(p.riskNotes || ''); };

  const submitModal = async () => {
    const { data } = await api.post(`/tutor/placements/${modal.placement.id}/risk`, { action: modal.mode === 'flag' ? 'flag' : 'update', riskLevel, riskNotes });
    setModal(null);
    setFlash({ type: 'success', msg: data.message });
    load();
  };

  const unflag = async (p) => {
    if (!confirm(`Remove at-risk flag for ${p.student.fullName}?`)) return;
    const { data } = await api.post(`/tutor/placements/${p.id}/risk`, { action: 'unflag' });
    setFlash({ type: 'success', msg: data.message });
    load();
  };

  return (
    <div>
      {flash && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem', borderTop: '3px solid #ef4444' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>High Risk</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#ef4444' }}>{highCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem', borderTop: '3px solid #f97316' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Medium Risk</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#f97316' }}>{medCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem', borderTop: '3px solid #eab308' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Low Risk</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#eab308' }}>{lowCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Total Active</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--navy)' }}>{placements.length}</h3>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <div><h3>⚠️ Flagged Students ({flagged.length})</h3><p>Students currently marked as needing attention</p></div>
        </div>
        {flagged.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <p style={{ color: 'var(--muted)' }}>No students currently flagged as at-risk.</p>
          </div>
        ) : (
          <div>
            {flagged.map((p) => {
              const color = RISK_COLORS[p.riskLevel] || '#6b7280';
              return (
                <div key={p.id} style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', borderLeft: `4px solid ${color}`, background: `${color}10` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="avatar" style={{ background: `${color}20`, color, flexShrink: 0 }}>{p.student.avatarInitials || '??'}</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{p.student.fullName}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, background: color, color: 'white', padding: '0.15rem 0.5rem', borderRadius: 4, textTransform: 'uppercase' }}>
                          {p.riskLevel} RISK
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                        {p.company.name}{p.company.city ? ` · ${p.company.city}` : ''} · {p.roleTitle || 'N/A'}
                      </p>
                      {p.riskNotes && (
                        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--navy)' }}>Note: </span>{p.riskNotes}
                        </div>
                      )}
                      <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Flagged {p.riskFlaggedAt ? fmtDate(p.riskFlaggedAt) : '—'}{p.flaggedByName ? ` by ${p.flaggedByName}` : ''} · Reports: {p.reportCount}/2 · Last visit: {p.lastVisit ? fmtDate(p.lastVisit) : 'None'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openUpdate(p)}>✏️ Update</button>
                      <button className="btn btn-ghost btn-sm" style={{ width: '100%', color: 'var(--success)' }} onClick={() => unflag(p)}>✅ Remove Flag</button>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tutor/placements/${p.id}/edit`)}>View Placement</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div><h3>All Active Students ({unflagged.length})</h3><p>Click "Flag" to mark a student as needing attention</p></div>
        </div>
        {unflagged.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
            <p style={{ color: 'var(--muted)' }}>All active students are currently flagged above.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Company</th><th>Role</th><th>Dates</th><th>Reports</th><th>Last Visit</th><th>Flag</th></tr></thead>
              <tbody>
                {unflagged.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="avatar-cell">
                        <div className="avatar">{p.student.avatarInitials || '??'}</div>
                        <div><h4>{p.student.fullName}</h4><p style={{ fontSize: '0.78rem' }}>{p.student.email}</p></div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.company.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{p.company.city || ''}</div>
                    </td>
                    <td><span className="type-chip">{p.roleTitle || 'N/A'}</span></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{p.startDate ? fmtDate(p.startDate) : ''}<br />→ {p.endDate ? fmtDate(p.endDate) : ''}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: p.reportCount >= 2 ? 'var(--success)' : p.reportCount === 1 ? 'var(--warning)' : 'var(--danger)' }}>{p.reportCount}/2</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{p.lastVisit ? fmtDate(p.lastVisit) : '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ borderColor: '#f97316', color: '#f97316' }} onClick={() => openFlag(p)}>⚠️ Flag</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>⚠️ Flag Student as At-Risk</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {modal.mode === 'flag' ? modal.placement.student.fullName : 'Update risk details'}
            </p>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>Risk Level <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
                <option value="low">🟡 Low — Monitor, no immediate action needed</option>
                <option value="medium">🟠 Medium — Requires follow-up soon</option>
                <option value="high">🔴 High — Immediate attention required</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Notes / Reason</label>
              <textarea rows={4} value={riskNotes} onChange={(e) => setRiskNotes(e.target.value)} placeholder="e.g., Missed two visits, not responding to emails, concerns raised by provider…" />
              <small style={{ color: 'var(--muted)' }}>The student will receive a message notification.</small>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitModal}>{modal.mode === 'flag' ? '⚠️ Flag Student' : 'Save Changes →'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
