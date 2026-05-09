import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  IconClock, IconCog, IconPackage, IconTruck, IconCheckCircle,
  IconWarning, IconXCircle, IconReturn, IconPlus, IconFilter
} from './ProcurementIcons';

const STATUS_CONFIG = {
  Pending:           { className:'badge-draft',     Icon: IconClock     },
  Processing:        { className:'badge-submitted', Icon: IconCog       },
  Shipped:           { className:'badge-ordered',   Icon: IconPackage   },
  'In Transit':      { className:'badge-partial',   Icon: IconTruck     },
  'Out for Delivery':{ className:'badge-partial',   Icon: IconTruck     },
  Delivered:         { className:'badge-completed', Icon: IconCheckCircle },
  Delayed:           { className:'badge-rejected',  Icon: IconWarning   },
  Cancelled:         { className:'badge-cancelled', Icon: IconXCircle   },
  Returned:          { className:'badge-rejected',  Icon: IconReturn    },
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
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
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
            <IconWarning size={15}/> Show Delayed
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
          <div className="empty-icon"><IconTruck size={56}/></div>
          <p className="empty-title">No shipments found</p>
        </div>
      ) : (
        <div className="tracking-grid">
          {shipments.map(s => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.Pending;
            const { Icon: StatusIcon } = cfg;
            const delayed = isDelayed(s);
            return (
              <div key={s._id} className={`tracking-card ${delayed ? 'delayed' : ''}`}>
                {delayed && <div className="delayed-banner">⚠️ Shipment Delayed</div>}
                <div className="tracking-card-body">
                  <div className="tracking-card-header">
                    <div>
                      <h3 className="tracking-po-num">{s.purchase_order_id?.po_number||'—'}</h3>
                      <p className="tracking-supplier">{s.supplier_id?.name||'—'}</p>
                    </div>
                    <span className={`status-badge-tracking procurement-badge ${cfg.className}`}>
                      <StatusIcon size={11}/> {s.status}
                    </span>
                  </div>

                  <div className="tracking-info-grid">
                    <div>
                      <p className="info-item-label">Tracking #</p>
                      <p className="info-item-val val-mono">{s.tracking_number||'—'}</p>
                    </div>
                    <div>
                      <p className="info-item-label">Carrier</p>
                      <p className="info-item-val">{s.carrier||'—'}</p>
                    </div>
                    <div>
                      <p className="info-item-label">Est. Arrival</p>
                      <p className={`info-item-val ${delayed ? 'text-delayed' : ''}`}>{s.estimated_arrival?new Date(s.estimated_arrival).toLocaleDateString():'—'}</p>
                    </div>
                    <div>
                      <p className="info-item-label">Condition</p>
                      <p className={`info-item-val ${s.condition==='Good'?'text-emerald':s.condition==='Pending Inspection'?'text-amber':'text-red'}`}>{s.condition||'Pending Inspection'}</p>
                    </div>
                  </div>

                  {/* Mini timeline */}
                  {s.timeline?.length > 0 && (
                    <div className="latest-update-section">
                      <p className="latest-update-title">Latest Update</p>
                      <div className="audit-trail-item">
                        <div className="audit-dot" />
                        <div>
                          <p className="latest-update-desc">{s.timeline[s.timeline.length-1]?.description}</p>
                          <p className="latest-update-time">{new Date(s.timeline[s.timeline.length-1]?.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={()=>openUpdate(s)} className="btn-update-shipment">
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
