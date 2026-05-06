import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PurchaseOrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({ supplier_id: '', total_cost: '', currency: 'USD', expected_delivery: '', notes: '', item_name: '', item_qty: '', item_unit: '', item_price: '' });

  const fetchData = async () => {
    try {
      const [oRes, sRes] = await Promise.all([
        axios.get('/api/procurement/orders'),
        axios.get('/api/procurement/suppliers')
      ]);
      setOrders(oRes.data);
      setSuppliers(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        supplier_id: formData.supplier_id,
        total_cost: Number(formData.total_cost),
        currency: formData.currency,
        expected_delivery: formData.expected_delivery,
        notes: formData.notes,
        items: [{
          chemical_name: formData.item_name,
          quantity: Number(formData.item_qty),
          unit: formData.item_unit,
          unit_price: Number(formData.item_price),
          total_price: Number(formData.total_cost)
        }]
      };
      await axios.post('/api/procurement/orders', payload);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to create PO');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`/api/procurement/orders/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert('Update failed');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Draft': return 'bg-secondary-100 text-secondary-600';
      case 'Approved': return 'bg-blue-100 text-blue-700';
      case 'Ordered': return 'bg-purple-100 text-purple-700';
      case 'In Transit': return 'bg-amber-100 text-amber-700';
      case 'Received': return 'bg-green-100 text-green-700';
      default: return 'bg-secondary-100 text-secondary-600';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-secondary-900">Purchase Orders</h2>
        <button onClick={() => setShowModal(true)} className="px-5 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all text-sm shadow-sm flex items-center gap-2">
          <span>+ Create PO</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-secondary-100 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-secondary-50 border-b border-secondary-100">
              <th className="p-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">PO Number</th>
              <th className="p-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Supplier</th>
              <th className="p-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Status</th>
              <th className="p-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Items</th>
              <th className="p-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Total Cost</th>
              <th className="p-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-50">
            {orders.map(o => (
              <tr key={o._id} className="hover:bg-secondary-50/50 transition-colors">
                <td className="p-5 font-black text-secondary-900">{o.po_number}</td>
                <td className="p-5 text-sm font-bold text-secondary-600">{o.supplier_id?.name || 'Unknown'}</td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusColor(o.status)}`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-5 text-sm font-medium text-secondary-600">
                  {o.items[0]?.chemical_name} ({o.items[0]?.quantity} {o.items[0]?.unit})
                </td>
                <td className="p-5 font-black text-secondary-900">{o.currency} {o.total_cost?.toLocaleString()}</td>
                <td className="p-5 text-right space-x-2">
                  {o.status === 'Draft' && <button onClick={() => updateStatus(o._id, 'Approved')} className="text-[10px] uppercase tracking-widest font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">Approve</button>}
                  {o.status === 'Approved' && <button onClick={() => updateStatus(o._id, 'Ordered')} className="text-[10px] uppercase tracking-widest font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors">Order</button>}
                  {o.status === 'Ordered' && <button onClick={() => updateStatus(o._id, 'In Transit')} className="text-[10px] uppercase tracking-widest font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">Ship</button>}
                  {o.status === 'In Transit' && <button onClick={() => updateStatus(o._id, 'Received')} className="text-[10px] uppercase tracking-widest font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">Receive</button>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && !loading && (
               <tr>
                 <td colSpan="6" className="p-12 text-center text-secondary-400 font-medium">No purchase orders found.</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-secondary-900 mb-6 tracking-tight">Create Purchase Order</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2 block">Supplier</label>
                  <select required value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20">
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2 block">Expected Delivery</label>
                  <input required type="date" value={formData.expected_delivery} onChange={e => setFormData({...formData, expected_delivery: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
              </div>

              <div className="bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                <h4 className="font-black text-secondary-900 mb-4 text-sm uppercase tracking-wider">Item Details</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1 block">Chemical Name</label>
                    <input required type="text" value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-lg p-2 text-sm font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1 block">Qty</label>
                      <input required type="number" value={formData.item_qty} onChange={e => setFormData({...formData, item_qty: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-lg p-2 text-sm font-medium" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1 block">Unit</label>
                      <input required type="text" value={formData.item_unit} onChange={e => setFormData({...formData, item_unit: e.target.value})} placeholder="L, kg" className="w-full bg-white border border-secondary-200 rounded-lg p-2 text-sm font-medium" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1 block">Unit Price</label>
                    <input required type="number" step="0.01" value={formData.item_price} onChange={e => setFormData({...formData, item_price: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-lg p-2 text-sm font-medium" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1 block">Total Cost</label>
                    <input required type="number" step="0.01" value={formData.total_cost} onChange={e => setFormData({...formData, total_cost: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-lg p-2 text-sm font-medium" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-white border border-secondary-200 text-secondary-700 rounded-xl font-bold hover:bg-secondary-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-sm hover:bg-primary-700 transition-all">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PurchaseOrdersTab;
