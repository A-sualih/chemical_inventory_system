import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { IconStar, IconAward, IconPlus, IconCheckCircle, IconWarning, IconXCircle } from './ProcurementIcons';

const Stars = ({ value, onClick }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map(s => (
      <button key={s} type={onClick?'button':'button'} onClick={()=>onClick&&onClick(s)}
        className={`transition-transform ${onClick?'hover:scale-125 cursor-pointer':'cursor-default'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24"
          fill={s<=value?'currentColor':'none'}
          stroke="currentColor" strokeWidth={1.5}
          className={s<=value?'text-amber-400':'text-secondary-300'}>
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
      await axios.post('/api/procurement/reviews', form);
      showToast('Review submitted successfully');
      setShowModal(false);
      setForm(emptyForm);
      fetch();
    } catch (err) { showToast(err.response?.data?.error||'Failed','error'); }
    finally { setSubmitting(false); }
  };

  const reliabilityColor = (score) => score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const reliabilityBg = (score) => score >= 80 ? 'bg-emerald-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100';

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-[999] px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 text-white ${toast.type==='error'?'bg-red-600':'bg-emerald-600'}`}>
          {toast.type==='error'?'✕':'✓'} {toast.msg}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-secondary-100/60 p-1.5 rounded-2xl w-fit">
        {[{id:'reviews',label:'Reviews'},{id:'rankings',label:'Supplier Rankings'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveView(t.id)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeView===t.id?'bg-white text-secondary-900 shadow-sm':'text-secondary-500 hover:text-secondary-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeView === 'rankings' && (
        <div className="bg-white rounded-2xl border border-secondary-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-secondary-100 flex justify-between items-center">
            <h3 className="font-black text-secondary-900">Supplier Performance Rankings</h3>
            <p className="text-xs text-secondary-400">Sorted by reliability score</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary-50 border-b border-secondary-100">
                <tr>
                  {['Rank','Supplier','Rating','On-Time','Reliability','Orders','Delayed','Rejected'].map(h=>(
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-50">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-secondary-400 font-medium">Loading…</td></tr>
                ) : rankings.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center"><div className="text-4xl mb-3">⭐</div><p className="text-secondary-400 font-bold">No suppliers to rank yet</p></td></tr>
                ) : rankings.map((s,i) => (
                  <tr key={s._id} className="hover:bg-secondary-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
                        ${i===0?'bg-amber-100 text-amber-700':i===1?'bg-secondary-200 text-secondary-700':i===2?'bg-orange-100 text-orange-700':'bg-secondary-100 text-secondary-500'}`}>
                        {i < 3 ? <IconAward size={16}/> : <span className="text-xs font-black">{i+1}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-secondary-900">{s.name}</p>
                      <p className="text-[10px] font-mono text-secondary-400">{s.supplier_id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400 text-sm">★</span>
                        <span className="font-black text-secondary-900 text-sm">{s.rating?.toFixed(1)||'—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-black text-sm ${s.on_time_delivery_rate>=90?'text-emerald-600':s.on_time_delivery_rate>=70?'text-amber-600':'text-red-600'}`}>{s.on_time_delivery_rate}%</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${reliabilityBg(s.reliability_score)} ${reliabilityColor(s.reliability_score)}`}>{s.reliability_score}</span>
                    </td>
                    <td className="px-5 py-4 font-black text-secondary-700 text-sm">{s.total_orders}</td>
                    <td className="px-5 py-4">
                      <span className={`font-black text-sm ${s.delayed_orders>0?'text-amber-600':'text-secondary-400'}`}>{s.delayed_orders}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-black text-sm ${s.rejected_shipments>0?'text-red-600':'text-secondary-400'}`}>{s.rejected_shipments}</span>
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
          <div className="flex flex-wrap gap-3 mb-6 justify-between items-center">
            <select value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} className="px-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none">
              <option value="">All Suppliers</option>
              {suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <button onClick={()=>setShowModal(true)} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-all shadow-sm flex items-center gap-2">
              <IconPlus size={16}/> Submit Review
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_,i)=><div key={i} className="bg-white rounded-2xl p-6 border border-secondary-100 animate-pulse h-44" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 text-secondary-400">
              <div className="text-secondary-300 mb-3 flex justify-center"><IconStar size={48}/></div>
              <p className="font-bold text-lg">No reviews yet</p>
              <p className="text-sm mt-1">Submit the first vendor performance review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map(r=>(
                <div key={r._id} className="bg-white rounded-2xl border border-secondary-100 shadow-sm p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-secondary-900">{r.supplier_id?.name||'—'}</h3>
                      <p className="text-xs text-secondary-400 mt-0.5">{r.purchase_order_id?.po_number||'General Review'}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <IconStar size={18} className="text-amber-400 fill-amber-400" />
                        <span className="text-xl font-black text-secondary-900">{r.overall_rating?.toFixed(1)}</span>
                      </div>
                      <p className="text-[10px] text-secondary-400">/ 5.0</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[
                      { label:'Delivery', val:r.delivery_punctuality },
                      { label:'Accuracy', val:r.order_accuracy },
                      { label:'Quality', val:r.chemical_quality },
                      { label:'Comms', val:r.communication },
                      { label:'Safety', val:r.safety_compliance }
                    ].map(c=>(
                      <div key={c.label} className="text-center bg-secondary-50 rounded-lg p-2">
                        <p className="text-[8px] font-black text-secondary-400 uppercase tracking-widest">{c.label}</p>
                        <p className="text-base font-black text-secondary-900">{c.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {r.was_on_time && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-md flex items-center gap-1"><IconCheckCircle size={10}/>On Time</span>}
                    {!r.was_on_time && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-md flex items-center gap-1"><IconWarning size={10}/>Late</span>}
                    {r.had_damaged_goods && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded-md flex items-center gap-1"><IconWarning size={10}/>Damaged</span>}
                    {r.had_quantity_mismatch && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-md flex items-center gap-1"><IconWarning size={10}/>Qty Mismatch</span>}
                    {r.shipment_rejected && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md flex items-center gap-1"><IconXCircle size={10}/>Rejected</span>}
                  </div>

                  {r.comments && <p className="text-xs text-secondary-600 italic border-t border-secondary-100 pt-2">" {r.comments} "</p>}
                  <p className="text-[10px] text-secondary-400 mt-2">by {r.reviewed_by_name||r.reviewed_by?.name} · {new Date(r.review_date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 pt-8 pb-4 border-b border-secondary-100 rounded-t-3xl">
              <h2 className="text-xl font-black text-secondary-900">Submit Vendor Review</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              <div>
                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Supplier *</label>
                <select required value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                  <option value="">Select Supplier…</option>
                  {suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              {/* Scoring criteria */}
              <div className="space-y-4 bg-secondary-50 rounded-xl p-5 border border-secondary-100">
                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Performance Scores (1–5 stars) *</p>
                {[
                  { field:'delivery_punctuality', label:'Delivery Punctuality' },
                  { field:'order_accuracy',       label:'Order Accuracy' },
                  { field:'chemical_quality',     label:'Chemical Quality' },
                  { field:'communication',        label:'Communication' },
                  { field:'safety_compliance',    label:'Safety Compliance' }
                ].map(c=>(
                  <div key={c.field} className="flex items-center justify-between">
                    <label className="text-sm font-bold text-secondary-700">{c.label}</label>
                    <Stars value={form[c.field]} onClick={val=>setScore(c.field, val)} />
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-secondary-200">
                  <span className="text-sm font-black text-secondary-900">Overall Rating</span>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 text-lg">★</span>
                    <span className="text-xl font-black text-violet-600">{avgScore()}</span>
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field:'was_on_time',            label:'✓ Delivered On Time' },
                  { field:'had_damaged_goods',      label:'⚠ Had Damaged Goods' },
                  { field:'had_quantity_mismatch',  label:'⚠ Quantity Mismatch' },
                  { field:'shipment_rejected',      label:'✕ Shipment Rejected' }
                ].map(f=>(
                  <label key={f.field} className="flex items-center gap-2 bg-secondary-50 rounded-xl p-3 cursor-pointer border border-secondary-100 hover:border-violet-200 transition-all">
                    <input type="checkbox" checked={form[f.field]} onChange={e=>setForm(p=>({...p,[f.field]:e.target.checked}))} className="accent-violet-600 w-4 h-4" />
                    <span className="text-xs font-bold text-secondary-700">{f.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Comments</label>
                <textarea rows={3} value={form.comments} onChange={e=>setForm(f=>({...f,comments:e.target.value}))} placeholder="Overall feedback…" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none resize-none" />
              </div>

              {(form.had_damaged_goods || form.shipment_rejected) && (
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Incident Description</label>
                  <textarea rows={2} value={form.incident_description} onChange={e=>setForm(f=>({...f,incident_description:e.target.value}))} className="w-full bg-red-50 border border-red-200 rounded-xl p-3 text-sm font-medium outline-none resize-none" />
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-secondary-100">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 bg-secondary-50 border border-secondary-200 text-secondary-700 rounded-xl font-bold hover:bg-secondary-100 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all disabled:opacity-50">
                  {submitting?'Submitting…':'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
