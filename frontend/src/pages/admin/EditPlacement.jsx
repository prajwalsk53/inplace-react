import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const STATUSES = ['SUBMITTED', 'AWAITING_PROVIDER', 'AWAITING_TUTOR', 'APPROVED', 'ACTIVE', 'REJECTED', 'TERMINATED'];
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminEditPlacement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [form, setForm] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    api.get(`/admin/placements/${id}`).then(({ data }) => {
      setP(data);
      setForm({
        roleTitle: data.roleTitle || '', jobDescription: data.jobDescription || '',
        startDate: toDateInput(data.startDate), endDate: toDateInput(data.endDate),
        salary: data.salary || '', workingPattern: data.workingPattern || '',
        supervisorName: data.supervisorName || '', supervisorEmail: data.supervisorEmail || '', supervisorPhone: data.supervisorPhone || '',
        status: data.status, tutorId: data.tutorId || '',
      });
    }).catch(() => navigate('/admin/placements'));
    api.get('/admin/users', { params: { role: 'TUTOR', status: 'active' } }).then(({ data }) => setTutors(data));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/placements/${id}`, form);
      setFlash({ type: 'success', msg: 'Placement updated successfully.' });
    } catch (err) {
      setFlash({ type: 'danger', msg: `Error updating placement: ${err.response?.data?.error || ''}` });
    }
  };

  if (!p || !form) return <div className="loading-screen">Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/placements')}>← Back to Placements</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/placements/${id}`)}>View Details</button>
      </div>

      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Edit Placement</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>{p.student.fullName} &nbsp;·&nbsp; {p.company.name}</p>
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Role / Job Title <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" required value={form.roleTitle} onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Start Date <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>End Date <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="date" required value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Salary</label>
              <input type="text" placeholder="e.g. £18,000 p/a" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Working Pattern</label>
              <input type="text" placeholder="e.g. 9am–5pm, Mon–Fri" value={form.workingPattern} onChange={(e) => setForm((f) => ({ ...f, workingPattern: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Status <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select required value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Assign Tutor</label>
              <select value={form.tutorId} onChange={(e) => setForm((f) => ({ ...f, tutorId: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {tutors.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Job Description</label>
              <textarea rows={4} value={form.jobDescription} onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))} />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <h4 style={{ color: 'var(--navy)', fontSize: '1rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Supervisor Details</h4>
            </div>
            <div className="form-group">
              <label>Supervisor Name</label>
              <input type="text" value={form.supervisorName} onChange={(e) => setForm((f) => ({ ...f, supervisorName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Supervisor Email</label>
              <input type="email" value={form.supervisorEmail} onChange={(e) => setForm((f) => ({ ...f, supervisorEmail: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Supervisor Phone</label>
              <input type="text" value={form.supervisorPhone} onChange={(e) => setForm((f) => ({ ...f, supervisorPhone: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/placements')}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
