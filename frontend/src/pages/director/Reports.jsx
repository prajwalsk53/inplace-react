import { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import api from '../../api/axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = ['#0c1b33', '#e8a020', '#059669', '#0369a1', '#dc2626', '#7c3aed', '#d97706', '#6b7a8d'];

export default function DirectorReports() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/director/reports').then(({ data }) => setSummary(data));
  }, []);

  if (!summary) return <div className="loading-screen">Loading...</div>;

  const statusData = {
    labels: summary.byStatus.map((s) => s.status.replace('_', ' ')),
    datasets: [{ label: 'Placements', data: summary.byStatus.map((s) => s.count), backgroundColor: COLORS }],
  };

  const sectorData = {
    labels: summary.bySector.map((s) => s.sector || 'Unspecified'),
    datasets: [{ data: summary.bySector.map((s) => s.count), backgroundColor: COLORS }],
  };

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-tile"><div className="label">Average Employer Rating</div><div className="value">{summary.averageEvaluationRating.toFixed(1)} / 5</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h3 className="section-title">Placements by Status</h3>
          <Bar data={statusData} options={{ plugins: { legend: { display: false } } }} />
        </div>
        <div className="card">
          <h3 className="section-title">Placements by Sector</h3>
          <Pie data={sectorData} />
        </div>
      </div>
    </div>
  );
}
