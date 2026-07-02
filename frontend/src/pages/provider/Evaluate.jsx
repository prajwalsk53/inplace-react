import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ProviderEvaluate() {
  const [evaluations, setEvaluations] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [form, setForm] = useState({ placementId: '', rating: 5, comments: '' });
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/provider/evaluations').then(({ data }) => setEvaluations(data));
  useEffect(() => {
    load();
    api.get('/provider/placements').then(({ data }) => setPlacements(data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/provider/evaluations', form);
      setForm({ placementId: '', rating: 5, comments: '' });
      load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="section-title">Evaluate a Student</h3>
        <form onSubmit={submit}>
          <div className="field">
            <label>Placement</label>
            <select value={form.placementId} onChange={(e) => setForm((f) => ({ ...f, placementId: e.target.value }))} required>
              <option value="">Select a placement</option>
              {placements.map((p) => <option key={p.id} value={p.id}>{p.student.fullName}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Rating (1-5)</label>
            <input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} required />
          </div>
          <div className="field"><label>Comments</label><textarea rows={4} value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} /></div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit evaluation'}</button>
        </form>
      </div>
      <div className="card">
        <h3 className="section-title">Past Evaluations</h3>
        {evaluations.length === 0 ? <div className="empty-state">No evaluations yet</div> : evaluations.map((e) => (
          <div key={e.id} className="list-item" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{e.placement.student.fullName}</strong>
              <span className="badge badge-info">{'★'.repeat(e.rating)}{'☆'.repeat(5 - e.rating)}</span>
            </div>
            {e.comments && <p style={{ fontSize: 14, marginTop: 4 }}>{e.comments}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
