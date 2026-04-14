import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import Layout from '../layout/Layout';

// Inline SVG components to replace heroicons for better stability
const TagIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66a2.25 2.25 0 0 0-1.591-.659Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);

const CalendarDaysIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
  </svg>
);

const TruckIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.806H14.25M16.5 18.75h-2.25m0-11.25v11.25m0-11.25H8.25m0 11.25H6.75m3.375-11.25V4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V7.5m-6.75 0h6.75m-10.5 6h10.5" />
  </svg>
);

const MagnifyingGlassIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.247 2.118H8.122a2.25 2.25 0 0 1-2.247-2.118L6.24 5.614m1.13 0c.342-.052.682-.107 1.022-.166m2.321 4.303A1.125 1.125 0 0 1 9.5 12.067H9.26a1.125 1.125 0 0 1-1.125-1.125V9.747c0-.621.504-1.125 1.125-1.125h.24a1.125 1.125 0 0 1 1.125 1.125V10.707Z" />
  </svg>
);

const PencilIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const Batches = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  
  const [formData, setFormData] = useState({
    batch_number: "",
    chemical_id: "",
    total_quantity: 0,
    unit: "L",
    manufacturing_date: "",
    expiry_date: "",
    supplier_name: "",
    status: "Active",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchRes, chemRes] = await Promise.all([
        axios.get('/api/batches'),
        axios.get('/api/chemicals')
      ]);
      setBatches(batchRes.data);
      setChemicals(chemRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setLoading(false);
    }
  };

  const handleOpenModal = (batch = null) => {
    if (batch) {
      setIsEditing(true);
      setCurrentBatchId(batch.batch_number);
      setFormData({
        ...batch,
        manufacturing_date: batch.manufacturing_date ? batch.manufacturing_date.split('T')[0] : "",
        expiry_date: batch.expiry_date ? batch.expiry_date.split('T')[0] : "",
      });
    } else {
      setIsEditing(false);
      setFormData({
        batch_number: `B-${Date.now().toString().slice(-4)}`,
        chemical_id: "",
        total_quantity: 0,
        unit: "L",
        manufacturing_date: "",
        expiry_date: "",
        supplier_name: "",
        status: "Active",
        notes: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentBatchId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`/api/batches/${currentBatchId}`, formData);
      } else {
        await axios.post('/api/batches', formData);
      }
      fetchData();
      handleCloseModal();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving batch");
    }
  };

  const handleDelete = async (num) => {
    if (window.confirm("Delete this batch record?")) {
      try {
        await axios.delete(`/api/batches/${num}`);
        fetchData();
      } catch (err) {
        alert("Error deleting batch");
      }
    }
  };

  const filteredBatches = batches.filter(b => {
    const matchesSearch = 
      (b.batch_number?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (b.chemical_name?.toLowerCase() || "").includes(search.toLowerCase());
    
    const matchesStatus = filterStatus === "All" || b.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-secondary-200 sticky top-0 z-30 px-6 py-4">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-secondary-900 flex items-center gap-3">
                    <TagIcon className="w-8 h-8 text-primary-600" />
                    Batch Intelligence
                  </h1>
                  <p className="text-sm text-secondary-500 font-medium">Aggregate lot management and expiry tracking</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search batch number or chemical..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all outline-none md:w-80"
                    />
                  </div>
                  
                  <button 
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/30 transition-all hover:-translate-y-0.5"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add Batch
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-8">
              <div className="bg-white rounded-[32px] border border-secondary-200 shadow-xl shadow-secondary-200/20 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    {['All', 'Active', 'Near Expiry', 'Expired', 'Recalled'].map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          filterStatus === status 
                          ? 'bg-secondary-900 text-white shadow-lg' 
                          : 'bg-secondary-50 text-secondary-500 hover:bg-secondary-100'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-secondary-50/50">
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Batch Number</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Chemical Identity</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Quantity & Unit</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Timeline</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Supplier</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {filteredBatches.map((batch) => (
                        <tr key={batch._id} className="group hover:bg-secondary-50/30 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white border border-secondary-100 rounded-xl flex items-center justify-center group-hover:border-primary-200 transition-colors">
                                <TagIcon className="w-5 h-5 text-secondary-400 group-hover:text-primary-500" />
                              </div>
                              <span className="text-sm font-black text-secondary-900">{batch.batch_number}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-sm font-bold text-secondary-800">{batch.chemical_name}</div>
                            <div className="text-[10px] text-secondary-400 font-medium">Ref: {batch.chemical_id}</div>
                          </td>
                          <td className="p-6 font-black text-secondary-900">
                            {batch.total_quantity} <span className="text-[11px] text-secondary-400 font-bold uppercase">{batch.unit}</span>
                          </td>
                          <td className="p-6">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary-600">
                                <CalendarDaysIcon className="w-3.5 h-3.5" />
                                Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                              </div>
                              <div className="text-[10px] text-secondary-400 font-medium">Mfg: {new Date(batch.manufacturing_date).toLocaleDateString()}</div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 text-sm text-secondary-700 font-medium">
                              <TruckIcon className="w-4 h-4 text-secondary-400" />
                              {batch.supplier_name || 'Generic Vendor'}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleOpenModal(batch)} className="p-2.5 rounded-xl bg-white border border-secondary-200 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition-all">
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(batch.batch_number)} className="p-2.5 rounded-xl bg-white border border-secondary-200 text-secondary-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                  <div className="p-8 border-b border-secondary-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-secondary-900">{isEditing ? 'Master Batch Sync' : 'Initialize New Batch'}</h2>
                      <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest mt-1 tracking-tighter">Aggregate Lot Management</p>
                    </div>
                    <button onClick={handleCloseModal} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-secondary-50 text-secondary-400 hover:bg-secondary-100 transition-all">&times;</button>
                  </div>

                  <form onSubmit={handleSubmit} className="overflow-y-auto p-8 custom-scrollbar">
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Batch / Lot Number</label>
                          <input 
                            type="text" 
                            value={formData.batch_number} 
                            onChange={e => setFormData({...formData, batch_number: e.target.value})}
                            className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-black text-primary-600"
                            required
                          />
                        </div>
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Parent Chemical</label>
                          <select 
                            value={formData.chemical_id} 
                            onChange={e => setFormData({...formData, chemical_id: e.target.value})}
                            className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm font-bold appearance-none"
                            required
                          >
                            <option value="">Select chemical...</option>
                            {chemicals.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Total Batch Quantity</label>
                          <div className="flex gap-2">
                            <input 
                              type="number" 
                              value={formData.total_quantity} 
                              onChange={e => setFormData({...formData, total_quantity: Number(e.target.value)})}
                              className="flex-1 bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm font-mono"
                              required
                            />
                            <select 
                              value={formData.unit} 
                              onChange={e => setFormData({...formData, unit: e.target.value})}
                              className="w-24 bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm font-bold"
                            >
                              <option value="L">L</option><option value="kg">kg</option><option value="mL">mL</option><option value="g">g</option>
                            </select>
                          </div>
                        </div>
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Supplier Name</label>
                          <div className="relative">
                            <TruckIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" />
                            <input 
                              type="text" 
                              value={formData.supplier_name} 
                              onChange={e => setFormData({...formData, supplier_name: e.target.value})}
                              className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold"
                              placeholder="e.g. LabChem Supplies"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary-50/30 p-8 rounded-[32px] border border-primary-100/50">
                        <h3 className="text-[11px] font-black text-primary-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <CalendarDaysIcon className="w-4 h-4" />
                          Lifecycle Timeline
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="group">
                            <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1.5 block">Manufactured On</label>
                            <input 
                              type="date" 
                              value={formData.manufacturing_date} 
                              onChange={e => setFormData({...formData, manufacturing_date: e.target.value})}
                              className="w-full bg-white border border-secondary-200 rounded-xl p-3 text-sm font-bold"
                            />
                          </div>
                          <div className="group">
                            <label className="text-[10px] font-bold text-red-400 uppercase mb-1.5 block">Expiry Date (Critical)</label>
                            <input 
                              type="date" 
                              value={formData.expiry_date} 
                              onChange={e => setFormData({...formData, expiry_date: e.target.value})}
                              className="w-full bg-white border border-red-200 text-red-600 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-red-500/10 outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="group">
                        <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Aggregated Notes</label>
                        <textarea 
                          value={formData.notes}
                          onChange={e => setFormData({...formData, notes: e.target.value})}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm h-24 resize-none transition-all placeholder:italic"
                          placeholder="e.g. High purity batch, certificate of analysis attached..."
                        />
                      </div>
                    </div>

                    <div className="mt-10 flex gap-4 sticky bottom-0 bg-white pt-4">
                      <button type="button" onClick={handleCloseModal} className="flex-1 px-6 py-4 rounded-2xl font-black text-secondary-500 bg-secondary-50 hover:bg-secondary-100">Discard</button>
                      <button type="submit" className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-primary-500/30 transition-all hover:-translate-y-0.5">
                        {isEditing ? 'Update Batch' : 'Register Batch'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Batches;
