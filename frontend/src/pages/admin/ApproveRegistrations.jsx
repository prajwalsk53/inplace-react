import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AdminApproveRegistrations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [registrations, setRegistrations] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ years: [], programmes: [] });
  const [selected, setSelected] = useState(new Set());
  const [flash, setFlash] = useState(null);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [bulkModal, setBulkModal] = useState(null); // 'approve' | 'reject'

  const year = searchParams.get('year') || '';
  const programme = searchParams.get('programme') || '';
  const status = searchParams.get('status') || '';

  const load = () => api.get('/admin/registrations', { params: { year: year || undefined, programme: programme || undefined, status: status || undefined } }).then(({ data }) => { setRegistrations(data); setSelected(new Set()); });
  useEffect(() => { load(); }, [year, programme, status]);
  useEffect(() => { api.get('/admin/registrations/filters').then(({ data }) => setFilterOptions(data)); }, []);

  const pendingCount = registrations.filter((r) => r.approvalStatus === 'PENDING').length;
  const totalCount = registrations.length;
  const pendingIds = useMemo(() => registrations.filter((r) => r.approvalStatus === 'PENDING').map((r) => r.id), [registrations]);
  const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const changeParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    setSearchParams(next);
  };

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pendingIds));
  const toggleOne = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const approve = async () => {
    await api.post(`/admin/registrations/${approveTarget.id}/approve`);
    setApproveTarget(null);
    setFlash({ type: 'success', msg: 'Student account approved successfully!' });
    load();
  };
  const reject = async () => {
    await api.post(`/admin/registrations/${rejectTarget.id}/reject`);
    setRejectTarget(null);
    setFlash({ type: 'warning', msg: 'Registration rejected and user record deleted. They can register again next year.' });
    load();
  };
  const bulkApprove = async () => {
    const { data } = await api.post('/admin/registrations/bulk-approve', { userIds: [...selected] });
    setBulkModal(null);
    setFlash({ type: 'success', msg: `${data.count} student(s) approved successfully!` });
    load();
  };
  const bulkReject = async () => {
    const { data } = await api.post('/admin/registrations/bulk-reject', { userIds: [...selected] });
    setBulkModal(null);
    setFlash({ type: 'warning', msg: `${data.count} registration(s) rejected and deleted. They can re-register next year.` });
    load();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Pending Approval</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: pendingCount > 0 ? 'var(--warning)' : 'var(--navy)' }}>{pendingCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Total Registrations</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--navy)' }}>{totalCount}</h3>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <h3>Student Registrations</h3>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
            <select value={year} onChange={(e) => changeParam('year', e.target.value)}>
              <option value="">All Years</option>
              {filterOptions.years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={programme} onChange={(e) => changeParam('programme', e.target.value)}>
              <option value="">All Programmes</option>
              {filterOptions.programmes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={status} onChange={(e) => changeParam('status', e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
            {(year || programme || status) && <button className="btn btn-ghost btn-sm" onClick={() => setSearchParams({})}>Clear filters</button>}
          </div>
        </div>

        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--navy)', color: '#fff', padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-sm)', margin: '0 1.5rem 1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selected.size} student{selected.size > 1 ? 's' : ''} selected</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-success btn-sm" onClick={() => setBulkModal('approve')}>✓ Approve Selected</button>
              <button className="btn btn-danger btn-sm" onClick={() => setBulkModal('reject')}>✗ Reject Selected</button>
            </div>
          </div>
        )}

        {registrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <p style={{ color: 'var(--muted)' }}>No registrations found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}><input type="checkbox" checked={allSelected} onChange={toggleAll} title="Select all pending" /></th>
                  <th>Student</th><th>Email</th><th>Academic Year</th><th>Programme</th><th>Registered</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg.id}>
                    <td>{reg.approvalStatus === 'PENDING' ? <input type="checkbox" checked={selected.has(reg.id)} onChange={() => toggleOne(reg.id)} /> : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}</td>
                    <td style={{ fontWeight: 500 }}>{reg.fullName}</td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{reg.email}</td>
                    <td><span className="type-chip">{reg.academicYear}</span></td>
                    <td style={{ fontSize: '0.875rem' }}>{reg.programmeType}</td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8125rem' }}>{fmtDate(reg.createdAt)}</td>
                    <td><span className={`badge badge-${reg.approvalStatus === 'APPROVED' ? 'approved' : 'pending'}`}>{reg.approvalStatus.charAt(0) + reg.approvalStatus.slice(1).toLowerCase()}</span></td>
                    <td>
                      {reg.approvalStatus === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-success btn-sm" onClick={() => setApproveTarget(reg)}>✓ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectTarget(reg)}>✗ Reject</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Approved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {approveTarget && (
        <div className="modal-backdrop" onClick={() => setApproveTarget(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>✅ Approve Registration</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>You are about to approve the registration for: {approveTarget.fullName}</p>
            <div style={{ background: 'var(--success-bg)', border: '1px solid #6ee7b7', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--success)', fontSize: '0.9rem' }}>This will activate the student account immediately.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setApproveTarget(null)}>Cancel</button>
              <button className="btn btn-success" onClick={approve}>Confirm Approval</button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="modal-backdrop" onClick={() => setRejectTarget(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>⚠️ Reject &amp; Delete Registration</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>You are about to reject the registration for: {rejectTarget.fullName}</p>
            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>This will <strong>permanently delete</strong> the user's record. They can re-register with the same email.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={reject}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {bulkModal === 'approve' && (
        <div className="modal-backdrop" onClick={() => setBulkModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>✅ Bulk Approve</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>You are about to approve {selected.size} pending registration{selected.size > 1 ? 's' : ''}.</p>
            <div style={{ background: 'var(--success-bg)', border: '1px solid #6ee7b7', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--success)', fontSize: '0.9rem' }}>All selected pending students will be approved and notified by email.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setBulkModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={bulkApprove}>Approve All Selected</button>
            </div>
          </div>
        </div>
      )}

      {bulkModal === 'reject' && (
        <div className="modal-backdrop" onClick={() => setBulkModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>⚠️ Bulk Reject &amp; Delete</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>You are about to reject and delete {selected.size} pending registration{selected.size > 1 ? 's' : ''}.</p>
            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>This will <strong>permanently delete</strong> all selected pending registrations. They can re-register next year.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setBulkModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={bulkReject}>Reject All Selected</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
