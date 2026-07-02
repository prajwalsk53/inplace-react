import { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_BADGE = { PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-danger' };

export default function SubmitRequest() {
  const [requestType, setRequestType] = useState('end_date');
  const [details, setDetails] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const load = () => api.get('/student/change-requests').then(({ data }) => setRequests(data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/student/change-requests', { requestType, details });
      setDetails('');
      setMessage('Request submitted to your tutor.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="section-title">New Change Request</h3>
        {message && <div className="success-banner">{message}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Request type</label>
            <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
              <option value="end_date">Change end date</option>
              <option value="supervisor">Change supervisor details</option>
              <option value="working_pattern">Change working pattern</option>
              <option value="terminate">Request termination</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Details</label>
            <textarea rows={5} value={details} onChange={(e) => setDetails(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit request'}</button>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">Your Requests</h3>
        {requests.length === 0 ? <div className="empty-state">No requests submitted yet</div> : requests.map((r) => (
          <div className="list-item" key={r.id}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.requestType.replace('_', ' ')}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{r.details}</div>
              {r.reviewNotes && <div style={{ fontSize: 13, marginTop: 4 }}>Tutor note: {r.reviewNotes}</div>}
            </div>
            <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
