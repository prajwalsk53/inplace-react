import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const STATUS_COLOR = { APPROVED: '#10b981', ACTIVE: '#10b981', REJECTED: '#ef4444', TERMINATED: '#ef4444' };

export default function AdminViewPlacement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);

  useEffect(() => {
    api.get(`/admin/placements/${id}`).then(({ data }) => setP(data)).catch(() => navigate('/admin/placements'));
  }, [id]);

  if (!p) return <div className="loading-screen">Loading...</div>;
  const badgeColor = STATUS_COLOR[p.status] || '#f59e0b';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/placements')}>← Back to Placements</button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/placements/${id}/edit`)}>Edit Placement</button>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '1.5rem 2rem', marginBottom: '1.5rem', borderLeft: `4px solid ${badgeColor}`, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="avatar" style={{ width: '3rem', height: '3rem', fontSize: '1.1rem' }}>{p.student.avatarInitials || '??'}</div>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--navy)', margin: 0 }}>{p.student.fullName}</h2>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.875rem' }}>
              {p.student.email} &nbsp;·&nbsp; {p.student.academicYear || ''} &nbsp;·&nbsp; {p.student.programmeType || ''}
            </p>
          </div>
          <span style={{ marginLeft: 'auto', background: `${badgeColor}1a`, color: badgeColor, border: `1px solid ${badgeColor}`, borderRadius: 20, padding: '0.3rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>
            {titleCase(p.status)}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="panel">
          <div className="panel-header"><h3>Placement Details</h3></div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Role / Job Title', p.roleTitle || '—'],
                ['Company', p.company.name],
                ['Location', [p.company.city, p.company.sector].filter(Boolean).join(' · ') || '—'],
                ['Start Date', fmtDate(p.startDate)],
                ['End Date', fmtDate(p.endDate)],
                ['Salary', p.salary || '—'],
                ['Working Pattern', p.workingPattern || '—'],
                ['Assigned Tutor', p.tutor?.fullName || 'Unassigned'],
                ['Submitted', fmtDate(p.createdAt)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--navy)', fontSize: '0.875rem', width: '40%', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>{label}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid var(--border)' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Supervisor & Company</h3></div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Supervisor Name', p.supervisorName || '—'],
                ['Supervisor Email', p.supervisorEmail || '—'],
                ['Supervisor Phone', p.supervisorPhone || '—'],
                ['Company Address', p.company.address || '—'],
                ['Company Website', p.company.website || '—'],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--navy)', fontSize: '0.875rem', width: '40%', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>{label}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid var(--border)' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {p.jobDescription && (
          <div className="panel" style={{ gridColumn: '1/-1' }}>
            <div className="panel-header"><h3>Job Description</h3></div>
            <div style={{ padding: '1.25rem', color: 'var(--text)', fontSize: '0.9375rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{p.jobDescription}</div>
          </div>
        )}

        <div className="panel" style={{ gridColumn: '1/-1' }}>
          <div className="panel-header"><h3>Documents ({p.documents.length})</h3></div>
          {p.documents.length === 0 ? (
            <p style={{ padding: '1.25rem', color: 'var(--muted)' }}>No documents uploaded.</p>
          ) : (
            <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {p.documents.map((doc) => (
                <a key={doc.id} href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${doc.filePath}`} target="_blank" rel="noreferrer"
                   style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'var(--navy)', fontSize: '0.875rem', background: 'var(--cream)' }}>
                  📄 {doc.fileName}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
