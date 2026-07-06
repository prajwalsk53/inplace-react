import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const ALL_SECTORS = [
  'Technology & Software', 'Engineering & Manufacturing', 'Finance & Banking',
  'Healthcare & Life Sciences', 'Consultancy', 'Media & Communications',
  'Retail & E-commerce', 'Public Sector / Government', 'Education & Research', 'Other',
];

const EMPTY_EDIT = {
  id: null, name: '', city: '', address: '', sector: '', website: '', phone: '',
  contactName: '', contactEmail: '', contactPhone: '', description: '',
};

export default function Providers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [flash, setFlash] = useState(null);
  const [editing, setEditing] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const search = searchParams.get('search') || '';
  const sector = searchParams.get('sector') || '';

  const load = () => api.get('/tutor/providers', { params: { search, sector } }).then(({ data }) => setCompanies(data));
  useEffect(() => { load(); }, [search, sector]);
  useEffect(() => { api.get('/tutor/providers/sectors').then(({ data }) => setSectors(data)); }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (searchInput) next.set('search', searchInput);
    if (sector) next.set('sector', sector);
    setSearchParams(next);
  };

  const changeSector = (e) => {
    const next = new URLSearchParams(searchParams);
    if (e.target.value) next.set('sector', e.target.value); else next.delete('sector');
    setSearchParams(next);
  };

  const openEdit = (co) => setEditing({
    id: co.id, name: co.name || '', city: co.city || '', address: co.address || '', sector: co.sector || '',
    website: co.website || '', phone: co.phone || '', contactName: co.contactName || '', contactEmail: co.contactEmail || '',
    contactPhone: co.contactPhone || '', description: co.description || '',
  });

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tutor/providers/${editing.id}`, editing);
      setEditing(null);
      setFlash({ type: 'success', msg: 'Company updated successfully.' });
      load();
    } catch (err) {
      setFlash({ type: 'danger', msg: err.response?.data?.error || 'Could not update company' });
    }
  };

  const remove = async (co) => {
    if (!confirm(`Delete ${co.name}?`)) return;
    try {
      await api.delete(`/tutor/providers/${co.id}`);
      setFlash({ type: 'success', msg: 'Company deleted.' });
      load();
    } catch (err) {
      setFlash({ type: 'danger', msg: err.response?.data?.error || 'Could not delete company' });
    }
  };

  const totalCo = companies.length;
  const withActive = companies.filter((c) => c.activePlacements > 0).length;
  const noProvider = companies.filter((c) => !c.providerUserName).length;

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Total Companies</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--navy)' }}>{totalCo}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>With Active Placements</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--success)' }}>{withActive}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>No Provider Account</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--warning)' }}>{noProvider}</h3>
        </div>
      </div>

      <form onSubmit={submitSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="🔍 Search company, city or email…" style={{ minWidth: 280 }} />
        <select value={sector} onChange={changeSector}>
          <option value="">All Sectors</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
        {(search || sector) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setSearchParams({}); }}>✕ Clear</button>}
      </form>

      <div className="panel">
        <div className="panel-header"><h3>{companies.length} Compan{companies.length !== 1 ? 'ies' : 'y'}</h3></div>

        {companies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
            <p style={{ color: 'var(--muted)' }}>No companies found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Company</th><th>Location</th><th>Sector</th><th>Provider Account</th><th>Placements</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {companies.map((co) => (
                  <tr key={co.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{co.name}</div>
                      {co.contactEmail && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{co.contactEmail}</div>}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{co.city || '—'}</td>
                    <td>{co.sector ? <span className="type-chip">{co.sector}</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>—</span>}</td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {co.providerUserName ? (
                        <>
                          <div style={{ fontWeight: 500, color: 'var(--navy)' }}>{co.providerUserName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{co.providerUserEmail}</div>
                        </>
                      ) : <span className="badge badge-pending" style={{ fontSize: '0.75rem' }}>No account</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: co.activePlacements > 0 ? 'var(--success)' : 'var(--muted)' }}>{co.activePlacements}</span>
                      <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}> / {co.totalPlacements}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(co)}>✏️ Edit</button>
                        {co.totalPlacements === 0 && <button className="btn btn-danger btn-sm" onClick={() => remove(co)}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '1.5rem' }}>Edit Company</h3>
            <form onSubmit={saveEdit}>
              <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Company Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" required value={editing.name} onChange={(e) => setEditing((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>City / Town</label>
                  <input type="text" placeholder="e.g., Derby" value={editing.city} onChange={(e) => setEditing((f) => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="form-group full-col">
                  <label>Address</label>
                  <input type="text" value={editing.address} onChange={(e) => setEditing((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Sector</label>
                  <select value={editing.sector} onChange={(e) => setEditing((f) => ({ ...f, sector: e.target.value }))}>
                    <option value="">Select sector</option>
                    {ALL_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input type="url" placeholder="https://…" value={editing.website} onChange={(e) => setEditing((f) => ({ ...f, website: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Company Phone</label>
                  <input type="tel" value={editing.phone} onChange={(e) => setEditing((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input type="text" value={editing.contactName} onChange={(e) => setEditing((f) => ({ ...f, contactName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input type="email" value={editing.contactEmail} onChange={(e) => setEditing((f) => ({ ...f, contactEmail: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input type="tel" value={editing.contactPhone} onChange={(e) => setEditing((f) => ({ ...f, contactPhone: e.target.value }))} />
                </div>
                <div className="form-group full-col">
                  <label>Description / Notes</label>
                  <textarea rows={3} value={editing.description} onChange={(e) => setEditing((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
