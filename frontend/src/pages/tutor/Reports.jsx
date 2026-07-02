import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function TutorReports() {
  const [data, setData] = useState({ reflections: [], reports: [] });
  const [tab, setTab] = useState('reflections');
  const [feedbackById, setFeedbackById] = useState({});

  const load = () => api.get('/tutor/reports').then(({ data }) => setData(data));
  useEffect(() => { load(); }, []);

  const giveReflectionFeedback = async (id) => {
    await api.put(`/tutor/reflections/${id}/feedback`, { tutorFeedback: feedbackById[id] || '' });
    load();
  };
  const giveReportFeedback = async (id) => {
    await api.put(`/tutor/reports/${id}/feedback`, { tutorFeedback: feedbackById[id] || '' });
    load();
  };

  return (
    <div>
      <div className="tabs">
        <div className={`tab${tab === 'reflections' ? ' active' : ''}`} onClick={() => setTab('reflections')} style={{ cursor: 'pointer' }}>Reflections</div>
        <div className={`tab${tab === 'reports' ? ' active' : ''}`} onClick={() => setTab('reports')} style={{ cursor: 'pointer' }}>Reports</div>
      </div>

      <div className="card">
        {tab === 'reflections' && (
          data.reflections.length === 0 ? <div className="empty-state">No reflections submitted yet</div> : data.reflections.map((r) => (
            <div key={r.id} className="list-item" style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>{r.student.fullName}</strong> — {r.title} {r.weekNumber && `(Week ${r.weekNumber})`}</div>
                <span className="badge badge-muted">{r.status}</span>
              </div>
              <p style={{ marginTop: 6, fontSize: 14 }}>{r.content}</p>
              {r.tutorFeedback ? (
                <div style={{ fontSize: 13, marginTop: 6, background: 'var(--cream)', padding: 8, borderRadius: 8 }}>Your feedback: {r.tutorFeedback}</div>
              ) : (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <input placeholder="Feedback" value={feedbackById[r.id] || ''} onChange={(e) => setFeedbackById((f) => ({ ...f, [r.id]: e.target.value }))} style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => giveReflectionFeedback(r.id)}>Send</button>
                </div>
              )}
            </div>
          ))
        )}

        {tab === 'reports' && (
          data.reports.length === 0 ? <div className="empty-state">No reports submitted yet</div> : data.reports.map((r) => (
            <div key={r.id} className="list-item" style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>{r.student.fullName}</strong> — {r.title}</div>
                <span className="badge badge-muted">{r.status}</span>
              </div>
              {r.filePath && <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${r.filePath}`} target="_blank" rel="noreferrer">View file</a>}
              {r.tutorFeedback ? (
                <div style={{ fontSize: 13, marginTop: 6, background: 'var(--cream)', padding: 8, borderRadius: 8 }}>Your feedback: {r.tutorFeedback}</div>
              ) : (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <input placeholder="Feedback" value={feedbackById[r.id] || ''} onChange={(e) => setFeedbackById((f) => ({ ...f, [r.id]: e.target.value }))} style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => giveReportFeedback(r.id)}>Send</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
