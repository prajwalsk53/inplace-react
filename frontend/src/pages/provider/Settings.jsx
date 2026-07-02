import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ProviderSettings() {
  const [company, setCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/provider/settings').then(({ data }) => setCompany(data));
  }, []);

  const update = (key) => (e) => setCompany((c) => ({ ...c, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/provider/settings', company);
      setMessage('Company details updated.');
    } finally {
      setSaving(false);
    }
  };

  if (!company) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h3 className="section-title">Organisation Details</h3>
      {message && <div className="success-banner">{message}</div>}
      <form onSubmit={save}>
        <div className="field"><label>Company name</label><input value={company.name || ''} onChange={update('name')} required /></div>
        <div className="field"><label>Address</label><input value={company.address || ''} onChange={update('address')} /></div>
        <div className="field"><label>Sector</label><input value={company.sector || ''} onChange={update('sector')} /></div>
        <div className="field"><label>Contact name</label><input value={company.contactName || ''} onChange={update('contactName')} /></div>
        <div className="grid-2">
          <div className="field"><label>Contact email</label><input value={company.contactEmail || ''} onChange={update('contactEmail')} /></div>
          <div className="field"><label>Contact phone</label><input value={company.contactPhone || ''} onChange={update('contactPhone')} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Latitude</label><input value={company.latitude || ''} onChange={update('latitude')} /></div>
          <div className="field"><label>Longitude</label><input value={company.longitude || ''} onChange={update('longitude')} /></div>
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
      </form>
    </div>
  );
}
