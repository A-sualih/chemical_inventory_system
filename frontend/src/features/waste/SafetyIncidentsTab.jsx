import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IconSiren, IconX } from './WasteIcons';

const INCIDENT_TYPES = ['Spill', 'Leak', 'Toxic Emission', 'Air Contamination', 'Water Contamination', 'Soil Contamination', 'PPE Violation', 'Other'];
const SEVERITIES = ['Minor', 'Moderate', 'Major', 'Critical'];

export default function SafetyIncidentsTab() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    type: 'Spill', severity: 'Minor', location: '', description: '',
    environmental_impact_details: '', emergency_actions_taken: ''
  });

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/waste/incidents');
      setIncidents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/waste/incidents', form);
      setShowModal(false);
      fetchIncidents();
    } catch (err) {
      alert('Failed to log incident');
    }
  };

  return (
    <div className="safety-incidents-tab">
      <div className="waste-card-header" style={{ padding: '0 0 2rem 0' }}>
        <h2 className="waste-title" style={{ fontSize: '1.5rem' }}>Environmental Safety & Incidents</h2>
        <button className="btn-waste-primary" style={{ background: '#ef4444' }} onClick={() => setShowModal(true)}>
          <IconSiren size={18} /> Report Incident
        </button>
      </div>

      <div className="waste-stats-grid">
        {SEVERITIES.map(sev => (
          <div key={sev} className="waste-stat-card" style={{ borderLeft: `6px solid ${sev === 'Critical' ? '#ef4444' : sev === 'Major' ? '#f97316' : sev === 'Moderate' ? '#eab308' : '#22c55e'}` }}>
            <div className="stat-label">{sev} Incidents</div>
            <div className="stat-value">{incidents.filter(i => i.severity === sev).length}</div>
          </div>
        ))}
      </div>

      <div className="tracking-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {incidents.map(i => (
          <div key={i._id} className={`incident-card incident-severity-${i.severity}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--secondary-400)' }}>{i.incident_id}</span>
              <span className="waste-badge" style={{ background: 'var(--secondary-100)', color: 'var(--secondary-700)' }}>{i.type}</span>
            </div>
            <h3 style={{ margin: '0.5rem 0', fontWeight: 900 }}>{i.location}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--secondary-600)', marginBottom: '1rem' }}>{i.description}</p>

            <div style={{ padding: '0.75rem', background: 'var(--secondary-50)', borderRadius: '0.75rem', fontSize: '0.8rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Actions Taken:</strong>
              {i.emergency_actions_taken}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{i.reported_by_name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary-400)' }}>{new Date(i.incident_date).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card" style={{ maxWidth: '600px' }}>
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.25rem' }}>Report Environmental Incident</h2>
              <button onClick={() => setShowModal(false)} className="btn-modal-secondary" style={{ padding: '0.5rem' }}>
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div className="procurement-form-grid">
                <div>
                  <label className="form-label-small">Incident Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="procurement-input">
                    {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label-small">Severity</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="procurement-input">
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Location *</label>
                  <input required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="procurement-input" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Description *</label>
                  <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="procurement-input" rows="3" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Emergency Actions Taken</label>
                  <textarea value={form.emergency_actions_taken} onChange={e => setForm({ ...form, emergency_actions_taken: e.target.value })} className="procurement-input" rows="2" />
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" className="btn-waste-primary" style={{ background: '#ef4444' }}>Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
