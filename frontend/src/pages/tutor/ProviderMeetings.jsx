import { useEffect, useState } from 'react';
import api from '../../api/axios';

const EMPTY_FORM = {
  companyId: '', contactName: '', contactEmail: '', meetingDate: '', meetingTime: '10:00',
  duration: '1', meetingType: 'physical', location: '', meetingLink: '', agenda: '',
};

export default function ProviderMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/tutor/provider-meetings').then(({ data }) => setMeetings(data));
  useEffect(() => {
    load();
    api.get('/tutor/providers').then(({ data }) => setCompanies([...data].sort((a, b) => a.name.localeCompare(b.name))));
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const selectCompany = (e) => {
    const companyId = e.target.value;
    const co = companies.find((c) => String(c.id) === String(companyId));
    setForm((f) => ({
      ...f, companyId,
      contactName: co?.contactName || '',
      contactEmail: co?.contactEmail || '',
      location: f.meetingType === 'physical' ? (co?.city || f.location) : f.location,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { data } = await api.post('/tutor/provider-meetings', form);
      setSuccess(data.message);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    if (!confirm(status === 'completed' ? 'Mark this meeting as completed?' : 'Cancel this meeting?')) return;
    await api.post(`/tutor/provider-meetings/${id}/status`, { status });
    setSuccess(`Meeting marked as ${status}.`);
    load();
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = meetings.filter((m) => m.status === 'scheduled' && m.scheduledAt.slice(0, 10) >= todayStr).length;
  const completed = meetings.filter((m) => m.status === 'completed').length;

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div>
      {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>✅ {success}</div>}
      {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>⚠️ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div><h3>📅 Schedule Provider Meeting</h3><p>A calendar invite will be sent to the provider's contact email</p></div>
          </div>
          <div className="panel-body">
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="form-group full-col">
                  <label>Provider / Company <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select value={form.companyId} onChange={selectCompany} required>
                    <option value="">-- Select a company --</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ''}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact Person</label>
                  <input type="text" placeholder="e.g., Jane Smith" value={form.contactName} onChange={update('contactName')} />
                </div>
                <div className="form-group">
                  <label>Contact Email <small style={{ color: 'var(--muted)' }}>(invite sent here)</small></label>
                  <input type="email" placeholder="contact@company.com" value={form.contactEmail} onChange={update('contactEmail')} />
                </div>

                <div className="form-group">
                  <label>Meeting Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="date" required min={todayStr} value={form.meetingDate} onChange={update('meetingDate')} />
                </div>
                <div className="form-group">
                  <label>Meeting Time <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="time" required value={form.meetingTime} onChange={update('meetingTime')} />
                </div>

                <div className="form-group">
                  <label>Duration</label>
                  <select value={form.duration} onChange={update('duration')}>
                    <option value="0.5">30 minutes</option>
                    <option value="1">1 hour</option>
                    <option value="1.5">1.5 hours</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Meeting Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select value={form.meetingType} onChange={update('meetingType')} required>
                    <option value="physical">📍 In-Person</option>
                    <option value="virtual">🖥 Virtual (Teams / Zoom)</option>
                  </select>
                </div>

                {form.meetingType === 'physical' ? (
                  <div className="form-group full-col">
                    <label>Location / Address</label>
                    <input type="text" placeholder="e.g., Company HQ, 10 Main Street, London" value={form.location} onChange={update('location')} />
                  </div>
                ) : (
                  <div className="form-group full-col">
                    <label>Meeting Link <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="url" required placeholder="https://teams.microsoft.com/..." value={form.meetingLink} onChange={update('meetingLink')} />
                    <small style={{ color: 'var(--muted)' }}>Included in the calendar invite</small>
                  </div>
                )}

                <div className="form-group full-col">
                  <label>Agenda / Purpose</label>
                  <textarea rows={4} placeholder="What will be discussed? e.g., student progress review, placement extension, site visit coordination..." value={form.agenda} onChange={update('agenda')} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>📧 Calendar invite (.ics) sent to provider &amp; your email</p>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Scheduling...' : '📅 Schedule & Send Invite'}</button>
              </div>
            </form>
          </div>
        </div>

        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <div className="panel">
            <div className="panel-header"><h3>About Provider Meetings</h3></div>
            <div className="panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>📧 Calendar Invite</p>
                  <p style={{ color: 'var(--muted)' }}>A .ics file is emailed to the provider's contact. They can Accept or Decline directly from their email client (Outlook, Gmail, etc.)</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>🖥 Virtual Meetings</p>
                  <p style={{ color: 'var(--muted)' }}>For virtual meetings, paste a Teams or Zoom link — it will appear in the calendar invite and email body.</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>📋 No Contact Email?</p>
                  <p style={{ color: 'var(--muted)' }}>Update the provider's contact email in <a href="/tutor/providers" style={{ color: 'var(--navy)', fontWeight: 600 }}>Provider Directory</a> first, then schedule the meeting.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '1.25rem' }}>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--navy)', fontFamily: "'Playfair Display', serif" }}>{upcoming}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Upcoming</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)', fontFamily: "'Playfair Display', serif" }}>{completed}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {meetings.length > 0 && (
        <div className="panel" style={{ marginTop: '1.5rem' }}>
          <div className="panel-header"><h3>All Provider Meetings</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Company</th><th>Contact</th><th>Date & Time</th><th>Type</th><th>Agenda</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {meetings.map((m) => {
                  const isPast = m.scheduledAt.slice(0, 10) < todayStr;
                  const badgeClass = m.status === 'completed' ? 'approved' : m.status === 'cancelled' ? 'rejected' : (isPast ? 'open' : 'pending');
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{m.company.name}</div>
                        {m.company.city && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{m.company.city}</div>}
                      </td>
                      <td>
                        {m.contactName && <div style={{ fontSize: '0.875rem' }}>{m.contactName}</div>}
                        {m.contactEmail && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{m.contactEmail}</div>}
                        {!m.contactName && !m.contactEmail && <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 500 }}>{fmtDate(m.scheduledAt)}</div>
                        <div style={{ color: 'var(--muted)' }}>{fmtTime(m.scheduledAt)} · {m.durationHours}h</div>
                      </td>
                      <td>
                        {m.meetingType === 'virtual' ? (
                          <>
                            <span style={{ fontSize: '0.8rem' }}>🖥 Virtual</span>
                            {m.meetingLink && <><br /><a href={m.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--navy)' }}>Join Link</a></>}
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.8rem' }}>📍 In-Person</span>
                            {m.location && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{m.location}</div>}
                          </>
                        )}
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        {m.agenda ? (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.agenda.slice(0, 80)}{m.agenda.length > 80 ? '…' : ''}
                          </div>
                        ) : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}
                      </td>
                      <td><span className={`badge badge-${badgeClass}`}>{m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span></td>
                      <td>
                        {m.status === 'scheduled' ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-success btn-sm" onClick={() => updateStatus(m.id, 'completed')}>✓ Done</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(m.id, 'cancelled')}>Cancel</button>
                          </div>
                        ) : <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
