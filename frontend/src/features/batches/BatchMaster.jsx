import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../layout/Layout';
import '../../styles/Batches.css';

import { 
  Tag, Calendar, Truck, Search, Plus, Trash2, Edit3, CheckCircle2, 
  AlertCircle, Clock, Package, X 
} from 'lucide-react';

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
                <Tag size={28} />
              </div>
              <div>
                <h1 className="batches-title">Batch Master</h1>
                <p className="batches-subtitle">Lifecycle tracking for chemical manufacturing lots</p>
              </div>
            </div>

            <div className="batches-action-group">
              <div className="batches-search-wrapper">
                <Search className="batches-search-icon" />
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
                  <Plus size={18} />
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
                  icon: CheckCircle2
                },
                {
                  label: 'Expired',
                  value: batches.filter(b => b.status === 'Expired').length,
                  iconClass: 'stat-icon-rose',
                  icon: AlertCircle
                },
                {
                  label: 'Near Expiry',
                  value: batches.filter(b => b.status === 'Near Expiry').length,
                  iconClass: 'stat-icon-amber',
                  icon: Clock
                },
                {
                  label: 'Total Batches',
                  value: batches.length,
                  iconClass: 'stat-icon-emerald',
                  icon: Package
                },
              ].map((s, i) => (
                <div key={i} className="batch-stat-card">
                  <div className={`batch-stat-icon ${s.iconClass}`}>
                    <s.icon size={24} />
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
                                <Tag size={20} />
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
                              <button onClick={() => handleOpenModal(b)} className="action-icon-btn action-edit"><Edit3 size={16} /></button>
                              <button onClick={() => handleDelete(b._id)} className="action-icon-btn action-delete"><Trash2 size={16} /></button>
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
                    <button onClick={handleCloseModal} className="btn-close-batch">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="batch-form">
                    <div className="form-grid-2">
                      <div className="form-field-group">
                        <label className="form-field-label"><Tag size={12} className="inline mr-1" /> Batch / Lot Number</label>
                        <input 
                          type="text" 
                          value={formData.batch_number} 
                          onChange={e => setFormData({...formData, batch_number: e.target.value})}
                          className="form-field-input"
                          required
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-field-label"><Plus size={12} className="inline mr-1" /> Parent Chemical</label>
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
                        <label className="form-field-label"><Tag size={12} className="inline mr-1" /> Total Batch Quantity</label>
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
                        <label className="form-field-label"><Truck size={12} className="inline mr-1" /> Supplier Name</label>
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
                        <label className="form-field-label"><Calendar size={12} className="inline mr-1" /> Manufactured On</label>
                        <input 
                          type="date" 
                          value={formData.manufacturing_date} 
                          onChange={e => setFormData({...formData, manufacturing_date: e.target.value})}
                          className="form-field-input"
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-field-label"><Calendar size={12} className="inline mr-1" /> Expiry Date</label>
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
