import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IconFileText, IconPlus, IconX } from './WasteIcons';

const COMPLIANCE_TYPES = ['Manifest', 'Inspection', 'Violation', 'Corrective Action', 'Permit Update', 'Government Report'];

export default function ComplianceTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    type: 'Manifest', title: '', regulatory_body: '', reference_number: '', description: '', status: 'Active'
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/waste/compliance');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/waste/compliance', form);
      setShowModal(false);
      fetchLogs();
    } catch (err) {
      alert('Failed to log compliance entry');
    }
  };

  return (
    <div className="compliance-tab">
      <div className="waste-card-header" style={{ padding: '0 0 2rem 0' }}>
        <h2 className="waste-title" style={{ fontSize: '1.5rem' }}>Regulatory Compliance & Audit Trails</h2>
        <button className="btn-waste-primary" onClick={() => setShowModal(true)}>
          <IconPlus size={18} /> Add Compliance Log
        </button>
      </div>

      <div className="waste-card">
        <table className="waste-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Document Title</th>
              <th>Regulatory Body</th>
              <th>Ref #</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>No compliance logs found.</td></tr>
            ) : logs.map(log => (
              <tr key={log._id}>
                <td><span style={{ fontWeight: 800 }}>{log.log_id}</span></td>
                <td><span className="waste-badge" style={{ background: 'var(--secondary-100)', color: 'var(--secondary-700)' }}>{log.type}</span></td>
                <td>
                  <div style={{ fontWeight: 700 }}>{log.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>{log.description?.substring(0, 50)}...</div>
                </td>
                <td>{log.regulatory_body || '—'}</td>
                <td style={{ fontFamily: 'monospace' }}>{log.reference_number || '—'}</td>
                <td>
                  <span className={`waste-badge badge-${log.status.toLowerCase().replace(' ', '-')}`}>
                    {log.status}
                  </span>
                </td>
                <td>{new Date(log.event_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card" style={{ maxWidth: '600px' }}>
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.25rem' }}>New Compliance Entry</h2>
              <button onClick={() => setShowModal(false)} className="btn-modal-secondary" style={{ padding: '0.5rem' }}>
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div className="procurement-form-grid">
                <div>
                  <label className="form-label-small">Log Type</label>
                  <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} className="procurement-input">
                    {COMPLIANCE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label-small">Status</label>
                  <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} className="procurement-input">
                    {['Active', 'Pending Review', 'Resolved', 'Closed'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Title / Document Name *</label>
                  <input required value={form.title} onChange={e=>setForm({...form, title:e.target.value})} className="procurement-input" placeholder="e.g. Hazardous Waste Manifest #9901" />
                </div>
                <div>
                  <label className="form-label-small">Regulatory Body</label>
                  <input value={form.regulatory_body} onChange={e=>setForm({...form, regulatory_body:e.target.value})} className="procurement-input" placeholder="EPA, OSHA, etc." />
                </div>
                <div>
                  <label className="form-label-small">Reference Number</label>
                  <input value={form.reference_number} onChange={e=>setForm({...form, reference_number:e.target.value})} className="procurement-input" placeholder="Permit # or ID" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Description / Notes</label>
                  <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} className="procurement-input" rows="3" />
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" className="btn-waste-primary">Create Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
