import { useEffect, useState } from 'react';
import api from '../../api/axios';

const fmtDateTime = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function StudentAnnouncements() {
  const [data, setData] = useState(null);
  const [filterUnread, setFilterUnread] = useState(false);

  const load = (unread) => {
    api.get('/student/announcements', { params: unread ? { filter: 'unread' } : {} }).then(({ data }) => setData(data));
  };

  useEffect(() => { load(filterUnread); }, [filterUnread]);

  if (!data) return <div className="loading-screen">Loading...</div>;

  const { totalCount, unreadCount, announcements } = data;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>
            📢 Announcements
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            {totalCount} announcement{totalCount !== 1 ? 's' : ''}
            {unreadCount > 0 ? <> · <strong style={{ color: 'var(--navy)' }}>{unreadCount} unread</strong></> : ' · All read'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className={`btn btn-sm ${!filterUnread ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterUnread(false)}>
            All ({totalCount})
          </button>
          <button type="button" className={`btn btn-sm ${filterUnread ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterUnread(true)}>
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="panel">
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--navy)', marginBottom: '0.75rem' }}>
              {filterUnread ? 'All caught up!' : 'No announcements yet'}
            </h3>
            <p style={{ color: 'var(--muted)', maxWidth: 380, margin: '0 auto' }}>
              {filterUnread
                ? "You've read all announcements. Check back later for new messages from your tutor."
                : "Your tutor hasn't posted any announcements yet. Check back soon."}
            </p>
            {filterUnread && totalCount > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '1.25rem' }} onClick={() => setFilterUnread(false)}>
                View all announcements →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {announcements.map((ann) => {
            const isNew = new Date(ann.createdAt) > new Date(Date.now() - 3 * 86400000);
            const audienceLabel = ann.audienceRole ? `${ann.audienceRole[0]}${ann.audienceRole.slice(1).toLowerCase()}s Only` : 'All Students';
            return (
              <div key={ann.id} className="panel" style={{ marginBottom: 0, ...(ann.isPinned ? { borderLeft: '4px solid #e8a020' } : {}) }}>
                <div style={{ padding: '1.75rem 2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#0c1b33,#1a2d4d)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 700, color: 'white',
                    }}>
                      {ann.authorInitials || 'T'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--navy)' }}>{ann.authorName}</span>
                        <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>·</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{fmtDateTime(ann.createdAt)}</span>
                        {ann.isPinned && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                            📌 Pinned
                          </span>
                        )}
                        {isNew && !ann.isPinned && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                            NEW
                          </span>
                        )}
                        {!ann.isRead && (
                          <span title="Unread" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--navy)', display: 'inline-block' }} />
                        )}
                      </div>

                      <span style={{ fontSize: '0.75rem', background: 'var(--cream)', color: 'var(--muted)', padding: '0.1rem 0.5rem', borderRadius: 4, border: '1px solid var(--border)' }}>
                        {audienceLabel}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem' }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.125rem', color: 'var(--navy)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                      {ann.title}
                    </h3>
                    <div style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {ann.body}
                    </div>
                  </div>

                  {ann.expiresAt && (
                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      ⏳ This announcement expires {fmtDate(ann.expiresAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
