import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Edit2, Trash2, Eye, Ban, Star, Mail, Phone, Globe, 
  User, Factory, MapPin, Receipt, Check, X, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import '../../styles/Procurement.css';

const CATEGORIES = ['Chemical Manufacturer','Distributor','Wholesaler','Laboratory Supplier','Specialty Chemical','Raw Materials','Other'];
const STATUSES = ['Active','Inactive','Blacklisted'];
const COUNTRIES = ['USA','UK','Germany','France','China','India','Japan','Canada','Australia','Other'];

const StatusBadge = ({ status }) => {
  const map = { Active:'status-active', Inactive:'status-inactive', Blacklisted:'status-blacklisted' };
  return <span className={`status-badge ${map[status]||'status-inactive'}`}>{status}</span>;
};

const Stars = ({ rating }) => (
  <div style={{ display: 'flex', gap: '0.125rem', alignItems: 'center' }}>
    {[1,2,3,4,5].map(s => (
      <span key={s} style={{ color: s <= Math.round(rating) ? '#fbbf24' : 'var(--secondary-200)' }}><Star className="w-4 h-4 inline-block" fill={s <= Math.round(rating) ? '#fbbf24' : 'none'} /></span>
    ))}
    <span style={{ fontSize: '0.75rem', color: 'var(--secondary-400)', marginLeft: '0.25rem', fontWeight: 500 }}>{rating?.toFixed(1) || '—'}</span>
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
      const currentPage = Math.max(1, parseInt(page) || 1);
      const params = { 
        search: search || undefined, 
        status: filterStatus || undefined, 
        category: filterCategory || undefined, 
        sort, 
        page: currentPage, 
        limit: 12 
      };
      const res = await axios.get('/api/procurement/suppliers', { params });
      setSuppliers(res.data.suppliers || []);
      setTotal(res.data.total || 0);
    } catch (e) { 
      console.error('Fetch Error:', e.response?.data || e.message);
      showToast('Failed to fetch suppliers', 'error'); 
    }
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
      // Create a clean copy of the formData
      const payload = { ...formData };
      
      // 1. Handle array field: convert comma-separated string to array
      if (typeof payload.chemical_types_supplied === 'string') {
        payload.chemical_types_supplied = payload.chemical_types_supplied
          .split(',')
          .map(x => x.trim())
          .filter(Boolean);
      }
      
      // 2. Remove all empty strings to avoid Mongoose validation errors
      // (Mongoose often fails on empty strings for Date, Number, or Regex fields)
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (editing) {
        await axios.put(`/api/procurement/suppliers/${editing._id}`, payload);
        showToast('Supplier updated successfully');
      } else {
        await axios.post('/api/procurement/suppliers', payload);
        showToast('Supplier created successfully');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      console.error('Submit Error:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save supplier';
      showToast(errorMsg, 'error');
    }
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
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div className={`procurement-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          <span>{toast.type === 'error' ? <X className="w-4 h-4 inline-block" /> : <Check className="w-4 h-4 inline-block" />}</span> {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="procurement-toolbar">
        <div className="toolbar-filters">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search suppliers…" className="search-input" />
          </div>
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="filter-select">
            <option value="">All Statuses</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);setPage(1);}} className="filter-select">
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="filter-select">
            <option value="name">Sort: Name</option>
            <option value="rating">Sort: Rating</option>
            <option value="reliability">Sort: Reliability</option>
            <option value="spending">Sort: Spending</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>
        <button onClick={openAdd} className="btn-add">
          <Plus size={18} />
          <span>Add Supplier</span>
        </button>
      </div>

      <p className="result-count">{total} supplier{total!==1?'s':''} found</p>

      {/* Grid */}
      {loading ? (
        <div className="supplier-grid">
          {[...Array(6)].map((_,i)=>(
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Factory size={56} /></div>
          <p className="empty-title">No suppliers found</p>
          <p className="empty-desc">Add your first supplier to get started.</p>
        </div>
      ) : (
        <div className="supplier-grid">
          {suppliers.map(s => (
            <div key={s._id} className="supplier-card">
              <div className="card-body">
                <div className="card-header-row">
                  <div className="card-title-group">
                    <div className="card-title-flex">
                      {s.is_preferred && <span className="pref-star" title="Preferred Supplier"><ShieldCheck size={14} /></span>}
                      <h3 className="card-title">{s.name}</h3>
                    </div>
                    <p className="card-id">{s.supplier_id}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                <div className="card-rating">
                  <Stars rating={s.rating} />
                </div>

                <div className="card-details">
                  <p className="detail-line"><Mail size={12} className="detail-icon" /> {s.contact_email || '—'}</p>
                  <p className="detail-line"><Phone size={12} className="detail-icon" /> {s.contact_phone || '—'}</p>
                  <p className="detail-line"><Globe size={12} className="detail-icon" /> {s.country} · {s.category}</p>
                  {s.contact_person && <p className="detail-line"><User size={12} className="detail-icon" /> {s.contact_person}</p>}
                </div>

                <div className="card-stats-grid">
                  <div className="stat-box">
                    <p className="stat-box-label">Orders</p>
                    <p className="stat-box-val">{s.total_orders}</p>
                  </div>
                  <div className="stat-box">
                    <p className="stat-box-label">On-Time</p>
                    <p className={`stat-box-val ${s.on_time_delivery_rate>=90?'text-emerald':s.on_time_delivery_rate>=70?'text-amber':'text-red'}`}>{s.on_time_delivery_rate}%</p>
                  </div>
                  <div className="stat-box">
                    <p className="stat-box-label">Reliability</p>
                    <p className={`stat-box-val ${s.reliability_score>=80?'text-emerald':s.reliability_score>=60?'text-amber':'text-red'}`}>{s.reliability_score}</p>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button onClick={()=>openDetail(s)} className="action-btn action-view"><Eye size={13}/>View</button>
                <button onClick={()=>openEdit(s)} className="action-btn action-edit"><Edit2 size={13}/>Edit</button>
                {s.status !== 'Blacklisted' && <button onClick={()=>handleBlacklist(s._id)} className="action-btn action-danger"><Ban size={13}/>Blacklist</button>}
                <button onClick={()=>handleDelete(s._id)} className="action-btn action-danger"><Trash2 size={13}/>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="page-btn">← Prev</button>
          {[...Array(pages)].map((_,i)=>(
            <button key={i} onClick={()=>setPage(i+1)} className={`page-num ${page===i+1?'active':''}`}>{i+1}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="page-btn">Next →</button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{editing?'Edit Supplier':'Add New Supplier'}</h2>
                <p className="modal-subtitle">Fill in supplier details and contact information</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-col-full">
                  <label className="form-label">Company Name *</label>
                  <input required value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Contact Person</label>
                  <input value={formData.contact_person} onChange={e=>setFormData({...formData,contact_person:e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={formData.contact_email} onChange={e=>setFormData({...formData,contact_email:e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input value={formData.contact_phone} onChange={e=>setFormData({...formData,contact_phone:e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Country</label>
                  <select value={formData.country} onChange={e=>setFormData({...formData,country:e.target.value})} className="form-input">
                    {COUNTRIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-col-full">
                  <label className="form-label">Office Address</label>
                  <input value={formData.address} onChange={e=>setFormData({...formData,address:e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select value={formData.category} onChange={e=>setFormData({...formData,category:e.target.value})} className="form-input">
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})} className="form-input">
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tax / VAT Number</label>
                  <input value={formData.tax_vat_number} onChange={e=>setFormData({...formData,tax_vat_number:e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Contract Expiry</label>
                  <input type="date" value={formData.contract_expiry} onChange={e=>setFormData({...formData,contract_expiry:e.target.value})} className="form-input" />
                </div>
                <div className="form-col-full">
                  <label className="form-label">Chemical Types Supplied <span style={{ textTransform: 'none', fontWeight: 500 }}>(comma-separated)</span></label>
                  <input placeholder="e.g. Acids, Solvents, Reagents" value={formData.chemical_types_supplied} onChange={e=>setFormData({...formData,chemical_types_supplied:e.target.value})} className="form-input" />
                </div>
                <div className="form-col-full">
                  <label className="form-label">Notes</label>
                  <textarea rows={3} value={formData.notes} onChange={e=>setFormData({...formData,notes:e.target.value})} className="form-input form-textarea" />
                </div>
                <div className="form-col-full checkbox-row">
                  <input type="checkbox" id="preferred" checked={formData.is_preferred} onChange={e=>setFormData({...formData,is_preferred:e.target.checked})} className="form-checkbox" />
                  <label htmlFor="preferred" className="checkbox-label">Mark as Preferred Supplier ⭐</label>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={()=>setShowModal(false)} className="btn-cancel">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-submit">
                  {submitting ? 'Saving…' : editing ? 'Update Supplier' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailSupplier && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  {detailSupplier.is_preferred && <span className="pref-star"><Star size={16}/></span>}
                  <h2 className="modal-title">{detailSupplier.name}</h2>
                </div>
                <p className="modal-subtitle">{detailSupplier.supplier_id} · {detailSupplier.category}</p>
              </div>
              <button onClick={()=>{setDetailSupplier(null);setDetailData(null);}} className="modal-close"><X className="w-4 h-4" /></button>
            </div>

            <div className="modal-body">
              {/* Stats row */}
              <div className="detail-section">
                <div className="detail-grid">
                  {[
                    { label:'Total Orders', value: detailSupplier.total_orders },
                    { label:'On-Time Rate', value: `${detailSupplier.on_time_delivery_rate}%` },
                    { label:'Reliability', value: detailSupplier.reliability_score },
                    { label:'Avg Lead Time', value: `${detailSupplier.average_lead_time_days}d` }
                  ].map(s=>(
                    <div key={s.label} className="detail-stat">
                      <p className="detail-stat-label">{s.label}</p>
                      <p className="detail-stat-val">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="detail-section">
                <h4 className="detail-section-title">Contact Information</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p className="detail-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14}/> {detailSupplier.contact_person || '—'}</p>
                  <p className="detail-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14}/> {detailSupplier.contact_email || '—'}</p>
                  <p className="detail-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={14}/> {detailSupplier.contact_phone || '—'}</p>
                  <p className="detail-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14}/> {detailSupplier.address || '—'}, {detailSupplier.country}</p>
                  {detailSupplier.tax_vat_number && <p className="detail-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Receipt size={14}/> VAT: {detailSupplier.tax_vat_number}</p>}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="detail-section" style={{ backgroundColor: 'transparent', padding: '0' }}>
                <h4 className="detail-section-title">Recent Orders</h4>
                {detailData?.recentOrders?.length === 0 ? (
                  <p className="detail-text-sm" style={{ fontStyle: 'italic' }}>No orders yet</p>
                ) : (
                  <div>
                    {detailData?.recentOrders?.map(o=>(
                      <div key={o._id} className="detail-row">
                        <span className="detail-text-bold">{o.po_number}</span>
                        <span className="detail-text">{o.currency} {o.total_cost?.toLocaleString()}</span>
                        <span className="detail-text-sm" style={{ fontWeight: 700 }}>{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {detailSupplier.notes && (
                <div className="detail-section" style={{ backgroundColor: 'transparent', padding: '0', marginTop: '1.5rem' }}>
                  <h4 className="detail-section-title">Notes</h4>
                  <p className="detail-text" style={{ backgroundColor: 'var(--secondary-50)', borderRadius: '0.75rem', padding: '1rem' }}>{detailSupplier.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
