import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

const YEARS = ['2024/25', '2025/26', '2026/27', '2027/28'];
const PROGRAMMES = [
  'BSc Computer Science', 'BSc Software Engineering', 'BSc Data Science',
  'BEng Engineering', 'MEng Engineering', 'MSc Computer Science', 'Other',
];

const EMPTY_FORM = { id: null, title: '', body: '', audienceType: 'all', targetValue: YEARS[0], isPinned: false, expiresAt: '' };

const fmtDateTime = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function TutorAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(null);
  const composeRef = useRef(null);

  const load = () => api.get('/tutor/announcements').then(({ data }) => {
    setAnnouncements(data.announcements);
    setTotalStudents(data.totalStudents);
  });
  useEffect(() => { load(); }, []);

  const isEditing = form.id !== null;

  const scrollToCompose = () => composeRef.current?.scrollIntoView({ behavior: 'smooth' });

  const openEdit = (a) => {
    setForm({
      id: a.id,
      title: a.title,
      body: a.content,
      audienceType: a.audienceType,
      targetValue: a.targetValue || (a.audienceType === 'programme' ? PROGRAMMES[0] : YEARS[0]),
      isPinned: a.isPinned,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : '',
    });
    scrollToCompose();
  };

  const resetForm = () => setForm(EMPTY_FORM);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFlash(null);
    const payload = {
      title: form.title,
      content: form.body,
      audienceRole: 'STUDENT',
      audienceType: form.audienceType,
      targetValue: form.audienceType !== 'all' ? form.targetValue : undefined,
      isPinned: form.isPinned,
      expiresAt: form.expiresAt || undefined,
    };
    try {
      if (isEditing) {
        await api.put(`/tutor/announcements/${form.id}`, payload);
        setFlash({ type: 'success', msg: 'Announcement updated.' });
      } else {
        await api.post('/tutor/announcements', payload);
        setFlash({ type: 'success', msg: 'Announcement posted successfully.' });
      }
      resetForm();
      load();
    } catch (err) {
      setFlash({ type: 'danger', msg: err.response?.data?.error || 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (a) => {
    await api.post(`/tutor/announcements/${a.id}/toggle-pin`);
    load();
  };

  const remove = async (a) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/tutor/announcements/${a.id}`);
    if (form.id === a.id) resetForm();
    load();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>{flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Posted Announcements</h3>
              <p>{announcements.length} total · {totalStudents} active students</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={scrollToCompose}>+ New Announcement</button>
          </div>

          {announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📢</div>
              <p style={{ color: 'var(--muted)' }}>No announcements posted yet.</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Use the form on the right to broadcast a message to your students.</p>
            </div>
          ) : (
            announcements.map((a) => {
              const isExpired = a.expiresAt && new Date(a.expiresAt) < new Date();
              const audienceLabel = a.audienceType === 'year' ? `Year: ${a.targetValue || '?'}` : a.audienceType === 'programme' ? `Programme: ${a.targetValue || '?'}` : 'All Students';
              return (
                <div
                  key={a.id}
                  style={{
                    padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)',
                    ...(a.isPinned ? { background: 'linear-gradient(to right, rgba(232,160,32,0.06), transparent)', borderLeft: '3px solid #e8a020' } : {}),
                    ...(isExpired ? { opacity: 0.55 } : {}),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        {a.isPinned && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: 4 }}>📌 PINNED</span>}
                        {isExpired && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>EXPIRED</span>}
                        <span style={{ fontSize: '0.75rem', background: 'var(--cream)', color: 'var(--muted)', padding: '0.15rem 0.5rem', borderRadius: 4, border: '1px solid var(--border)' }}>{audienceLabel}</span>
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.35rem' }}>{a.title}</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6, maxHeight: '3.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {a.content}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                        <span>📅 {fmtDateTime(a.createdAt)}</span>
                        <span>👁 {a.readCount} read</span>
                        {a.expiresAt && <span>⏳ Expires {fmtDate(a.expiresAt)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>✏️ Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => togglePin(a)}>{a.isPinned ? '📌 Unpin' : '📌 Pin'}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(a)}>🗑 Delete</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div ref={composeRef} style={{ position: 'sticky', top: '1.5rem' }}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>{isEditing ? 'Edit Announcement' : 'New Announcement'}</h3>
                <p>{isEditing ? 'Update and save changes' : 'Broadcast to your students'}</p>
              </div>
            </div>
            <div className="panel-body">
              <form onSubmit={submit}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g., Important: Report Submission Reminder" required />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Message <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea rows={7} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Write your announcement here…" required />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Audience</label>
                  <select
                    value={form.audienceType}
                    onChange={(e) => {
                      const audienceType = e.target.value;
                      setForm((f) => ({ ...f, audienceType, targetValue: audienceType === 'programme' ? PROGRAMMES[0] : YEARS[0] }));
                    }}
                  >
                    <option value="all">All Students</option>
                    <option value="year">Specific Academic Year</option>
                    <option value="programme">Specific Programme</option>
                  </select>
                </div>

                {form.audienceType !== 'all' && (
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label>{form.audienceType === 'year' ? 'Academic Year' : 'Programme'}</label>
                    <select value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}>
                      {(form.audienceType === 'year' ? YEARS : PROGRAMMES).map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))} style={{ width: 16, height: 16 }} />
                    📌 Pin this announcement
                  </label>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Expires On (optional)</label>
                  <input type="date" min={todayISO()} value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
                  <small style={{ color: 'var(--muted)' }}>Hidden from students after this date.</small>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  {isEditing && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : isEditing ? 'Save Changes →' : 'Post Announcement →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
