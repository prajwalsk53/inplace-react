import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_BADGE = {
  ACTIVE: 'approved', APPROVED: 'approved', AWAITING_PROVIDER: 'pending', AWAITING_TUTOR: 'pending',
  REJECTED: 'rejected', TERMINATED: 'rejected',
};
const DEFAULT_STATUSES = ['AWAITING_PROVIDER', 'AWAITING_TUTOR', 'APPROVED', 'ACTIVE'];
const STATUS_ORDER = ['ACTIVE', 'APPROVED', 'AWAITING_TUTOR', 'AWAITING_PROVIDER'];

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProviderStudents() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [placements, setPlacements] = useState([]);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const filterStatus = searchParams.get('status') || '';
  const filterSearch = searchParams.get('search') || '';

  useEffect(() => {
    api.get('/provider/placements').then(({ data }) => setPlacements(data));
  }, []);

  const students = useMemo(() => {
    let list = placements;
    if (filterStatus) {
      list = list.filter((p) => p.status === filterStatus);
    } else {
      list = list.filter((p) => DEFAULT_STATUSES.includes(p.status));
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      list = list.filter((p) => p.student.fullName.toLowerCase().includes(q) || p.student.email.toLowerCase().includes(q) || (p.roleTitle || '').toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const oa = STATUS_ORDER.indexOf(a.status); const ob = STATUS_ORDER.indexOf(b.status);
      const ra = oa === -1 ? 5 : oa; const rb = ob === -1 ? 5 : ob;
      if (ra !== rb) return ra - rb;
      return new Date(b.startDate) - new Date(a.startDate);
    });
  }, [placements, filterStatus, filterSearch]);

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (filterStatus) next.set('status', filterStatus);
    if (searchInput) next.set('search', searchInput);
    setSearchParams(next);
  };

  const changeStatus = (val) => {
    const next = new URLSearchParams();
    if (val) next.set('status', val);
    if (filterSearch) next.set('search', filterSearch);
    setSearchParams(next);
  };

  return (
    <div>
      <form onSubmit={submitSearch} className="filter-bar">
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="🔍 Search by name, email or role..." style={{ minWidth: 300 }} />
        <select value={filterStatus} onChange={(e) => changeStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="APPROVED">Approved</option>
          <option value="AWAITING_TUTOR">Awaiting Tutor</option>
          <option value="AWAITING_PROVIDER">Awaiting Provider</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          {(filterSearch || filterStatus) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setSearchParams({}); }}>✕ Clear</button>
          )}
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-header">
          <div><h3>{students.length} Student{students.length !== 1 ? 's' : ''}</h3><p>Placed at your company</p></div>
        </div>

        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <p style={{ color: 'var(--muted)' }}>No students found matching your filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Role</th><th>Dates</th><th>Year / Programme</th><th>Tutor</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="avatar-cell">
                        <div className="avatar">{s.student.avatarInitials || '??'}</div>
                        <div><h4>{s.student.fullName}</h4><p>{s.student.email}</p></div>
                      </div>
                    </td>
                    <td><span className="type-chip">{s.roleTitle || 'Not specified'}</span></td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8125rem' }}>
                      {fmtDate(s.startDate)}<br /><span style={{ color: 'var(--muted)' }}>to</span><br />{fmtDate(s.endDate)}
                    </td>
                    <td>
                      {s.student.academicYear || 'N/A'}<br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.student.programmeType || ''}</span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{s.tutor?.fullName || 'Unassigned'}</td>
                    <td><span className={`badge badge-${STATUS_BADGE[s.status] || 'open'}`}>{titleCase(s.status)}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/provider/view-placement/${s.id}`)}>View</button></td>
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
