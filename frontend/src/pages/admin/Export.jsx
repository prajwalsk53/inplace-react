import api from '../../api/axios';

export default function AdminExport() {
  const download = async () => {
    const { data } = await api.get('/admin/placements/export/csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'placements.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 className="section-title">Export Data</h3>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Download all placements as a CSV file.</p>
      <button className="btn btn-primary" onClick={download}>Download placements.csv</button>
    </div>
  );
}
