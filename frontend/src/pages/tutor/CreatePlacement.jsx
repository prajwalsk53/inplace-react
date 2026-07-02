import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function CreatePlacement() {
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [useExistingCompany, setUseExistingCompany] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    studentId: '', companyId: '', companyName: '', companyAddress: '', companySector: '', companyLat: '', companyLng: '',
    roleTitle: '', jobDescription: '', startDate: '', endDate: '', salary: '', workingPattern: '',
    supervisorName: '', supervisorEmail: '', supervisorPhone: '',
  });

  useEffect(() => {
    api.get('/tutor/available-students').then(({ data }) => setStudents(data));
    api.get('/tutor/providers').then(({ data }) => setCompanies(data));
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/tutor/placements', form);
      navigate('/tutor/placements');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create placement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 className="section-title">Create Placement</h3>
      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={submit}>
        <div className="field">
          <label>Student</label>
          <select value={form.studentId} onChange={update('studentId')} required>
            <option value="">Select a student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.programmeType || 'no programme set'})</option>)}
          </select>
        </div>

        <div className="field">
          <label>
            <input type="checkbox" checked={useExistingCompany} onChange={(e) => setUseExistingCompany(e.target.checked)} /> Use an existing company
          </label>
        </div>

        {useExistingCompany ? (
          <div className="field">
            <label>Company</label>
            <select value={form.companyId} onChange={update('companyId')} required={useExistingCompany}>
              <option value="">Select a company</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div className="field"><label>Company name</label><input value={form.companyName} onChange={update('companyName')} required /></div>
            <div className="field"><label>Address</label><input value={form.companyAddress} onChange={update('companyAddress')} /></div>
            <div className="field"><label>Sector</label><input value={form.companySector} onChange={update('companySector')} /></div>
            <div className="grid-2">
              <div className="field"><label>Latitude</label><input value={form.companyLat} onChange={update('companyLat')} placeholder="52.6369" /></div>
              <div className="field"><label>Longitude</label><input value={form.companyLng} onChange={update('companyLng')} placeholder="-1.1398" /></div>
            </div>
          </>
        )}

        <div className="field"><label>Role title</label><input value={form.roleTitle} onChange={update('roleTitle')} required /></div>
        <div className="field"><label>Job description</label><textarea rows={3} value={form.jobDescription} onChange={update('jobDescription')} /></div>

        <div className="grid-2">
          <div className="field"><label>Start date</label><input type="date" value={form.startDate} onChange={update('startDate')} /></div>
          <div className="field"><label>End date</label><input type="date" value={form.endDate} onChange={update('endDate')} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Salary (£)</label><input type="number" value={form.salary} onChange={update('salary')} /></div>
          <div className="field"><label>Working pattern</label><input value={form.workingPattern} onChange={update('workingPattern')} placeholder="Full-time, Mon-Fri" /></div>
        </div>

        <h4 style={{ margin: '16px 0 10px', color: 'var(--navy)' }}>Supervisor (receives confirmation email)</h4>
        <div className="field"><label>Name</label><input value={form.supervisorName} onChange={update('supervisorName')} /></div>
        <div className="grid-2">
          <div className="field"><label>Email</label><input type="email" value={form.supervisorEmail} onChange={update('supervisorEmail')} /></div>
          <div className="field"><label>Phone</label><input value={form.supervisorPhone} onChange={update('supervisorPhone')} /></div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create placement'}</button>
      </form>
    </div>
  );
}
