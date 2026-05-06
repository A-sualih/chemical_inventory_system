import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  IconClock, IconCog, IconPackage, IconTruck, IconCheckCircle,
  IconWarning, IconXCircle, IconReturn, IconPlus, IconFilter
} from './ProcurementIcons';

const STATUS_CONFIG = {
  Pending:           { color:'bg-secondary-100 text-secondary-600', Icon: IconClock     },
  Processing:        { color:'bg-blue-100 text-blue-700',           Icon: IconCog       },
  Shipped:           { color:'bg-purple-100 text-purple-700',       Icon: IconPackage   },
  'In Transit':      { color:'bg-amber-100 text-amber-700',         Icon: IconTruck     },
  'Out for Delivery':{ color:'bg-orange-100 text-orange-700',       Icon: IconTruck     },
  Delivered:         { color:'bg-emerald-100 text-emerald-700',     Icon: IconCheckCircle },
  Delayed:           { color:'bg-red-100 text-red-700',             Icon: IconWarning   },
  Cancelled:         { color:'bg-secondary-200 text-secondary-500', Icon: IconXCircle   },
  Returned:          { color:'bg-rose-100 text-rose-700',           Icon: IconReturn    },
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
      const res = await axios.get('/api/procurement/shipments', { params:{ status:filterStatus, page, limit:12 } });
      setShipments(res.data.shipments||[]);
      setTotal(res.data.total||0);
    } catch { showToast('Failed to load shipments','error'); }
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
    <div className="relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-[999] px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 text-white ${toast.type==='error'?'bg-red-600':'bg-emerald-600'}`}>
          {toast.type==='error'?'✕':'✓'} {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="px-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none">
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={()=>setFilterStatus('Delayed')} className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all flex items-center gap-2">
            <IconWarning size={15}/> Show Delayed
          </button>
        </div>
        <p className="text-xs text-secondary-400 font-medium">{total} shipment{total!==1?'s':''}</p>
      </div>

      {/* Shipment Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_,i)=><div key={i} className="bg-white rounded-2xl p-6 border border-secondary-100 animate-pulse h-44" />)}
        </div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-20 text-secondary-400">
          <div className="text-secondary-300 mb-4"><IconTruck size={56}/></div>
          <p className="font-bold text-lg">No shipments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shipments.map(s => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.Pending;
            const { Icon: StatusIcon } = cfg;
            const delayed = isDelayed(s);
            return (
              <div key={s._id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${delayed?'border-red-200':'border-secondary-100'}`}>
                {delayed && <div className="bg-red-500 text-white text-[10px] font-black px-4 py-1.5 uppercase tracking-widest">⚠️ Shipment Delayed</div>}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-black text-secondary-900">{s.purchase_order_id?.po_number||'—'}</h3>
                      <p className="text-xs text-secondary-400 font-medium mt-0.5">{s.supplier_id?.name||'—'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${cfg.color}`}>
                      <StatusIcon size={11}/> {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                    <div>
                      <p className="text-secondary-400 font-black uppercase tracking-widest text-[9px]">Tracking #</p>
                      <p className="font-mono font-bold text-secondary-700 mt-0.5">{s.tracking_number||'—'}</p>
                    </div>
                    <div>
                      <p className="text-secondary-400 font-black uppercase tracking-widest text-[9px]">Carrier</p>
                      <p className="font-bold text-secondary-700 mt-0.5">{s.carrier||'—'}</p>
                    </div>
                    <div>
                      <p className="text-secondary-400 font-black uppercase tracking-widest text-[9px]">Est. Arrival</p>
                      <p className={`font-bold mt-0.5 ${delayed?'text-red-600':'text-secondary-700'}`}>{s.estimated_arrival?new Date(s.estimated_arrival).toLocaleDateString():'—'}</p>
                    </div>
                    <div>
                      <p className="text-secondary-400 font-black uppercase tracking-widest text-[9px]">Condition</p>
                      <p className={`font-bold mt-0.5 ${s.condition==='Good'?'text-emerald-600':s.condition==='Pending Inspection'?'text-amber-600':'text-red-600'}`}>{s.condition||'Pending Inspection'}</p>
                    </div>
                  </div>

                  {/* Mini timeline */}
                  {s.timeline?.length > 0 && (
                    <div className="border-t border-secondary-100 pt-3 mb-3">
                      <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-2">Latest Update</p>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-secondary-700">{s.timeline[s.timeline.length-1]?.description}</p>
                          <p className="text-[10px] text-secondary-400">{new Date(s.timeline[s.timeline.length-1]?.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={()=>openUpdate(s)} className="w-full py-2 bg-secondary-50 border border-secondary-200 text-secondary-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all">
                    Update Shipment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 rounded-xl border border-secondary-200 text-sm font-bold disabled:opacity-40">← Prev</button>
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="px-4 py-2 rounded-xl border border-secondary-200 text-sm font-bold disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Update Modal */}
      {showUpdate && selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="px-8 pt-8 pb-4 border-b border-secondary-100">
              <h2 className="text-xl font-black text-secondary-900">Update Shipment</h2>
              <p className="text-sm text-secondary-400 mt-0.5">{selected.purchase_order_id?.po_number}</p>
            </div>
            <form onSubmit={handleUpdate} className="px-8 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Status</label>
                  <select value={updateForm.status} onChange={e=>setUpdateForm(f=>({...f,status:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                    {ALL_STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Tracking Number</label>
                  <input value={updateForm.tracking_number} onChange={e=>setUpdateForm(f=>({...f,tracking_number:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Carrier</label>
                  <input value={updateForm.carrier} onChange={e=>setUpdateForm(f=>({...f,carrier:e.target.value}))} placeholder="FedEx, UPS…" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Est. Arrival</label>
                  <input type="date" value={updateForm.estimated_arrival} onChange={e=>setUpdateForm(f=>({...f,estimated_arrival:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Condition</label>
                  <select value={updateForm.condition} onChange={e=>setUpdateForm(f=>({...f,condition:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                    {['Good','Partially Damaged','Fully Damaged','Quantity Mismatch','Pending Inspection'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Location</label>
                  <input value={updateForm.location} onChange={e=>setUpdateForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Chicago Hub" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Update Note</label>
                  <textarea rows={2} value={updateForm.description} onChange={e=>setUpdateForm(f=>({...f,description:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-secondary-100">
                <button type="button" onClick={()=>setShowUpdate(false)} className="flex-1 py-3 bg-secondary-50 border border-secondary-200 text-secondary-700 rounded-xl font-bold hover:bg-secondary-100 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all">Update Shipment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
