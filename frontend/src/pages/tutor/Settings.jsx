import { useEffect, useState } from 'react';
import api from '../../api/axios';

const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function TutorSettings() {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/tutor/settings').then(({ data }) => setCfg(data));
  }, []);

  const update = (key) => (e) => setCfg((c) => ({ ...c, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await api.put('/tutor/settings', cfg);
      setMessage(data.message);
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return <div className="loading-screen">Loading...</div>;

  let previewRows = [];
  if (cfg.cycle_start_date && cfg.cycle_end_date) {
    const cs = new Date(cfg.cycle_start_date);
    const ce = new Date(cfg.cycle_end_date);
    const im = Math.max(1, parseInt(cfg.interim_report_months, 10) || 1);
    const fm = Math.max(1, parseInt(cfg.final_report_months_before, 10) || 1);
    const rd = Math.max(1, parseInt(cfg.deadline_reminder_days, 10) || 1);

    const interimDue = addMonths(cs, im);
    const finalDue = addMonths(ce, -fm);
    const interimReminder = addDays(interimDue, -rd);
    const finalReminder = addDays(finalDue, -rd);

    previewRows = [
      ['Cycle Start', fmtDate(cs), '🟢'],
      ['Interim Report Due', fmtDate(interimDue), '📋'],
      ['Interim Reminder Sent', fmtDate(interimReminder), '🔔'],
      ['Final Report Due', fmtDate(finalDue), '📝'],
      ['Final Reminder Sent', fmtDate(finalReminder), '🔔'],
      ['Cycle End', fmtDate(ce), '🏁'],
    ];
  }

  return (
    <div>
      {message && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid #6ee7b7', borderRadius: 'var(--radius)', padding: '1.25rem 2rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--success)', fontWeight: 500 }}>✅ {message}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
        <form onSubmit={save}>
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header"><div><h3>Academic Cycle</h3><p>Define the current placement year boundaries</p></div></div>
            <div className="panel-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Cycle Label</label>
                  <input type="text" placeholder="e.g., 2025/26" value={cfg.cycle_label} onChange={update('cycle_label')} />
                  <small style={{ color: 'var(--muted)' }}>Displayed on headers and reports.</small>
                </div>
                <div className="form-group" />
                <div className="form-group">
                  <label>Cycle Start Date</label>
                  <input type="date" value={cfg.cycle_start_date} onChange={update('cycle_start_date')} />
                </div>
                <div className="form-group">
                  <label>Cycle End Date</label>
                  <input type="date" value={cfg.cycle_end_date} onChange={update('cycle_end_date')} />
                </div>
                <div className="form-group">
                  <label>Minimum Placement Length (months)</label>
                  <input type="number" min={1} max={24} value={cfg.min_placement_months} onChange={update('min_placement_months')} />
                </div>
                <div className="form-group">
                  <label>Maximum Placement Length (months)</label>
                  <input type="number" min={1} max={24} value={cfg.max_placement_months} onChange={update('max_placement_months')} />
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header"><div><h3>Report Deadlines</h3><p>Offsets are calculated relative to each student's placement dates</p></div></div>
            <div className="panel-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Interim Report Due (months after start)</label>
                  <input type="number" min={1} max={12} value={cfg.interim_report_months} onChange={update('interim_report_months')} />
                  <small style={{ color: 'var(--muted)' }}>e.g., 4 → due 4 months after placement start</small>
                </div>
                <div className="form-group">
                  <label>Final Report Due (months before end)</label>
                  <input type="number" min={1} max={6} value={cfg.final_report_months_before} onChange={update('final_report_months_before')} />
                  <small style={{ color: 'var(--muted)' }}>e.g., 1 → due 1 month before placement end</small>
                </div>
                <div className="form-group">
                  <label>Reminder Email Days Before Deadline</label>
                  <input type="number" min={1} max={60} value={cfg.deadline_reminder_days} onChange={update('deadline_reminder_days')} />
                  <small style={{ color: 'var(--muted)' }}>Students receive a reminder this many days before each deadline.</small>
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header"><div><h3>Additional Configuration</h3></div></div>
            <div className="panel-body">
              <div className="form-grid">
                <div className="form-group full-col">
                  <label>Allowed Industry Sectors (comma-separated, leave blank to allow all)</label>
                  <input type="text" placeholder="e.g., Technology &amp; Software, Engineering &amp; Manufacturing" value={cfg.allowed_sectors} onChange={update('allowed_sectors')} />
                </div>
                <div className="form-group full-col">
                  <label>Placement Year Notes / Guidance for Students</label>
                  <textarea rows={4} placeholder="Any notes or guidance visible to students on their dashboard…" value={cfg.placement_notes} onChange={update('placement_notes')} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings →'}</button>
          </div>
        </form>

        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <div className="panel">
            <div className="panel-header"><div><h3>Deadline Preview</h3><p>Based on current cycle dates</p></div></div>
            {previewRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Set the cycle start and end dates to see a deadline preview.</p>
              </div>
            ) : (
              <>
                <div>
                  {previewRows.map(([label, date, icon]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span>{icon}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{label}</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)', fontFamily: "'DM Mono', monospace" }}>{date}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '1rem 1.5rem', background: 'var(--cream)', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    These dates apply to the cycle as a whole. Each student's individual deadlines are offset from their own start/end dates using the same month offsets above.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="panel" style={{ marginTop: '1rem' }}>
            <div className="panel-header"><h3>Active Cycle</h3></div>
            <div className="panel-body">
              <div className="info-grid">
                <div className="info-item"><label>Label</label><p style={{ fontWeight: 700, color: 'var(--navy)' }}>{cfg.cycle_label || '—'}</p></div>
                <div className="info-item"><label>Duration</label><p>{cfg.min_placement_months}–{cfg.max_placement_months} months</p></div>
                <div className="info-item"><label>Interim Report</label><p>Month {cfg.interim_report_months}</p></div>
                <div className="info-item"><label>Final Report</label><p>{cfg.final_report_months_before} month(s) before end</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
