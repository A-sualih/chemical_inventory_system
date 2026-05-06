import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const STATUS_COLORS = {
  Draft:'bg-secondary-100 text-secondary-600',
  Submitted:'bg-blue-100 text-blue-700',
  Approved:'bg-indigo-100 text-indigo-700',
  Rejected:'bg-red-100 text-red-700',
  Ordered:'bg-purple-100 text-purple-700',
  'Partially Received':'bg-amber-100 text-amber-700',
  Completed:'bg-emerald-100 text-emerald-700',
  Cancelled:'bg-secondary-200 text-secondary-500'
};
const PRIORITY_COLORS = { Low:'text-secondary-400', Normal:'text-blue-500', High:'text-amber-500', Urgent:'text-red-600' };
const CURRENCIES = ['USD','EUR','GBP','JPY','CAD','AUD','CNY'];

const Badge = ({ label, colorClass }) => (
  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${colorClass}`}>{label}</span>
);

const emptyItem = { chemical_name:'', quantity:'', unit:'L', unit_price:'', total_price:'', tax_rate:0, notes:'' };

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
    supplier_id:'', priority:'Normal', currency:'USD',
    expected_delivery:'', notes:'', department:'',
    shipping_fee:0, items:[{ ...emptyItem }]
  });

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, sRes] = await Promise.all([
        axios.get('/api/procurement/orders', { params:{ status:filterStatus, priority:filterPriority, search, page, limit:15 } }),
        axios.get('/api/procurement/suppliers', { params:{ status:'Active', limit:100 } })
      ]);
      setOrders(oRes.data.orders || []);
      setTotal(oRes.data.total || 0);
      setSuppliers(sRes.data.suppliers || []);
    } catch { showToast('Failed to load orders','error'); }
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
  const addItem = () => setForm(f => ({ ...f, items:[...f.items,{...emptyItem}] }));
  const removeItem = idx => setForm(f => ({ ...f, items:f.items.filter((_,i)=>i!==idx) }));
  const grandTotal = form.items.reduce((s,i)=>s+(parseFloat(i.total_price)||0),0) + (parseFloat(form.shipping_fee)||0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, total_cost: grandTotal, subtotal: grandTotal - (parseFloat(form.shipping_fee)||0) };
      await axios.post('/api/procurement/orders', payload);
      setShowModal(false);
      setForm({ supplier_id:'', priority:'Normal', currency:'USD', expected_delivery:'', notes:'', department:'', shipping_fee:0, items:[{...emptyItem}] });
      showToast('Purchase order created');
      fetch();
    } catch (err) { showToast(err.response?.data?.error||'Failed to create PO','error'); }
    finally { setSubmitting(false); }
  };

  const changeStatus = async (id, status, comment='') => {
    try {
      await axios.put(`/api/procurement/orders/${id}/status`, { status, comment });
      showToast(`PO ${status}`);
      fetch();
      if (detailPO?._id === id) openDetail(id);
    } catch (err) { showToast(err.response?.data?.error||'Failed','error'); }
  };

  const openDetail = async (id) => {
    try {
      const res = await axios.get(`/api/procurement/orders/${id}`);
      setDetailPO(res.data.po);
      setDetailData(res.data);
    } catch { showToast('Failed to load PO details','error'); }
  };

  const nextAction = (o) => {
    const map = {
      Draft: { label:'Submit', status:'Submitted', color:'bg-blue-600' },
      Submitted: { label:'Approve', status:'Approved', color:'bg-indigo-600' },
      Approved: { label:'Mark Ordered', status:'Ordered', color:'bg-purple-600' },
      Ordered: { label:'Mark Shipped', status:'Partially Received', color:'bg-amber-600' },
      'Partially Received': { label:'Complete', status:'Completed', color:'bg-emerald-600' }
    };
    return map[o.status] || null;
  };

  const pages = Math.ceil(total / 15);

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-[999] px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 ${toast.type==='error'?'bg-red-600':'bg-emerald-600'} text-white`}>
          {toast.type==='error'?'✕':'✓'} {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search PO number…" className="px-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none flex-1 min-w-[160px]" />
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="px-3 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none">
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e=>{setFilterPriority(e.target.value);setPage(1);}} className="px-3 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none">
            <option value="">All Priorities</option>
            {['Low','Normal','High','Urgent'].map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
        <button onClick={()=>setShowModal(true)} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-all shadow-sm">+ Create PO</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-secondary-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary-50 border-b border-secondary-100">
              <tr>
                {['PO Number','Supplier','Priority','Status','Items','Total','Expected','Actions'].map(h=>(
                  <th key={h} className="px-5 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-50">
              {loading ? (
                [...Array(5)].map((_,i)=>(
                  <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-5 bg-secondary-100 rounded animate-pulse" /></td></tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-secondary-400"><div className="text-4xl mb-3">📋</div><p className="font-bold">No purchase orders found</p></td></tr>
              ) : orders.map(o=>{
                const action = nextAction(o);
                return (
                  <tr key={o._id} className="hover:bg-secondary-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <button onClick={()=>openDetail(o._id)} className="font-black text-secondary-900 hover:text-violet-600 transition-colors text-sm">{o.po_number}</button>
                      <p className="text-[10px] text-secondary-400 font-mono mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-secondary-600">{o.supplier_id?.name||'—'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-black ${PRIORITY_COLORS[o.priority]||''}`}>{'●'} {o.priority}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge label={o.status} colorClass={STATUS_COLORS[o.status]||'bg-secondary-100 text-secondary-500'} />
                    </td>
                    <td className="px-5 py-4 text-sm text-secondary-600">
                      <span className="font-bold">{o.items?.length||0}</span> item{o.items?.length!==1?'s':''}
                    </td>
                    <td className="px-5 py-4 font-black text-secondary-900 text-sm whitespace-nowrap">{o.currency} {o.total_cost?.toLocaleString()}</td>
                    <td className="px-5 py-4 text-xs font-medium text-secondary-500 whitespace-nowrap">{o.expected_delivery?new Date(o.expected_delivery).toLocaleDateString():'—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 items-center">
                        {action && (
                          <button onClick={()=>changeStatus(o._id,action.status)} className={`px-3 py-1.5 ${action.color} text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:opacity-90 transition-all whitespace-nowrap`}>
                            {action.label}
                          </button>
                        )}
                        {!['Cancelled','Completed'].includes(o.status) && (
                          <button onClick={()=>changeStatus(o._id,'Cancelled','Cancelled by user')} className="px-3 py-1.5 bg-secondary-100 text-secondary-500 text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-red-100 hover:text-red-600 transition-all">✕</button>
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
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 rounded-xl border border-secondary-200 text-sm font-bold disabled:opacity-40">← Prev</button>
          {[...Array(Math.min(pages,5))].map((_,i)=>(
            <button key={i} onClick={()=>setPage(i+1)} className={`w-9 h-9 rounded-xl text-sm font-bold ${page===i+1?'bg-violet-600 text-white':'border border-secondary-200 text-secondary-600'}`}>{i+1}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="px-4 py-2 rounded-xl border border-secondary-200 text-sm font-bold disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Create PO Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 pt-8 pb-4 border-b border-secondary-100 rounded-t-3xl">
              <h2 className="text-2xl font-black text-secondary-900">Create Purchase Order</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Supplier *</label>
                  <select required value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                    <option value="">Select Supplier…</option>
                    {suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Priority</label>
                  <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                    {['Low','Normal','High','Urgent'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Currency</label>
                  <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                    {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Expected Delivery *</label>
                  <input required type="date" value={form.expected_delivery} onChange={e=>setForm(f=>({...f,expected_delivery:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Department</label>
                  <input value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Chemical Items *</label>
                  <button type="button" onClick={addItem} className="text-xs font-black text-violet-600 hover:text-violet-700">+ Add Item</button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item,idx)=>(
                    <div key={idx} className="bg-secondary-50 rounded-xl p-4 border border-secondary-100">
                      <div className="grid grid-cols-6 gap-3 items-end">
                        <div className="col-span-2">
                          <label className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Chemical Name</label>
                          <input required value={item.chemical_name} onChange={e=>updateItem(idx,'chemical_name',e.target.value)} className="w-full bg-white border border-secondary-200 rounded-lg px-3 py-2 text-sm font-medium outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Qty</label>
                          <input required type="number" min="0" value={item.quantity} onChange={e=>updateItem(idx,'quantity',e.target.value)} className="w-full bg-white border border-secondary-200 rounded-lg px-3 py-2 text-sm font-medium outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Unit</label>
                          <input value={item.unit} onChange={e=>updateItem(idx,'unit',e.target.value)} placeholder="L, kg…" className="w-full bg-white border border-secondary-200 rounded-lg px-3 py-2 text-sm font-medium outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Unit Price</label>
                          <input required type="number" step="0.01" min="0" value={item.unit_price} onChange={e=>updateItem(idx,'unit_price',e.target.value)} className="w-full bg-white border border-secondary-200 rounded-lg px-3 py-2 text-sm font-medium outline-none" />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Total</label>
                            <div className="bg-secondary-100 rounded-lg px-3 py-2 text-sm font-black text-secondary-700">{parseFloat(item.total_price||0).toFixed(2)}</div>
                          </div>
                          {form.items.length > 1 && (
                            <button type="button" onClick={()=>removeItem(idx)} className="w-8 h-8 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-all flex items-center justify-center font-bold text-sm">✕</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Shipping Fee</label>
                  <input type="number" step="0.01" min="0" value={form.shipping_fee} onChange={e=>setForm(f=>({...f,shipping_fee:e.target.value}))} className="w-28 bg-white border border-secondary-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none text-right" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-violet-200">
                  <span className="font-black text-secondary-700">Grand Total ({form.currency})</span>
                  <span className="text-2xl font-black text-violet-600">{grandTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none resize-none" />
              </div>

              <div className="flex gap-3 pt-2 border-t border-secondary-100">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 bg-secondary-50 border border-secondary-200 text-secondary-700 rounded-xl font-bold hover:bg-secondary-100 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all disabled:opacity-50">
                  {submitting?'Creating…':'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPO && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 pt-8 pb-4 border-b border-secondary-100 rounded-t-3xl flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-secondary-900">{detailPO.po_number}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <Badge label={detailPO.status} colorClass={STATUS_COLORS[detailPO.status]||''} />
                  <span className={`text-xs font-black ${PRIORITY_COLORS[detailPO.priority]}`}>● {detailPO.priority}</span>
                </div>
              </div>
              <button onClick={()=>{setDetailPO(null);setDetailData(null);}} className="w-9 h-9 rounded-xl bg-secondary-100 flex items-center justify-center font-bold text-secondary-600 hover:bg-secondary-200">✕</button>
            </div>

            <div className="px-8 py-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary-50 rounded-xl p-4">
                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Supplier</p>
                  <p className="font-black text-secondary-900">{detailPO.supplier_id?.name||'—'}</p>
                  <p className="text-xs text-secondary-500">{detailPO.supplier_id?.contact_email}</p>
                </div>
                <div className="bg-secondary-50 rounded-xl p-4">
                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Order Details</p>
                  <p className="text-sm font-bold text-secondary-700">By: {detailPO.requested_by?.name||'—'}</p>
                  <p className="text-sm font-bold text-secondary-700">Expected: {detailPO.expected_delivery?new Date(detailPO.expected_delivery).toLocaleDateString():'—'}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-3">Chemical Items</h4>
                <div className="bg-secondary-50 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-secondary-100">
                      <tr>
                        {['Chemical','Qty','Unit','Unit Price','Total'].map(h=>(
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-secondary-400 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {detailPO.items?.map((item,i)=>(
                        <tr key={i}>
                          <td className="px-4 py-2.5 font-bold text-secondary-900">{item.chemical_name}</td>
                          <td className="px-4 py-2.5 text-secondary-600">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-secondary-600">{item.unit}</td>
                          <td className="px-4 py-2.5 text-secondary-600">{item.unit_price?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 font-black text-secondary-900">{item.total_price?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-secondary-200 flex justify-between font-black text-secondary-900">
                    <span>Grand Total ({detailPO.currency})</span>
                    <span className="text-violet-600">{detailPO.total_cost?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Approval History */}
              {detailPO.approval_history?.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-3">Audit Trail</h4>
                  <div className="space-y-2">
                    {detailPO.approval_history.map((h,i)=>(
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm font-black text-secondary-900">{h.action} <span className="font-medium text-secondary-500">by {h.performed_by_name||'—'}</span></p>
                          {h.comment && <p className="text-xs text-secondary-400 mt-0.5">{h.comment}</p>}
                          <p className="text-[10px] text-secondary-300 mt-0.5">{new Date(h.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailPO.notes && (
                <div className="bg-secondary-50 rounded-xl p-4">
                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-sm font-medium text-secondary-700">{detailPO.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
