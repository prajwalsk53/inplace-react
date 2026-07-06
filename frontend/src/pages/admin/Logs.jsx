import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const fmtDateTime = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export default function AdminLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [userInput, setUserInput] = useState(searchParams.get('user') || '');
  const [actionInput, setActionInput] = useState(searchParams.get('action') || '');
  const [dateInput, setDateInput] = useState(searchParams.get('date') || '');

  const user = searchParams.get('user') || '';
  const action = searchParams.get('action') || '';
  const date = searchParams.get('date') || '';

  useEffect(() => {
    api.get('/admin/logs', { params: { user: user || undefined, action: action || undefined, date: date || undefined } }).then(({ data }) => setLogs(data));
  }, [user, action, date]);

  const submit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (userInput) next.set('user', userInput);
    if (actionInput) next.set('action', actionInput);
    if (dateInput) next.set('date', dateInput);
    setSearchParams(next);
  };
  const clear = () => {
    setUserInput(''); setActionInput(''); setDateInput('');
    setSearchParams({});
  };

  return (
    <div>
      <form onSubmit={submit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search user..." value={userInput} onChange={(e) => setUserInput(e.target.value)} style={{ minWidth: 200 }} />
        <input type="text" placeholder="Filter by action..." value={actionInput} onChange={(e) => setActionInput(e.target.value)} style={{ minWidth: 200 }} />
        <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
        <button type="submit" className="btn btn-primary btn-sm">Filter</button>
        {(user || action || date) && <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>✕ Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--muted)' }}>{logs.length} entries</span>
      </form>

      <div className="panel">
        <div className="panel-header"><h3>Audit Log</h3></div>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>No log entries found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Table</th><th>Record ID</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(log.createdAt)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{log.user?.fullName || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{log.user?.email || ''}</div>
                    </td>
                    <td><span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>{log.user?.role ? log.user.role.charAt(0) + log.user.role.slice(1).toLowerCase() : '—'}</span></td>
                    <td style={{ fontSize: '0.8125rem' }}>{(log.action || '').replace(/_/g, ' ')}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{log.tableAffected || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{log.recordId ?? '—'}</td>
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
