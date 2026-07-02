import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);

  const load = () => api.get('/student/announcements').then(({ data }) => setAnnouncements(data));
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.post(`/student/announcements/${id}/read`);
    load();
  };

  return (
    <div className="card">
      <h3 className="section-title">Announcements</h3>
      {announcements.length === 0 ? <div className="empty-state">No announcements yet</div> : announcements.map((a) => (
        <div key={a.id} className="list-item" style={{ display: 'block', opacity: a.isRead ? 0.7 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{a.title}</strong>
            {!a.isRead && <button className="btn btn-outline btn-sm" onClick={() => markRead(a.id)}>Mark as read</button>}
          </div>
          <p style={{ marginTop: 6, fontSize: 14 }}>{a.content}</p>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{new Date(a.createdAt).toLocaleDateString('en-GB')}</div>
        </div>
      ))}
    </div>
  );
}
