import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "../../layout/Layout";
import axios from "axios";
import HazardBadge from "../../components/feedback/HazardBadge";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import NFPADiamond from "../../components/feedback/NFPADiamond";
import { Shield, AlertTriangle, Zap, LifeBuoy } from 'lucide-react';
import "../../styles/ChemicalDetails.css";

const ChemicalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chemical, setChemical] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportSDS = async () => {
    setExportingPDF(true);
    try {
      const response = await axios.get(`/api/safety/export-sds/${chemical.id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SDS_${chemical.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export SDS PDF. Please try again.');
      console.error('SDS Export Error:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    const fetchChemical = async () => {
      try {
        const { data } = await axios.get(`/api/chemicals/${id}`);
        setChemical(data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load chemical details.");
      } finally {
        setLoading(false);
      }
    };
    fetchChemical();
  }, [id]);

  if (loading) return (
    <Layout>
      <div className="details-loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading Records...</p>
      </div>
    </Layout>
  );

  if (error || !chemical) return (
    <Layout>
      <div className="details-error-card">
        <div className="error-icon-wrapper">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="error-title">{error || "Chemical Not Found"}</h2>
        <p className="error-message">The requested chemical ID (CIMS-{id}) could not be located in the registry. It may have been permanently deleted or incorrectly scanned.</p>
        <div className="error-actions">
          <button onClick={() => navigate('/scan')} className="primary-button">Scan Again</button>
          <button onClick={() => navigate('/chemicals')} className="secondary-button">Return to Inventory</button>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="details-container">
        
        {/* Header Actions */}
        <div className="header-actions">
           <button onClick={() => navigate(-1)} className="back-button">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             Back
           </button>
           <div className="action-buttons">
             <Link to={`/print/${chemical.id}`} target="_blank" className="print-label-link">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print Label
             </Link>
             <button onClick={() => navigate('/chemicals')} className="edit-protocol-button">
                Edit Protocol
             </button>
           </div>
        </div>

        {/* Dashboard-Style Detail View */}
        <div className="details-grid">
           
           {/* Left Column - Core Identity */}
           <div className="column-left">
              
              <div className="core-identity-card">
                 <div className="card-blur-circle"></div>
                 
                 <div className="qr-wrapper">
                    <QRCode value={`${window.location.origin}/chemicals/details/${chemical.id}`} size={200} />
                    <div className="qr-label">CIMS-{chemical.id}</div>
                 </div>

                 <h1 className="chemical-name">{chemical.name}</h1>
                 
                 <div className="badge-row">
                    <span className="cas-badge">CAS {chemical.cas_number || 'N/A'}</span>
                    <span className="formula-badge">{chemical.formula || 'NO FORMULA'}</span>
                 </div>

                 <div className={`status-indicator ${
                    chemical.status === 'In Stock' ? 'status-in-stock' :
                    chemical.status === 'Low Stock' ? 'status-low-stock' :
                    chemical.status === 'Near Expiry' ? 'status-near-expiry' :
                    chemical.status === 'Expired' ? 'status-expired' :
                    'status-default'
                 }`}>
                   {chemical.status} STATUS
                 </div>

              </div>

              {/* Hazards Panel */}
              <div className="safety-panel">
                 <h3 className="panel-title">
                    <AlertTriangle style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
                    Safety Protocols
                 </h3>
                 
                 {chemical.ghs_hazards?.signal_word && chemical.ghs_hazards.signal_word !== 'None' && (
                   <div className={`signal-word-badge ${chemical.ghs_hazards.signal_word === 'Danger' ? 'signal-danger' : 'signal-warning'}`}>
                     {chemical.ghs_hazards.signal_word}
                   </div>
                 )}

                 {chemical.ghs_classes && chemical.ghs_classes.length > 0 ? (
                    <div className="hazards-list">
                       <HazardBadge hazards={chemical.ghs_classes} showLabels={true} size="md" />
                    </div>
                 ) : (
                    <div className="no-hazards-badge">
                       No Active Hazards Filed
                    </div>
                 )}

                 <div className="nfpa-container">
                   <NFPADiamond ratings={chemical.nfpa_rating} size="sm" />
                 </div>

                 {chemical.ppe_requirements?.length > 0 && (
                   <div className="ppe-section">
                     <p className="mini-label">Required PPE</p>
                     <div className="ppe-tags">
                       {chemical.ppe_requirements.map(ppe => (
                         <span key={ppe} className="ppe-tag">{ppe}</span>
                       ))}
                     </div>
                   </div>
                 )}

                 {chemical.sds_attached && (
                    <a href={chemical.sds_file_url} target="_blank" rel="noopener noreferrer" className="view-sds-link">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                       View SDS Document
                    </a>
                 )}

                 <button
                    onClick={handleExportSDS}
                    disabled={exportingPDF}
                    className="export-sds-button"
                  >
                    {exportingPDF ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export Formal SDS (PDF)
                      </>
                    )}
                  </button>
              </div>

              {/* Access Control */}
              {(chemical.restricted_access || chemical.training_required) && (
                <div className="access-control-panel">
                  <h3 className="access-title">
                    <Shield style={{ width: '1rem', height: '1rem' }} />
                    Access Control
                  </h3>
                  <ul className="access-list">
                    {chemical.restricted_access && <li className="access-item"><div className="bullet"></div> Restricted Access Area</li>}
                    {chemical.training_required && <li className="access-item"><div className="bullet"></div> Safety Training Required</li>}
                  </ul>
                </div>
              )}

           </div>

           {/* Right Column - Inventory Stats */}
           <div className="column-right">
              
              <div className="stats-grid">
                 {/* Stock Levels */}
                 <div className="stat-card">
                    <h3 className="stat-label">Total Quantity</h3>
                    <div className="stat-value-container">
                       <span className="stat-value">{chemical.quantity}</span>
                       <span className="stat-unit">{chemical.unit}</span>
                    </div>
                    {/* Visual Threshold Bar */}
                    <div className="threshold-bar-bg">
                       <div className={`threshold-bar-fill ${chemical.quantity <= chemical.threshold ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (chemical.quantity / (chemical.threshold * 4)) * 100)}%`, backgroundColor: chemical.quantity <= chemical.threshold ? '#ef4444' : '#22c55e' }}></div>
                    </div>
                    <p className="threshold-text">Threshold: {chemical.threshold} {chemical.unit}</p>
                 </div>

                 {/* Storage Location */}
                 <div className="stat-card">
                    <h3 className="stat-label">Location Log</h3>
                    <div className="location-value">
                       {chemical.location || 'Unassigned Facility'}
                    </div>
                    <p className="location-subtext">
                       Room {chemical.room || '-'} • Cab {chemical.cabinet || '-'} • Shelf {chemical.shelf || '-'}
                    </p>
                 </div>
              </div>

              {/* Emergency Response section */}
              <div className="protocol-card">
                 <div className="protocol-header">
                    <h3 className="protocol-title">
                       <LifeBuoy style={{ width: '1.25rem', height: '1.25rem' }} />
                       Emergency Response Protocol
                    </h3>
                 </div>
                 <div className="protocol-body">
                    <div className="protocol-item">
                       <p className="mini-label">First Aid Measures</p>
                       <p className="protocol-text">{chemical.emergency_response?.first_aid || chemical.emergency_instructions || 'Consult SDS for immediate first aid protocol.'}</p>
                    </div>
                    <div className="protocol-item">
                       <p className="mini-label">Spill Response</p>
                       <p className="protocol-text">{chemical.emergency_response?.neutralization || chemical.spill_instructions || 'Evacuate area and consult safety officer.'}</p>
                    </div>
                 </div>
                 <div className="hazard-statements-grid">
                    <div>
                       <p className="mini-label">Hazard Statements</p>
                       <div className="h-codes-list">
                         {chemical.ghs_hazards?.h_codes?.map(code => (
                           <span key={code} className="h-code-badge">{code}</span>
                         )) || <span className="italic-placeholder">No H-codes assigned</span>}
                       </div>
                    </div>
                    <div>
                       <p className="mini-label">Precautionary Statements</p>
                       <div className="p-codes-list">
                         {chemical.ghs_hazards?.p_codes?.map(code => (
                           <span key={code} className="p-code-badge">{code}</span>
                         )) || <span className="italic-placeholder">No P-codes assigned</span>}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Exposure Matrix */}
              <div className="matrix-card">
                 <div className="matrix-header">
                    <h3 className="matrix-title">
                       <Zap style={{ width: '1.25rem', height: '1.25rem', color: '#eab308' }} />
                       Exposure Risk Management
                     </h3>
                  </div>
                  <div className="matrix-body">
                     <table className="matrix-table">
                        <tbody>
                           <tr className="matrix-row">
                              <th className="matrix-th">Risk Level</th>
                              <td className="matrix-td">
                                <span className={`risk-level-badge ${
                                  chemical.exposure_details?.risk_level === 'Extreme' ? 'risk-extreme' :
                                  chemical.exposure_details?.risk_level === 'High' ? 'risk-high' :
                                  chemical.exposure_details?.risk_level === 'Medium' ? 'risk-medium' :
                                  'risk-low'
                                }`}>{chemical.exposure_details?.risk_level || 'Low'}</span>
                              </td>
                           </tr>
                           <tr className="matrix-row">
                              <th className="matrix-th">Health Indicators</th>
                              <td className="matrix-td">
                                <div className="cmr-badges">
                                  {chemical.exposure_details?.carcinogenic && <span className="cmr-badge-red">Carcinogenic</span>}
                                  {chemical.exposure_details?.mutagenic && <span className="cmr-badge-purple">Mutagenic</span>}
                                  {!chemical.exposure_details?.carcinogenic && !chemical.exposure_details?.mutagenic && <span style={{ color: 'var(--secondary-400)', fontStyle: 'italic', fontWeight: 'normal' }}>No CMR indicators</span>}
                                </div>
                              </td>
                           </tr>
                           <tr className="matrix-row">
                              <th className="matrix-th">Infrastructure Req.</th>
                              <td className="matrix-td" style={{ color: 'var(--secondary-900)' }}>
                                {chemical.exposure_details?.fume_hood_required ? '⚠️ Fume Hood Mandatory' : 'Standard Ventilation'}
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

           </div>

        </div>
      </div>
    </Layout>
  );
};

export default ChemicalDetails;
