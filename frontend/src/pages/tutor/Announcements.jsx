import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function TutorAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audienceRole, setAudienceRole] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/tutor/announcements').then(({ data }) => setAnnouncements(data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/tutor/announcements', { title, content, audienceRole: audienceRole || undefined, isPinned, expiresAt: expiresAt || undefined });
      setTitle(''); setContent(''); setAudienceRole(''); setIsPinned(false); setExpiresAt('');
      load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="section-title">Post Announcement</h3>
        <form onSubmit={submit}>
          <div className="field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="field"><label>Content</label><textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} required /></div>
          <div className="field">
            <label>Audience</label>
            <select value={audienceRole} onChange={(e) => setAudienceRole(e.target.value)}>
              <option value="">Everyone</option>
              <option value="STUDENT">Students only</option>
              <option value="TUTOR">Tutors only</option>
              <option value="PROVIDER">Providers only</option>
            </select>
          </div>
          <div className="field">
            <label>Expires on (optional)</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="field">
            <label><input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} /> Pin to top</label>
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Posting...' : 'Post announcement'}</button>
        </form>
      </div>
      <div className="card">
        <h3 className="section-title">All Announcements</h3>
        {announcements.length === 0 ? <div className="empty-state">No announcements yet</div> : announcements.map((a) => (
          <div key={a.id} className="list-item" style={{ display: 'block' }}>
            <strong>{a.isPinned && '📌 '}{a.title}</strong>
            <p style={{ fontSize: 14, marginTop: 4 }}>{a.content}</p>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {a.audienceRole ? `${a.audienceRole.toLowerCase()}s only` : 'Everyone'} · {new Date(a.createdAt).toLocaleDateString('en-GB')}
              {a.expiresAt && ` · Expires ${new Date(a.expiresAt).toLocaleDateString('en-GB')}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
