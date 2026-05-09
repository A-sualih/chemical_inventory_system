import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { IconTrash, IconClock, IconPlus, IconX, IconCheckCircle } from './WasteIcons';

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
    chemical_id: '', batch_id: '', batch_number: '', quantity: '', unit: '', reason: 'Expired',
    method: 'Neutralization', hazard_classification: '', notes: ''
  });
  const [batches, setBatches] = useState([]);
  const [viewingDisposal, setViewingDisposal] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const [completingDisposal, setCompletingDisposal] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    method_details: {
      safety_procedure_followed: true,
      operator_name: '',
      neutralization: { initial_ph: 7, final_ph: 7, neutralizing_agent: '' },
      incineration: { temperature: 1200, certificate_number: '' }
    }
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
    axios.get('/api/chemicals', { params: { limit: 100 } }).then(res => setChemicals(res.data.data || []));
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

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionNotes) return alert('Rejection reason is required.');

    try {
      await axios.put(`/api/waste/disposals/${rejectingId}/reject`, { rejection_notes: rejectionNotes });
      setRejectingId(null);
      setRejectionNotes('');
      fetchDisposals();
    } catch (err) {
      alert(err.response?.data?.error || 'Rejection failed');
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/waste/disposals/${completingDisposal._id}/complete`, completionForm);
      setCompletingDisposal(null);
      fetchDisposals();
    } catch (err) {
      alert(err.response?.data?.error || 'Completion failed');
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
                      <>
                        <button onClick={() => handleApprove(d._id)} className="btn-waste-action action-approve">
                          Approve
                        </button>
                        <button onClick={() => setRejectingId(d._id)} className="btn-waste-action action-reject">
                          Reject
                        </button>
                      </>
                    )}
                    {d.status === 'Approved' && hasPermission('manage_waste') && (
                      <button onClick={() => {
                        setCompletingDisposal(d);
                        setCompletionForm({
                          ...completionForm,
                          operator_name: user.name
                        });
                      }} className="btn-waste-action action-approve">
                        <IconCheckCircle size={14} /> Complete
                      </button>
                    )}
                    <button
                      onClick={() => setViewingDisposal(d)}
                      className="btn-waste-action"
                    >
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
                    onChange={async (e) => {
                      const chemId = e.target.value;
                      const chem = chemicals.find(c => c._id === chemId);
                      setForm({
                        ...form,
                        chemical_id: chemId,
                        batch_id: '',
                        batch_number: '',
                        unit: chem ? chem.unit : ''
                      });

                      if (chemId) {
                        try {
                          const res = await axios.get('/api/batches', { params: { chemical_id: chemId } });
                          setBatches(res.data.data || res.data || []);
                        } catch (err) {
                          console.error('Fetch Batches Error:', err);
                        }
                      } else {
                        setBatches([]);
                      }
                    }}
                    className="procurement-input"
                  >
                    <option value="">Select chemical...</option>
                    {chemicals.map(c => <option key={c._id} value={c._id}>{c.name} ({c.cas_number})</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Batch (Optional)</label>
                  <select
                    value={form.batch_id}
                    onChange={e => {
                      const batch = batches.find(b => b._id === e.target.value);
                      setForm({
                        ...form,
                        batch_id: e.target.value,
                        batch_number: batch ? batch.batch_number : ''
                      });
                    }}
                    className="procurement-input"
                  >
                    <option value="">Select specific batch (Auto-FIFO if empty)</option>
                    {batches.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.batch_number} - Stock: {b.total_quantity} {b.unit} {b.expiry_date ? `(Exp: ${new Date(b.expiry_date).toLocaleDateString()})` : ''} {b.status === 'Expired' ? '(EXPIRED)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label-small">Quantity *</label>
                  <input
                    type="number"
                    required
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="procurement-input"
                  />
                </div>
                <div>
                  <label className="form-label-small">Unit *</label>
                  <input
                    type="text"
                    required
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="procurement-input"
                    placeholder="kg, L, bottles..."
                  />
                  {form.chemical_id && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--secondary-400)', marginTop: '0.25rem', fontWeight: 600 }}>
                      Current Inventory Unit: {chemicals.find(c => c._id === form.chemical_id)?.unit}
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label-small">Reason *</label>
                  <select
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    className="procurement-input"
                  >
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label-small">Initial Method *</label>
                  <select
                    value={form.method}
                    onChange={e => setForm({ ...form, method: e.target.value })}
                    className="procurement-input"
                  >
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Additional Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
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

      {viewingDisposal && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card" style={{ maxWidth: '600px' }}>
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.25rem' }}>Record #{viewingDisposal.disposal_id}</h2>
              <button onClick={() => setViewingDisposal(null)} className="btn-waste-action">
                <IconX size={16} />
              </button>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="form-label-small">Chemical</label>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{viewingDisposal.chemical_name}</div>
                </div>
                <div>
                  <label className="form-label-small">Batch</label>
                  <div style={{ fontWeight: 700 }}>{viewingDisposal.batch_number || 'N/A (FIFO)'}</div>
                </div>
                <div>
                  <label className="form-label-small">Quantity</label>
                  <div style={{ fontWeight: 700 }}>{viewingDisposal.quantity} {viewingDisposal.unit}</div>
                </div>
                <div>
                  <label className="form-label-small">Status</label>
                  <div>
                    <span className={`waste-badge badge-${viewingDisposal.status.toLowerCase().replace(' ', '-')}`}>
                      {viewingDisposal.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="form-label-small">Method</label>
                  <div style={{ fontWeight: 600 }}>{viewingDisposal.method}</div>
                </div>
                <div>
                  <label className="form-label-small">Responsible</label>
                  <div style={{ fontWeight: 600 }}>{viewingDisposal.responsible_person_name}</div>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <label className="form-label-small">Notes</label>
                <p style={{ background: 'var(--secondary-50)', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
                  {viewingDisposal.notes || 'No notes provided.'}
                </p>
              </div>
              {viewingDisposal.approval_notes && (
                <div style={{ marginTop: '1rem' }}>
                  <label className="form-label-small">Officer Comments</label>
                  <p style={{ background: viewingDisposal.status === 'Rejected' ? '#fef2f2' : '#f0fdf4', color: viewingDisposal.status === 'Rejected' ? '#dc2626' : '#16a34a', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    {viewingDisposal.approval_notes}
                  </p>
                </div>
              )}
            </div>
            <div className="waste-modal-footer" style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--secondary-100)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewingDisposal(null)} className="btn-waste-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {completingDisposal && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card" style={{ maxWidth: '600px' }}>
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.25rem' }}>Finalize Disposal: {completingDisposal.disposal_id}</h2>
              <button onClick={() => setCompletingDisposal(null)} className="btn-waste-action">
                <IconX size={16} />
              </button>
            </div>
            <form onSubmit={handleComplete} style={{ padding: '2rem' }}>
              <div className="procurement-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Operator Name *</label>
                  <input
                    required
                    value={completionForm.operator_name}
                    onChange={e => setCompletionForm({ ...completionForm, operator_name: e.target.value })}
                    className="procurement-input"
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={completionForm.method_details.safety_procedure_followed}
                      onChange={e => setCompletionForm({
                        ...completionForm,
                        method_details: { ...completionForm.method_details, safety_procedure_followed: e.target.checked }
                      })}
                    />
                    Safety protocols and PPE requirements verified
                  </label>
                </div>

                {completingDisposal.method === 'Neutralization' && (
                  <>
                    <div>
                      <label className="form-label-small">Initial pH</label>
                      <input
                        type="number" step="0.1"
                        value={completionForm.method_details.neutralization.initial_ph}
                        onChange={e => setCompletionForm({
                          ...completionForm,
                          method_details: {
                            ...completionForm.method_details,
                            neutralization: { ...completionForm.method_details.neutralization, initial_ph: e.target.value }
                          }
                        })}
                        className="procurement-input"
                      />
                    </div>
                    <div>
                      <label className="form-label-small">Final pH</label>
                      <input
                        type="number" step="0.1"
                        value={completionForm.method_details.neutralization.final_ph}
                        onChange={e => setCompletionForm({
                          ...completionForm,
                          method_details: {
                            ...completionForm.method_details,
                            neutralization: { ...completionForm.method_details.neutralization, final_ph: e.target.value }
                          }
                        })}
                        className="procurement-input"
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label-small">Neutralizing Agent Used</label>
                      <input
                        value={completionForm.method_details.neutralization.neutralizing_agent}
                        onChange={e => setCompletionForm({
                          ...completionForm,
                          method_details: {
                            ...completionForm.method_details,
                            neutralization: { ...completionForm.method_details.neutralization, neutralizing_agent: e.target.value }
                          }
                        })}
                        className="procurement-input"
                        placeholder="e.g. Sodium Bicarbonate"
                      />
                    </div>
                  </>
                )}

                {completingDisposal.method === 'Incineration' && (
                  <>
                    <div>
                      <label className="form-label-small">Temp (°C)</label>
                      <input
                        type="number"
                        value={completionForm.method_details.incineration.temperature}
                        onChange={e => setCompletionForm({
                          ...completionForm,
                          method_details: {
                            ...completionForm.method_details,
                            incineration: { ...completionForm.method_details.incineration, temperature: e.target.value }
                          }
                        })}
                        className="procurement-input"
                      />
                    </div>
                    <div>
                      <label className="form-label-small">Cert #</label>
                      <input
                        value={completionForm.method_details.incineration.certificate_number}
                        onChange={e => setCompletionForm({
                          ...completionForm,
                          method_details: {
                            ...completionForm.method_details,
                            incineration: { ...completionForm.method_details.incineration, certificate_number: e.target.value }
                          }
                        })}
                        className="procurement-input"
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setCompletingDisposal(null)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" className="btn-waste-primary">
                  Confirm Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectingId && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card" style={{ maxWidth: '500px' }}>
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.25rem', color: 'var(--danger-900)' }}>Reject Disposal Request</h2>
              <button onClick={() => setRejectingId(null)} className="btn-waste-action">
                <IconX size={16} />
              </button>
            </div>
            <form onSubmit={handleReject} style={{ padding: '2rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary-600)', marginBottom: '1.5rem' }}>
                Please provide a reason for rejecting this disposal request. This will be visible to the requester.
              </p>
              <label className="form-label-small">Rejection Reason *</label>
              <textarea
                required
                value={rejectionNotes}
                onChange={e => setRejectionNotes(e.target.value)}
                className="procurement-input"
                rows="4"
                placeholder="Enter detailed reason for rejection..."
                autoFocus
              />
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setRejectingId(null)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" className="btn-waste-primary" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
