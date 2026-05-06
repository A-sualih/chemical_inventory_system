import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  IconSearch, IconPlus, IconEdit, IconTrash, IconEye, IconBan,
  IconStar, IconMail, IconPhone, IconGlobe, IconUser, IconFactory, IconMapPin
} from './ProcurementIcons';

const CATEGORIES = ['Chemical Manufacturer','Distributor','Wholesaler','Laboratory Supplier','Specialty Chemical','Raw Materials','Other'];
const STATUSES = ['Active','Inactive','Blacklisted'];
const COUNTRIES = ['USA','UK','Germany','France','China','India','Japan','Canada','Australia','Other'];

const StatusBadge = ({ status }) => {
  const map = { Active:'bg-emerald-100 text-emerald-700', Inactive:'bg-secondary-100 text-secondary-500', Blacklisted:'bg-red-100 text-red-700' };
  return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${map[status]||'bg-secondary-100 text-secondary-500'}`}>{status}</span>;
};

const Stars = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(s => (
      <span key={s} className={`text-sm ${s <= Math.round(rating) ? 'text-amber-400' : 'text-secondary-200'}`}>★</span>
    ))}
    <span className="text-xs text-secondary-400 ml-1 font-medium">{rating?.toFixed(1) || '—'}</span>
  </div>
);

const emptyForm = { name:'', contact_person:'', contact_email:'', contact_phone:'', address:'', country:'USA', website:'', tax_vat_number:'', category:'Distributor', chemical_types_supplied:'', status:'Active', is_preferred:false, notes:'', contract_expiry:'' };

export default function SuppliersTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [detailSupplier, setDetailSupplier] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, status: filterStatus, category: filterCategory, sort, page, limit: 12 };
      const res = await axios.get('/api/procurement/suppliers', { params });
      setSuppliers(res.data.suppliers || []);
      setTotal(res.data.total || 0);
    } catch (e) { showToast('Failed to fetch suppliers', 'error'); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterCategory, sort, page]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openAdd = () => { setEditing(null); setFormData(emptyForm); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setFormData({ ...emptyForm, ...s, chemical_types_supplied: (s.chemical_types_supplied||[]).join(', '), contract_expiry: s.contract_expiry ? s.contract_expiry.split('T')[0] : '' });
    setShowModal(true);
  };

  const openDetail = async (s) => {
    setDetailSupplier(s);
    try {
      const res = await axios.get(`/api/procurement/suppliers/${s._id}`);
      setDetailData(res.data);
    } catch { setDetailData({ supplier: s, recentOrders: [], reviews: [] }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData, chemical_types_supplied: formData.chemical_types_supplied.split(',').map(x=>x.trim()).filter(Boolean) };
      if (editing) {
        await axios.put(`/api/procurement/suppliers/${editing._id}`, payload);
        showToast('Supplier updated successfully');
      } else {
        await axios.post('/api/procurement/suppliers', payload);
        showToast('Supplier created successfully');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) { showToast(err.response?.data?.error || 'Failed to save supplier', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier? This action cannot be undone.')) return;
    try {
      await axios.delete(`/api/procurement/suppliers/${id}`);
      showToast('Supplier deleted');
      fetchSuppliers();
    } catch (err) { showToast(err.response?.data?.error || 'Delete failed', 'error'); }
  };

  const handleBlacklist = async (id) => {
    const reason = window.prompt('Reason for blacklisting:');
    if (!reason) return;
    try {
      await axios.put(`/api/procurement/suppliers/${id}/blacklist`, { reason });
      showToast('Supplier blacklisted');
      fetchSuppliers();
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const pages = Math.ceil(total / 12);

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[999] px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 transition-all ${toast.type==='error'?'bg-red-600 text-white':'bg-emerald-600 text-white'}`}>
          <span>{toast.type==='error'?'✕':'✓'}</span> {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400"><IconSearch size={15} /></span>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search suppliers…" className="w-full pl-9 pr-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400/30" />
          </div>
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="px-3 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none">
            <option value="">All Statuses</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);setPage(1);}} className="px-3 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none">
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="px-3 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-medium outline-none">
            <option value="name">Sort: Name</option>
            <option value="rating">Sort: Rating</option>
            <option value="reliability">Sort: Reliability</option>
            <option value="spending">Sort: Spending</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>
        <button onClick={openAdd} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-all shadow-sm flex items-center gap-2">
          <IconPlus size={16} /> Add Supplier
        </button>
      </div>

      <p className="text-xs text-secondary-400 font-medium mb-4">{total} supplier{total!==1?'s':''} found</p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_,i)=>(
            <div key={i} className="bg-white rounded-2xl p-6 border border-secondary-100 animate-pulse h-52" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-20 text-secondary-400">
          <div className="mb-4 text-secondary-300"><IconFactory size={56} /></div>
          <p className="font-bold text-lg">No suppliers found</p>
          <p className="text-sm mt-1">Add your first supplier to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map(s => (
            <div key={s._id} className="bg-white rounded-2xl border border-secondary-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {s.is_preferred && <span className="text-amber-500" title="Preferred Supplier"><IconStar size={14} /></span>}
                      <h3 className="font-black text-secondary-900 truncate">{s.name}</h3>
                    </div>
                    <p className="text-xs text-secondary-400 font-mono">{s.supplier_id}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                <div className="mb-3">
                  <Stars rating={s.rating} />
                </div>

                <div className="space-y-1.5 text-xs text-secondary-500 font-medium mb-4">
                  <p className="flex items-center gap-1.5"><IconMail size={12} className="shrink-0" /> {s.contact_email || '—'}</p>
                  <p className="flex items-center gap-1.5"><IconPhone size={12} className="shrink-0" /> {s.contact_phone || '—'}</p>
                  <p className="flex items-center gap-1.5"><IconGlobe size={12} className="shrink-0" /> {s.country} · {s.category}</p>
                  {s.contact_person && <p className="flex items-center gap-1.5"><IconUser size={12} className="shrink-0" /> {s.contact_person}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-secondary-100">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Orders</p>
                    <p className="text-base font-black text-secondary-900">{s.total_orders}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">On-Time</p>
                    <p className={`text-base font-black ${s.on_time_delivery_rate>=90?'text-emerald-600':s.on_time_delivery_rate>=70?'text-amber-600':'text-red-600'}`}>{s.on_time_delivery_rate}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Reliability</p>
                    <p className={`text-base font-black ${s.reliability_score>=80?'text-emerald-600':s.reliability_score>=60?'text-amber-600':'text-red-600'}`}>{s.reliability_score}</p>
                  </div>
                </div>
              </div>

              <div className="flex border-t border-secondary-100 divide-x divide-secondary-100">
                <button onClick={()=>openDetail(s)} className="flex-1 py-2.5 text-xs font-bold text-secondary-500 hover:text-violet-600 hover:bg-violet-50 transition-all flex items-center justify-center gap-1"><IconEye size={13}/>View</button>
                <button onClick={()=>openEdit(s)} className="flex-1 py-2.5 text-xs font-bold text-secondary-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-1"><IconEdit size={13}/>Edit</button>
                {s.status !== 'Blacklisted' && <button onClick={()=>handleBlacklist(s._id)} className="flex-1 py-2.5 text-xs font-bold text-secondary-500 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-1"><IconBan size={13}/>Blacklist</button>}
                <button onClick={()=>handleDelete(s._id)} className="flex-1 py-2.5 text-xs font-bold text-secondary-500 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-1"><IconTrash size={13}/>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 rounded-xl border border-secondary-200 text-sm font-bold disabled:opacity-40">← Prev</button>
          {[...Array(pages)].map((_,i)=>(
            <button key={i} onClick={()=>setPage(i+1)} className={`w-9 h-9 rounded-xl text-sm font-bold ${page===i+1?'bg-violet-600 text-white':'border border-secondary-200 text-secondary-600 hover:bg-secondary-50'}`}>{i+1}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="px-4 py-2 rounded-xl border border-secondary-200 text-sm font-bold disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 pt-8 pb-4 border-b border-secondary-100 rounded-t-3xl">
              <h2 className="text-2xl font-black text-secondary-900">{editing?'Edit Supplier':'Add New Supplier'}</h2>
              <p className="text-sm text-secondary-400 mt-1">Fill in supplier details and contact information</p>
            </div>
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Company Name *</label>
                  <input required value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Contact Person</label>
                  <input value={formData.contact_person} onChange={e=>setFormData({...formData,contact_person:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Email</label>
                  <input type="email" value={formData.contact_email} onChange={e=>setFormData({...formData,contact_email:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Phone</label>
                  <input value={formData.contact_phone} onChange={e=>setFormData({...formData,contact_phone:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Country</label>
                  <select value={formData.country} onChange={e=>setFormData({...formData,country:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                    {COUNTRIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Office Address</label>
                  <input value={formData.address} onChange={e=>setFormData({...formData,address:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Category</label>
                  <select value={formData.category} onChange={e=>setFormData({...formData,category:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Status</label>
                  <select value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none">
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Tax / VAT Number</label>
                  <input value={formData.tax_vat_number} onChange={e=>setFormData({...formData,tax_vat_number:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Contract Expiry</label>
                  <input type="date" value={formData.contract_expiry} onChange={e=>setFormData({...formData,contract_expiry:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Chemical Types Supplied <span className="normal-case font-medium">(comma-separated)</span></label>
                  <input placeholder="e.g. Acids, Solvents, Reagents" value={formData.chemical_types_supplied} onChange={e=>setFormData({...formData,chemical_types_supplied:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5 block">Notes</label>
                  <textarea rows={3} value={formData.notes} onChange={e=>setFormData({...formData,notes:e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none resize-none" />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="preferred" checked={formData.is_preferred} onChange={e=>setFormData({...formData,is_preferred:e.target.checked})} className="w-4 h-4 rounded accent-violet-600" />
                  <label htmlFor="preferred" className="text-sm font-bold text-secondary-700">Mark as Preferred Supplier ⭐</label>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-secondary-100">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 bg-secondary-50 border border-secondary-200 text-secondary-700 rounded-xl font-bold hover:bg-secondary-100 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all disabled:opacity-50">
                  {submitting ? 'Saving…' : editing ? 'Update Supplier' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailSupplier && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 pt-8 pb-4 border-b border-secondary-100 rounded-t-3xl flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {detailSupplier.is_preferred && <span className="text-amber-500"><IconStar size={16}/></span>}
                  <h2 className="text-2xl font-black text-secondary-900">{detailSupplier.name}</h2>
                </div>
                <p className="text-sm text-secondary-400 mt-0.5 font-mono">{detailSupplier.supplier_id} · {detailSupplier.category}</p>
              </div>
              <button onClick={()=>{setDetailSupplier(null);setDetailData(null);}} className="w-9 h-9 rounded-xl bg-secondary-100 text-secondary-600 hover:bg-secondary-200 transition-all flex items-center justify-center font-bold">✕</button>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label:'Total Orders', value: detailSupplier.total_orders },
                  { label:'On-Time Rate', value: `${detailSupplier.on_time_delivery_rate}%` },
                  { label:'Reliability', value: detailSupplier.reliability_score },
                  { label:'Avg Lead Time', value: `${detailSupplier.average_lead_time_days}d` }
                ].map(s=>(
                  <div key={s.label} className="bg-secondary-50 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">{s.label}</p>
                    <p className="text-xl font-black text-secondary-900 mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="bg-secondary-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2">Contact Information</h4>
                <p className="text-sm font-medium text-secondary-700 flex items-center gap-2"><IconUser size={14}/> {detailSupplier.contact_person || '—'}</p>
                <p className="text-sm font-medium text-secondary-700 flex items-center gap-2"><IconMail size={14}/> {detailSupplier.contact_email || '—'}</p>
                <p className="text-sm font-medium text-secondary-700 flex items-center gap-2"><IconPhone size={14}/> {detailSupplier.contact_phone || '—'}</p>
                <p className="text-sm font-medium text-secondary-700 flex items-center gap-2"><IconMapPin size={14}/> {detailSupplier.address || '—'}, {detailSupplier.country}</p>
                {detailSupplier.tax_vat_number && <p className="text-sm font-medium text-secondary-700 flex items-center gap-2"><IconReceipt size={14}/> VAT: {detailSupplier.tax_vat_number}</p>}
              </div>

              {/* Recent Orders */}
              <div>
                <h4 className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-3">Recent Orders</h4>
                {detailData?.recentOrders?.length === 0 ? (
                  <p className="text-sm text-secondary-400 italic">No orders yet</p>
                ) : (
                  <div className="space-y-2">
                    {detailData?.recentOrders?.map(o=>(
                      <div key={o._id} className="flex items-center justify-between bg-secondary-50 rounded-xl px-4 py-2.5">
                        <span className="text-sm font-black text-secondary-900">{o.po_number}</span>
                        <span className="text-sm text-secondary-500 font-medium">{o.currency} {o.total_cost?.toLocaleString()}</span>
                        <span className="text-xs font-bold text-secondary-500">{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {detailSupplier.notes && (
                <div>
                  <h4 className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2">Notes</h4>
                  <p className="text-sm text-secondary-600 font-medium bg-secondary-50 rounded-xl p-4">{detailSupplier.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
