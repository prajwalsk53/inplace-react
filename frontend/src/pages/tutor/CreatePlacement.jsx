import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

const SECTORS = [
  'Technology & Software', 'Engineering & Manufacturing', 'Finance & Banking',
  'Healthcare & Life Sciences', 'Consultancy', 'Media & Communications',
  'Retail & E-commerce', 'Public Sector / Government', 'Education & Research', 'Other',
];
const PATTERNS = ['Full-time (37.5 hrs/week)', 'Full-time (40 hrs/week)', 'Hybrid', 'Remote', 'Part-time'];
const STATUS_OPTIONS = [
  { value: 'awaiting_provider', icon: '📩', label: 'Awaiting Provider', desc: 'Provider must confirm. An email will be sent to the supervisor.' },
  { value: 'awaiting_tutor', icon: '📋', label: 'Awaiting Tutor Review', desc: 'Provider has already confirmed. Tutor needs to approve.' },
  { value: 'approved', icon: '✅', label: 'Approved', desc: 'Mark as fully approved immediately. Use only if all parties have already agreed verbally.' },
];

const EMPTY_FORM = {
  studentId: '', companyName: '', companyAddress: '', sector: '', roleTitle: '', workingPattern: PATTERNS[0],
  jobDescription: '', startDate: '', endDate: '', salary: '',
  supervisorName: '', supervisorEmail: '', supervisorPhone: '', initialStatus: 'awaiting_provider',
  companyLat: '', companyLng: '',
};

