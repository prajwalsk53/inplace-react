import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_BADGE = {
  APPROVED: 'badge-approved', ACTIVE: 'badge-approved', COMPLETED: 'badge-approved',
  TERMINATED: 'badge-rejected', REJECTED: 'badge-rejected',
};

export default function TutorPlacements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [placements, setPlacements] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ companies: [], cities: [] });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [expanded, setExpanded] = useState(new Set());
  const [terminateTarget, setTerminateTarget] = useState(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateError, setTerminateError] = useState(null);
  const navigate = useNavigate();

  const status = searchParams.get('status') || '';
  const company = searchParams.get('company') || '';
  const location = searchParams.get('location') || '';

  const load = () => {
    const params = {};
    if (status) params.status = status;
    if (company) params.company = company;
    if (location) params.location = location;
    if (searchParams.get('search')) params.search = searchParams.get('search');
    api.get('/tutor/placements', { params }).then(({ data }) => setPlacements(data));
  };

  useEffect(load, [searchParams]);
  useEffect(() => {
    api.get('/tutor/placements/filters').then(({ data }) => setFilterOptions(data));
  }, []);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    updateParam('search', search);
  };

  const clearFilters = () => {
    setSearch('');
    setSearchParams({});
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportCsv = async () => {
    const params = {};
    if (status) params.status = status;
    if (company) params.company = company;
    if (location) params.location = location;
    if (searchParams.get('search')) params.search = searchParams.get('search');
    const { data } = await api.get('/tutor/placements/export/csv', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-placements.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openTerminate = (placement) => {
    setTerminateTarget(placement);
    setTerminateReason('');
    setTerminateError(null);
  };

  const confirmTerminate = async () => {
    setTerminateError(null);
    try {
      await api.post(`/tutor/placements/${terminateTarget.id}/terminate`, { reason: terminateReason });
      setTerminateTarget(null);
      load();
    } catch (err) {
      setTerminateError(err.response?.data?.error || 'Could not terminate placement');
    }
  };

  const hasFilters = search || status || location || company;

  return (
    <div>
      <form className="filter-bar" onSubmit={submitSearch}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Search by name, company or location..."
        />
        <select value={status} onChange={(e) => updateParam('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select value={location} onChange={(e) => updateParam('location', e.target.value)}>
          <option value="">All Locations</option>
          {filterOptions.cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={company} onChange={(e) => updateParam('company', e.target.value)}>
          <option value="">All Companies</option>
          {filterOptions.companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          {hasFilters && <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Clear</button>}
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/tutor/map-view')}>🗺 Map View</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>⬇ Export CSV</button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>{placements.length} Student{placements.length !== 1 ? 's' : ''} on Placement</h3>
            <p>Academic Year 2024–25</p>
          </div>
        </div>

        {placements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>No placements found matching your filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Company & Location</th><th>Role</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {placements.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <div className="avatar-cell">
                          <div className="avatar">{p.student.avatarInitials || '??'}</div>
                          <div><h4>{p.student.fullName}</h4><p>{p.student.email}</p></div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.company.name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                          {p.company.city || 'N/A'}{p.company.sector ? ` · ${p.company.sector}` : ''}
                        </div>
                      </td>
                      <td><span className="type-chip">{p.roleTitle || 'N/A'}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{p.startDate ? fmtDate(p.startDate) : 'N/A'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{p.endDate ? fmtDate(p.endDate) : 'N/A'}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-pending'}`}>{p.status[0]}{p.status.slice(1).toLowerCase()}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(p.id)}>View</button>
                          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tutor/placements/${p.id}/edit`)}>Edit</button>
                        </div>
                      </td>
                    </tr>
                    {expanded.has(p.id) && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--cream)', padding: '1.5rem 2rem' }}>
                          <div className="info-grid" style={{ marginBottom: '1.25rem' }}>
                            <div className="info-item">
                              <label>Student Email</label>
                              <p><a href={`mailto:${p.student.email}`} style={{ color: 'var(--navy)' }}>{p.student.email}</a></p>
                            </div>
                            <div className="info-item"><label>Company Address</label><p>{p.company.address || 'N/A'}</p></div>
                            <div className="info-item"><label>Supervisor</label><p>{p.supervisorName || 'N/A'}</p></div>
                            <div className="info-item">
                              <label>Supervisor Email</label>
                              <p>{p.supervisorEmail ? <a href={`mailto:${p.supervisorEmail}`} style={{ color: 'var(--navy)' }}>{p.supervisorEmail}</a> : 'N/A'}</p>
                            </div>
                            <div className="info-item"><label>Supervisor Phone</label><p>{p.supervisorPhone || 'N/A'}</p></div>
                            <div className="info-item"><label>Salary</label><p>{p.salary || 'Not stated'}</p></div>
                            <div className="info-item"><label>Working Pattern</label><p>{p.workingPattern || 'N/A'}</p></div>
                          </div>

                          {p.jobDescription && (
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Job Description</p>
                              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{p.jobDescription}</p>
                            </div>
                          )}

                          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tutor/schedule-visit?placementId=${p.id}`)}>🗓 Schedule Visit</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/messages?with=${p.student.id}`)}>💬 Message Student</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => openTerminate(p)}>⚠️ Terminate Placement</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {terminateTarget && (
        <div className="modal-backdrop" onClick={() => setTerminateTarget(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>⚠️ Terminate Placement</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You are about to terminate {terminateTarget.student.fullName}'s placement. This action will notify the student and mark the placement as terminated.
            </p>
            {terminateError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{terminateError}</div>}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Reason for termination <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                rows={4}
                required
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                placeholder="Explain clearly why this placement is being terminated..."
                style={{ borderColor: '#fca5a5', background: '#fff8f8' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setTerminateTarget(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={!terminateReason.trim()} onClick={confirmTerminate}>Confirm Termination</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
