import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Clock, Settings, Package, Truck, CheckCircle, AlertTriangle, 
  XCircle, RotateCcw, Plus, Filter, X, Check, Eye 
} from 'lucide-react';
import '../../styles/Procurement.css';

const STATUS_CONFIG = {
  Pending:           { className:'badge-draft',     icon: Clock        },
  Processing:        { className:'badge-submitted', icon: Settings     },
  Shipped:           { className:'badge-ordered',   icon: Package      },
  'In Transit':      { className:'badge-partial',   icon: Truck        },
  'Out for Delivery':{ className:'badge-partial',   icon: Truck        },
  Delivered:         { className:'badge-completed', icon: CheckCircle  },
  Delayed:           { className:'badge-rejected',  icon: AlertTriangle },
  Cancelled:         { className:'badge-cancelled', icon: XCircle      },
  Returned:          { className:'badge-rejected',  icon: RotateCcw    },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

export default function OrderTrackingTab() {
  const [shipments, setShipments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status:'', location:'', description:'', tracking_number:'', carrier:'', estimated_arrival:'', condition:'Good' });
  const [showUpdate, setShowUpdate] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const currentPage = Math.max(1, parseInt(page) || 1);
      const res = await axios.get('/api/procurement/shipments', { 
        params: { 
          status: filterStatus || undefined, 
          page: currentPage, 
          limit: 12 
        } 
      });
      setShipments(res.data.shipments || []);
      setTotal(res.data.total || 0);
    } catch (err) { 
      console.error('Fetch Shipments Error:', err.response?.data || err.message);
      showToast('Failed to load shipments', 'error'); 
    }
    finally { setLoading(false); }
  }, [filterStatus, page]);

  useEffect(()=>{ fetch(); },[fetch]);

  const openUpdate = (s) => {
    setSelected(s);
    setUpdateForm({ status:s.status, location:'', description:'', tracking_number:s.tracking_number||'', carrier:s.carrier||'', estimated_arrival:s.estimated_arrival?s.estimated_arrival.split('T')[0]:'', condition:s.condition||'Good' });
    setShowUpdate(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/procurement/shipments/${selected.purchase_order_id?._id||selected.purchase_order_id}`, updateForm);
      showToast('Shipment updated');
      setShowUpdate(false);
      fetch();
    } catch (err) { showToast(err.response?.data?.error||'Failed','error'); }
  };

  const isDelayed = (s) => s.estimated_arrival && new Date() > new Date(s.estimated_arrival) && !['Delivered','Cancelled','Returned'].includes(s.status);
  const pages = Math.ceil(total / 12);

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div className={`procurement-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          <span className="mr-2">{toast.type === 'error' ? <X className="w-4 h-4 inline-block" /> : <Check className="w-4 h-4 inline-block" />}</span> {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="procurement-toolbar">
        <div className="toolbar-filters">
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="filter-select">
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={()=>setFilterStatus('Delayed')} className="btn-filter-delayed">
            <AlertTriangle size={15}/> Show Delayed
          </button>
        </div>
        <p className="result-count">{total} shipment{total!==1?'s':''}</p>
      </div>

      {/* Shipment Cards */}
      {loading ? (
        <div className="tracking-grid">
          {[...Array(4)].map((_,i)=><div key={i} className="skeleton-card" style={{ height: '11rem' }} />)}
        </div>
      ) : shipments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Truck size={56}/></div>
          <p className="empty-title">No shipments found</p>
        </div>
      ) : (
        <div className="tracking-grid">
          {shipments.map(s => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.Pending;
            const StatusIcon = cfg.icon;
            const delayed = isDelayed(s);
            return (
              <div key={s._id} className={`tracking-card ${delayed ? 'delayed' : ''}`} style={{ borderTop: delayed ? '6px solid #ef4444' : s.status === 'Delivered' ? '6px solid #10b981' : '1px solid var(--secondary-100)' }}>
                {delayed && (
                  <div className="delayed-banner" style={{ background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid #fee2e2' }}>
                    <AlertTriangle size={14} /> 
                    <span style={{ fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shipment Delayed</span>
                  </div>
                )}
                <div className="tracking-card-body" style={{ padding: '1.75rem' }}>
                  <div className="tracking-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 className="tracking-po-num" style={{ fontSize: '1.25rem', fontWeight: 950, color: 'var(--secondary-900)', margin: 0, letterSpacing: '-0.02em' }}>{s.purchase_order_id?.po_number||'—'}</h3>
                      <p className="tracking-supplier" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary-500)', marginTop: '0.2rem' }}>{s.supplier_id?.name||'—'}</p>
                    </div>
                    <span className={`status-badge-tracking procurement-badge ${cfg.className}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '2rem' }}>
                      <StatusIcon size={12} /> {s.status}
                    </span>
                  </div>

                  <div className="tracking-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.75rem' }}>
                    <div className="info-item">
                      <p className="info-item-label" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--secondary-400)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Tracking #</p>
                      <p className="info-item-val val-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-700)', fontFamily: 'var(--font-mono)', background: 'var(--secondary-50)', padding: '0.4rem 0.6rem', borderRadius: '0.6rem', width: 'fit-content' }}>{s.tracking_number||'—'}</p>
                    </div>
                    <div className="info-item">
                      <p className="info-item-label" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--secondary-400)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Carrier</p>
                      <p className="info-item-val" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-900)' }}>{s.carrier||'—'}</p>
                    </div>
                    <div className="info-item">
                      <p className="info-item-label" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--secondary-400)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Est. Arrival</p>
                      <p className={`info-item-val ${delayed ? 'text-delayed' : ''}`} style={{ fontSize: '0.875rem', fontWeight: 800, color: delayed ? '#dc2626' : 'var(--secondary-900)' }}>{s.estimated_arrival?new Date(s.estimated_arrival).toLocaleDateString():'—'}</p>
                    </div>
                    <div className="info-item">
                      <p className="info-item-label" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--secondary-400)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Condition</p>
                      <p className={`info-item-val ${s.condition==='Good'?'text-emerald':s.condition==='Pending Inspection'?'text-amber':'text-red'}`} style={{ fontSize: '0.875rem', fontWeight: 800 }}>{s.condition||'Pending Inspection'}</p>
                    </div>
                  </div>

                  {s.timeline?.length > 0 && (
                    <div className="latest-update-section" style={{ background: 'linear-gradient(to right, var(--secondary-50), transparent)', padding: '1rem', borderRadius: '1.25rem', marginBottom: '1.75rem', borderLeft: '3px solid var(--proc-primary)' }}>
                      <p className="latest-update-title" style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--proc-primary)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Latest Update</p>
                      <div className="audit-trail-item" style={{ display: 'flex', gap: '0.75rem' }}>
                        <div>
                          <p className="latest-update-desc" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-800)', margin: 0, lineHeight: 1.4 }}>{s.timeline[s.timeline.length-1]?.description}</p>
                          <p className="latest-update-time" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary-400)', marginTop: '0.25rem' }}>{new Date(s.timeline[s.timeline.length-1]?.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={()=>openUpdate(s)} className="btn-update-shipment" style={{ width: '100%', padding: '0.875rem', borderRadius: '1rem', border: 'none', background: 'var(--proc-primary)', color: 'white', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.3)' }}>
                    <Settings size={16} />
                    Update Shipment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="procurement-pagination">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="page-btn-arrow">← Prev</button>
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="page-btn-arrow">Next →</button>
        </div>
      )}

      {/* Update Modal */}
      {showUpdate && selected && (
        <div className="procurement-modal-overlay">
          <div className="procurement-modal-card" style={{ maxWidth: '32rem' }}>
            <div className="procurement-modal-header">
              <h2 className="procurement-modal-title">Update Shipment</h2>
              <p className="modal-subtitle">{selected.purchase_order_id?.po_number}</p>
            </div>
            <form onSubmit={handleUpdate} className="procurement-modal-body">
              <div className="procurement-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Status</label>
                  <select value={updateForm.status} onChange={e=>setUpdateForm(f=>({...f,status:e.target.value}))} className="procurement-input">
                    {ALL_STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="procurement-form-field">
                  <label className="form-label-small">Tracking Number</label>
                  <input value={updateForm.tracking_number} onChange={e=>setUpdateForm(f=>({...f,tracking_number:e.target.value}))} className="procurement-input" />
                </div>
                <div className="procurement-form-field">
                  <label className="form-label-small">Carrier</label>
                  <input value={updateForm.carrier} onChange={e=>setUpdateForm(f=>({...f,carrier:e.target.value}))} placeholder="FedEx, UPS…" className="procurement-input" />
                </div>
                <div className="procurement-form-field">
                  <label className="form-label-small">Est. Arrival</label>
                  <input type="date" value={updateForm.estimated_arrival} onChange={e=>setUpdateForm(f=>({...f,estimated_arrival:e.target.value}))} className="procurement-input" />
                </div>
                <div className="procurement-form-field">
                  <label className="form-label-small">Condition</label>
                  <select value={updateForm.condition} onChange={e=>setUpdateForm(f=>({...f,condition:e.target.value}))} className="procurement-input">
                    {['Good','Partially Damaged','Fully Damaged','Quantity Mismatch','Pending Inspection'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="procurement-form-field" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Location</label>
                  <input value={updateForm.location} onChange={e=>setUpdateForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Chicago Hub" className="procurement-input" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Update Note</label>
                  <textarea rows={2} value={updateForm.description} onChange={e=>setUpdateForm(f=>({...f,description:e.target.value}))} className="procurement-input" style={{ resize: 'none' }} />
                </div>
              </div>
              <div className="procurement-modal-footer">
                <button type="button" onClick={()=>setShowUpdate(false)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" className="btn-modal-primary">Update Shipment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

