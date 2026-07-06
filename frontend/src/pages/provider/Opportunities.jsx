import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtMonthYear = (d) => new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const EMPTY = { id: 0, title: '', description: '', requirements: '', salaryRange: '', startDateEst: '', deadline: '', durationMonths: 12, positions: 1, skillsRequired: '' };

export default function ProviderOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [company, setCompany] = useState(null);
  const [flash, setFlash] = useState(null);
  const [modal, setModal] = useState(null); // { form }

  const load = () => api.get('/provider/opportunities').then(({ data }) => setOpportunities(data));
  useEffect(() => { load(); api.get('/provider/settings').then(({ data }) => setCompany(data)); }, []);

  const activeCount = useMemo(() => opportunities.filter((o) => o.isActive).length, [opportunities]);
  const inactiveCount = opportunities.length - activeCount;
  const expiredCount = useMemo(() => opportunities.filter((o) => o.deadline && new Date(o.deadline) < new Date()).length, [opportunities]);

  const openCreate = () => setModal({ form: { ...EMPTY } });
  const openEdit = (o) => setModal({
    form: {
      id: o.id, title: o.title, description: o.description || '', requirements: o.requirements || '',
      salaryRange: o.salaryRange || '', startDateEst: toDateInput(o.startDateEst), deadline: toDateInput(o.deadline),
      durationMonths: o.durationMonths || 12, positions: o.positions || 1, skillsRequired: o.skillsRequired || '',
    },
  });

  const submit = async (e) => {
    e.preventDefault();
    const { id, ...body } = modal.form;
    if (id) {
      await api.put(`/provider/opportunities/${id}`, body);
      setFlash({ type: 'success', msg: 'Opportunity updated.' });
    } else {
      await api.post('/provider/opportunities', body);
      setFlash({ type: 'success', msg: 'Opportunity posted successfully. All students have been notified.' });
    }
    setModal(null);
    load();
  };

  const toggle = async (o) => {
    await api.put(`/provider/opportunities/${o.id}/toggle`);
    setFlash({ type: 'success', msg: 'Status updated.' });
    load();
  };

  const remove = async (o) => {
    if (!window.confirm('Delete this opportunity?')) return;
    await api.delete(`/provider/opportunities/${o.id}`);
    setFlash({ type: 'success', msg: 'Opportunity removed.' });
    load();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Active Postings</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--success)' }}>{activeCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Inactive / Filled</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--muted)' }}>{inactiveCount}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Past Deadline</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--warning)' }}>{expiredCount}</h3>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div><h3>Placement Opportunities</h3><p>{company?.name} · {company?.sector || 'All sectors'}</p></div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Post Opportunity</button>
        </div>

        {opportunities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💼</div>
            <h3 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>No opportunities posted yet</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Post placement opportunities to let students know about available roles.</p>
            <button className="btn btn-primary" onClick={openCreate}>Post First Opportunity →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {opportunities.map((o) => {
              const isExpired = o.deadline && new Date(o.deadline) < new Date();
              const borderColor = !o.isActive ? '#d1d5db' : (isExpired ? '#fbbf24' : '#059669');
              return (
                <div key={o.id} style={{ borderLeft: `4px solid ${borderColor}`, padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <h4 style={{ fontSize: '1.0625rem', color: 'var(--navy)', fontWeight: 700 }}>{o.title}</h4>
                        {!o.isActive ? <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280' }}>Inactive</span>
                          : isExpired ? <span className="badge badge-pending">Deadline Passed</span>
                          : <span className="badge badge-approved">Active</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                        {o.durationMonths && <span>📅 {o.durationMonths} months</span>}
                        {o.positions && <span>👥 {o.positions} position{o.positions > 1 ? 's' : ''}</span>}
                        {o.salaryRange && <span>💷 {o.salaryRange}</span>}
                        {o.startDateEst && <span>🗓 Est. start: {fmtMonthYear(o.startDateEst)}</span>}
                        {o.deadline && <span>⏰ Apply by {fmtDate(o.deadline)}</span>}
                      </div>
                      {o.description && <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{o.description}</p>}
                      {o.skillsRequired && <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}><strong>Skills:</strong> {o.skillsRequired}</p>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 120 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(o)}>✏️ Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle(o)}>{o.isActive ? '⏸ Deactivate' : '▶ Activate'}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(o)}>🗑 Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>
              {modal.form.id ? 'Edit Opportunity' : 'Post Placement Opportunity'}
            </h3>
            <form onSubmit={submit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Role Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" required value={modal.form.title} onChange={(e) => setModal((m) => ({ form: { ...m.form, title: e.target.value } }))} placeholder="e.g. Software Developer Placement" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label>Number of Positions</label>
                  <input type="number" min={1} max={50} value={modal.form.positions} onChange={(e) => setModal((m) => ({ form: { ...m.form, positions: e.target.value } }))} />
                </div>
                <div className="form-group">
                  <label>Duration (months)</label>
                  <input type="number" min={1} max={24} value={modal.form.durationMonths} onChange={(e) => setModal((m) => ({ form: { ...m.form, durationMonths: e.target.value } }))} />
                </div>
                <div className="form-group">
                  <label>Estimated Start Date</label>
                  <input type="date" value={modal.form.startDateEst} onChange={(e) => setModal((m) => ({ form: { ...m.form, startDateEst: e.target.value } }))} />
                </div>
                <div className="form-group">
                  <label>Application Deadline</label>
                  <input type="date" value={modal.form.deadline} onChange={(e) => setModal((m) => ({ form: { ...m.form, deadline: e.target.value } }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Salary / Remuneration</label>
                <input type="text" value={modal.form.salaryRange} onChange={(e) => setModal((m) => ({ form: { ...m.form, salaryRange: e.target.value } }))} placeholder="e.g. £18,000–£22,000 per year, or Competitive" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Description</label>
                <textarea rows={4} value={modal.form.description} onChange={(e) => setModal((m) => ({ form: { ...m.form, description: e.target.value } }))} placeholder="Describe the role, day-to-day responsibilities, team, and work environment…" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Requirements / Preferred Degree Subjects</label>
                <textarea rows={2} value={modal.form.requirements} onChange={(e) => setModal((m) => ({ form: { ...m.form, requirements: e.target.value } }))} placeholder="e.g. Computer Science, Engineering, any STEM discipline…" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Key Skills Required</label>
                <input type="text" value={modal.form.skillsRequired} onChange={(e) => setModal((m) => ({ form: { ...m.form, skillsRequired: e.target.value } }))} placeholder="e.g. Python, teamwork, problem-solving, Microsoft Office" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{modal.form.id ? 'Save Changes →' : 'Post Opportunity →'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
