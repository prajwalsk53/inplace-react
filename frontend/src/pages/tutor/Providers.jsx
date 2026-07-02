import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function Providers() {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    api.get('/tutor/providers').then(({ data }) => setCompanies(data));
  }, []);

  return (
    <div className="card">
      <h3 className="section-title">Provider Directory</h3>
      {companies.length === 0 ? <div className="empty-state">No providers yet</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Company</th><th>Sector</th><th>Contact</th><th>Placements</th></tr></thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.sector || '-'}</td>
                  <td>{c.contactName ? `${c.contactName} (${c.contactEmail})` : '-'}</td>
                  <td>{c._count.placements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
