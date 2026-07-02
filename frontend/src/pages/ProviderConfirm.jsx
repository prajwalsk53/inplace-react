import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

export default function ProviderConfirm() {
  const { token } = useParams();
  const [placement, setPlacement] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/public/provider-confirm/${token}`)
      .then(({ data }) => setPlacement(data.placement))
      .catch((err) => setError(err.response?.data?.error || 'This link is invalid or has expired'))
      .finally(() => setLoading(false));
  }, [token]);

  const respond = async (decision) => {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/public/provider-confirm/${token}`, { decision });
      setResult(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="brand">InPlace</div>
        <h1>Placement Confirmation</h1>

        {loading && <p className="subtitle">Loading...</p>}
        {error && <div className="error-banner">{error}</div>}
        {result && <div className="success-banner">{result}</div>}

        {placement && !result && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <p><strong>Student:</strong> {placement.student.fullName} ({placement.student.email})</p>
              <p><strong>Role:</strong> {placement.roleTitle}</p>
              <p><strong>Company:</strong> {placement.company.name}</p>
              {placement.jobDescription && <p><strong>Description:</strong> {placement.jobDescription}</p>}
              {placement.startDate && <p><strong>Start:</strong> {new Date(placement.startDate).toLocaleDateString('en-GB')}</p>}
              {placement.endDate && <p><strong>End:</strong> {new Date(placement.endDate).toLocaleDateString('en-GB')}</p>}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={() => respond('approve')}>
                Confirm Placement
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} disabled={submitting} onClick={() => respond('reject')}>
                Reject Placement
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
