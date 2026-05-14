import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../layout/Layout';
import '../../styles/Batches.css';

// Inline SVG components
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

const SearchIcon = ({ className }) => (
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
  const { user, hasPermission } = useAuth();
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
        axios.get('/api/chemicals?limit=10000')
      ]);
      setBatches(batchRes.data);
      setChemicals(Array.isArray(chemRes.data.data) ? chemRes.data.data : (Array.isArray(chemRes.data) ? chemRes.data : []));
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

  const handleDelete = async (id) => {
    if (window.confirm("Delete this batch record?")) {
      try {
        await axios.delete(`/api/batches/${id}`);
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
      <div className="batches-container">
        <div className="batches-header-bar">
          <div className="batches-header-content">
            <div className="batches-title-section">
              <div className="batches-icon-box">
                <TagIcon className="icon-lg" />
              </div>
              <div>
                <h1 className="batches-title">Batch Master</h1>
                <p className="batches-subtitle">Lifecycle tracking for chemical manufacturing lots</p>
              </div>
            </div>

            <div className="batches-action-group">
              <div className="batches-search-wrapper">
                <SearchIcon className="batches-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search batch #, chemical, supplier..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="batches-search-input"
                />
              </div>
              {hasPermission("create_chemical") && (
                <button onClick={() => handleOpenModal()} className="btn-new-batch">
                  <PlusIcon className="icon-md" />
                  New Batch
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="loader-spinner"></div>
          </div>
        ) : (
          <>
            <div className="batches-stats">
              {[
                {
                  label: 'Active Batches',
                  value: batches.filter(b => b.status === 'Active').length,
                  iconClass: 'stat-icon-indigo',
                  svg: (
                    <svg className="icon-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  label: 'Expired',
                  value: batches.filter(b => b.status === 'Expired').length,
                  iconClass: 'stat-icon-rose',
                  svg: (
                    <svg className="icon-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )
                },
                {
                  label: 'Near Expiry',
                  value: batches.filter(b => b.status === 'Near Expiry').length,
                  iconClass: 'stat-icon-amber',
                  svg: (
                    <svg className="icon-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  label: 'Total Batches',
                  value: batches.length,
                  iconClass: 'stat-icon-emerald',
                  svg: (
                    <svg className="icon-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 0012 10.172V5L11 4z" />
                    </svg>
                  )
                },
              ].map((s, i) => (
                <div key={i} className="batch-stat-card">
                  <div className={`batch-stat-icon ${s.iconClass}`}>
                    {s.svg}
                  </div>
                  <div className="batch-stat-info">
                    <span className="batch-stat-label">{s.label}</span>
                    <span className="batch-stat-value">{s.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="batches-table-wrap">
              <div className="batches-table-card">
                <div style={{ overflowX: 'auto' }}>
                  <table className="batches-table">
                    <thead>
                      <tr>
                        <th>Batch Identity</th>
                        <th>Chemical Reference</th>
                        <th>Supplier / Lot</th>
                        <th>Quantity Status</th>
                        <th>Timeline</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBatches.map(b => (
                        <tr key={b._id}>
                          {/* Batch Identity */}
                          <td data-label="Batch">
                            <div className="batch-id-cell">
                              <div className="batch-id-icon">
                                <TagIcon className="icon-md" />
                              </div>
                              <div>
                                <div className="batch-id-text">{b.batch_number}</div>
                                <div className="batch-chem-text">
                                  {b.manufacturing_date
                                    ? `MFG: ${new Date(b.manufacturing_date).toLocaleDateString()}`
                                    : 'MFG: —'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Chemical Reference */}
                          <td data-label="Chemical">
                            <div className="chem-main-text">{b.chemical_name || '—'}</div>
                            <div className="chem-id-text">{b._id ? `ID: ${b._id.slice(-8).toUpperCase()}` : '—'}</div>
                          </td>

                          {/* Supplier */}
                          <td data-label="Supplier">
                            <div className="chem-main-text">{b.supplier_name || '—'}</div>
                            <div className="batch-chem-text">{b.notes ? b.notes.slice(0, 40) : 'No notes'}</div>
                          </td>

                          {/* Quantity */}
                          <td data-label="Quantity">
                            <div className="qty-cell">
                              <p className="qty-line">
                                {b.total_quantity != null
                                  ? `${b.total_quantity} ${b.unit || ''}`
                                  : '—'}
                              </p>
                              <div className={`status-indicator ${b.status === 'Expired' ? 'status-expired' : b.status === 'Near Expiry' ? 'status-near-expiry' : 'status-active'}`}>
                                {b.status}
                              </div>
                            </div>
                          </td>

                          {/* Timeline */}
                          <td data-label="Timeline">
                            <div className="date-cell">
                              <span className="date-label">Expires</span>
                              <span className="date-value">{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : '—'}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td data-label="Actions">
                            <div className="batch-actions">
                              <button onClick={() => handleOpenModal(b)} className="action-icon-btn action-edit"><PencilIcon className="icon-sm" /></button>
                              <button onClick={() => handleDelete(b._id)} className="action-icon-btn action-delete"><TrashIcon className="icon-sm" /></button>
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
              <div className="batch-modal-overlay">
                <div className="batch-modal-card">
                  <div className="batch-modal-header">
                    <h2 className="batch-modal-title">{isEditing ? 'Master Batch Sync' : 'Initialize New Batch'}</h2>
                    <button onClick={handleCloseModal} className="btn-close-batch">&times;</button>
                  </div>

                  <form onSubmit={handleSubmit} className="batch-form">
                    <div className="form-grid-2">
                      <div className="form-field-group">
                        <label className="form-field-label"><TagIcon className="icon-xs inline mr-1" /> Batch / Lot Number</label>
                        <input 
                          type="text" 
                          value={formData.batch_number} 
                          onChange={e => setFormData({...formData, batch_number: e.target.value})}
                          className="form-field-input"
                          required
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-field-label"><PlusIcon className="icon-xs inline mr-1" /> Parent Chemical</label>
                        <select 
                          value={formData.chemical_id} 
                          onChange={e => setFormData({...formData, chemical_id: e.target.value})}
                          className="form-field-input"
                          required
                        >
                          <option value="">Select chemical...</option>
                          {chemicals.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-field-group">
                        <label className="form-field-label"><TagIcon className="icon-xs inline mr-1" /> Total Batch Quantity</label>
                        <div className="flex-row-gap-2">
                          <input 
                            type="number" 
                            value={formData.total_quantity} 
                            onChange={e => setFormData({...formData, total_quantity: Number(e.target.value)})}
                            className="form-field-input"
                            required
                          />
                          <select 
                            value={formData.unit} 
                            onChange={e => setFormData({...formData, unit: e.target.value})}
                            className="form-field-input w-unit-select"
                          >
                            <option value="L">L</option><option value="kg">kg</option><option value="mL">mL</option><option value="g">g</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-field-group">
                        <label className="form-field-label"><TruckIcon className="icon-xs inline mr-1" /> Supplier Name</label>
                        <input 
                          type="text" 
                          value={formData.supplier_name} 
                          onChange={e => setFormData({...formData, supplier_name: e.target.value})}
                          className="form-field-input"
                          placeholder="e.g. LabChem Supplies"
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-field-group">
                        <label className="form-field-label"><CalendarDaysIcon className="icon-xs inline mr-1" /> Manufactured On</label>
                        <input 
                          type="date" 
                          value={formData.manufacturing_date} 
                          onChange={e => setFormData({...formData, manufacturing_date: e.target.value})}
                          className="form-field-input"
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-field-label"><CalendarDaysIcon className="icon-xs inline mr-1" /> Expiry Date</label>
                        <input 
                          type="date" 
                          value={formData.expiry_date} 
                          onChange={e => setFormData({...formData, expiry_date: e.target.value})}
                          className="form-field-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-field-group">
                      <label className="form-field-label">Aggregated Notes</label>
                      <textarea 
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="form-field-input h-notes-area"
                        placeholder="e.g. High purity batch..."
                      />
                    </div>

                    <div className="batch-form-footer">
                      <button type="button" onClick={handleCloseModal} className="btn-batch-cancel">Discard</button>
                      <button type="submit" className="btn-batch-submit">
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
