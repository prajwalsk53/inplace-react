import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function DirectorReports() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/director/reports').then(({ data }) => setSummary(data));
  }, []);

  const download = async (key, filename) => {
    const { data } = await api.get(`/director/reports/export/${key}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inplace_${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!summary) return <div className="loading-screen">Loading...</div>;

  const exports = [
    { key: 'placements', icon: '🏢', title: 'All Placements', desc: 'Complete list of all placement records including student, company, role, dates, status and assigned tutor.', count: `${summary.placementCount} records`, color: '#0c1b33' },
    { key: 'summary', icon: '📊', title: 'Summary by Sector', desc: 'Aggregate summary — total, active, pending and rejected placements grouped by industry sector.', count: 'Aggregated', color: '#2563eb' },
    { key: 'visits', icon: '🗓', title: 'Visit Log', desc: 'All scheduled and completed tutor visits with student, company, date, purpose and status.', count: `${summary.visitCount} records`, color: '#059669' },
    { key: 'at_risk', icon: '⚠️', title: 'At-Risk Students', desc: 'Students flagged as at-risk, with risk level, notes and who raised the flag.', count: `${summary.atRiskCount} flagged`, color: '#dc2626' },
    { key: 'evaluations', icon: '⭐', title: 'Employer Evaluations', desc: 'Provider performance evaluations including all rating criteria and comments.', count: `${summary.evalCount} submitted`, color: '#d97706' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {exports.map((exp) => (
            <div className="panel" key={exp.key} style={{ marginBottom: 0 }}>
              <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: `${exp.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>{exp.icon}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>{exp.title}</h4>
                    <span style={{ fontSize: '0.75rem', background: '#f3f4f6', color: '#6b7280', padding: '0.15rem 0.6rem', borderRadius: 20 }}>{exp.count}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{exp.desc}</p>
                </div>
                <button className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => download(exp.key, exp.key)}>📥 Download CSV</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <div className="panel">
            <div className="panel-header"><h3>About Exports</h3></div>
            <div className="panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>📂 Format</p>
                  <p style={{ color: 'var(--muted)' }}>All files are exported as <strong>CSV</strong> with UTF-8 BOM encoding, compatible with Microsoft Excel, Google Sheets and LibreOffice Calc.</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>🔒 Read-Only</p>
                  <p style={{ color: 'var(--muted)' }}>Downloads are for reporting purposes only. No data is modified when exporting.</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>🕒 Real-Time</p>
                  <p style={{ color: 'var(--muted)' }}>Each download reflects current live data at the time of export.</p>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>For GDPR compliance, ensure exported files are handled in accordance with your institution's data protection policy.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