export default function CreatePlacement() {
  const [students, setStudents] = useState([]);
  const [companyNames, setCompanyNames] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addrResults, setAddrResults] = useState([]);
  const addrTimer = useRef(null);

  useEffect(() => {
    api.get('/tutor/available-students').then(({ data }) => setStudents(data));
    api.get('/tutor/company-names').then(({ data }) => setCompanyNames(data));
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onAddressChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, companyAddress: value }));
    clearTimeout(addrTimer.current);
    if (value.trim().length < 3) { setAddrResults([]); return; }
    addrTimer.current = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&addressdetails=1&limit=6&q=${encodeURIComponent(value)}`, { headers: { 'Accept-Language': 'en' } })
        .then((r) => r.json())
        .then((data) => setAddrResults(data || []))
        .catch(() => setAddrResults([]));
    }, 350);
  };

  const pickAddress = (item) => {
    setForm((f) => ({ ...f, companyAddress: item.display_name, companyLat: item.lat, companyLng: item.lon }));
    setAddrResults([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (form.endDate && form.startDate && form.endDate <= form.startDate) {
      setError('End date must be after start date.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/tutor/placements', form);
      setSuccess(data.message);
      setForm(EMPTY_FORM);
      api.get('/tutor/company-names').then(({ data }) => setCompanyNames(data));
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating placement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {success && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid #6ee7b7', borderRadius: 'var(--radius)', padding: '1.25rem 2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <div style={{ flex: 1 }}><p style={{ color: 'var(--success)', fontWeight: 600 }}>{success}</p></div>
          <a href="/tutor/placements" className="btn btn-success btn-sm">View Placements →</a>
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '1.25rem 2rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 500 }}>⚠️ {error}</p>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Create Placement on Behalf of Student</h3>
            <p>Fill in all required fields. The student will be notified automatically.</p>
          </div>
          <a href="/tutor/placements" className="btn btn-ghost btn-sm">← Back to Placements</a>
        </div>
        <div className="panel-body">
          <form onSubmit={submit}>
            <div className="section-label">1 · Select Student</div>
            <div className="form-grid" style={{ marginBottom: '2rem' }}>
              <div className="form-group full-col">
                <label>Student <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select value={form.studentId} onChange={update('studentId')} required>
                  <option value="">— Select an approved student —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}{s.academicYear ? ` (${s.academicYear})` : ''} — {s.email}
                    </option>
                  ))}
                </select>
                {students.length === 0 && <small style={{ color: 'var(--danger)' }}>No approved students found. Students must be approved before a placement can be created for them.</small>}
              </div>
            </div>

            <div className="section-label">2 · Company &amp; Role</div>
            <div className="form-grid" style={{ marginBottom: '2rem' }}>
              <div className="form-group">
                <label>Company Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" list="companySuggest" required placeholder="e.g., Rolls-Royce plc" value={form.companyName} onChange={update('companyName')} />
                <datalist id="companySuggest">
                  {companyNames.map((c) => <option key={c} value={c} />)}
                </datalist>
                <small style={{ color: 'var(--muted)' }}>Start typing to find an existing company or enter a new one.</small>
              </div>

              <div className="form-group">
                <label>Industry / Sector</label>
                <select value={form.sector} onChange={update('sector')}>
                  <option value="">Select sector</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group full-col" style={{ position: 'relative' }}>
                <label>Company Address</label>
                <input type="text" autoComplete="off" placeholder="Start typing an address or postcode…" value={form.companyAddress} onChange={onAddressChange} />
                {addrResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '2px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', zIndex: 999, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                    {addrResults.map((item, i) => (
                      <div key={i} onClick={() => pickAddress(item)} style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid #f0f0f0' }}>
                        {item.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Role / Job Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" required placeholder="e.g., Software Engineering Intern" value={form.roleTitle} onChange={update('roleTitle')} />
              </div>

              <div className="form-group">
                <label>Working Pattern</label>
                <select value={form.workingPattern} onChange={update('workingPattern')}>
                  {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group full-col">
                <label>Job Description</label>
                <textarea rows={3} placeholder="Describe the role and responsibilities…" value={form.jobDescription} onChange={update('jobDescription')} />
              </div>
            </div>

            <div className="section-label">3 · Placement Dates &amp; Terms</div>
            <div className="form-grid" style={{ marginBottom: '2rem' }}>
              <div className="form-group">
                <label>Start Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="date" required value={form.startDate} onChange={update('startDate')} />
              </div>
              <div className="form-group">
                <label>End Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="date" required value={form.endDate} onChange={update('endDate')} />
              </div>
              <div className="form-group">
                <label>Salary (Annual)</label>
                <input type="text" placeholder="e.g., £22,000" value={form.salary} onChange={update('salary')} />
              </div>
            </div>

            <div className="section-label">4 · Supervisor Details</div>
            <div className="form-grid" style={{ marginBottom: '2rem' }}>
              <div className="form-group">
                <label>Supervisor Name</label>
                <input type="text" placeholder="e.g., Mark Henderson" value={form.supervisorName} onChange={update('supervisorName')} />
              </div>
              <div className="form-group">
                <label>Supervisor Email</label>
                <input type="email" placeholder="supervisor@company.com" value={form.supervisorEmail} onChange={update('supervisorEmail')} />
              </div>
              <div className="form-group">
                <label>Supervisor Phone</label>
                <input type="tel" placeholder="+44 7700 000000" value={form.supervisorPhone} onChange={update('supervisorPhone')} />
              </div>
            </div>

            <div className="section-label">5 · Initial Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {STATUS_OPTIONS.map((opt) => {
                const selected = form.initialStatus === opt.value;
                return (
                  <label key={opt.value} style={{ cursor: 'pointer' }}>
                    <input type="radio" name="initialStatus" value={opt.value} checked={selected} onChange={update('initialStatus')} style={{ display: 'none' }} />
                    <div style={{ border: '2px solid var(--border)', borderRadius: 10, padding: '1rem', transition: 'all 0.2s', ...(selected ? { borderColor: 'var(--navy)', background: 'var(--cream)' } : {}) }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{opt.icon}</div>
                      <p style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>{opt.label}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.4 }}>{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <a href="/tutor/placements" className="btn btn-ghost">Cancel</a>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Placement →'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
