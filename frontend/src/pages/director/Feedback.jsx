import { useEffect, useState } from 'react';
import api from '../../api/axios';

const CRITERIA_LABELS = { attendance: 'Attendance', punctuality: 'Punctuality', professionalism: 'Professionalism', technicalSkills: 'Technical Skills', communication: 'Communication', initiative: 'Initiative', rating: 'Overall' };
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function DirectorFeedback() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/director/feedback').then(({ data }) => setData(data));
  }, []);

  const downloadCsv = async () => {
    const { data } = await api.get('/director/reports/export/evaluations', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inplace_evaluations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!data) return <div className="loading-screen">Loading...</div>;
  const { totalEvals, avgOverall, recommendRate, interimCount, finalCount, avgAll, byCompany, evaluations } = data;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Total Evaluations</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: 'var(--navy)' }}>{totalEvals}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Avg Overall Rating</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: '#f59e0b' }}>{avgOverall !== null ? `${avgOverall.toFixed(1)}/5` : '—'}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Would Recommend</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: 'var(--success)' }}>{recommendRate}%</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Interim / Final</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: 'var(--info)' }}>{interimCount} / {finalCount}</h3>
        </div>
      </div>

      {totalEvals === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
          <h3 style={{ color: 'var(--navy)' }}>No evaluations submitted yet</h3>
          <p style={{ color: 'var(--muted)' }}>Provider evaluations will appear here once submitted.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header"><h3>Average Ratings Across All Evaluations</h3></div>
              <div style={{ padding: '1.5rem' }}>
                {Object.entries(CRITERIA_LABELS).map(([key, label]) => {
                  const avg = avgAll[key];
                  const pct = avg ? (avg / 5) * 100 : 0;
                  const isOverall = key === 'rating';
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <span style={{ minWidth: 130, fontSize: '0.875rem', fontWeight: isOverall ? 700 : 400, color: isOverall ? 'var(--navy)' : 'var(--text)' }}>{label}</span>
                      <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 6, height: 10 }}>
                        <div style={{ width: `${Math.round(pct)}%`, background: isOverall ? '#f59e0b' : '#2563eb', borderRadius: 6, height: 10 }} />
                      </div>
                      <span style={{ minWidth: 36, textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', color: isOverall ? '#f59e0b' : 'var(--navy)' }}>{avg !== null ? avg.toFixed(1) : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header"><h3>By Company</h3></div>
              <div>
                {byCompany.slice(0, 8).map((c) => (
                  <div key={c.name} style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)' }}>{c.name}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f59e0b' }}>{c.avg !== null ? c.avg.toFixed(1) : '—'}/5</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      <span>{c.count} eval{c.count !== 1 ? 's' : ''}</span>
                      <span>{c.recommend}/{c.count} recommend</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>All Evaluations</h3>
              <button className="btn btn-ghost btn-sm" onClick={downloadCsv}>📥 Export CSV</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Company</th><th>Period</th><th>Overall</th><th>Attendance</th><th>Professionalism</th><th>Technical</th><th>Communication</th><th>Recommend</th><th>Date</th></tr></thead>
                <tbody>
                  {evaluations.map((e, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{e.studentName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{e.academicYear || ''}</div>
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>{e.companyName}</td>
                      <td><span className={`badge ${e.evalPeriod === 'final' ? 'badge-approved' : 'badge-pending'}`}>{e.evalPeriod.charAt(0).toUpperCase() + e.evalPeriod.slice(1)}</span></td>
                      <td>{e.rating ? <span style={{ fontWeight: 700, color: '#f59e0b' }}>{e.rating}/5</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{e.attendance ?? '—'}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{e.professionalism ?? '—'}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{e.technicalSkills ?? '—'}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{e.communication ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{e.recommendFuture ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>Yes</span> : <span style={{ color: 'var(--muted)' }}>No</span>}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{fmtDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
