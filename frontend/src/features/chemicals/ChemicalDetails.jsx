import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../layout/Layout";
import axios from "axios";
import HazardBadge from "../../components/feedback/HazardBadge";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import NFPADiamond from "../../components/feedback/NFPADiamond";
import { 
    Shield, 
    AlertTriangle, 
    Zap, 
    LifeBuoy, 
    Archive, 
    RotateCcw, 
    MapPin, 
    Layers, 
    Box, 
    Thermometer, 
    Droplets, 
    Printer, 
    Edit3, 
    ChevronLeft,
    Activity,
    Info,
    CheckCircle2,
    Calendar,
    Tag,
    Link2
} from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import "../../styles/ChemicalDetails.css";

const ChemicalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chemical, setChemical] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const { hasPermission } = useAuth();

  const canDelete = hasPermission("delete_chemical");

  const [batches, setBatches] = useState([]);
  const [containers, setContainers] = useState([]);

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        const [chemRes, batchRes, contRes] = await Promise.all([
          axios.get(`/api/chemicals/${id}`),
          axios.get(`/api/batches?chemical_id=${id}`),
          axios.get(`/api/containers?chemical_id=${id}`)
        ]);
        setChemical(chemRes.data);
        setBatches(batchRes.data);
        setContainers(contRes.data);
      } catch (err) {
        if (!chemical) setError(err.response?.data?.error || "Asset lookup failed.");
      } finally {
        setLoading(false);
      }
    };

    fetchFullData();
    
    // Real-time synchronization: Poll every 5 seconds
    const interval = setInterval(fetchFullData, 5000);

    // Immediate refetch when user returns to tab
    const handleFocus = () => fetchFullData();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

  const handleExportSDS = async () => {
    setExportingPDF(true);
    try {
      const response = await axios.get(`/api/safety/export-sds/${chemical.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SDS_${chemical.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate secure SDS export.');
    } finally {
      setExportingPDF(false);
    }
  };

  const toggleArchive = async () => {
    if (!window.confirm(chemical.archived ? "Restore asset?" : "Archive this asset for safety compliance?")) return;
    try {
      if (chemical.archived) await axios.put(`/api/chemicals/${chemical.id}/restore`);
      else await axios.delete(`/api/chemicals/${chemical.id}`);
      const { data } = await axios.get(`/api/chemicals/${id}`);
      setChemical(data);
    } catch (err) { alert("State synchronization failed."); }
  };

  if (loading) return (
    <Layout>
      <div className="details-loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Synchronizing Laboratory Data...</p>
      </div>
    </Layout>
  );

  if (error || !chemical) return (
    <Layout>
      <div className="details-error-card">
        <div className="error-icon-wrapper">
          <AlertTriangle size={40} />
        </div>
        <h2 className="error-title">Asset Not Found</h2>
        <p className="error-message">The requested identifier (CIMS-{id}) does not exist in the active registry.</p>
        <div className="error-actions">
          <button onClick={() => navigate('/chemicals')} className="primary-button">Inventory Portal</button>
        </div>
      </div>
    </Layout>
  );

  // Calculate stock percentage for visual analytics
  const stockPercentage = Math.min(100, (chemical.quantity / (chemical.threshold * 4)) * 100);
  const thresholdPercentage = (chemical.threshold / (chemical.threshold * 4)) * 100;

  return (
    <Layout>
      <div className="details-page-wrapper">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>

        <div className="dashboard-container">
          
          {/* Top Control Bar */}
          <div className="header-actions">
            <button onClick={() => navigate(-1)} className="back-button">
              <ChevronLeft size={18} />
              Return to Registry
            </button>
            <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-indigo-400">
               Scientific Management Protocol v3.0
            </div>
          </div>

          <div className="dashboard-grid">
            
            {/* COLUMN 1: Identity & Safety */}
            <div className="column-left">
              
              <div className="premium-card identity-header">
                <div className="qr-glow-container">
                   <QRCode value={`${window.location.origin}/chemicals/details/${chemical.id}`} size={180} level="H" />
                   <div className="qr-label">REG-{chemical.id}</div>
                </div>

                <h1 className="chemical-display-title">{chemical.name}</h1>
                
                <div className="meta-badges">
                   <span className="meta-badge badge-cas">CAS {chemical.cas_number || 'N/A'}</span>
                   <span className="meta-badge badge-formula">{chemical.formula || 'UNSPECIFIED'}</span>
                </div>

                <div className={`status-indicator ${
                    chemical.status === 'In Stock' ? 'status-in-stock' :
                    chemical.status === 'Low Stock' ? 'status-low-stock' :
                    chemical.status === 'Expired' ? 'status-expired' : 'status-default'
                }`}>
                  <Activity size={12} className="inline mr-2" />
                  {chemical.status} PROTOCOL
                </div>
              </div>

              {/* GHS & Hazards */}
              <div className="premium-card">
                 <h3 className="panel-title"><Shield size={14} /> Hazard Classification</h3>
                 
                 {chemical.ghs_hazards?.signal_word && chemical.ghs_hazards.signal_word !== 'None' && (
                    <div className={`signal-word-badge ${chemical.ghs_hazards.signal_word.toLowerCase() === 'danger' ? 'signal-danger' : 'signal-warning'}`}>
                       {chemical.ghs_hazards.signal_word}
                    </div>
                 )}

                 <div className="hazards-list">
                    <HazardBadge hazards={chemical.ghs_classes} showLabels={true} size="md" />
                 </div>

                 <div className="nfpa-container">
                    <NFPADiamond ratings={chemical.nfpa_rating} size="sm" />
                 </div>
              </div>

            </div>

            {/* COLUMN 2: Inventory & Protocols */}
            <div className="column-main">
               
               {/* Stock Analytics */}
               <div className="premium-card status-analytics-card">
                  <div className="analytics-header">
                     <div>
                        <h3 className="panel-title"><Box size={14} /> Inventory Intelligence</h3>
                        <div className="large-stat-value">
                           {chemical.quantity}
                           <span className="stat-unit-label">{chemical.unit}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[0.65rem] font-black text-slate-400 uppercase">Operational Status</p>
                        <p className="text-sm font-bold text-slate-900">{stockPercentage > 25 ? 'Optimal' : 'Replenishment Recommended'}</p>
                     </div>
                  </div>

                  <div className="progress-track">
                     <div className="progress-fill" style={{ width: `${stockPercentage}%` }}></div>
                     <div className="threshold-marker" style={{ left: `${thresholdPercentage}%` }}></div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Minimum Safety Threshold: {chemical.threshold} {chemical.unit}
                     </div>
                     <div className="text-xs font-black text-indigo-600">
                        {Math.round(stockPercentage)}% OF CAPACITY
                     </div>
                  </div>
               </div>

               {/* Emergency & Response */}
               <div className="premium-card">
                  <h3 className="panel-title"><LifeBuoy size={14} /> Rapid Response Protocols</h3>
                  
                  <div className="protocols-grid">
                     <div className="protocol-mini-card">
                        <div className="protocol-card-header">
                           <Zap size={16} className="text-amber-500" />
                           <span className="protocol-card-title">First Aid</span>
                        </div>
                        <p className="protocol-content-text">{chemical.emergency_response?.first_aid || 'Standard first aid protocol.'}</p>
                     </div>

                     <div className="protocol-mini-card">
                        <div className="protocol-card-header">
                           <Droplets size={16} className="text-blue-500" />
                           <span className="protocol-card-title">Spill Control</span>
                        </div>
                        <p className="protocol-content-text">{chemical.emergency_response?.neutralization || 'Evacuate and contain.'}</p>
                     </div>
                  </div>

                  <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="mini-label"><Info size={10} className="inline mr-1" /> Hazard Statements (H-Codes)</p>
                     <div className="flex flex-wrap gap-2 mt-2">
                        {chemical.ghs_hazards?.h_codes?.map(code => (
                           <span key={code} className="h-code-badge">{code}</span>
                        )) || <span className="text-xs text-slate-400 italic">None Assigned</span>}
                     </div>
                  </div>
               </div>

               {/* Operational Batches */}
               <div className="premium-card">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="panel-title"><Tag size={14} /> Operational Batches</h3>
                     <span className="text-[0.65rem] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-md uppercase">{batches.length} LOTS FOUND</span>
                  </div>
                  
                  <div className="ledger-scroll-area">
                    <table className="ledger-premium-table">
                       <thead>
                          <tr>
                             <th>Lot Number</th>
                             <th>MFG Date</th>
                             <th>Expiry Date</th>
                             <th>Status</th>
                          </tr>
                       </thead>
                       <tbody>
                          {batches.map(batch => (
                             <tr key={batch.batch_number} className="ledger-premium-row">
                                <td className="font-bold text-slate-900">{batch.batch_number}</td>
                                <td className="text-slate-500">{batch.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString() : 'N/A'}</td>
                                <td className={`font-bold ${new Date(batch.expiry_date) < new Date() ? 'text-red-500' : 'text-slate-900'}`}>
                                   {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td>
                                   <span className={`status-pill ${
                                      batch.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                      batch.status === 'Expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                   }`}>
                                      {batch.status}
                                   </span>
                                </td>
                             </tr>
                          ))}
                          {batches.length === 0 && (
                             <tr>
                                <td colSpan="4" className="text-center py-8 text-slate-400 italic">No batch history recorded.</td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                  </div>
               </div>

               {/* Asset Tracking (Containers) */}
               <div className="premium-card">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="panel-title"><Layers size={14} /> Asset Vessel Tracking</h3>
                     <span className="text-[0.65rem] font-black text-cyan-400 bg-cyan-50 px-2 py-1 rounded-md uppercase">{containers.length} VESSELS ACTIVE</span>
                  </div>
                  
                  <div className="ledger-scroll-area">
                    <table className="ledger-premium-table">
                       <thead>
                          <tr>
                             <th>Vessel ID</th>
                             <th>Location</th>
                             <th>Qty/Status</th>
                             <th>Action</th>
                          </tr>
                       </thead>
                       <tbody>
                          {containers.map(container => (
                             <tr key={container.container_id} className="ledger-premium-row">
                                <td>
                                   <div className="flex flex-col">
                                      <span className="font-bold text-slate-900">{container.container_id}</span>
                                      <span className="text-[10px] text-slate-400 uppercase font-bold">{container.barcode || 'NO BARCODE'}</span>
                                   </div>
                                </td>
                                <td className="text-slate-600 text-xs">
                                   {container.building}-{container.room} (C:{container.cabinet}, S:{container.shelf})
                                </td>
                                <td>
                                   <div className="flex flex-col items-end">
                                      <span className="font-black text-slate-800">{container.quantity} {container.unit}</span>
                                      <span className={`text-[9px] font-black uppercase ${
                                         container.status === 'Full' ? 'text-emerald-500' :
                                         container.status === 'Empty' ? 'text-slate-400' : 'text-orange-500'
                                      }`}>{container.status}</span>
                                   </div>
                                </td>
                                <td className="text-right">
                                   <button onClick={() => navigate('/containers')} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                                      <Link2 size={16} />
                                   </button>
                                </td>
                             </tr>
                          ))}
                          {containers.length === 0 && (
                             <tr>
                                <td colSpan="4" className="text-center py-8 text-slate-400 italic">No active vessels found in registry.</td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>

            {/* COLUMN 3: Logistics & Actions */}
            <div className="column-right right-sidebar">
               
               {/* Location Card */}
               <div className="premium-card location-visual-card">
                  <h3 className="panel-title"><MapPin size={14} /> Storage Logistics</h3>
                  <div className="location-hierarchy">
                     <div className="location-step">
                        <div className="step-icon"><MapPin size={18} /></div>
                        <div className="step-info">
                           <div className="label">Primary Facility</div>
                           <div className="value">{chemical.location || 'Central Inventory'}</div>
                        </div>
                     </div>
                     <div className="location-step">
                        <div className="step-icon"><Layers size={18} /></div>
                        <div className="step-info">
                           <div className="label">Coordinate</div>
                           <div className="value">R:{chemical.room || '-'} • C:{chemical.cabinet || '-'} • S:{chemical.shelf || '-'}</div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* PPE Requirements */}
               <div className="premium-card">
                  <h3 className="panel-title"><Shield size={14} /> Safety Gear (PPE)</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                     {chemical.ppe_requirements?.map(ppe => (
                        <div key={ppe} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                           {ppe}
                        </div>
                     )) || <p className="text-xs text-slate-400">Standard protocol gear.</p>}
                  </div>
               </div>

               {/* Action Suite */}
               <div className="action-sidebar mt-4">
                  <Link to={`/print/${chemical.id}`} target="_blank" className="dashboard-action-btn btn-primary-glow">
                     <Printer size={18} />
                     Print Safety Label
                  </Link>
                  <button onClick={() => navigate('/chemicals')} className="dashboard-action-btn btn-glass">
                     <Edit3 size={18} />
                     Modify Protocol
                  </button>
                  <button onClick={handleExportSDS} disabled={exportingPDF} className="dashboard-action-btn btn-glass">
                     <Layers size={18} />
                     {exportingPDF ? 'Processing...' : 'Export SDS (PDF)'}
                  </button>
                  {canDelete && (
                    <button onClick={toggleArchive} className={`dashboard-action-btn ${chemical.archived ? 'bg-emerald-500 text-white' : 'btn-glass text-rose-500'}`}>
                       {chemical.archived ? <RotateCcw size={18} /> : <Archive size={18} />}
                       {chemical.archived ? "Restore Asset" : "Archive Record"}
                    </button>
                  )}
               </div>

            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChemicalDetails;
