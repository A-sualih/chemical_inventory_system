import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../../layout/Layout';
import '../../styles/Containers.css';
import useUnits from '../../hooks/useUnits';

// Inline SVG components to replace heroicons for stability
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

const MagnifyingGlassIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const BeakerIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v1.307c0 .735-.633 1.28-1.346 1.23a12.049 12.049 0 01-5.876-2.671L1.125 1.75c-.389-.32-.935-.047-.935.459v19.563c0 .506.546.779.935.459l1.403-1.22a12.05 12.05 0 015.876-2.671c.713-.05 1.346.495 1.346 1.23v1.307c0 .542.544.934 1.05.748a12.078 12.078 0 0110.45 0c.506.186 1.05-.206 1.05-.748V3.104c0-.542-.544-.934-1.05-.748a12.078 12.078 0 01-10.45 0c-.506-.186-1.05.206-1.05.748z" />
  </svg>
);

const ArchiveBoxIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);

const TagIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66a2.25 2.25 0 0 0-1.591-.659Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);

const MapPinIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

const ExclamationCircleIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const CalendarIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
  </svg>
);

const InboxIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.656l-1.5-4.5a2.25 2.25 0 0 0-2.138-1.556h-12a2.25 2.25 0 0 0-2.138 1.556l-1.5 4.5a2.25 2.25 0 0 0-.1.656Z" />
  </svg>
);

const QrCodeIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.008v.008H6.75V6.75ZM6.75 16.5h.008v.008H6.75V16.5ZM16.5 6.75h.008v.008H16.5V6.75ZM13.5 13.5h.008v.008h-.008V13.5ZM13.5 19.5h.008v.008h-.008V19.5ZM19.5 13.5h.008v.008h-.008V13.5ZM19.5 19.5h.008v.008h-.008V19.5ZM16.5 16.5h.008v.008H16.5V16.5Z" />
  </svg>
);

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
                    <ArchiveBoxIcon className="icon-xl text-primary-600" />
                    Container Mastery
                  </h1>
                  <p className="containers-main-desc">Granular tracking for individual chemical vessels</p>
                </div>
                
                <div className="containers-actions-group">
                  <div className="containers-search-box">
                    <MagnifyingGlassIcon className="containers-search-icon" />
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
                      <PlusIcon className="icon-md" />
                      Add Container
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="containers-max-width mt-8">
              <div className="containers-stats-grid">
                {[
                  { label: 'Total Containers', value: containers.length, icon: InboxIcon, color: 'primary' },
                  { label: 'In Use', value: containers.filter(c => c.status === 'In Use').length, icon: BeakerIcon, color: 'blue' },
                  { label: 'Expired / Critical', value: containers.filter(c => c.status === 'Expired' || c.status === 'Near Expiry').length, icon: ExclamationCircleIcon, color: 'red' },
                  { label: 'Available', value: containers.filter(c => c.status === 'Full').length, icon: CheckCircleIcon, color: 'green' },
                ].map((stat, i) => (
                  <div key={i} className="container-stat-card">
                    <div className="container-stat-header">
                      <div className={`container-stat-icon-wrap bg-${stat.color}-stat`}>
                        <stat.icon className="icon-lg" />
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
                                <ArchiveBoxIcon className="icon-lg text-secondary-400" />
                              </div>
                              <div>
                                <div className="container-id-text">
                                  {container.container_id}
                                  {container.barcode && <QrCodeIcon className="icon-sm text-secondary-300" />}
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
                                  <TagIcon className="icon-xs" />
                                  <span>Batch: {container.batch_number}</span>
                                </div>
                              )}
                              {container.expiry_date && (
                                <div className={`batch-tag ${new Date(container.expiry_date) < new Date() ? 'bg-red-50-badge' : 'bg-orange-50-badge'}`}>
                                  <CalendarIcon className="icon-xs" />
                                  <span>EXP: {new Date(container.expiry_date).toISOString().split('T')[0]}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td data-label="Location">
                            <div className="location-cell">
                              <div className="location-main">
                                <MapPinIcon className="icon-xs text-primary-500" />
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
                                  <PencilIcon className="icon-sm" />
                                </button>
                              )}
                              {hasPermission("delete_chemical") && (
                                <button onClick={() => handleDelete(container.container_id)} className="btn-icon-action btn-delete">
                                  <TrashIcon className="icon-sm" />
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
                    <button onClick={handleCloseModal} className="btn-close-modal">&times;</button>
                  </div>

                  <form onSubmit={handleSubmit} className="containers-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label-top"><TagIcon className="icon-xs inline mr-1" /> Container ID (Unique)</label>
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
                        <label className="form-label-top"><QrCodeIcon className="icon-xs inline mr-1" /> Barcode / QR (Optional)</label>
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
                      <label className="form-label-top"><BeakerIcon className="icon-xs inline mr-1" /> Chemical Reference</label>
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
                        <label className="form-label-top"><PlusIcon className="icon-xs inline mr-1" /> Quantity per unit</label>
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
                        <label className="form-label-top"><ArchiveBoxIcon className="icon-xs inline mr-1" /> Vessel Type</label>
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
                      <h3 className="storage-header"><MapPinIcon className="icon-sm" />Storage Hierarchy</h3>
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
                        <label className="form-label-top"><TagIcon className="icon-xs inline mr-1" /> Batch Reference</label>
                        <input type="text" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="form-input-standard font-bold" placeholder="Lot / Batch #"/>
                      </div>
                      <div className="form-group">
                        <label className="form-label-top"><ExclamationCircleIcon className="icon-xs inline mr-1" /> Current Status</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="form-input-standard font-bold">
                          <option value="Full">Full</option><option value="In Use">In Use</option><option value="Empty">Empty</option><option value="Expired">Expired</option><option value="Near Expiry">Near Expiry</option><option value="Damaged">Damaged</option>
                        </select>
                      </div>
                    </div>

                    <div className="date-grid">
                      {[{ label: 'MFG Date', key: 'manufacturing_date' }, { label: 'EXP Date', key: 'expiry_date' }, { label: 'Opened on', key: 'opened_date' }].map(d => (
                        <div key={d.key} className="form-group">
                          <label className="form-label-top"><CalendarIcon className="icon-xs inline mr-1" /> {d.label}</label>
                          <div className="date-input-wrap">
                            <CalendarIcon className="date-icon-inline" />
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
