import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const ROLE_BADGE = { admin: 'review', tutor: 'approved', provider: 'pending', student: 'pending', director: 'pending' };
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const EMPTY_CREATE = { fullName: '', email: '', password: '', role: 'student', studentId: '', companyId: '' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [flash, setFlash] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { action: 'deactivate'|'delete'|'hard_delete', user }

  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const load = () => api.get('/admin/users', { params: { role: role || undefined, status: status || undefined, search: search || undefined } }).then(({ data }) => setUsers(data));
  useEffect(() => { load(); }, [role, status, search]);
  useEffect(() => { api.get('/admin/companies').then(({ data }) => setCompanies(data)); }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (role) next.set('role', role);
    if (status) next.set('status', status);
    if (searchInput) next.set('search', searchInput);
    setSearchParams(next);
  };
  const changeParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    setSearchParams(next);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', createForm);
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      setFlash({ type: 'success', msg: '✅ User created successfully!' });
      load();
    } catch (err) {
      setFlash({ type: 'danger', msg: `❌ Error: ${err.response?.data?.error || 'Could not create user'}` });
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ fullName: u.fullName, email: u.email, role: u.role.toLowerCase(), studentId: u.studentId || '', companyId: u.companyId || '', isActive: u.isActive, newPassword: '' });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${editUser.id}`, editForm);
      setEditUser(null);
      setFlash({ type: 'success', msg: 'User updated successfully.' });
      load();
    } catch (err) {
      setFlash({ type: 'danger', msg: `Error updating user: ${err.response?.data?.error || ''}` });
    }
  };

  const activate = async (u) => {
    await api.post(`/admin/users/${u.id}/activate`);
    setFlash({ type: 'success', msg: 'User activated successfully.' });
    load();
  };

  const runConfirm = async () => {
    const { action, user } = confirmAction;
    try {
      if (action === 'deactivate') {
        await api.post(`/admin/users/${user.id}/deactivate`);
        setFlash({ type: 'warning', msg: 'User deactivated successfully.' });
      } else if (action === 'delete') {
        await api.delete(`/admin/users/${user.id}`);
        setFlash({ type: 'success', msg: 'User deleted successfully.' });
      } else if (action === 'hard_delete') {
        await api.delete(`/admin/users/${user.id}/hard`);
        setFlash({ type: 'success', msg: 'User and all associated data permanently deleted.' });
      }
    } catch (err) {
      setFlash({ type: 'danger', msg: err.response?.data?.error || 'Action failed.' });
    }
    setConfirmAction(null);
    load();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <form onSubmit={submitSearch} style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="🔍  Search by name, email, student ID..." style={{ minWidth: 300 }} />
        <select value={role} onChange={(e) => changeParam('role', e.target.value)}>
          <option value="">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="TUTOR">Tutors</option>
          <option value="PROVIDER">Providers</option>
          <option value="ADMIN">Admins</option>
          <option value="DIRECTOR">Directors</option>
        </select>
        <select value={status} onChange={(e) => changeParam('status', e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          {(searchInput || role || status) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setSearchParams({}); }}>✕ Clear</button>}
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
          <button type="button" className="btn btn-success btn-sm" onClick={() => setShowCreate(true)}>+ Create User</button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-header"><h3>{users.length} User{users.length !== 1 ? 's' : ''}</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Student ID / Company</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="avatar-cell">
                      <div className="avatar">{u.avatarInitials || '??'}</div>
                      <div><h4>{u.fullName}</h4><p>{u.email}</p></div>
                    </div>
                  </td>
                  <td><span className={`badge badge-${ROLE_BADGE[u.role.toLowerCase()] || 'pending'}`}>{u.role.charAt(0) + u.role.slice(1).toLowerCase()}</span></td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{u.studentId || u.company?.name || '—'}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8125rem' }}>{fmtDate(u.createdAt)}</td>
                  <td><span className={`badge badge-${u.isActive ? 'approved' : 'rejected'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      {u.isActive ? (
                        <button className="btn btn-warning btn-sm" onClick={() => setConfirmAction({ action: 'deactivate', user: u })}>Deactivate</button>
                      ) : (
                        <button className="btn btn-success btn-sm" onClick={() => activate(u)}>Activate</button>
                      )}
                      {u.id !== me.id && (
                        <>
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirmAction({ action: 'delete', user: u })}>Delete</button>
                          <button className="btn btn-sm" style={{ background: '#7f1d1d', color: '#fff', border: 'none' }} onClick={() => setConfirmAction({ action: 'hard_delete', user: u })}>Hard Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Create New User</h3>
            <form onSubmit={submitCreate}>
              <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group full-col">
                  <label>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" required value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="form-group full-col">
                  <label>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="email" required value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="password" required minLength={6} value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Role <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select required value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="student">Student</option>
                    <option value="tutor">Tutor</option>
                    <option value="provider">Provider</option>
                    <option value="admin">Admin</option>
                    <option value="director">Programme Director</option>
                  </select>
                </div>
                {createForm.role === 'student' && (
                  <div className="form-group">
                    <label>Student ID</label>
                    <input type="text" placeholder="e.g., 190123456" value={createForm.studentId} onChange={(e) => setCreateForm((f) => ({ ...f, studentId: e.target.value }))} />
                  </div>
                )}
                {createForm.role === 'provider' && (
                  <div className="form-group">
                    <label>Company</label>
                    <select value={createForm.companyId} onChange={(e) => setCreateForm((f) => ({ ...f, companyId: e.target.value }))}>
                      <option value="">-- Select company --</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && editForm && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Edit User</h3>
            <form onSubmit={submitEdit}>
              <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group full-col">
                  <label>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" required value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="form-group full-col">
                  <label>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="email" required value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Role <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select required value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="student">Student</option>
                    <option value="tutor">Tutor</option>
                    <option value="provider">Provider</option>
                    <option value="admin">Admin</option>
                    <option value="director">Programme Director</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={editForm.isActive ? '1' : '0'} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === '1' }))}>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
                {editForm.role === 'student' && (
                  <div className="form-group">
                    <label>Student ID</label>
                    <input type="text" placeholder="e.g., 190123456" value={editForm.studentId} onChange={(e) => setEditForm((f) => ({ ...f, studentId: e.target.value }))} />
                  </div>
                )}
                {editForm.role === 'provider' && (
                  <div className="form-group">
                    <label>Company</label>
                    <select value={editForm.companyId} onChange={(e) => setEditForm((f) => ({ ...f, companyId: e.target.value }))}>
                      <option value="">-- Select company --</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group full-col">
                  <label>New Password <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(leave blank to keep current)</span></label>
                  <input type="password" placeholder="Enter new password to change it" minLength={6} value={editForm.newPassword} onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="modal-backdrop" onClick={() => setConfirmAction(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            {confirmAction.action === 'deactivate' && (
              <>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>Deactivate User</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Deactivate account for: {confirmAction.user.fullName}? They will not be able to log in.</p>
              </>
            )}
            {confirmAction.action === 'delete' && (
              <>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>Delete User</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Permanently delete {confirmAction.user.fullName}? This cannot be undone. If they have associated records, use Hard Delete instead.</p>
              </>
            )}
            {confirmAction.action === 'hard_delete' && (
              <>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>Hard Delete User</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <strong style={{ color: '#7f1d1d' }}>{confirmAction.user.fullName}</strong> and ALL their data will be permanently erased — placements, documents, messages, audit logs, and tokens. This cannot be undone.
                </p>
              </>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className={confirmAction.action === 'hard_delete' ? 'btn' : confirmAction.action === 'deactivate' ? 'btn btn-warning' : 'btn btn-danger'}
                style={confirmAction.action === 'hard_delete' ? { background: '#7f1d1d', color: '#fff', border: 'none' } : undefined}
                onClick={runConfirm}
              >
                {confirmAction.action === 'hard_delete' ? 'Permanently Delete Everything' : confirmAction.action === 'deactivate' ? 'Deactivate' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
