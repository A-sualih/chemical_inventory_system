import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { IconTrash, IconClock, IconPlus, IconX } from './WasteIcons';

const REASONS = ['Expired', 'Contaminated', 'Damaged', 'Excess stock', 'Experimental waste', 'Other'];
const METHODS = ['Neutralization', 'Incineration', 'Chemical treatment', 'Recycling', 'Waste contractor pickup', 'Secure hazardous storage'];

export default function DisposalLogTab() {
  const { user, hasPermission } = useAuth();
  const [disposals, setDisposals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [chemicals, setChemicals] = useState([]);
  
  const [form, setForm] = useState({
    chemical_id: '', quantity: '', unit: '', reason: 'Expired', 
    method: 'Neutralization', hazard_classification: '', notes: ''
  });

  const fetchDisposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/waste/disposals', { params: { search, page, limit: 10 } });
      setDisposals(res.data.disposals);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Fetch Disposals Error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchDisposals();
    // Fetch chemicals for the dropdown
    axios.get('/api/chemicals', { params: { limit: 100 } }).then(res => setChemicals(res.data.chemicals));
  }, [fetchDisposals]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/waste/disposals', form);
      setShowModal(false);
      fetchDisposals();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this disposal? This will reduce inventory quantity.')) return;
    try {
      await axios.put(`/api/waste/disposals/${id}/approve`, { approval_notes: 'System approved' });
      fetchDisposals();
    } catch (err) {
      alert(err.response?.data?.error || 'Approval failed');
    }
  };

  return (
    <div className="disposal-tab">
      <div className="waste-stats-grid">
        <div className="waste-stat-card">
          <div className="stat-header">
            <span className="stat-icon-box" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              <IconTrash size={20} />
            </span>
            <span className="stat-label">Total Logs</span>
          </div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="waste-stat-card">
          <div className="stat-header">
            <span className="stat-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
              <IconClock size={20} />
            </span>
            <span className="stat-label">Pending Approval</span>
          </div>
          <div className="stat-value">{disposals.filter(d => d.status === 'Pending Approval').length}</div>
        </div>
      </div>

      <div className="waste-card">
        <div className="waste-card-header">
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Search chemical..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="procurement-input" 
              style={{ width: '300px' }}
            />
          </div>
          {hasPermission('manage_waste') && (
            <button className="btn-waste-primary" onClick={() => setShowModal(true)}>
              <IconPlus size={18} /> Log New Disposal
            </button>
          )}
        </div>

        <table className="waste-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Chemical</th>
              <th>Quantity</th>
              <th>Method</th>
              <th>Status</th>
              <th>Responsible</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>Loading records...</td></tr>
            ) : disposals.map(d => (
              <tr key={d._id}>
                <td><span style={{ fontWeight: 800 }}>{d.disposal_id}</span></td>
                <td>
                  <div style={{ fontWeight: 700 }}>{d.chemical_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--secondary-400)' }}>{d.hazard_classification}</div>
                </td>
                <td>{d.quantity} {d.unit}</td>
                <td>{d.method}</td>
                <td>
                  <span className={`waste-badge badge-${d.status.toLowerCase().replace(' ', '-')}`}>
                    {d.status}
                  </span>
                </td>
                <td>{d.responsible_person_name}</td>
                <td>{new Date(d.disposal_date).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {d.status === 'Pending Approval' && hasPermission('approve_disposal') && (
                      <button onClick={() => handleApprove(d._id)} className="btn-modal-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                        Approve
                      </button>
                    )}
                    <button className="btn-modal-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card">
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.5rem' }}>Log New Disposal Request</h2>
              <button onClick={() => setShowModal(false)} className="btn-modal-secondary" style={{ padding: '0.5rem' }}>
                <IconX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '2rem', overflowY: 'auto' }}>
              <div className="procurement-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Chemical *</label>
                  <select 
                    required 
                    value={form.chemical_id} 
                    onChange={e => setForm({...form, chemical_id: e.target.value})}
                    className="procurement-input"
                  >
                    <option value="">Select chemical...</option>
                    {chemicals.map(c => <option key={c._id} value={c._id}>{c.name} ({c.cas_number})</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="form-label-small">Quantity *</label>
                  <input 
                    type="number" 
                    required 
                    value={form.quantity}
                    onChange={e => setForm({...form, quantity: e.target.value})}
                    className="procurement-input"
                  />
                </div>
                <div>
                  <label className="form-label-small">Unit *</label>
                  <input 
                    type="text" 
                    required 
                    value={form.unit}
                    onChange={e => setForm({...form, unit: e.target.value})}
                    className="procurement-input"
                    placeholder="kg, L, bottles..."
                  />
                </div>

                <div>
                  <label className="form-label-small">Reason *</label>
                  <select 
                    value={form.reason} 
                    onChange={e => setForm({...form, reason: e.target.value})}
                    className="procurement-input"
                  >
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label-small">Initial Method *</label>
                  <select 
                    value={form.method} 
                    onChange={e => setForm({...form, method: e.target.value})}
                    className="procurement-input"
                  >
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Additional Notes</label>
                  <textarea 
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    className="procurement-input"
                    rows="3"
                  />
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-waste-primary">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
