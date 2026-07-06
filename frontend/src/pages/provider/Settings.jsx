import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ProviderSettings() {
  const [company, setCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    api.get('/provider/settings').then(({ data }) => setCompany(data));
  }, []);

  const update = (key) => (e) => setCompany((c) => ({ ...c, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFlash(null);
    try {
      if (!company.name?.trim()) {
        setFlash({ type: 'danger', msg: '⚠️ Company name is required.' });
        return;
      }
      await api.put('/provider/settings', company);
      setFlash({ type: 'success', msg: '✅ Company details updated successfully.' });
    } finally {
      setSaving(false);
    }
  };

  if (!company) return <div className="loading-screen">Loading...</div>;

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div className="panel" style={{ maxWidth: 720 }}>
        <div className="panel-header"><h3>🏢 Company Details</h3></div>
        <div style={{ padding: '2rem' }}>
          <form onSubmit={save}>
            <div className="form-group">
              <label>Company Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" value={company.name || ''} onChange={update('name')} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group">
                <label>City / Town</label>
                <input type="text" value={company.city || ''} onChange={update('city')} placeholder="e.g. London" />
              </div>
              <div className="form-group">
                <label>Sector / Industry</label>
                <input type="text" value={company.sector || ''} onChange={update('sector')} placeholder="e.g. Technology" />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input type="text" value={company.address || ''} onChange={update('address')} placeholder="Street address" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Website</label>
                <input type="url" value={company.website || ''} onChange={update('website')} placeholder="https://www.example.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={company.phone || ''} onChange={update('phone')} placeholder="+44 ..." />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea rows={4} value={company.description || ''} onChange={update('description')} placeholder="Brief description of the company..." />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '1rem' }}>Supervisor / Primary Contact</h4>

            <div className="form-group">
              <label>Contact Name</label>
              <input type="text" value={company.contactName || ''} onChange={update('contactName')} placeholder="e.g. Jane Smith" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" value={company.contactEmail || ''} onChange={update('contactEmail')} placeholder="supervisor@company.com" />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input type="tel" value={company.contactPhone || ''} onChange={update('contactPhone')} placeholder="+44 ..." />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
