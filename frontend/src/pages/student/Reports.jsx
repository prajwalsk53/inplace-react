import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function StudentReports() {
  const [tab, setTab] = useState('reflections');
  const [reflections, setReflections] = useState([]);
  const [reports, setReports] = useState([]);

  const [rTitle, setRTitle] = useState('');
  const [rContent, setRContent] = useState('');
  const [rWeek, setRWeek] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [repTitle, setRepTitle] = useState('');
  const [repFile, setRepFile] = useState(null);

  const load = () => {
    api.get('/student/reflections').then(({ data }) => setReflections(data));
    api.get('/student/reports').then(({ data }) => setReports(data));
  };
  useEffect(() => { load(); }, []);

  const submitReflection = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/student/reflections', { title: rTitle, content: rContent, weekNumber: rWeek || undefined });
      setRTitle(''); setRContent(''); setRWeek('');
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', repTitle);
    if (repFile) formData.append('file', repFile);
    try {
      await api.post('/student/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setRepTitle(''); setRepFile(null);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="tabs">
        <div className={`tab${tab === 'reflections' ? ' active' : ''}`} onClick={() => setTab('reflections')} style={{ cursor: 'pointer' }}>Reflections</div>
        <div className={`tab${tab === 'reports' ? ' active' : ''}`} onClick={() => setTab('reports')} style={{ cursor: 'pointer' }}>Reports</div>
      </div>

      {tab === 'reflections' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="section-title">New Reflection</h3>
            <form onSubmit={submitReflection}>
              <div className="field"><label>Title</label><input value={rTitle} onChange={(e) => setRTitle(e.target.value)} required /></div>
              <div className="field"><label>Week number</label><input type="number" value={rWeek} onChange={(e) => setRWeek(e.target.value)} /></div>
              <div className="field"><label>Content</label><textarea rows={6} value={rContent} onChange={(e) => setRContent(e.target.value)} required /></div>
              <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit reflection'}</button>
            </form>
          </div>
          <div className="card">
            <h3 className="section-title">Past Reflections</h3>
            {reflections.length === 0 ? <div className="empty-state">No reflections yet</div> : reflections.map((r) => (
              <div key={r.id} className="list-item" style={{ display: 'block' }}>
                <div style={{ fontWeight: 600 }}>{r.title} {r.weekNumber && `· Week ${r.weekNumber}`}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{r.content}</div>
                {r.tutorFeedback && <div style={{ fontSize: 13, marginTop: 6, background: 'var(--cream)', padding: 8, borderRadius: 8 }}>Tutor feedback: {r.tutorFeedback}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="section-title">Upload Report</h3>
            <form onSubmit={submitReport}>
              <div className="field"><label>Title</label><input value={repTitle} onChange={(e) => setRepTitle(e.target.value)} required /></div>
              <div className="field"><label>File</label><input type="file" onChange={(e) => setRepFile(e.target.files[0])} /></div>
              <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Uploading...' : 'Upload report'}</button>
            </form>
          </div>
          <div className="card">
            <h3 className="section-title">Past Reports</h3>
            {reports.length === 0 ? <div className="empty-state">No reports yet</div> : reports.map((r) => (
              <div key={r.id} className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(r.submittedAt).toLocaleDateString('en-GB')}</div>
                  {r.tutorFeedback && <div style={{ fontSize: 13, marginTop: 6 }}>Feedback: {r.tutorFeedback}</div>}
                </div>
                <span className="badge badge-info">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
