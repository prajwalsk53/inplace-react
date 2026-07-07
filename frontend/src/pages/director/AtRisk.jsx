import { useEffect, useState } from 'react';
import api from '../../api/axios';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const LEVEL_COLOR = { high: '#dc2626', medium: '#d97706', low: '#059669' };
const LEVEL_LABEL = { high: '🔴 High Risk', medium: '🟡 Medium Risk', low: '🟢 Low Risk' };

export default function DirectorAtRisk() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/director/at-risk').then(({ data }) => setData(data));
  }, []);

  const downloadCsv = async () => {
    const { data } = await api.get('/director/reports/export/at_risk', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inplace_at_risk_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!data) return <div className="loading-screen">Loading...</div>;
  const { flagged, allActive } = data;
  const high = flagged.filter((f) => f.riskLevel === 'high').length;
  const medium = flagged.filter((f) => f.riskLevel === 'medium').length;
  const low = flagged.filter((f) => f.riskLevel === 'low').length;

  return (
    <div>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', padding: '0.875rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span>👁</span>
        <p style={{ color: '#1e40af', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>
          Read-only view. Flags are managed by the placement tutor.{' '}
          <button onClick={downloadCsv} style={{ background: 'none', border: 'none', padding: 0, color: '#1e40af', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>📥 Download CSV</button>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Total Flagged</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: 'var(--navy)' }}>{flagged.length}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>High Risk</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: '#dc2626' }}>{high}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Medium Risk</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: '#d97706' }}>{medium}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Low Risk</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: '#059669' }}>{low}</h3>
        </div>
      </div>

      {flagged.length > 0 ? (
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header"><h3>⚠️ Flagged Students</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {flagged.map((s) => {
              const color = LEVEL_COLOR[s.riskLevel] || '#059669';
              return (
                <div key={s.placementId} style={{ borderLeft: `4px solid ${color}`, padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>{s.studentName}</h4>
                        <span style={{ fontWeight: 700, color, fontSize: '0.875rem' }}>{LEVEL_LABEL[s.riskLevel] || s.riskLevel}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                        {s.companyName}{s.roleTitle ? ` · ${s.roleTitle}` : ''}{s.city ? ` · ${s.city}` : ''}
                      </p>
                      {s.riskNotes && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text)', background: 'var(--cream)', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', lineHeight: 1.5, marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{s.riskNotes}</p>
                      )}
                      <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Flagged by {s.flaggedByName || 'tutor'}{s.riskFlaggedAt ? ` · ${fmtDate(s.riskFlaggedAt)}` : ''} · Tutor: <strong>{s.tutorName || 'Unassigned'}</strong>{s.tutorEmail ? <> (<a href={`mailto:${s.tutorEmail}`} style={{ color: 'var(--navy)' }}>{s.tutorEmail}</a>)</> : null}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8125rem' }}>
                      <p style={{ color: 'var(--muted)' }}>{s.academicYear || '—'}</p>
                      <p style={{ color: 'var(--muted)' }}>{s.programmeType || ''}</p>
                      <span className={`badge badge-${['APPROVED', 'ACTIVE'].includes(s.status) ? 'approved' : 'pending'}`}>{titleCase(s.status.toLowerCase())}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: '3rem 2rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <h3 style={{ color: 'var(--navy)' }}>No at-risk students flagged</h3>
          <p style={{ color: 'var(--muted)' }}>All students are currently on track.</p>
        </div>
      )}

      <div className="panel">
        <div className="panel-header"><div><h3>All Active Students Overview</h3><p>{allActive.length} placements</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Company</th><th>Year</th><th>Programme</th><th>Status</th><th>Risk</th></tr></thead>
            <tbody>
              {allActive.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{s.studentName}</td>
                  <td style={{ fontSize: '0.875rem' }}>{s.companyName}</td>
                  <td style={{ fontSize: '0.875rem' }}>{s.academicYear || '—'}</td>
                  <td style={{ fontSize: '0.875rem' }}>{s.programmeType || '—'}</td>
                  <td><span className={`badge badge-${['APPROVED', 'ACTIVE'].includes(s.status) ? 'approved' : 'pending'}`}>{titleCase(s.status.toLowerCase())}</span></td>
                  <td>
                    {s.riskFlag ? <span style={{ fontWeight: 700, color: LEVEL_COLOR[s.riskLevel] || '#059669' }}>{s.riskLevel ? s.riskLevel.charAt(0).toUpperCase() + s.riskLevel.slice(1) : 'Flagged'}</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
