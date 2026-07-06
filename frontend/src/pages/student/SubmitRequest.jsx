import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const SECTORS = [
  'Technology & Software', 'Engineering & Manufacturing', 'Finance & Banking',
  'Healthcare & Life Sciences', 'Consultancy', 'Media & Communications',
  'Retail & E-commerce', 'Public Sector / Government', 'Education & Research', 'Other',
];

const WORKING_PATTERNS = ['Full-time (37.5 hrs/week)', 'Full-time (40 hrs/week)', 'Hybrid', 'Remote', 'Part-time'];

const EMPTY_FORM = {
  companyName: '', companyAddress: '', sector: '', companyLat: '', companyLng: '',
  roleTitle: '', jobDescription: '', startDate: '', endDate: '', salary: '', workingPattern: WORKING_PATTERNS[0],
  supervisorName: '', supervisorJobTitle: '', supervisorEmail: '', supervisorPhone: '',
};

function companyNameInEmail(companyName, email) {
  const words = companyName.toLowerCase().split(/[\s\-&.,/()]+/).filter((w) => w.length > 2);
  return words.some((w) => email.toLowerCase().includes(w));
}

export default function SubmitRequest() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [existingPlacement, setExistingPlacement] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [documents, setDocuments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const addressTimer = useRef(null);

  useEffect(() => {
    api.get('/student/placement-request', { params: editId ? { edit: editId } : {} }).then(({ data }) => {
      setExistingPlacement(data.existingPlacement);
      if (data.draft) {
        setForm({
          companyName: data.draft.companyName || '',
          companyAddress: data.draft.companyAddress || '',
          sector: data.draft.sector || '',
          companyLat: data.draft.companyLat ?? '',
          companyLng: data.draft.companyLng ?? '',
          roleTitle: data.draft.roleTitle || '',
          jobDescription: data.draft.jobDescription || '',
          startDate: data.draft.startDate || '',
          endDate: data.draft.endDate || '',
          salary: data.draft.salary || '',
          workingPattern: data.draft.workingPattern || WORKING_PATTERNS[0],
          supervisorName: data.draft.supervisorName || '',
          supervisorJobTitle: '',
          supervisorEmail: data.draft.supervisorEmail || '',
          supervisorPhone: data.draft.supervisorPhone || '',
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onAddressInput = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, companyAddress: value }));
    clearTimeout(addressTimer.current);
    if (value.trim().length < 3) { setShowSuggestions(false); return; }
    addressTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&addressdetails=1&limit=6&q=${encodeURIComponent(value)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(true);
      } catch {
        setShowSuggestions(false);
      }
    }, 350);
  };

  const selectSuggestion = (item) => {
    setForm((f) => ({ ...f, companyAddress: item.display_name, companyLat: item.lat, companyLng: item.lon }));
    setShowSuggestions(false);
  };

  const submit = async (action) => {
    setError(null);
    if (action !== 'draft') {
      if (form.supervisorEmail && form.companyName && !companyNameInEmail(form.companyName, form.supervisorEmail)) {
        setError(`Supervisor email must contain the company name (e.g. supervisor@${form.companyName.replace(/\s+/g, '').toLowerCase()}.com or john.${form.companyName.replace(/\s+/g, '').toLowerCase()}@gmail.com).`);
        return;
      }
      if (form.startDate && form.endDate && form.endDate <= form.startDate) {
        setError('End date must be after start date.');
        return;
      }
    }

    setLoading(true);
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (action === 'draft') formData.append('action', 'draft');
    if (editId) formData.append('editPlacementId', editId);
    documents.forEach((file) => formData.append('documents', file));

    try {
      const { data } = await api.post('/student/placement-request', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(data.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {success && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid #6ee7b7', borderRadius: 'var(--radius)', padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🎉</span>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.25rem' }}>Request Submitted!</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--success)' }}>{success}</p>
          </div>
          <Link to="/student/dashboard" className="btn btn-success btn-sm" style={{ marginLeft: 'auto' }}>Back to Dashboard →</Link>
        </div>
      )}

      {error && <div className="alert alert-danger" style={{ marginBottom: '2rem' }}>⚠️ {error}</div>}

      {existingPlacement && (
        <div style={{ background: 'var(--warning-bg)', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '1.25rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--warning)' }}>You already have a placement request</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--warning)' }}>
              Status: <strong>{existingPlacement.status.replace(/_/g, ' ')}</strong>. Submitting a new one will create an additional request.
            </p>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>{editId ? 'Edit Draft Request' : 'New Placement Authorisation Request'}</h3>
            <p>All fields marked * are required. The provider will be asked to confirm the details.</p>
          </div>
          <span className="badge badge-pending">Draft</span>
        </div>

        <div className="panel-body">
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border)' }}>
            1 · Company &amp; Role Information
          </div>
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-group">
              <label>Company Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" value={form.companyName} onChange={update('companyName')} placeholder="e.g., Rolls-Royce plc" required />
            </div>
            <div className="form-group full-col">
              <label>Full Company Address</label>
              <div style={{ position: 'relative' }}>
                <input type="text" autoComplete="off" placeholder="Start typing a street, city or postcode…" value={form.companyAddress} onChange={onAddressInput} style={{ width: '100%' }} />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '2px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 999, maxHeight: 220, overflowY: 'auto' }}>
                    {suggestions.map((item) => (
                      <div key={item.place_id} onClick={() => selectSuggestion(item)} style={{ padding: '0.625rem 1rem', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid #f0f0f0', color: '#2c3e50' }}>
                        {item.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <small style={{ color: 'var(--muted)' }}>Type an address or postcode and select from the suggestions.</small>
            </div>
            <div className="form-group">
              <label>Industry / Sector</label>
              <select value={form.sector} onChange={update('sector')}>
                <option value="">Select sector</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Role / Job Title <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" value={form.roleTitle} onChange={update('roleTitle')} placeholder="e.g., Software Engineering Intern" required />
            </div>
            <div className="form-group full-col">
              <label>Job Description <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea rows={4} value={form.jobDescription} onChange={update('jobDescription')} placeholder="Describe the role, responsibilities, technologies, and skills involved..." required />
            </div>
          </div>

          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border)' }}>
            2 · Placement Dates &amp; Terms
          </div>
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-group">
              <label>Start Date <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="date" value={form.startDate} onChange={update('startDate')} required />
            </div>
            <div className="form-group">
              <label>End Date <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="date" value={form.endDate} onChange={update('endDate')} required />
            </div>
            <div className="form-group">
              <label>Salary (Annual)</label>
              <input type="text" value={form.salary} onChange={update('salary')} placeholder="e.g., £22,000" />
            </div>
            <div className="form-group">
              <label>Working Pattern</label>
              <select value={form.workingPattern} onChange={update('workingPattern')}>
                {WORKING_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border)' }}>
            3 · Supervisor Details
          </div>
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-group">
              <label>Supervisor Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" value={form.supervisorName} onChange={update('supervisorName')} placeholder="e.g., Mark Henderson" required />
            </div>
            <div className="form-group">
              <label>Supervisor Job Title</label>
              <input type="text" value={form.supervisorJobTitle} onChange={update('supervisorJobTitle')} placeholder="e.g., Engineering Manager" />
            </div>
            <div className="form-group">
              <label>Supervisor Email <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="email" value={form.supervisorEmail} onChange={update('supervisorEmail')} placeholder="supervisor@company.com" required />
            </div>
            <div className="form-group">
              <label>Supervisor Phone</label>
              <input type="tel" value={form.supervisorPhone} onChange={update('supervisorPhone')} placeholder="+44 7700 000000" />
            </div>
          </div>

          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border)' }}>
            4 · Supporting Documents
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <label className="upload-zone" htmlFor="docInput" style={{ display: 'block' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📎</div>
              <p><strong>Click to upload</strong> or drag and drop</p>
              <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: 'var(--muted)' }}>Offer letter, job description PDF (max 10 MB each)</p>
            </label>
            <input id="docInput" type="file" multiple accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => setDocuments(Array.from(e.target.files))} />
            {documents.length > 0 && (
              <div style={{ marginTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {documents.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--success-bg)', borderRadius: 8, border: '1px solid #6ee7b7' }}>
                    <span style={{ fontSize: '1.25rem' }}>📄</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--success)' }}>{f.name}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginLeft: 'auto' }}>{Math.round(f.size / 1024)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Link to="/student/dashboard" className="btn btn-ghost">← Back</Link>
            <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => submit('draft')}>Save as Draft</button>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={() => submit('submit')}>{loading ? 'Submitting...' : 'Submit Request →'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
