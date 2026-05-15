import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../../layout/Layout';
import '../../styles/Containers.css';
import useUnits from '../../hooks/useUnits';

import { 
  Package, Trash2, Edit3, Search, Beaker, Archive, Tag, MapPin, 
  AlertCircle, CheckCircle2, Calendar, Inbox, QrCode, Plus, X 
} from 'lucide-react';

const Containers = () => {
  const { user, hasPermission } = useAuth();
  const { unitLabel } = useUnits();
  const navigate = useNavigate();
  const [containers, setContainers] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentContainerId, setCurrentContainerId] = useState(null);
  
  const [formData, setFormData] = useState({
    container_id: "",
    barcode: "",
    chemical_id: "",
    quantity: "",
    unit: "L",
    building: "",
    room: "",
    cabinet: "",
    shelf: "",
    batch_number: "",
    manufacturing_date: "",
    expiry_date: "",
    opened_date: "",
    shelf_life_days: "",
    container_type: "Plastic bottle",
    status: "Full",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contRes, chemRes] = await Promise.all([
        axios.get('/api/containers'),
        axios.get('/api/chemicals?limit=10000')
      ]);
      setContainers(contRes.data);
      setChemicals(Array.isArray(chemRes.data.data) ? chemRes.data.data : (Array.isArray(chemRes.data) ? chemRes.data : []));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setLoading(false);
    }
  };

  const handleOpenModal = (container = null) => {
    if (container) {
      setIsEditing(true);
      setCurrentContainerId(container.container_id);
      setFormData({
        ...container,
        manufacturing_date: container.manufacturing_date ? container.manufacturing_date.split('T')[0] : "",
        expiry_date: container.expiry_date ? container.expiry_date.split('T')[0] : "",
        opened_date: container.opened_date ? container.opened_date.split('T')[0] : "",
      });
    } else {
      setIsEditing(false);
      setFormData({
        container_id: `CONT-${Date.now().toString().slice(-4)}`,
        barcode: "",
        chemical_id: "",
        quantity: "",
        unit: "kg",
        building: "",
        room: "",
        cabinet: "",
        shelf: "",
        batch_number: "",
        manufacturing_date: "",
        expiry_date: "",
        opened_date: "",
        shelf_life_days: "",
        container_type: "Glass bottle",
        status: "Full",
        notes: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentContainerId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`/api/containers/${currentContainerId}`, formData);
      } else {
        await axios.post('/api/containers', formData);
      }
      fetchData();
      handleCloseModal();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving container");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this container?")) {
      try {
        await axios.delete(`/api/containers/${id}`);
        fetchData();
      } catch (err) {
        alert("Error deleting container");
      }
    }
  };

  const filteredContainers = containers.filter(c => {
    const matchesSearch = 
      (c.container_id?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (c.chemical_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (c.batch_number?.toLowerCase() || "").includes(search.toLowerCase());
    
    const matchesStatus = filterStatus === "All" || c.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Full': return 'status-badge-full';
      case 'In Use': return 'status-badge-inuse';
      case 'Empty': return 'status-badge-empty';
      case 'Expired': return 'status-badge-expired';
      case 'Near Expiry': return 'status-badge-near';
      case 'Damaged': return 'status-badge-damaged';
      default: return 'status-badge-default';
    }
  };

  return (
    <Layout>
      <div className="containers-wrapper">
        {loading ? (
          <div className="loader-container" style={{ height: '60vh' }}>
            <div className="loader-spinner"></div>
          </div>
        ) : (
          <>
            <div className="containers-header-sticky">
              <div className="containers-header-content">
                <div className="containers-title-group">
                  <h1 className="containers-main-title">
                    <Archive className="icon-xl text-primary-600" />
                    Container Mastery
                  </h1>
                  <p className="containers-main-desc">Granular tracking for individual chemical vessels</p>
                </div>
                
                <div className="containers-actions-group">
                  <div className="containers-search-box">
                    <Search className="containers-search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search container ID, chemical, batch..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="containers-search-input"
                    />
                  </div>
                  
                  {hasPermission("create_chemical") && (
                    <button 
                      onClick={() => handleOpenModal()}
                      className="btn-add-container"
                    >
                      <Plus className="icon-md" />
                      Add Container
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="containers-max-width mt-8">
              <div className="containers-stats-grid">
                {[
                  { label: 'Total Containers', value: containers.length, icon: Inbox, color: 'primary' },
                  { label: 'In Use', value: containers.filter(c => c.status === 'In Use').length, icon: Beaker, color: 'blue' },
                  { label: 'Expired / Critical', value: containers.filter(c => c.status === 'Expired' || c.status === 'Near Expiry').length, icon: AlertCircle, color: 'red' },
                  { label: 'Available', value: containers.filter(c => c.status === 'Full').length, icon: CheckCircle2, color: 'green' },
                ].map((stat, i) => (
                  <div key={i} className={`container-stat-card border-${stat.color}`}>
                    <div className="container-stat-header">
                      <div className={`container-stat-icon-wrap bg-${stat.color}-stat`}>
                        <stat.icon size={22} className={`text-${stat.color}-600`} />
                      </div>
                      <span className="container-stat-value">{stat.value}</span>
                    </div>
                    <p className="container-stat-label">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="containers-table-card">
                <div className="containers-table-filters">
                  <div className="status-filter-group">
                    {['All', 'Full', 'In Use', 'Empty', 'Expired', 'Near Expiry', 'Damaged'].map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`status-filter-btn ${filterStatus === status ? 'active' : ''}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="containers-table">
                    <thead>
                      <tr>
                        <th>Container Details</th>
                        <th>Chemical & Batch</th>
                        <th>Location</th>
                        <th>Status & Qty</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContainers.map((container) => (
                        <tr key={container._id}>
                          <td data-label="ID">
                            <div className="container-id-cell">
                              <div className="container-icon-box">
                                <Archive size={24} className="text-secondary-400" />
                              </div>
                              <div>
                                <div className="container-id-text">
                                  {container.container_id}
                                  {container.barcode && <QrCode size={14} className="text-secondary-300" />}
                                </div>
                                <div className="container-type-text">{container.container_type}</div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Chemical">
                            <div className="chemical-name-text">{container.chemical_name}</div>
                            <div className="batch-tags">
                              {container.batch_number && (
                                <div className="batch-tag bg-secondary-100">
                                  <Tag size={12} />
                                  <span>Batch: {container.batch_number}</span>
                                </div>
                              )}
                              {container.expiry_date && (
                                <div className={`batch-tag ${new Date(container.expiry_date) < new Date() ? 'bg-red-50-badge' : 'bg-orange-50-badge'}`}>
                                  <Calendar size={12} />
                                  <span>EXP: {new Date(container.expiry_date).toISOString().split('T')[0]}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td data-label="Location">
                            <div className="location-cell">
                              <div className="location-main">
                                <MapPin size={14} className="text-primary-500" />
                                {container.building || 'Unassigned'}-{container.room}
                              </div>
                              <div className="location-sub">
                                Cab: {container.cabinet || '-'}, Sh: {container.shelf || '-'}
                              </div>
                            </div>
                          </td>
                          <td data-label="Status">
                            <div className="status-cell">
                              <span className={`status-badge-inline ${getStatusColor(container.status)}`}>
                                {container.status}
                              </span>
                              <div className="qty-text">
                                {container.quantity} <span className="unit-text">{unitLabel(container.unit)}</span>
                              </div>
                            </div>
                          </td>
                          <td data-label="Actions">
                            <div className="action-btns" style={{ justifyContent: 'flex-end' }}>
                              {hasPermission("update_stock") && (
                                <button onClick={() => handleOpenModal(container)} className="btn-icon-action btn-edit">
                                  <Edit3 size={16} />
                                </button>
                              )}
                              {hasPermission("delete_chemical") && (
                                <button onClick={() => handleDelete(container.container_id)} className="btn-icon-action btn-delete">
                                  <Trash2 size={16} />
                                </button>
                              )}
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
              <div className="containers-modal-overlay">
                <div className="containers-modal">
                  <div className="containers-modal-header">
                    <div>
                      <h2 className="modal-header-title">{isEditing ? 'Edit Vessel' : 'Initialize Container'}</h2>
                      <p className="modal-header-subtitle">Granular Asset Management</p>
                    </div>
                    <button onClick={handleCloseModal} className="btn-close-modal">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="containers-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label-top"><Tag size={12} className="inline mr-1" /> Container ID (Unique)</label>
                        <input 
                          type="text" 
                          value={formData.container_id} 
                          onChange={e => setFormData({...formData, container_id: e.target.value})}
                          className="form-input-standard font-black"
                          placeholder="CONT-XXXX"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label-top"><QrCode size={12} className="inline mr-1" /> Barcode / QR (Optional)</label>
                        <input 
                          type="text" 
                          value={formData.barcode} 
                          onChange={e => setFormData({...formData, barcode: e.target.value})}
                          className="form-input-standard"
                          placeholder="Scan or type barcode"
                        />
                      </div>
                    </div>

                    <div className="form-group full-width mb-6">
                      <label className="form-label-top"><Beaker size={12} className="inline mr-1" /> Chemical Reference</label>
                      <select 
                        value={formData.chemical_id} 
                        onChange={e => setFormData({...formData, chemical_id: e.target.value})}
                        className="form-input-standard font-bold"
                        required
                      >
                        <option value="">Select chemical...</option>
                        {chemicals.map(chem => (
                          <option key={chem.id} value={chem.id}>{chem.name} ({chem.id})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label-top"><Plus size={12} className="inline mr-1" /> Quantity per unit</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <input 
                            type="number" 
                            value={formData.quantity} 
                            onChange={e => setFormData({...formData, quantity: e.target.value})}
                            className="form-input-standard font-mono"
                            required
                          />
                          <select 
                            value={formData.unit} 
                            onChange={e => setFormData({...formData, unit: e.target.value})}
                            className="form-input-standard w-24 font-bold"
                          >
                            <option value="L">L</option><option value="mL">mL</option><option value="kg">kg</option><option value="g">g</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label-top"><Archive size={12} className="inline mr-1" /> Vessel Type</label>
                        <select 
                          value={formData.container_type} 
                          onChange={e => setFormData({...formData, container_type: e.target.value})}
                          className="form-input-standard font-bold"
                        >
                          <option value="Glass bottle">Glass bottle</option>
                          <option value="Plastic bottle">Plastic bottle</option>
                          <option value="Drum">Drum</option>
                          <option value="Tank">Tank</option>
                          <option value="Vial">Vial</option>
                        </select>
                      </div>
                    </div>

                    <div className="storage-hierarchy-box">
                      <h3 className="storage-header"><MapPin size={16} />Storage Hierarchy</h3>
                      <div className="storage-grid-inputs">
                        {['building', 'room', 'cabinet', 'shelf'].map(f => (
                          <div key={f} className="form-group">
                            <label className="form-label-top" style={{ fontSize: '10px', color: 'var(--secondary-400)' }}>{f}</label>
                            <input type="text" value={formData[f]} onChange={e => setFormData({...formData, [f]: e.target.value})} className="form-input-standard" placeholder={f}/>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label-top"><Tag size={12} className="inline mr-1" /> Batch Reference</label>
                        <input type="text" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="form-input-standard font-bold" placeholder="Lot / Batch #"/>
                      </div>
                      <div className="form-group">
                        <label className="form-label-top"><AlertCircle size={12} className="inline mr-1" /> Current Status</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="form-input-standard font-bold">
                          <option value="Full">Full</option><option value="In Use">In Use</option><option value="Empty">Empty</option><option value="Expired">Expired</option><option value="Near Expiry">Near Expiry</option><option value="Damaged">Damaged</option>
                        </select>
                      </div>
                    </div>

                    <div className="date-grid">
                      {[{ label: 'MFG Date', key: 'manufacturing_date' }, { label: 'EXP Date', key: 'expiry_date' }, { label: 'Opened on', key: 'opened_date' }].map(d => (
                        <div key={d.key} className="form-group">
                          <label className="form-label-top"><Calendar size={12} className="inline mr-1" /> {d.label}</label>
                          <div className="date-input-wrap">
                            <Calendar size={16} className="date-icon-inline" />
                            <input type="date" value={formData[d.key]} onChange={e => setFormData({...formData, [d.key]: d.key === 'opened_date' ? (e.target.value || "") : e.target.value})} className="form-input-standard date-field font-bold"/>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="form-group mb-6">
                      <label className="form-label-top">Notes / Observations</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="form-input-standard h-24 italic" placeholder="e.g. Half used during experiment..." style={{ resize: 'none' }}/>
                    </div>

                    <div className="form-footer">
                      <button type="button" onClick={handleCloseModal} className="btn-form-secondary">Discard</button>
                      <button type="submit" className="btn-form-primary">{isEditing ? 'Sync Changes' : 'Initialize Vessel'}</button>
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

export default Containers;
