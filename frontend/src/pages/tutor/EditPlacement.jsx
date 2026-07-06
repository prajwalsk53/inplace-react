import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function EditPlacement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [placement, setPlacement] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get(`/tutor/placements/${id}`).then(({ data }) => {
      setPlacement(data);
      setForm({
        roleTitle: data.roleTitle || '',
        startDate: data.startDate ? data.startDate.slice(0, 10) : '',
        endDate: data.endDate ? data.endDate.slice(0, 10) : '',
        salary: data.salary || '',
        workingPattern: data.workingPattern || '',
        jobDescription: data.jobDescription || '',
      });
    });
  }, [id]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/tutor/placements/${id}`, form);
      navigate('/tutor/placements?success=updated');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not update placement');
    } finally {
      setSaving(false);
    }
  };

  if (!placement || !form) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="panel" style={{ maxWidth: 640 }}>
      <div className="panel-header"><div><h3>Edit Placement</h3></div></div>
      <div className="panel-body">
        {message && <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>{message}</div>}
        <form onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Student</label>
            <input type="text" value={placement.student.fullName} disabled />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Company</label>
            <input type="text" value={placement.company.name} disabled />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Role Title</label>
            <input type="text" value={form.roleTitle} onChange={update('roleTitle')} />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Start Date</label>
            <input type="date" value={form.startDate} onChange={update('startDate')} />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>End Date</label>
            <input type="date" value={form.endDate} onChange={update('endDate')} />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Salary</label>
            <input type="text" value={form.salary} onChange={update('salary')} />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Working Pattern</label>
            <input type="text" value={form.workingPattern} onChange={update('workingPattern')} />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Job Description</label>
            <textarea rows={5} value={form.jobDescription} onChange={update('jobDescription')} />
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            <a href="/tutor/placements" className="btn btn-ghost">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  );
}
