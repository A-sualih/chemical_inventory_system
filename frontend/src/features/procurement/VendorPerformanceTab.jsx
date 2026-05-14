import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { IconStar, IconAward, IconPlus, IconCheckCircle, IconWarning, IconXCircle } from './ProcurementIcons';
import { X, Check, Star, AlertTriangle } from 'lucide-react';
import '../../styles/Procurement.css';

const Stars = ({ value, onClick }) => (
  <div className="stars-group">
    {[1,2,3,4,5].map(s => (
      <button key={s} type="button" onClick={()=>onClick&&onClick(s)}
        className={`star-btn ${s <= value ? 'star-filled' : 'star-empty'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="star-icon" viewBox="0 0 24 24"
          fill={s<=value?'currentColor':'none'} stroke="currentColor" strokeWidth={1.5}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
    ))}
  </div>
);

const emptyForm = {
  supplier_id:'', purchase_order_id:'',
  delivery_punctuality:0, order_accuracy:0, chemical_quality:0, communication:0, safety_compliance:0,
  was_on_time:true, had_damaged_goods:false, had_quantity_mismatch:false, shipment_rejected:false,
  comments:'', incident_description:''
};

export default function VendorPerformanceTab() {
  const [reviews, setReviews] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSupplier, setFilterSupplier] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState('reviews');

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes, rankRes] = await Promise.all([
        axios.get('/api/procurement/reviews', { params:{ supplier_id:filterSupplier } }),
        axios.get('/api/procurement/suppliers', { params:{ limit:100 } }),
        axios.get('/api/procurement/suppliers/rankings')
      ]);
      setReviews(rRes.data||[]);
      setSuppliers(sRes.data.suppliers||[]);
      setRankings(rankRes.data||[]);
    } catch { showToast('Failed to load data','error'); }
    finally { setLoading(false); }
  }, [filterSupplier]);

  useEffect(()=>{ fetch(); },[fetch]);

  const setScore = (field, val) => setForm(f=>({...f,[field]:val}));
  const avgScore = () => {
    const scores = [form.delivery_punctuality,form.order_accuracy,form.chemical_quality,form.communication,form.safety_compliance];
    const valid = scores.filter(s=>s>0);
    return valid.length ? (valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(1) : '—';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ([form.delivery_punctuality,form.order_accuracy,form.chemical_quality,form.communication,form.safety_compliance].some(s=>s===0)) {
      showToast('Please rate all 5 criteria','error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });

      await axios.post('/api/procurement/reviews', payload);
      showToast('Review submitted successfully');
      setShowModal(false);
      setForm(emptyForm);
      fetch();
    } catch (err) { 
      console.error('Submit Review Error:', err.response?.data || err.message);
      showToast(err.response?.data?.error || 'Failed to submit review', 'error'); 
    }
    finally { setSubmitting(false); }
  };

  const reliabilityClass = (score) => score >= 80 ? 'reliability-high' : score >= 60 ? 'reliability-mid' : 'reliability-low';

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div className={`procurement-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          <span className="mr-2">{toast.type === 'error' ? <X className="w-4 h-4 inline-block" /> : <Check className="w-4 h-4 inline-block" />}</span> {toast.msg}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="vendor-subtabs">
        {[{id:'reviews',label:'Reviews'},{id:'rankings',label:'Supplier Rankings'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveView(t.id)}
            className={`vendor-subtab ${activeView===t.id?'active':''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeView === 'rankings' && (
        <div className="procurement-table-card">
          <div className="chart-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--secondary-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="chart-title">Supplier Performance Rankings</h3>
            <p className="chart-desc">Sorted by reliability score</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="procurement-table">
              <thead>
                <tr>
                  {['Rank','Supplier','Rating','On-Time','Reliability','Orders','Delayed','Rejected'].map(h=>(
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="empty-table-cell">Loading performance data…</td></tr>
                ) : rankings.length === 0 ? (
                  <tr><td colSpan={8} className="empty-table-cell">
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⭐</div>
                    <p style={{ fontWeight: 900 }}>No suppliers to rank yet</p>
                  </td></tr>
                ) : rankings.map((s,i) => (
                  <tr key={s._id}>
                    <td>
                      <div className={`rank-badge rank-${i < 3 ? i + 1 : 'other'}`}>
                        {i < 3 ? <IconAward size={16}/> : i + 1}
                      </div>
                    </td>
                    <td>
                      <p className="item-name">{s.name}</p>
                      <p className="po-date">{s.supplier_id}</p>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#f59e0b' }}><Star className="w-3 h-3 inline-block" fill="currentColor"/></span>
                        <span style={{ fontWeight: 900, color: 'var(--secondary-900)' }}>{s.rating?.toFixed(1)||'—'}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 900, color: s.on_time_delivery_rate>=90?'#059669':s.on_time_delivery_rate>=70?'#d97706':'#dc2626' }}>{s.on_time_delivery_rate}%</span>
                    </td>
                    <td>
                      <span className={`reliability-pill ${reliabilityClass(s.reliability_score)}`}>{s.reliability_score}</span>
                    </td>
                    <td style={{ fontWeight: 900, color: 'var(--secondary-700)' }}>{s.total_orders}</td>
                    <td>
                      <span style={{ fontWeight: 900, color: s.delayed_orders>0?'#d97706':'var(--secondary-400)' }}>{s.delayed_orders}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 900, color: s.rejected_shipments>0?'#dc2626':'var(--secondary-400)' }}>{s.rejected_shipments}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'reviews' && (
        <div>
          <div className="procurement-toolbar">
            <div className="toolbar-filters">
              <select value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} className="filter-select">
                <option value="">All Suppliers</option>
                {suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={()=>setShowModal(true)} className="btn-add">
              <IconPlus size={16}/> Submit Review
            </button>
          </div>

          {loading ? (
            <div className="tracking-grid">
              {[...Array(4)].map((_,i)=><div key={i} className="skeleton-card" style={{ height: '11rem' }} />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><IconStar size={48}/></div>
              <p className="empty-title">No reviews yet</p>
              <p className="empty-desc">Submit the first vendor performance review.</p>
            </div>
          ) : (
            <div className="tracking-grid">
              {reviews.map(r=>(
                <div key={r._id} className="review-card">
                  <div className="review-header">
                    <div>
                      <h3 className="review-supplier">{r.supplier_id?.name||'—'}</h3>
                      <p className="review-po">{r.purchase_order_id?.po_number||'General Review'}</p>
                    </div>
                    <div className="rating-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <IconStar size={18} className="star-filled" />
                        <span className="rating-val">{r.overall_rating?.toFixed(1)}</span>
                      </div>
                      <p className="rating-max">/ 5.0</p>
                    </div>
                  </div>

                  <div className="criteria-grid">
                    {[
                      { label:'Delivery', val:r.delivery_punctuality },
                      { label:'Accuracy', val:r.order_accuracy },
                      { label:'Quality', val:r.chemical_quality },
                      { label:'Comms', val:r.communication },
                      { label:'Safety', val:r.safety_compliance }
                    ].map(c=>(
                      <div key={c.label} className="criteria-box">
                        <p className="criteria-label">{c.label}</p>
                        <p className="criteria-val">{c.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flag-group">
                    {r.was_on_time && <span className="flag-pill flag-success"><IconCheckCircle size={10}/>On Time</span>}
                    {!r.was_on_time && <span className="flag-pill flag-danger"><IconWarning size={10}/>Late</span>}
                    {r.had_damaged_goods && <span className="flag-pill flag-warning"><IconWarning size={10}/>Damaged</span>}
                    {r.had_quantity_mismatch && <span className="flag-pill flag-warning"><IconWarning size={10}/>Qty Mismatch</span>}
                    {r.shipment_rejected && <span className="flag-pill flag-danger"><IconXCircle size={10}/>Rejected</span>}
                  </div>

                  {r.comments && <p className="review-comment">" {r.comments} "</p>}
                  <p className="review-meta">by {r.reviewed_by_name||r.reviewed_by?.name} · {new Date(r.review_date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Review Modal */}
      {showModal && (
        <div className="procurement-modal-overlay">
          <div className="procurement-modal-card">
            <div className="procurement-modal-header">
              <h2 className="procurement-modal-title">Submit Vendor Review</h2>
            </div>
            <form onSubmit={handleSubmit} className="procurement-modal-body">
              <div className="procurement-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Supplier *</label>
                  <select required value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value}))} className="procurement-input">
                    <option value="">Select Supplier…</option>
                    {suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div className="scoring-card">
                    <p className="form-label-small" style={{ marginBottom: '1rem' }}>Performance Scores (1–5 stars) *</p>
                    {[
                      { field:'delivery_punctuality', label:'Delivery Punctuality' },
                      { field:'order_accuracy',       label:'Order Accuracy' },
                      { field:'chemical_quality',     label:'Chemical Quality' },
                      { field:'communication',        label:'Communication' },
                      { field:'safety_compliance',    label:'Safety Compliance' }
                    ].map(c=>(
                      <div key={c.field} className="scoring-row">
                        <label className="scoring-label">{c.label}</label>
                        <Stars value={form[c.field]} onClick={val=>setScore(c.field, val)} />
                      </div>
                    ))}
                    <div className="overall-row">
                      <span className="overall-label">Overall Rating</span>
                      <div className="overall-val">
                        <span style={{ color: '#f59e0b' }}><Star className="w-4 h-4 inline-block mr-1" fill="currentColor"/></span>
                        <span>{avgScore()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div className="checkbox-grid">
                    {[
                      { field:'was_on_time',            label: <><Check className="w-4 h-4 inline-block mr-1"/> Delivered On Time</> },
                      { field:'had_damaged_goods',      label: <><AlertTriangle className="w-4 h-4 inline-block mr-1"/> Damaged Goods</> },
                      { field:'had_quantity_mismatch',  label: <><AlertTriangle className="w-4 h-4 inline-block mr-1"/> Qty Mismatch</> },
                      { field:'shipment_rejected',      label: <><X className="w-4 h-4 inline-block mr-1"/> Rejected</> }
                    ].map(f=>(
                      <label key={f.field} className="checkbox-pill">
                        <input type="checkbox" checked={form[f.field]} onChange={e=>setForm(p=>({...p,[f.field]:e.target.checked}))} className="checkbox-input" />
                        <span className="checkbox-pill-label">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-small">Comments</label>
                  <textarea rows={2} value={form.comments} onChange={e=>setForm(f=>({...f,comments:e.target.value}))} placeholder="Overall feedback…" className="procurement-input" style={{ resize: 'none' }} />
                </div>

                {(form.had_damaged_goods || form.shipment_rejected) && (
                  <div style={{ gridColumn: 'span 2' }} className="incident-box">
                    <label className="form-label-small" style={{ color: '#b91c1c' }}>Incident Description</label>
                    <textarea rows={2} value={form.incident_description} onChange={e=>setForm(f=>({...f,incident_description:e.target.value}))} className="procurement-input" style={{ backgroundColor: 'white', border: 'none', marginTop: '0.25rem' }} />
                  </div>
                )}
              </div>

              <div className="procurement-modal-footer">
                <button type="button" onClick={()=>setShowModal(false)} className="btn-modal-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-modal-primary">
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
