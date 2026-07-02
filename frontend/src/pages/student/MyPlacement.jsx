import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function MyPlacement() {
  const [placement, setPlacement] = useState(null);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    api.get('/student/placement').then(({ data }) => setPlacement(data)).catch(() => setError('No placement found yet'));
    api.get('/student/documents').then(({ data }) => setDocuments(data));
  };

  useEffect(() => { load(); }, []);

  const uploadDocument = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'other');
    try {
      await api.post('/student/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (error) return <div className="empty-state">{error}</div>;
  if (!placement) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="section-title">Placement Details</h3>
        <p><strong>Role:</strong> {placement.roleTitle}</p>
        <p><strong>Company:</strong> {placement.company.name}</p>
        <p><strong>Status:</strong> <span className="badge badge-info">{placement.status.replace('_', ' ')}</span></p>
        {placement.jobDescription && <p style={{ marginTop: 10 }}>{placement.jobDescription}</p>}
        {placement.startDate && <p style={{ marginTop: 10 }}><strong>Start:</strong> {new Date(placement.startDate).toLocaleDateString('en-GB')}</p>}
        {placement.endDate && <p><strong>End:</strong> {new Date(placement.endDate).toLocaleDateString('en-GB')}</p>}
        {placement.workingPattern && <p><strong>Working pattern:</strong> {placement.workingPattern}</p>}
        {placement.salary && <p><strong>Salary:</strong> £{Number(placement.salary).toLocaleString()}</p>}
      </div>

      <div className="card">
        <h3 className="section-title">Supervisor & Tutor</h3>
        {placement.supervisorName && (
          <>
            <p><strong>Supervisor:</strong> {placement.supervisorName}</p>
            <p>{placement.supervisorEmail}</p>
            <p>{placement.supervisorPhone}</p>
          </>
        )}
        {placement.tutor && (
          <p style={{ marginTop: 16 }}><strong>Tutor:</strong> {placement.tutor.fullName} ({placement.tutor.email})</p>
        )}
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3 className="section-title">Documents</h3>
        <input type="file" onChange={uploadDocument} disabled={uploading} style={{ marginBottom: 16 }} />
        {documents.length === 0 ? (
          <div className="empty-state">No documents uploaded yet</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th>Category</th><th>Uploaded</th><th></th></tr></thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>{d.fileName}</td>
                    <td>{d.category}</td>
                    <td>{new Date(d.createdAt).toLocaleDateString('en-GB')}</td>
                    <td><a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${d.filePath}`} target="_blank" rel="noreferrer">View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
