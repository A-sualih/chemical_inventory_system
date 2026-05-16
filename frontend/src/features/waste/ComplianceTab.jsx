import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IconFileText, IconPlus, IconX, IconCheckCircle, IconAlertTriangle } from './WasteIcons';
import { useAuth } from '../../context/AuthContext';

const COMPLIANCE_TYPES = ['Manifest', 'Inspection', 'Violation', 'Corrective Action', 'Permit Update', 'Government Report'];

export default function ComplianceTab() {
  const { user, hasPermission } = useAuth();
  const [logs, setLogs] = useState([]);
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);

  const [form, setForm] = useState({
    type: 'Manifest', title: '', regulatory_body: '', reference_number: '', description: '', status: 'Active'
  });

  const [permitForm, setPermitForm] = useState({
    permit_number: '', regulatory_body: '', type: 'Hazardous Waste Generation', issue_date: '', expiry_date: '', limits: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, permitsRes] = await Promise.all([
        axios.get('/api/waste/compliance'),
        axios.get('/api/waste/permits')
      ]);
      setLogs(logsRes.data);
      setPermits(permitsRes.data);
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
      await axios.post('/api/waste/compliance', form);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to log compliance entry');
    }
  };

  const handleSign = async (id) => {
    if (!window.confirm('Electronically sign this compliance log?')) return;
    try {
      await axios.put(`/api/waste/compliance/${id}/sign`);
      fetchData();
    } catch (err) {
      alert('Signature failed');
    }
  };

  const handleCreatePermit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/waste/permits', permitForm);
      setShowPermitModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save permit');
    }
  };

  return (
    <div className="compliance-tab">
      <div className="waste-card-header">
        <div>
          <p className="waste-subtitle">Regulatory Compliance Monitoring</p>
          <h2 className="waste-title" style={{ fontSize: '2.5rem' }}>Compliance & Permits</h2>
        </div>
        <div className="waste-header-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {hasPermission('manage_waste') && (
            <button className="btn-waste-action" onClick={() => setShowPermitModal(true)} style={{ height: '3.5rem', borderRadius: '1.25rem', padding: '0 1.5rem' }}>
              <IconFileText size={18} /> Manage Permits
            </button>
          )}
          <button className="btn-waste-primary" onClick={() => setShowModal(true)}>
            <IconPlus size={18} /> Add Compliance Log
          </button>
        </div>
      </div>

      <div className="waste-stats-grid">
        <div className="waste-stat-card">
          <div className="stat-header">
            <span className="stat-icon-box" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <IconCheckCircle size={20} />
            </span>
            <span className="stat-label">Active Permits</span>
          </div>
          <div className="stat-value">{permits.filter(p => p.status === 'Active').length}</div>
        </div>
        <div className="waste-stat-card">
          <div className="stat-header">
            <span className="stat-icon-box" style={{ background: '#fef2f2', color: '#ef4444' }}>
              <IconAlertTriangle size={20} />
            </span>
            <span className="stat-label">Regulatory Violations</span>
          </div>
          <div className="stat-value">{logs.filter(l => l.type === 'Violation' && l.status === 'Active').length}</div>
        </div>
      </div>

      <div className="waste-card" style={{ marginBottom: '2rem' }}>
        <div className="waste-card-header">
          <h3 style={{ fontWeight: 800 }}>Regulatory Compliance Logs</h3>
          <button className="btn-waste-action" onClick={() => window.print()}>Export Inspection Report</button>
        </div>
        <table className="waste-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Document Title</th>
              <th>Regulatory Body</th>
              <th>Status</th>
              <th>Signature</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="waste-empty-state">
                    <div className="empty-state-icon">
                      <IconFileText size={32} />
                    </div>
                    <h3 className="empty-state-title">No Compliance Logs Found</h3>
                    <p className="empty-state-desc">
                      Start tracking your regulatory activities by adding your first compliance log entry using the button above.
                    </p>
                  </div>
                </td>
              </tr>
            ) : logs.map(log => (
              <tr key={log._id}>
                <td data-label="ID"><span style={{ fontWeight: 800 }}>{log.log_id}</span></td>
                <td data-label="Type"><span className="waste-badge" style={{ background: 'var(--secondary-100)', color: 'var(--secondary-700)' }}>{log.type}</span></td>
                <td data-label="Document Title">
                  <div style={{ fontWeight: 800, color: 'var(--secondary-900)' }}>{log.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', fontWeight: 500, marginTop: '0.25rem' }}>{log.description?.substring(0, 50)}...</div>
                </td>
                <td data-label="Regulatory Body" style={{ fontWeight: 700, color: 'var(--secondary-700)' }}>{log.regulatory_body || '—'}</td>
                <td data-label="Status">
                  <span className={`waste-badge badge-${log.status.toLowerCase().replace(' ', '-')}`}>
                    {log.status}
                  </span>
                </td>
                <td data-label="Signature">
                  {log.digital_signature?.name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>
                      <IconCheckCircle size={14} /> Signed by {log.digital_signature.name}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--secondary-400)', fontSize: '0.75rem' }}>Unsigned</span>
                  )}
                </td>
                <td data-label="Date">{new Date(log.event_date).toLocaleDateString()}</td>
                <td data-label="Actions">
                  {!log.digital_signature?.name && hasPermission('approve_disposal') && (
                    <button onClick={() => handleSign(log._id)} className="btn-waste-action action-approve">
                      Sign & Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="waste-card">
        <div className="waste-card-header">
          <h3 style={{ fontWeight: 800 }}>Active Disposal Permits & Legal Limits</h3>
        </div>
        <table className="waste-table">
          <thead>
            <tr>
              <th>Permit #</th>
              <th>Authority</th>
              <th>Type</th>
              <th>Hazard Class</th>
              <th>Capacity Usage</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {permits.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="waste-empty-state">
                    <div className="empty-state-icon">
                      <IconFileText size={32} />
                    </div>
                    <h3 className="empty-state-title">No Permits Found</h3>
                    <p className="empty-state-desc">
                      Manage your regulatory permits and legal storage limits in one place.
                    </p>
                  </div>
                </td>
              </tr>
            ) : permits.map(permit => (
              permit.limits.map((limit, idx) => (
                <tr key={`${permit._id}-${idx}`}>
                  {idx === 0 && (
                    <td data-label="Permit #" rowSpan={permit.limits.length} style={{ fontWeight: 800 }}>{permit.permit_number}</td>
                  )}
                  {idx === 0 && (
                    <td data-label="Authority" rowSpan={permit.limits.length}>{permit.regulatory_body}</td>
                  )}
                  {idx === 0 && (
                    <td data-label="Type" rowSpan={permit.limits.length}>{permit.type}</td>
                  )}
                  <td data-label="Hazard Class" style={{ fontWeight: 700 }}>{limit.hazard_class}</td>
                  <td data-label="Capacity Usage">
                    <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '0.25rem' }}>
                      <div style={{
                        width: `${Math.min(100, (limit.current_quantity / limit.max_quantity) * 100)}%`,
                        height: '100%',
                        background: limit.current_quantity > limit.max_quantity ? '#ef4444' : '#10b981',
                        borderRadius: '3px'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                      {limit.current_quantity} / {limit.max_quantity} {limit.unit}
                    </span>
                  </td>
                  {idx === 0 && (
                    <td data-label="Expiry" rowSpan={permit.limits.length} style={{ color: new Date(permit.expiry_date) < new Date() ? '#ef4444' : 'inherit' }}>
                      {new Date(permit.expiry_date).toLocaleDateString()}
                    </td>
                  )}
                  {idx === 0 && (
                    <td data-label="Status" rowSpan={permit.limits.length}>
                      <span className={`waste-badge badge-${permit.status.toLowerCase()}`}>
                        {permit.status}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="premium-modal-overlay">
          <div className="premium-form-container" style={{ maxWidth: '650px', width: '100%' }}>
            <div className="premium-form-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--waste-grad)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'white' }}>
                  <IconFileText size={20} />
                </div>
                <div>
                  <h2 className="premium-form-title">New Compliance Entry</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--secondary-400)', fontWeight: 600, margin: 0 }}>Log regulatory events and document snapshots</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-modal-secondary" style={{ padding: '0.5rem', borderRadius: '10px' }}>
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="premium-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="premium-form-label">Log Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="premium-form-input">
                    {COMPLIANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="premium-form-label">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="premium-form-input">
                    {['Active', 'Pending Review', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <label className="premium-form-label">Title / Document Name *</label>
                  <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="premium-form-input" placeholder="e.g. Hazardous Waste Manifest #9901" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="premium-form-label">Regulatory Body</label>
                  <input value={form.regulatory_body} onChange={e => setForm({ ...form, regulatory_body: e.target.value })} className="premium-form-input" placeholder="EPA, OSHA, etc." />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="premium-form-label">Reference Number</label>
                  <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} className="premium-form-input" placeholder="Permit # or ID" />
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <label className="premium-form-label">Description / Notes</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="premium-form-input" rows="3" style={{ minHeight: '100px' }} />
                </div>
              </div>
              <div style={{ padding: '1.5rem 2.5rem', background: 'rgba(248, 250, 252, 0.5)', borderTop: '1px solid var(--secondary-100)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-waste-action">Cancel</button>
                <button type="submit" className="btn-premium-submit">Create Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPermitModal && (
        <div className="premium-modal-overlay">
          <div className="premium-form-container" style={{ maxWidth: '750px', width: '100%' }}>
            <div className="premium-form-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <IconFileText size={20} />
                </div>
                <div>
                  <h2 className="premium-form-title">Add Regulatory Permit</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--secondary-400)', fontWeight: 600, margin: 0 }}>Register new environmental and safety permits</p>
                </div>
              </div>
              <button onClick={() => setShowPermitModal(false)} className="btn-modal-secondary" style={{ padding: '0.5rem', borderRadius: '10px' }}>
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePermit}>
              <div className="premium-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="premium-form-label">Permit Number *</label>
                  <input required value={permitForm.permit_number} onChange={e => setPermitForm({ ...permitForm, permit_number: e.target.value })} className="premium-form-input" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="premium-form-label">Regulatory Body *</label>
                  <input required value={permitForm.regulatory_body} onChange={e => setPermitForm({ ...permitForm, regulatory_body: e.target.value })} className="premium-form-input" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="premium-form-label">Permit Type *</label>
                  <select value={permitForm.type} onChange={e => setPermitForm({ ...permitForm, type: e.target.value })} className="premium-form-input">
                    {['Hazardous Waste Generation', 'Transportation', 'On-site Treatment', 'Storage'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <label className="premium-form-label">Issue Date *</label>
                  <input required type="date" value={permitForm.issue_date} onChange={e => setPermitForm({ ...permitForm, issue_date: e.target.value })} className="premium-form-input" />
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <label className="premium-form-label">Expiry Date *</label>
                  <input required type="date" value={permitForm.expiry_date} onChange={e => setPermitForm({ ...permitForm, expiry_date: e.target.value })} className="premium-form-input" />
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <label className="premium-form-label">Permit Limits (Format: HazardClass:Qty:Unit, e.g. Flammable:500:kg)</label>
                  <input
                    placeholder="Enter limits separated by semicolon"
                    onBlur={e => {
                      const limits = e.target.value.split(';').map(s => {
                        const [hc, qty, unit] = s.split(':');
                        return { hazard_class: hc, max_quantity: Number(qty), unit: unit || 'kg', current_quantity: 0 };
                      }).filter(l => l.hazard_class && l.max_quantity);
                      setPermitForm({ ...permitForm, limits });
                    }}
                    className="premium-form-input"
                  />
                </div>
              </div>
              <div style={{ padding: '1.5rem 2.5rem', background: 'rgba(248, 250, 252, 0.5)', borderTop: '1px solid var(--secondary-100)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowPermitModal(false)} className="btn-waste-action">Cancel</button>
                <button type="submit" className="btn-premium-submit">Save Permit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
