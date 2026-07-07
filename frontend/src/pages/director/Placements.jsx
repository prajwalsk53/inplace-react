import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_BADGE = { APPROVED: 'approved', ACTIVE: 'approved', AWAITING_PROVIDER: 'pending', AWAITING_TUTOR: 'pending', REJECTED: 'rejected', TERMINATED: 'rejected' };
const STATUSES = ['AWAITING_PROVIDER', 'AWAITING_TUTOR', 'APPROVED', 'ACTIVE', 'REJECTED', 'TERMINATED'];
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function DirectorPlacements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [placements, setPlacements] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ years: [], sectors: [] });

  const year = searchParams.get('year') || '';
  const sector = searchParams.get('sector') || '';
  const status = searchParams.get('status') || '';

  useEffect(() => {
    api.get('/director/placements', { params: { year: year || undefined, sector: sector || undefined, status: status || undefined } }).then(({ data }) => setPlacements(data));
  }, [year, sector, status]);
  useEffect(() => { api.get('/director/placements/filters').then(({ data }) => setFilterOptions(data)); }, []);

  const changeParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    setSearchParams(next);
  };

  const downloadCsv = async () => {
    const { data } = await api.get('/director/reports/export/placements', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inplace_placements_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const total = placements.length;
  const active = placements.filter((p) => ['APPROVED', 'ACTIVE'].includes(p.status)).length;
  const pending = placements.filter((p) => ['AWAITING_PROVIDER', 'AWAITING_TUTOR'].includes(p.status)).length;
  const rejected = placements.filter((p) => p.status === 'REJECTED').length;
  const rate = total > 0 ? Math.round((active / total) * 100) : 0;

  const bySector = useMemo(() => {
    const m = {};
    placements.forEach((p) => { const s = p.sector || 'Unknown'; m[s] = (m[s] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [placements]);
  const byCity = useMemo(() => {
    const m = {};
    placements.forEach((p) => { const c = p.city || 'Unknown'; m[c] = (m[c] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [placements]);
  const maxSector = bySector[0]?.[1] || 1;
  const maxCity = byCity[0]?.[1] || 1;

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <select value={year} onChange={(e) => changeParam('year', e.target.value)}>
          <option value="">All Years</option>
          {filterOptions.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={sector} onChange={(e) => changeParam('sector', e.target.value)}>
          <option value="">All Sectors</option>
          {filterOptions.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => changeParam('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </select>
        {(year || sector || status) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSearchParams({})}>✕ Clear</button>}
        <button type="button" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={downloadCsv}>📥 Export →</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {[['Total', total, 'var(--navy)'], ['Active', active, 'var(--success)'], ['Pending', pending, 'var(--warning)'], ['Rejected', rejected, 'var(--danger)'], ['Rate', `${rate}%`, 'var(--info)']].map(([label, value, color]) => (
          <div className="panel" key={label} style={{ marginBottom: 0, padding: '1.25rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>{label}</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color }}>{value}</h3>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3>By Sector</h3></div>
          <div>
            {bySector.map(([s, n]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ flex: 1, fontSize: '0.875rem' }}>{s}</span>
                <div style={{ width: 100, background: '#e5e7eb', borderRadius: 4, height: 7 }}>
                  <div style={{ width: `${Math.round((n / maxSector) * 100)}%`, background: '#0c1b33', borderRadius: 4, height: 7 }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', minWidth: 24, textAlign: 'right' }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header"><h3>By Location</h3></div>
          <div>
            {byCity.map(([c, n]) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ flex: 1, fontSize: '0.875rem' }}>{c}</span>
                <div style={{ width: 100, background: '#e5e7eb', borderRadius: 4, height: 7 }}>
                  <div style={{ width: `${Math.round((n / maxCity) * 100)}%`, background: '#2563eb', borderRadius: 4, height: 7 }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', minWidth: 24, textAlign: 'right' }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><h3>{total} Placement{total !== 1 ? 's' : ''}</h3></div>
        {placements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <p style={{ color: 'var(--muted)' }}>No placements match the selected filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Company</th><th>Sector</th><th>Location</th><th>Role</th><th>Year</th><th>Dates</th><th>Tutor</th><th>Status</th></tr></thead>
              <tbody>
                {placements.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.studentName}</td>
                    <td style={{ fontSize: '0.875rem' }}>{p.companyName}</td>
                    <td><span className="type-chip" style={{ fontSize: '0.75rem' }}>{p.sector || '—'}</span></td>
                    <td style={{ fontSize: '0.875rem' }}>{p.city || '—'}</td>
                    <td style={{ fontSize: '0.875rem' }}>{p.roleTitle || '—'}</td>
                    <td style={{ fontSize: '0.875rem' }}>{p.academicYear || '—'}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace" }}>
                      {p.startDate ? fmtDate(p.startDate) : '—'}
                      {p.endDate && <><br /><span style={{ color: 'var(--muted)' }}>→ {fmtDate(p.endDate)}</span></>}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{p.tutorName || '—'}</td>
                    <td><span className={`badge badge-${STATUS_BADGE[p.status] || 'open'}`}>{titleCase(p.status.toLowerCase())}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
