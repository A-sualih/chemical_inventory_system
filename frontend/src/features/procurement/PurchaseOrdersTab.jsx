import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const STATUS_MAP = {
  Draft: 'badge-draft',
  Submitted: 'badge-submitted',
  Approved: 'badge-approved',
  Rejected: 'badge-rejected',
  Ordered: 'badge-ordered',
  'Partially Received': 'badge-partial',
  Completed: 'badge-completed',
  Cancelled: 'badge-cancelled'
};

const PRIORITY_COLORS = { Low: 'color-low', Normal: 'color-normal', High: 'color-high', Urgent: 'color-urgent' };
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY'];

const Badge = ({ label }) => (
  <span className={`procurement-badge ${STATUS_MAP[label] || 'badge-cancelled'}`}>{label}</span>
);

const emptyItem = { chemical_name: '', quantity: '', unit: 'L', unit_price: '', total_price: '', tax_rate: 0, notes: '' };

export default function PurchaseOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [detailPO, setDetailPO] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplier_id: '', priority: 'Normal', currency: 'USD',
    expected_delivery: '', notes: '', department: '',
    shipping_fee: 0, items: [{ ...emptyItem }]
  });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const currentPage = Math.max(1, parseInt(page) || 1);
      const params = { 
        status: filterStatus || undefined, 
        priority: filterPriority || undefined, 
        search: search || undefined, 
        page: currentPage, 
        limit: 15 
      };
      const [oRes, sRes] = await Promise.all([
        axios.get('/api/procurement/orders', { params }),
        axios.get('/api/procurement/suppliers', { params: { status: 'Active', limit: 100 } })
      ]);
      setOrders(oRes.data.orders || []);
      setTotal(oRes.data.total || 0);
      setSuppliers(sRes.data.suppliers || []);
    } catch (err) { 
      console.error('Fetch Orders Error:', err.response?.data || err.message);
      showToast('Failed to load orders', 'error'); 
    }
    finally { setLoading(false); }
  }, [filterStatus, filterPriority, search, page]);

  useEffect(() => { fetch(); }, [fetch]);

  // Auto-calc totals when items change
  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    if (field === 'quantity' || field === 'unit_price') {
      const q = parseFloat(items[idx].quantity) || 0;
      const p = parseFloat(items[idx].unit_price) || 0;
      items[idx].total_price = (q * p).toFixed(2);
    }
    setForm(f => ({ ...f, items }));
  };
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = idx => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const grandTotal = form.items.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0) + (parseFloat(form.shipping_fee) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Create a clean copy of the form
      const payload = { ...form };
      
      // Remove empty strings to avoid Mongoose validation errors
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });
      
      // Recalculate totals for the payload
      payload.total_cost = grandTotal;
      payload.subtotal = grandTotal - (parseFloat(form.shipping_fee) || 0);

      await axios.post('/api/procurement/orders', payload);
      setShowModal(false);
      setForm({ 
        supplier_id: '', priority: 'Normal', currency: 'USD', 
        expected_delivery: '', notes: '', department: '', 
        shipping_fee: 0, items: [{ ...emptyItem }] 
      });
      showToast('Purchase order created');
      fetch();
    } catch (err) { 
      console.error('Create PO Error:', err.response?.data || err.message);
      showToast(err.response?.data?.error || 'Failed to create PO', 'error'); 
    }
    finally { setSubmitting(false); }
  };

  const changeStatus = async (id, status, comment = '') => {
    try {
      await axios.put(`/api/procurement/orders/${id}/status`, { status, comment });
      showToast(`PO ${status}`);
      fetch();
      if (detailPO?._id === id) openDetail(id);
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const openDetail = async (id) => {
    try {
      const res = await axios.get(`/api/procurement/orders/${id}`);
      setDetailPO(res.data.po);
      setDetailData(res.data);
    } catch { showToast('Failed to load PO details', 'error'); }
  };

  const nextAction = (o) => {
    const map = {
      Draft: { label: 'Submit', status: 'Submitted', className: 'btn-action-blue' },
      Submitted: { label: 'Approve', status: 'Approved', className: 'btn-action-indigo' },
      Approved: { label: 'Mark Ordered', status: 'Ordered', className: 'btn-action-purple' },
      Ordered: { label: 'Mark Shipped', status: 'Partially Received', className: 'btn-action-amber' },
      'Partially Received': { label: 'Complete', status: 'Completed', className: 'btn-action-emerald' }
    };
    return map[o.status] || null;
  };

  const pages = Math.ceil(total / 15);

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div className={`procurement-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          <span className="mr-2">{toast.type === 'error' ? <X className="w-4 h-4 inline-block" /> : <Check className="w-4 h-4 inline-block" />}</span> {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="procurement-toolbar">
        <div className="toolbar-filters">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search PO number…" className="search-input" />
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="filter-select">
            <option value="">All Statuses</option>
            {Object.keys(STATUS_MAP).map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }} className="filter-select">
            <option value="">All Priorities</option>
            {['Low', 'Normal', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-add">+ Create PO</button>
      </div>

      {/* Table */}
      <div className="procurement-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="procurement-table">
            <thead>
              <tr>
                {['PO Number', 'Supplier', 'Priority', 'Status', 'Items', 'Total', 'Expected', 'Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={8} style={{ padding: '1.25rem' }}><div className="skeleton-line" /></td></tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="empty-table-cell">
                  <div style={{ marginBottom: '0.75rem' }}><ClipboardList className="w-10 h-10 inline-block text-secondary-500" /></div>
                  <p style={{ fontWeight: 900 }}>No purchase orders found</p>
                </td></tr>
              ) : orders.map(o => {
                const action = nextAction(o);
                return (
                  <tr key={o._id}>
                    <td data-label="PO Number">
                      <button onClick={() => openDetail(o._id)} className="po-number-link">{o.po_number}</button>
                      <p className="po-date">{new Date(o.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td data-label="Supplier" style={{ fontWeight: 700, color: 'var(--secondary-600)' }}>{o.supplier_id?.name || '—'}</td>
                    <td data-label="Priority">
                      <span className={`priority-tag ${PRIORITY_COLORS[o.priority] || ''}`}>● {o.priority}</span>
                    </td>
                    <td data-label="Status">
                      <Badge label={o.status} />
                    </td>
                    <td data-label="Items" style={{ color: 'var(--secondary-600)' }}>
                      <span style={{ fontWeight: 900 }}>{o.items?.length || 0}</span> item{o.items?.length !== 1 ? 's' : ''}
                    </td>
                    <td data-label="Total" style={{ fontWeight: 900, color: 'var(--secondary-900)', whiteSpace: 'nowrap' }}>{o.currency} {o.total_cost?.toLocaleString()}</td>
                    <td data-label="Expected" style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--secondary-500)', whiteSpace: 'nowrap' }}>{o.expected_delivery ? new Date(o.expected_delivery).toLocaleDateString() : '—'}</td>
                    <td data-label="Actions">
                      <div className="procurement-actions-wrapper">
                        {action && (
                          <button onClick={() => changeStatus(o._id, action.status)} className={`btn-table-action ${action.className}`}>
                            {action.label}
                          </button>
                        )}
                        {!['Cancelled', 'Completed'].includes(o.status) && (
                          <button onClick={() => changeStatus(o._id, 'Cancelled', 'Cancelled by user')} className="btn-table-cancel"><X className="w-4 h-4 mx-auto" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="procurement-pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="page-btn-arrow">← Prev</button>
          {[...Array(Math.min(pages, 5))].map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`page-btn-num ${page === i + 1 ? 'active' : ''}`}>{i + 1}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="page-btn-arrow">Next →</button>
        </div>
      )}

      {/* Create PO Modal */}
      {showModal && (
        <div className="procurement-modal-overlay">
          <div className="procurement-modal-card">
            <div className="procurement-modal-header">
              <h2 className="procurement-modal-title">Create Purchase Order</h2>
            </div>
            <form onSubmit={handleSubmit} className="procurement-modal-body">
              <div className="procurement-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Supplier *</label>
                  <select required value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} className="procurement-input">
                    <option value="">Select Supplier…</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="procurement-form-field">
                  <label className="form-label-small">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="procurement-input">
                    {['Low', 'Normal', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="procurement-form-field">
                  <label className="form-label-small">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="procurement-input">
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="procurement-form-field">
                  <label className="form-label-small">Expected Delivery *</label>
                  <input required type="date" value={form.expected_delivery} onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))} className="procurement-input" />
                </div>
                <div className="procurement-form-field">
                  <label className="form-label-small">Department</label>
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="procurement-input" />
                </div>
              </div>

              {/* Items */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="form-label-small">Chemical Items *</label>
                  <button type="button" onClick={addItem} className="btn-add-item-text">+ Add Item</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="po-item-row">
                      <div className="po-item-grid">
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="form-label-small" style={{ fontSize: '9px', marginBottom: '0.25rem', display: 'block' }}>Chemical Name</label>
                          <input required value={item.chemical_name} onChange={e => updateItem(idx, 'chemical_name', e.target.value)} className="procurement-input" style={{ backgroundColor: 'white' }} />
                        </div>
                        <div>
                          <label className="form-label-small" style={{ fontSize: '9px', marginBottom: '0.25rem', display: 'block' }}>Qty</label>
                          <input required type="number" min="0" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="procurement-input" style={{ backgroundColor: 'white' }} />
                        </div>
                        <div>
                          <label className="form-label-small" style={{ fontSize: '9px', marginBottom: '0.25rem', display: 'block' }}>Unit</label>
                          <input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} placeholder="L, kg…" className="procurement-input" style={{ backgroundColor: 'white' }} />
                        </div>
                        <div>
                          <label className="form-label-small" style={{ fontSize: '9px', marginBottom: '0.25rem', display: 'block' }}>Unit Price</label>
                          <input required type="number" step="0.01" min="0" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="procurement-input" style={{ backgroundColor: 'white' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <label className="form-label-small" style={{ fontSize: '9px', marginBottom: '0.25rem', display: 'block' }}>Total</label>
                            <div className="po-item-total">{parseFloat(item.total_price || 0).toFixed(2)}</div>
                          </div>
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="btn-remove-item"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="po-totals-card">
                <div className="po-totals-row">
                  <label className="form-label-small">Shipping Fee</label>
                  <input type="number" step="0.01" min="0" value={form.shipping_fee} onChange={e => setForm(f => ({ ...f, shipping_fee: e.target.value }))} className="procurement-input" style={{ width: '7rem', backgroundColor: 'white', textAlign: 'right' }} />
                </div>
                <div className="po-totals-row" style={{ paddingTop: '0.5rem', borderTop: '1px solid #ddd6fe' }}>
                  <span className="grand-total-label">Grand Total ({form.currency})</span>
                  <span className="grand-total-value">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <label className="form-label-small">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="procurement-input" style={{ resize: 'none' }} />
              </div>

              <div className="procurement-modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-modal-primary">
                  {submitting ? 'Creating…' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPO && (
        <div className="procurement-modal-overlay">
          <div className="procurement-modal-card" style={{ maxWidth: '42rem' }}>
            <div className="procurement-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="procurement-modal-title">{detailPO.po_number}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <Badge label={detailPO.status} />
                  <span className={`priority-tag ${PRIORITY_COLORS[detailPO.priority]}`}>● {detailPO.priority}</span>
                </div>
              </div>
              <button onClick={() => { setDetailPO(null); setDetailData(null); }} className="btn-close-modal"><X className="w-4 h-4" /></button>
            </div>

            <div className="procurement-modal-body">
              <div className="procurement-form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="po-detail-card">
                  <p className="form-label-small" style={{ marginBottom: '0.25rem' }}>Supplier</p>
                  <p style={{ fontWeight: 900, color: 'var(--secondary-900)' }}>{detailPO.supplier_id?.name || '—'}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>{detailPO.supplier_id?.contact_email}</p>
                </div>
                <div className="po-detail-card">
                  <p className="form-label-small" style={{ marginBottom: '0.25rem' }}>Order Details</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-700)' }}>By: {detailPO.requested_by?.name || '—'}</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-700)' }}>Expected: {detailPO.expected_delivery ? new Date(detailPO.expected_delivery).toLocaleDateString() : '—'}</p>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 className="form-label-small" style={{ marginBottom: '0.75rem' }}>Chemical Items</h4>
                <div className="detail-table-wrapper">
                  <table className="detail-table">
                    <thead>
                      <tr>
                        {['Chemical', 'Qty', 'Unit', 'Unit Price', 'Total'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detailPO.items?.map((item, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: 'var(--secondary-900)' }}>{item.chemical_name}</td>
                          <td style={{ color: 'var(--secondary-600)' }}>{item.quantity}</td>
                          <td style={{ color: 'var(--secondary-600)' }}>{item.unit}</td>
                          <td style={{ color: 'var(--secondary-600)' }}>{item.unit_price?.toFixed(2)}</td>
                          <td style={{ fontWeight: 900, color: 'var(--secondary-900)' }}>{item.total_price?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="detail-table-footer">
                    <span>Grand Total ({detailPO.currency})</span>
                    <span style={{ color: '#7c3aed' }}>{detailPO.total_cost?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Approval History */}
              {detailPO.approval_history?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 className="form-label-small" style={{ marginBottom: '0.75rem' }}>Audit Trail</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {detailPO.approval_history.map((h, i) => (
                      <div key={i} className="audit-trail-item">
                        <div className="audit-dot" />
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 900, color: 'var(--secondary-900)' }}>{h.action} <span style={{ fontWeight: 500, color: 'var(--secondary-500)' }}>by {h.performed_by_name || '—'}</span></p>
                          {h.comment && <p style={{ fontSize: '0.75rem', color: 'var(--secondary-400)', marginTop: '0.125rem' }}>{h.comment}</p>}
                          <p style={{ fontSize: '10px', color: 'var(--secondary-300)', marginTop: '0.125rem' }}>{new Date(h.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailPO.notes && (
                <div className="po-detail-card">
                  <p className="form-label-small" style={{ marginBottom: '0.25rem' }}>Notes</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--secondary-700)' }}>{detailPO.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
