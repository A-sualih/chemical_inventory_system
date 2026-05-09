import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IconSiren, IconX, IconCheckCircle, IconAlertTriangle, IconFileText, IconZap } from './WasteIcons';
import { useAuth } from '../../context/AuthContext';

const INCIDENT_TYPES = ['Spill', 'Leak', 'Toxic Emission', 'Air Contamination', 'Water Contamination', 'Soil Contamination', 'PPE Violation', 'Other'];
const SEVERITIES = ['Minor', 'Moderate', 'Major', 'Critical'];

export default function SafetyIncidentsTab() {
  const { hasPermission } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showEiaModal, setShowEiaModal] = useState(false);
  
  const [form, setForm] = useState({
    type: 'Spill', severity: 'Minor', location: '', description: '',
    environmental_impact_details: '', emergency_actions_taken: ''
  });

  const [eiaForm, setEiaForm] = useState({
    environmental_impact_details: '', cleanup_procedure_followed: '', status: 'Resolved'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incRes, protoRes] = await Promise.all([
        axios.get('/api/waste/incidents'),
        axios.get('/api/waste/protocols')
      ]);
      setIncidents(incRes.data);
      setProtocols(protoRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/waste/incidents', form);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to log incident');
    }
  };

  const handleUpdateEia = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/waste/incidents/${selectedIncident._id}/impact`, eiaForm);
      setShowEiaModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to update impact assessment');
    }
  };

  return (
    <div className="safety-incidents-tab">
      <div className="waste-card-header" style={{ padding: '0 0 2rem 0', borderBottom: 'none' }}>
        <div>
          <p className="waste-subtitle">Critical Environmental Safeguards</p>
          <h2 className="waste-title" style={{ fontSize: '2.5rem' }}>Safety & Risks</h2>
        </div>
        <button className="btn-waste-primary" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }} onClick={() => setShowModal(true)}>
          <IconSiren size={18} /> Report Incident
        </button>
      </div>

      <div className="waste-stats-grid">
        <div className="waste-stat-card" style={{ borderLeft: '6px solid #ef4444' }}>
          <div className="stat-header">
            <span className="stat-icon-box" style={{ background: '#fef2f2', color: '#ef4444' }}>
              <IconAlertTriangle size={20} />
            </span>
            <span className="stat-label">Critical Risks</span>
          </div>
          <div className="stat-value">{incidents.filter(i => i.severity === 'Critical' && i.status !== 'Closed').length}</div>
        </div>
        <div className="waste-stat-card" style={{ borderLeft: '6px solid #eab308' }}>
          <div className="stat-header">
            <span className="stat-icon-box" style={{ background: '#fefce8', color: '#ca8a04' }}>
              <IconZap size={20} />
            </span>
            <span className="stat-label">Active Cleanup</span>
          </div>
          <div className="stat-value">{incidents.filter(i => i.status === 'Cleanup In Progress').length}</div>
        </div>
      </div>

      <div className="tracking-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '2rem' }}>
        {incidents.map(i => (
          <div key={i._id} className={`incident-card incident-severity-${i.severity}`} style={{ padding: '2rem', background: 'white', borderRadius: '2rem', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', border: '1px solid var(--secondary-100)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 900, fontSize: '0.7rem', color: 'var(--secondary-400)', letterSpacing: '0.1em' }}>{i.incident_id}</span>
              <span className={`waste-badge badge-${i.status.toLowerCase().replace(/ /g, '-')}`}>
                {i.status}
              </span>
            </div>
            
            <h3 style={{ margin: '0.5rem 0', fontWeight: 900, fontSize: '1.5rem', color: 'var(--secondary-950)' }}>{i.location}</h3>
            <div className="waste-badge" style={{ marginBottom: '1.25rem', background: 'var(--secondary-50)', color: 'var(--secondary-700)' }}>{i.type}</div>
            
            <p style={{ fontSize: '0.95rem', color: 'var(--secondary-600)', marginBottom: '1.5rem', lineHeight: 1.6 }}>{i.description}</p>

            <div style={{ padding: '1.25rem', background: 'var(--secondary-50)', borderRadius: '1.25rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--secondary-900)' }}>Immediate Response:</strong>
              {i.emergency_actions_taken}
            </div>

            {i.environmental_impact_details && (
              <div style={{ padding: '1.25rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '1.25rem', fontSize: '0.875rem', border: '1px dashed var(--waste-primary)', marginBottom: '1.5rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--waste-primary)' }}>Impact Assessment:</strong>
                {i.environmental_impact_details}
              </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--secondary-400)' }}>
                Reported by <strong>{i.reported_by_name}</strong> • {new Date(i.incident_date).toLocaleDateString()}
              </div>
              {hasPermission('manage_waste') && i.status !== 'Closed' && (
                <button 
                  onClick={() => { setSelectedIncident(i); setShowEiaModal(true); setEiaForm({ environmental_impact_details: i.environmental_impact_details || '', cleanup_procedure_followed: i.cleanup_procedure_followed || '', status: i.status }); }} 
                  className="btn-waste-action"
                >
                  Update EIA
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="waste-card" style={{ marginTop: '3rem' }}>
        <div className="waste-card-header">
          <h3 style={{ fontWeight: 800 }}>Safety Protocol Library</h3>
          <p className="stat-label">Mandatory PPE & Cleanup Guidelines</p>
        </div>
        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {protocols.map(p => (
            <div key={p._id} style={{ padding: '1.5rem', background: 'var(--secondary-50)', borderRadius: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 900, color: 'var(--secondary-900)' }}>{p.waste_type}</h4>
                <span className="waste-badge" style={{ background: p.hazard_level === 'Extreme' ? '#fef2f2' : '#f0fdf4', color: p.hazard_level === 'Extreme' ? '#ef4444' : '#10b981' }}>{p.hazard_level} Risk</span>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label-small">Mandatory PPE</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {p.required_ppe.map(ppe => (
                    <span key={ppe} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'white', borderRadius: '0.5rem', border: '1px solid var(--secondary-200)' }}>{ppe}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label-small">Cleanup Procedure</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--secondary-600)', marginTop: '0.25rem' }}>{p.cleanup_procedure}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card" style={{ maxWidth: '600px' }}>
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.5rem' }}>Report Environmental Incident</h2>
              <button onClick={() => setShowModal(false)} className="btn-modal-secondary" style={{ padding: '0.5rem' }}>
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
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
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" className="btn-waste-primary" style={{ background: '#ef4444' }}>Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEiaModal && selectedIncident && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card" style={{ maxWidth: '600px' }}>
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.25rem' }}>Impact Assessment: {selectedIncident.incident_id}</h2>
              <button onClick={() => setShowEiaModal(false)} className="btn-waste-action">
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateEia} style={{ padding: '2rem' }}>
              <div className="procurement-form-grid">
                <div>
                  <label className="form-label-small">Incident Status</label>
                  <select value={eiaForm.status} onChange={e => setEiaForm({ ...eiaForm, status: e.target.value })} className="procurement-input">
                    {['Reported', 'Investigating', 'Cleanup In Progress', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Environmental Impact Assessment (EIA) *</label>
                  <textarea required value={eiaForm.environmental_impact_details} onChange={e => setEiaForm({ ...eiaForm, environmental_impact_details: e.target.value })} className="procurement-input" rows="4" placeholder="Detail air, water, or soil contamination risks..." />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Cleanup Procedure Followed</label>
                  <textarea value={eiaForm.cleanup_procedure_followed} onChange={e => setEiaForm({ ...eiaForm, cleanup_procedure_followed: e.target.value })} className="procurement-input" rows="3" placeholder="Reference protocol used and outcome..." />
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowEiaModal(false)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" className="btn-waste-primary">Update Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
