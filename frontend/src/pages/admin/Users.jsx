import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');

  const load = () => api.get('/admin/users', { params: { role: roleFilter || undefined } }).then(({ data }) => setUsers(data));
  useEffect(() => { load(); }, [roleFilter]);

  const toggleActive = async (user) => {
    if (user.isActive) {
      if (!confirm(`Deactivate ${user.fullName}?`)) return;
      await api.post(`/admin/users/${user.id}/deactivate`);
    } else {
      await api.put(`/admin/users/${user.id}`, { isActive: true });
    }
    load();
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="section-title" style={{ marginBottom: 0 }}>Users</h3>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="STUDENT">Student</option>
          <option value="TUTOR">Tutor</option>
          <option value="PROVIDER">Provider</option>
          <option value="DIRECTOR">Director</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role.toLowerCase()}</td>
                <td><span className={`badge ${u.approvalStatus === 'APPROVED' ? 'badge-success' : u.approvalStatus === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>{u.approvalStatus}</span></td>
                <td>{u.isActive ? 'Yes' : 'No'}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => toggleActive(u)}>{u.isActive ? 'Deactivate' : 'Reactivate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
