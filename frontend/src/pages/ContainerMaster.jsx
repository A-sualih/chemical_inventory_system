import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';

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
  const { user } = useAuth();
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
        axios.get('/api/chemicals')
      ]);
      setContainers(contRes.data);
      setChemicals(chemRes.data);
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
      case 'Full': return 'bg-green-100 text-green-700 border-green-200';
      case 'In Use': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Empty': return 'bg-secondary-100 text-secondary-600 border-secondary-200';
      case 'Expired': return 'bg-red-100 text-red-700 border-red-200';
      case 'Damaged': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-secondary-50 text-secondary-500';
    }
  };

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
                    <ArchiveBoxIcon className="className w-8 h-8 text-primary-600" />
                    Container Mastery
                  </h1>
                  <p className="text-sm text-secondary-500 font-medium">Granular tracking for individual chemical vessels</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search container ID, chemical, batch..." 
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
                    Add Container
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Total Containers', value: containers.length, icon: InboxIcon, color: 'primary' },
                  { label: 'In Use', value: containers.filter(c => c.status === 'In Use').length, icon: BeakerIcon, color: 'blue' },
                  { label: 'Expired', value: containers.filter(c => c.status === 'Expired').length, icon: ExclamationCircleIcon, color: 'red' },
                  { label: 'Available', value: containers.filter(c => c.status === 'Full').length, icon: CheckCircleIcon, color: 'green' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-secondary-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2.5 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-black text-secondary-900">{stat.value}</span>
                    </div>
                    <p className="text-sm font-bold text-secondary-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-[32px] border border-secondary-200 shadow-xl shadow-secondary-200/20 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    {['All', 'Full', 'In Use', 'Empty', 'Expired', 'Damaged'].map(status => (
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
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Container Details</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Chemical & Batch</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Location</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Status & Qty</th>
                        <th className="p-6 text-[11px] font-black text-secondary-500 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {filteredContainers.map((container) => (
                        <tr key={container._id} className="group hover:bg-secondary-50/30 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white border-2 border-secondary-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:border-primary-200 group-hover:bg-primary-50 transition-all">
                                <ArchiveBoxIcon className="w-6 h-6 text-secondary-400 group-hover:text-primary-500" />
                              </div>
                              <div>
                                <div className="text-sm font-black text-secondary-900 flex items-center gap-2">
                                  {container.container_id}
                                  {container.barcode && <QrCodeIcon className="w-4 h-4 text-secondary-300" />}
                                </div>
                                <div className="text-[11px] text-secondary-400 font-bold uppercase tracking-tight">{container.container_type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-sm font-bold text-secondary-800">{container.chemical_name}</div>
                            {container.batch_number && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <TagIcon className="w-3 h-3 text-secondary-400" />
                                <span className="text-[10px] bg-secondary-100 text-secondary-600 px-1.5 py-0.5 rounded font-bold">Batch: {container.batch_number}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary-700">
                                <MapPinIcon className="w-3.5 h-3.5 text-primary-500" />
                                {container.building || 'Unassigned'}-{container.room}
                              </div>
                              <div className="text-[10px] text-secondary-400 font-medium ml-5">
                                Cab: {container.cabinet || '-'}, Sh: {container.shelf || '-'}
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex flex-col gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border w-fit ${getStatusColor(container.status)}`}>
                                {container.status}
                              </span>
                              <div className="text-sm font-black text-secondary-900">
                                {container.quantity} <span className="text-[11px] text-secondary-400 font-bold uppercase">{container.unit}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleOpenModal(container)} className="p-2.5 rounded-xl bg-white border border-secondary-200 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition-all">
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(container.container_id)} className="p-2.5 rounded-xl bg-white border border-secondary-200 text-secondary-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all">
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
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-secondary-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                  <div className="p-8 border-b border-secondary-100 flex items-center justify-between flex-shrink-0">
                    <div>
                      <h2 className="text-2xl font-black text-secondary-900">{isEditing ? 'Edit Vessel' : 'Initialize Container'}</h2>
                      <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest mt-1">Granular Asset Management</p>
                    </div>
                    <button onClick={handleCloseModal} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-secondary-50 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-all">&times;</button>
                  </div>

                  <form onSubmit={handleSubmit} className="overflow-y-auto p-8 custom-scrollbar">
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Container ID (Unique)</label>
                          <input 
                            type="text" 
                            value={formData.container_id} 
                            onChange={e => setFormData({...formData, container_id: e.target.value})}
                            className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-black"
                            placeholder="CONT-XXXX"
                            required
                          />
                        </div>
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Barcode / QR (Optional)</label>
                          <input 
                            type="text" 
                            value={formData.barcode} 
                            onChange={e => setFormData({...formData, barcode: e.target.value})}
                            className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all"
                            placeholder="Scan or type barcode"
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Chemical Reference</label>
                        <select 
                          value={formData.chemical_id} 
                          onChange={e => setFormData({...formData, chemical_id: e.target.value})}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold appearance-none"
                          required
                        >
                          <option value="">Select chemical...</option>
                          {chemicals.map(chem => (
                            <option key={chem.id} value={chem.id}>{chem.name} ({chem.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Quantity per unit</label>
                          <div className="flex gap-2">
                             <input 
                              type="number" 
                              value={formData.quantity} 
                              onChange={e => setFormData({...formData, quantity: e.target.value})}
                              className="flex-1 bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-mono"
                              required
                            />
                            <select 
                              value={formData.unit} 
                              onChange={e => setFormData({...formData, unit: e.target.value})}
                              className="w-24 bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm transition-all font-bold"
                            >
                              <option value="L">L</option><option value="mL">mL</option><option value="kg">kg</option><option value="g">g</option>
                            </select>
                          </div>
                        </div>
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Vessel Type</label>
                          <select 
                            value={formData.container_type} 
                            onChange={e => setFormData({...formData, container_type: e.target.value})}
                            className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm transition-all font-bold"
                          >
                            <option value="Glass bottle">Glass bottle</option>
                            <option value="Plastic bottle">Plastic bottle</option>
                            <option value="Drum">Drum</option>
                            <option value="Tank">Tank</option>
                            <option value="Vial">Vial</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-primary-50/30 p-8 rounded-[32px] border border-primary-100/50">
                        <h3 className="text-[11px] font-black text-primary-600 uppercase tracking-widest mb-6 flex items-center gap-2"><MapPinIcon className="w-4 h-4" />Storage Hierarchy</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {['building', 'room', 'cabinet', 'shelf'].map(f => (
                            <div key={f} className="group">
                              <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1.5 block">{f}</label>
                              <input type="text" value={formData[f]} onChange={e => setFormData({...formData, [f]: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-primary-500/10 transition-all font-bold" placeholder={f}/>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Batch Reference</label>
                          <input type="text" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm transition-all font-bold" placeholder="Lot / Batch #"/>
                        </div>
                        <div className="group">
                          <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Current Status</label>
                          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm transition-all font-bold">
                            <option value="Full">Full</option><option value="In Use">In Use</option><option value="Empty">Empty</option><option value="Expired">Expired</option><option value="Damaged">Damaged</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {[{ label: 'MFG Date', key: 'manufacturing_date' }, { label: 'EXP Date', key: 'expiry_date' }, { label: 'Opened on', key: 'opened_date' }].map(d => (
                          <div key={d.key} className="group">
                            <label className="text-[10px] font-black text-secondary-500 uppercase mb-1.5 block tracking-wide">{d.label}</label>
                            <div className="relative">
                              <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                              <input type="date" value={formData[d.key]} onChange={e => setFormData({...formData, [d.key]: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl py-3 pl-9 pr-3 text-xs font-bold transition-all"/>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="group">
                        <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest mb-2 block">Notes / Observations</label>
                        <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-sm h-24 resize-none transition-all placeholder:italic" placeholder="e.g. Half used during experiment..."/>
                      </div>
                    </div>

                    <div className="mt-10 flex gap-4 flex-shrink-0 sticky bottom-0 bg-white pt-4 pb-0">
                      <button type="button" onClick={handleCloseModal} className="flex-1 px-6 py-4 rounded-2xl font-black text-secondary-500 bg-secondary-50 hover:bg-secondary-100 transition-all">Discard</button>
                      <button type="submit" className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-primary-500/30 transition-all hover:-translate-y-0.5">{isEditing ? 'Sync Changes' : 'Initialize Vessel'}</button>
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
