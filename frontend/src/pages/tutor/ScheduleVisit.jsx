import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function ScheduleVisit() {
  const [placements, setPlacements] = useState([]);
  const [placementId, setPlacementId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [visitType, setVisitType] = useState('in_person');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tutor/placements').then(({ data }) => setPlacements(data.filter((p) => ['ACTIVE', 'APPROVED'].includes(p.status))));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/tutor/visits', { placementId, scheduledAt, visitType });
      navigate('/tutor/visits');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not schedule visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 className="section-title">Schedule Visit</h3>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Placement</label>
          <select value={placementId} onChange={(e) => setPlacementId(e.target.value)} required>
            <option value="">Select a placement</option>
            {placements.map((p) => <option key={p.id} value={p.id}>{p.student.fullName} — {p.company.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Date & time</label>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </div>
        <div className="field">
          <label>Visit type</label>
          <select value={visitType} onChange={(e) => setVisitType(e.target.value)}>
            <option value="in_person">In person</option>
            <option value="virtual">Virtual</option>
            <option value="phone">Phone</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Scheduling...' : 'Schedule visit'}</button>
      </form>
    </div>
  );
}
