import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_BADGE = {
  APPROVED: 'approved', ACTIVE: 'approved', REJECTED: 'rejected', TERMINATED: 'rejected',
  SUBMITTED: 'pending', AWAITING_PROVIDER: 'pending', AWAITING_TUTOR: 'pending',
};
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminPlacements() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [placements, setPlacements] = useState([]);
  const [stats, setStats] = useState({});
  const [companies, setCompanies] = useState([]);
  const [years, setYears] = useState([]);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const status = searchParams.get('status') || '';
  const company = searchParams.get('company') || '';
  const year = searchParams.get('year') || '';
  const search = searchParams.get('search') || '';

  const load = () => api.get('/admin/placements', { params: { status: status || undefined, company: company || undefined, year: year || undefined, search: search || undefined } }).then(({ data }) => setPlacements(data));
  useEffect(() => { load(); }, [status, company, year, search]);
  useEffect(() => {
    api.get('/admin/placements/stats').then(({ data }) => setStats(data));
    api.get('/admin/companies').then(({ data }) => setCompanies(data));
    api.get('/admin/registrations/filters').then(({ data }) => setYears(data.years));
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (status) next.set('status', status);
    if (company) next.set('company', company);
    if (year) next.set('year', year);
    if (searchInput) next.set('search', searchInput);
    setSearchParams(next);
  };
  const changeParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    setSearchParams(next);
  };

  const exportCsv = async () => {
    const { data } = await api.get('/admin/placements/export/csv', { params: { status: status || undefined, company: company || undefined, year: year || undefined, search: search || undefined }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `placements_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const pendingCount = (stats.SUBMITTED || 0) + (stats.AWAITING_PROVIDER || 0) + (stats.AWAITING_TUTOR || 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Total Placements</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--navy)' }}>{placements.length}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Active</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--success)' }}>{stats.ACTIVE || 0}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Pending</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--warning)' }}>{pendingCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Approved</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--info)' }}>{stats.APPROVED || 0}</h3>
        </div>
      </div>

      <form onSubmit={submitSearch} style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="🔍  Search student, company, or role..." style={{ minWidth: 300 }} />
        <select value={status} onChange={(e) => changeParam('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="AWAITING_PROVIDER">Awaiting Provider</option>
          <option value="AWAITING_TUTOR">Awaiting Tutor</option>
          <option value="APPROVED">Approved</option>
          <option value="ACTIVE">Active</option>
          <option value="REJECTED">Rejected</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <select value={company} onChange={(e) => changeParam('company', e.target.value)}>
          <option value="">All Companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={year} onChange={(e) => changeParam('year', e.target.value)}>
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          {(searchInput || status || company || year) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setSearchParams({}); }}>✕ Clear</button>}
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
          <button type="button" className="btn btn-success btn-sm" onClick={exportCsv}>📥 Export CSV</button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-header"><h3>{placements.length} Placement{placements.length !== 1 ? 's' : ''}</h3></div>
        {placements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
            <p style={{ color: 'var(--muted)' }}>No placements found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Company</th><th>Role</th><th>Dates</th><th>Year</th><th>Tutor</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {placements.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="avatar-cell">
                        <div className="avatar">{p.student.avatarInitials || '??'}</div>
                        <div><h4>{p.student.fullName}</h4><p>{p.student.email}</p></div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.company.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{p.company.city}{p.company.sector ? ` · ${p.company.sector}` : ''}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}><span className="type-chip">{p.roleTitle || 'N/A'}</span></td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8125rem' }}>{fmtDate(p.startDate)}<br /><span style={{ color: 'var(--muted)' }}>to</span><br />{fmtDate(p.endDate)}</td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {p.student.academicYear || 'N/A'}
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.student.programmeType || ''}</div>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{p.tutor?.fullName || 'Unassigned'}</td>
                    <td><span className={`badge badge-${STATUS_BADGE[p.status] || 'open'}`}>{titleCase(p.status)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/placements/${p.id}`)}>View</button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/placements/${p.id}/edit`)}>Edit</button>
                      </div>
                    </td>
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
