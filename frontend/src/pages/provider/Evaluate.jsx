import { useEffect, useState } from 'react';
import api from '../../api/axios';

const CRITERIA = [
  ['attendance', 'Attendance'],
  ['punctuality', 'Punctuality'],
  ['professionalism', 'Professionalism'],
  ['technicalSkills', 'Technical Skills'],
  ['communication', 'Communication'],
  ['initiative', 'Initiative'],
];

const EMPTY_FORM = {
  attendance: 3, punctuality: 3, professionalism: 3, technicalSkills: 3, communication: 3, initiative: 3,
  overallRating: 3, strengths: '', areasForImprovement: '', additionalComments: '', recommendFuture: false,
};

function StarPicker({ value, onChange, size = '1.6rem' }) {
  return (
    <div style={{ display: 'flex', gap: '0.15rem' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} onClick={() => onChange(i)} style={{ cursor: 'pointer', fontSize: size, color: i <= value ? '#f59e0b' : '#d1d5db', transition: 'color 0.15s' }}>★</span>
      ))}
    </div>
  );
}

export default function ProviderEvaluate() {
  const [candidates, setCandidates] = useState([]);
  const [modal, setModal] = useState(null); // { placementId, studentName, period, form }
  const [flash, setFlash] = useState(null);

  const load = () => api.get('/provider/evaluation-candidates').then(({ data }) => setCandidates(data));
  useEffect(() => { load(); }, []);

  const openModal = (candidate, period) => setModal({ placementId: candidate.placementId, studentName: candidate.studentName, period, form: { ...EMPTY_FORM } });

  const setField = (key, val) => setModal((m) => ({ ...m, form: { ...m.form, [key]: val } }));

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/provider/evaluations', { placementId: modal.placementId, evalPeriod: modal.period, ...modal.form });
    setModal(null);
    setFlash({ type: 'success', msg: 'Evaluation saved successfully.' });
    load();
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`} style={{ marginBottom: '1.5rem' }}>✅ {flash.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <div className="panel">
            <div className="panel-header">
              <div><h3>Active Students</h3><p>Click a student to submit or update their evaluation</p></div>
            </div>
            {candidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
                <p style={{ color: 'var(--muted)' }}>No active students to evaluate.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Role</th><th>Interim</th><th>Final</th><th>Actions</th></tr></thead>
                  <tbody>
                    {candidates.map((s) => (
                      <tr key={s.placementId}>
                        <td>
                          <div className="avatar-cell">
                            <div className="avatar">{s.avatarInitials || '??'}</div>
                            <div><h4>{s.studentName}</h4><p style={{ fontSize: '0.78rem' }}>{s.studentEmail}</p></div>
                          </div>
                        </td>
                        <td><span className="type-chip">{s.roleTitle || '—'}</span></td>
                        <td>{s.interimRating ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(s.interimRating)}</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}</td>
                        <td>{s.finalRating ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(s.finalRating)}</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => openModal(s, 'interim')}>Interim</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(s, 'final')}>Final</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <div className="panel">
            <div className="panel-header"><h3>About Evaluations</h3></div>
            <div className="panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>📋 Interim</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Mid-placement review — typically around month 4. Identifies strengths and areas for improvement early.</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>🏁 Final</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>End-of-placement summary. This forms part of the student's academic record.</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>⭐ Ratings</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>1 = Poor &nbsp;·&nbsp; 3 = Meets expectations &nbsp;·&nbsp; 5 = Excellent</p>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Evaluations are shared with the student's tutor and contribute to their placement year assessment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: 'var(--navy)', marginBottom: '0.2rem' }}>
              {modal.period === 'interim' ? 'Interim' : 'Final'} Evaluation
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{modal.studentName}</p>
            <form onSubmit={submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {CRITERIA.map(([key, label]) => (
                  <div key={key}>
                    <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem', display: 'block' }}>{label}</label>
                    <StarPicker value={modal.form[key]} onChange={(v) => setField(key, v)} />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy)', marginBottom: '0.4rem', display: 'block' }}>Overall Rating</label>
                <StarPicker value={modal.form.overallRating} onChange={(v) => setField('overallRating', v)} size="2rem" />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Key Strengths</label>
                <textarea rows={3} value={modal.form.strengths} onChange={(e) => setField('strengths', e.target.value)} placeholder="What does the student do particularly well?" />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Areas for Improvement</label>
                <textarea rows={3} value={modal.form.areasForImprovement} onChange={(e) => setField('areasForImprovement', e.target.value)} placeholder="Where can the student develop further?" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Additional Comments</label>
                <textarea rows={2} value={modal.form.additionalComments} onChange={(e) => setField('additionalComments', e.target.value)} placeholder="Any other observations…" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.5rem', padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                <input type="checkbox" checked={modal.form.recommendFuture} onChange={(e) => setField('recommendFuture', e.target.checked)} style={{ width: 18, height: 18 }} />
                <span style={{ fontWeight: 600, color: 'var(--navy)' }}>I would recommend accepting future students from this programme</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Evaluation →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
