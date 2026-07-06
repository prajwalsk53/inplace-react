import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const fmtWeekday = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtMonthYear = (d) => new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

const STATUS_INFO = {
  completed: ['approved', 'Completed'],
  confirmed: ['approved', 'Confirmed'],
  cancelled: ['rejected', 'Cancelled'],
  rescheduled: ['review', 'Reschedule Pending'],
};

export default function ProviderViewVisit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);

  useEffect(() => {
    api.get(`/provider/visits/${id}`).then(({ data }) => setVisit(data)).catch(() => navigate('/provider/visits'));
  }, [id]);

  if (!visit) return <div className="loading-screen">Loading...</div>;
  const [badgeClass, badgeLabel] = STATUS_INFO[visit.status] || ['pending', visit.status.charAt(0).toUpperCase() + visit.status.slice(1)];
  const typeLabel = visit.visitType === 'virtual' ? '🖥️ Virtual' : '🏢 In-Person';

  return (
    <div>
      <a onClick={() => navigate('/provider/visits')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.5rem', cursor: 'pointer' }}>
        ← Back to Visits
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span className={`badge badge-${badgeClass}`}>{badgeLabel}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{typeLabel}</span>
                </div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>Placement Visit</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{visit.placement.company.name}{visit.placement.company.city ? ` · ${visit.placement.company.city}` : ''}</p>
              </div>
              <a href={`mailto:${visit.tutor.email}`} className="btn btn-ghost btn-sm">📧 Contact Tutor</a>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header"><h3>📅 Date & Time</h3></div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
                <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Date</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>{fmtWeekday(visit.scheduledAt)}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{fmtDate(visit.scheduledAt)}</p>
                </div>
                <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Time</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>{fmtTime(visit.scheduledAt)}</p>
                  {visit.durationHours && <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{visit.durationHours} hour{visit.durationHours > 1 ? 's' : ''}</p>}
                </div>
                <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Format</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>{typeLabel}</p>
                </div>
              </div>

              {visit.location && (
                <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span>📍</span><span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{visit.location}</span>
                </div>
              )}
              {visit.meetingLink && (
                <div style={{ marginTop: '0.75rem', padding: '0.875rem 1rem', background: '#e0f2fe', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span>🔗</span><a href={visit.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem', color: '#0369a1', wordBreak: 'break-all' }}>{visit.meetingLink}</a>
                </div>
              )}
            </div>
          </div>

          {visit.notes && (
            <div className="panel" style={{ marginBottom: '1.5rem' }}>
              <div className="panel-header"><h3>📋 Visit Notes / Purpose</h3></div>
              <div className="panel-body">
                <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{visit.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-header"><h3>👨‍🎓 Student</h3></div>
            <div className="panel-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: '1rem' }}>{visit.placement.student.avatarInitials || '??'}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{visit.placement.student.fullName}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{visit.placement.student.email}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                <div style={{ marginBottom: '0.35rem' }}>💼 <strong>Role:</strong> {visit.placement.roleTitle || '—'}</div>
                {visit.placement.startDate && (
                  <div>📅 <strong>Period:</strong> {fmtMonthYear(visit.placement.startDate)} → {fmtMonthYear(visit.placement.endDate)}</div>
                )}
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-header"><h3>👨‍🏫 Placement Tutor</h3></div>
            <div className="panel-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: '1rem', background: 'var(--navy)' }}>{visit.tutor.avatarInitials || '??'}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{visit.tutor.fullName}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{visit.tutor.email}</div>
                </div>
              </div>
              <a href={`mailto:${visit.tutor.email}`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>📧 Send Email</a>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 0, padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Scheduled on</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)' }}>{fmtDate(visit.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
