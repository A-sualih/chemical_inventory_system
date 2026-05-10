import React, { useState, useEffect, useCallback } from 'react';
// Disposal Tracking Tab with Quick Log feature
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { IconTrash, IconClock, IconPlus, IconX, IconCheckCircle, IconAlertTriangle, IconFileText } from './WasteIcons';

const REASONS = ['Expired', 'Contaminated', 'Damaged', 'Excess stock', 'Experimental waste', 'Other'];
const METHODS = ['Neutralization', 'Incineration', 'Chemical treatment', 'Recycling', 'Waste contractor pickup', 'Secure hazardous storage'];

export default function DisposalLogTab({ externalShowModal, onCloseModal, onOpenModal }) {
  const { user, hasPermission } = useAuth();
  const [disposals, setDisposals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

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

  const [approvingDisposal, setApprovingDisposal] = useState(null);
  const [fifoPreview, setFifoPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('Regulatory compliance verified.');

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

    // 1. Frontend validation: Check if quantity is available
    const selectedChem = chemicals.find(c => c._id === form.chemical_id);
    const selectedBatch = batches.find(b => b._id === form.batch_id);
    const requestedQty = parseFloat(form.quantity);

    if (selectedBatch) {
      if (requestedQty > selectedBatch.total_quantity) {
        return alert(`Insufficient batch stock: Only ${selectedBatch.total_quantity} ${selectedBatch.unit} available in batch ${selectedBatch.batch_number}.`);
      }
    } else if (selectedChem) {
      if (requestedQty > selectedChem.quantity) {
        return alert(`Insufficient total stock: Only ${selectedChem.quantity} ${selectedChem.unit} available in total inventory.`);
      }
    }

    setSubmitting(true);
    try {
      await axios.post('/api/waste/disposals', form);
      onCloseModal();
      fetchDisposals();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveClick = async (disposal) => {
    setApprovingDisposal(disposal);
    setPreviewLoading(true);
    try {
      const res = await axios.get(`/api/waste/disposals/${disposal._id}/fifo-preview`);
      setFifoPreview(res.data);
    } catch (err) {
      console.error('FIFO Preview Error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/waste/disposals/${approvingDisposal._id}/approve`, { approval_notes: approvalNotes });
      setApprovingDisposal(null);
      setFifoPreview(null);
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
            <span className="stat-icon-box" style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4f46e5' }}>
              <IconTrash size={24} />
            </span>
            <span className="stat-label">Total Logs</span>
          </div>
          <div className="stat-value">{total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--secondary-400)', marginTop: '0.5rem', fontWeight: 600 }}>DISPOSAL RECORDS RECORDED</div>
        </div>
        <div className="waste-stat-card">
          <div className="stat-header">
            <span className="stat-icon-box" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' }}>
              <IconClock size={24} />
            </span>
            <span className="stat-label">Pending Approval</span>
          </div>
          <div className="stat-value">{disposals.filter(d => d.status === 'Pending Approval').length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--secondary-400)', marginTop: '0.5rem', fontWeight: 600 }}>AWAITING OFFICER REVIEW</div>
        </div>
        <div className="waste-stat-card">
          <div className="stat-header">
            <span className="stat-icon-box" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', color: '#059669' }}>
              <IconCheckCircle size={24} />
            </span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-value">{disposals.filter(d => d.status === 'Disposed').length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--secondary-400)', marginTop: '0.5rem', fontWeight: 600 }}>SUCCESSFULLY PROCESSED</div>
        </div>
      </div>

      {externalShowModal && (
        <div className="premium-form-container">
          <div className="premium-form-header">
            <h2 className="premium-form-title">
              <IconPlus size={20} style={{ color: 'var(--waste-primary)' }} /> New Disposal Request
            </h2>
            <button 
              onClick={onCloseModal} 
              className="btn-modal-secondary" 
              style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', minWidth: 'auto' }}
            >
              <IconX size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="premium-form-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="premium-form-label">Chemical *</label>
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

                    if (chemId && chem) {
                      try {
                        const res = await axios.get('/api/batches', { params: { chemical_id: chem.id } });
                        setBatches(res.data.data || res.data || []);
                      } catch (err) {
                        console.error('Fetch Batches Error:', err);
                      }
                    } else {
                      setBatches([]);
                    }
                  }}
                  className="premium-form-input"
                >
                  <option value="">Select chemical...</option>
                  {chemicals
                    .filter(c => c.quantity > 0)
                    .map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.cas_number}) - Available: {c.quantity} {c.unit}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="premium-form-label">Batch (Optional)</label>
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
                  className="premium-form-input"
                >
                  <option value="">Auto-FIFO (Oldest first)</option>
                  {batches
                    .filter(b => b.total_quantity > 0)
                    .map(b => (
                      <option key={b._id} value={b._id}>
                        {b.batch_number} - Stock: {b.total_quantity} {b.unit} {b.status === 'Expired' ? '(EXPIRED)' : ''}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="premium-form-label">Quantity *</label>
                <input
                  type="number"
                  required
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  className="premium-form-input"
                />
              </div>

              <div>
                <label className="premium-form-label">Unit *</label>
                <input
                  type="text"
                  required
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                  className="premium-form-input"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="premium-form-label">Reason *</label>
                <select
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="premium-form-input"
                >
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="premium-form-label">Additional Notes (Optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="premium-form-input"
                  rows="1"
                  placeholder="Safety notes..."
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" disabled={submitting} className="btn-premium-submit">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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
            <button 
              className="btn-waste-primary" 
              onClick={externalShowModal ? onCloseModal : onOpenModal}
            >
              {externalShowModal ? <IconX size={18} /> : <IconPlus size={18} />}
              {externalShowModal ? 'Close Form' : 'Log New Disposal'}
            </button>
          )}
        </div>

        <div className="waste-table">
          <div className="waste-thead">
            <div className="waste-header-row">
              <div className="waste-th">ID</div>
              <div className="waste-th">Chemical</div>
              <div className="waste-th">Quantity</div>
              <div className="waste-th waste-hide-1200">Method</div>
              <div className="waste-th">Status</div>
              <div className="waste-th waste-hide-992">Responsible</div>
              <div className="waste-th waste-hide-1200">Date</div>
              <div className="waste-th">Actions</div>
            </div>
          </div>
          <div className="waste-tbody">
            {loading ? (
              <div className="waste-tr"><div className="waste-td" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', justifyContent: 'center' }}>Loading records...</div></div>
            ) : disposals.map(d => {
              // Determine border color based on status
              const getBorderColor = (status) => {
                if(status === 'Approved') return '#10b981'; // Success Green
                if(status === 'Pending Approval') return '#f59e0b'; // Amber
                if(status === 'Rejected') return '#ef4444'; // Red
                if(status === 'Disposed') return '#0ea5e9'; // Blue
                return 'transparent';
              };
              
              return (
              <div className="waste-tr" key={d._id} style={{ borderLeftColor: getBorderColor(d.status), borderLeftWidth: '4px' }}>
                <div className="waste-td" data-label="ID"><span className="waste-id-cell">{d.disposal_id}</span></div>
                <div className="waste-td" data-label="Chemical" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <div className="waste-chemical-name">{d.chemical_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--secondary-400)', fontWeight: '700', marginTop: '0.2rem' }}>{d.hazard_classification}</div>
                </div>
                <div className="waste-td" data-label="Quantity"><span className="waste-quantity-cell">{d.quantity} {d.unit}</span></div>
                <div className="waste-td waste-hide-1200" data-label="Method" style={{ fontWeight: '600' }}>{d.method}</div>
                <div className="waste-td" data-label="Status">
                  <span className={`waste-badge badge-${d.status.toLowerCase().replace(' ', '-')}`}>
                    {d.status}
                  </span>
                </div>
                <div className="waste-td waste-hide-992" data-label="Responsible"><span className="waste-responsible-cell">{d.responsible_person_name}</span></div>
                <div className="waste-td waste-hide-1200" data-label="Date" style={{ fontWeight: '700', color: 'var(--secondary-500)' }}>{new Date(d.disposal_date).toLocaleDateString()}</div>
                <div className="waste-td waste-actions-cell">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {d.status === 'Pending Approval' && hasPermission('approve_disposal') && (
                      <>
                        <button onClick={() => handleApproveClick(d)} className="btn-waste-action action-approve">
                          <IconCheckCircle size={14} style={{ marginRight: '4px' }}/> Approve
                        </button>
                        <button onClick={() => setRejectingId(d._id)} className="btn-waste-action action-reject">
                          <IconX size={14} style={{ marginRight: '4px' }}/> Reject
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
                      }} className="btn-waste-action action-complete">
                        <IconCheckCircle size={14} style={{ marginRight: '4px' }} /> Complete
                      </button>
                    )}
                    <button
                      onClick={() => setViewingDisposal(d)}
                      className="btn-waste-action action-view"
                    >
                      <IconFileText size={14} style={{ marginRight: '4px' }} /> View Details
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>



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
      {approvingDisposal && (
        <div className="waste-modal-overlay">
          <div className="waste-modal-card" style={{ maxWidth: '650px' }}>
            <div className="waste-card-header">
              <h2 className="waste-title" style={{ fontSize: '1.25rem' }}>Approve Disposal: {approvingDisposal.disposal_id}</h2>
              <button onClick={() => setApprovingDisposal(null)} className="btn-waste-action">
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmApproval} style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--secondary-600)', marginBottom: '1rem' }}>
                  The following batches will be affected based on the <strong>FIFO (First to Expire)</strong> policy:
                </p>

                {previewLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary-400)' }}>Calculating FIFO impact...</div>
                ) : fifoPreview ? (
                  <div style={{ background: 'var(--secondary-50)', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--secondary-100)' }}>
                    <table className="waste-table" style={{ fontSize: '0.8rem' }}>
                      <thead style={{ background: 'var(--secondary-100)' }}>
                        <tr>
                          <th>Batch #</th>
                          <th>Current</th>
                          <th>Subtract</th>
                          <th>Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fifoPreview.affected_batches.map(b => (
                          <tr key={b.batch_id}>
                            <td style={{ fontWeight: 700 }}>{b.batch_number} {b.is_targeted && <span style={{ color: 'var(--waste-primary)', fontSize: '0.65rem' }}>(Selected)</span>}</td>
                            <td>{b.current_quantity} {b.unit}</td>
                            <td style={{ color: '#ef4444', fontWeight: 800 }}>-{b.subtract_quantity} {b.unit}</td>
                            <td>{b.remaining_quantity} {b.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {fifoPreview.insufficient_inventory && (
                      <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>
                        <IconAlertTriangle size={14} style={{ marginRight: '0.5rem' }} />
                        Warning: Insufficient inventory. Shortfall: {fifoPreview.shortfall} {fifoPreview.unit}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label-small">Approval Notes</label>
                <textarea
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  className="procurement-input"
                  rows="2"
                  placeholder="Notes for compliance audit..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setApprovingDisposal(null)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" className="btn-waste-primary">
                  Confirm Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
