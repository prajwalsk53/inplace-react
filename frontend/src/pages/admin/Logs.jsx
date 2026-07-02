import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/admin/logs').then(({ data }) => setLogs(data));
  }, []);

  return (
    <div className="card">
      <h3 className="section-title">Audit Logs</h3>
      {logs.length === 0 ? <div className="empty-state">No activity logged yet</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Table</th><th>Record</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString('en-GB')}</td>
                  <td>{l.user?.fullName || 'System'}</td>
                  <td>{l.action}</td>
                  <td>{l.tableAffected || '-'}</td>
                  <td>{l.recordId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
