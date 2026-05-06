import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SuppliersTab = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact_email: '', contact_phone: '', address: '', website: '' });

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get('/api/procurement/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/procurement/suppliers', formData);
      setShowModal(false);
      setFormData({ name: '', contact_email: '', contact_phone: '', address: '', website: '' });
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save supplier');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-secondary-900">Vendor Directory</h2>
        <button onClick={() => setShowModal(true)} className="px-5 py-2 bg-secondary-900 text-white rounded-xl font-bold hover:bg-black transition-all text-sm shadow-sm">
          + Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <p>Loading...</p> : suppliers.map(supplier => (
          <div key={supplier._id} className="bg-white p-6 rounded-3xl border border-secondary-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-black text-secondary-900">{supplier.name}</h3>
              <span className={`px-2 py-1 rounded text-[10px] font-black tracking-wider uppercase ${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {supplier.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="space-y-2 text-sm text-secondary-600 mb-6 font-medium">
              <p><span className="font-bold text-secondary-900">Email:</span> {supplier.contact_email || 'N/A'}</p>
              <p><span className="font-bold text-secondary-900">Phone:</span> {supplier.contact_phone || 'N/A'}</p>
              <p><span className="font-bold text-secondary-900">Website:</span> {supplier.website || 'N/A'}</p>
            </div>
            
            <div className="pt-5 border-t border-secondary-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">On-Time Rate</p>
                <p className="text-2xl font-black text-secondary-900">{supplier.on_time_delivery_rate}%</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Avg Lead Time</p>
                <p className="text-2xl font-black text-secondary-900">{supplier.average_lead_time_days} <span className="text-sm font-medium text-secondary-500">Days</span></p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-secondary-900 mb-6 tracking-tight">Add Supplier</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2 block">Supplier Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div>
                <label className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2 block">Contact Email</label>
                <input type="email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div>
                <label className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2 block">Contact Phone</label>
                <input type="text" value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-white border border-secondary-200 text-secondary-700 rounded-xl font-bold hover:bg-secondary-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-sm hover:bg-primary-700 transition-all">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SuppliersTab;
