import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "../layout/Layout";
import axios from "axios";
import HazardBadge from "../components/HazardBadge";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import NFPADiamond from "../components/NFPADiamond";
import { Shield, AlertTriangle, Zap, LifeBuoy, Info } from 'lucide-react';

const ChemicalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chemical, setChemical] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
        <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4"></div>
        <p className="text-primary-500 font-bold uppercase tracking-widest">Loading Records...</p>
      </div>
    </Layout>
  );

  if (error || !chemical) return (
    <Layout>
      <div className="max-w-3xl mx-auto mt-12 bg-white rounded-3xl p-12 text-center shadow-xl border border-secondary-100">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-black heading-font text-secondary-900 mb-2">{error || "Chemical Not Found"}</h2>
        <p className="text-secondary-500 font-medium mb-8">The requested chemical ID (CIMS-{id}) could not be located in the registry. It may have been permanently deleted or incorrectly scanned.</p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate('/scan')} className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-600/30 transition-all">Scan Again</button>
          <button onClick={() => navigate('/chemicals')} className="px-6 py-3 bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50 rounded-xl font-bold transition-all">Return to Inventory</button>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-secondary-500 hover:text-secondary-900 font-bold text-sm transition-all">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             Back
           </button>
           <div className="flex gap-3">
             <Link to={`/print/${chemical.id}`} target="_blank" className="px-4 py-2 bg-white text-secondary-700 border border-secondary-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-secondary-50 transition-all flex items-center gap-2 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print Label
             </Link>
             <button onClick={() => navigate('/chemicals')} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-600/20 hover:bg-primary-500 transition-all">
                Edit Protocol
             </button>
           </div>
        </div>

        {/* Dashboard-Style Detail View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Left Column - Core Identity */}
           <div className="lg:col-span-1 space-y-6">
              
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-secondary-200/40 border border-secondary-100 flex flex-col items-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
                 
                 <div className="bg-white p-3 rounded-3xl shadow-lg border border-secondary-100 mb-6 relative group z-10 w-full aspect-square flex items-center justify-center max-w-[240px]">
                    <QRCode value={`${window.location.origin}/chemicals/details/${chemical.id}`} size={200} className="group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute -bottom-3 text-[10px] bg-secondary-900 text-white font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">CIMS-{chemical.id}</div>
                 </div>

                 <h1 className="text-3xl font-black heading-font text-secondary-900 tracking-tight text-center leading-none mb-2 z-10">{chemical.name}</h1>
                 
                 <div className="flex gap-2 justify-center mb-6 z-10">
                    <span className="bg-secondary-100/50 text-secondary-600 border border-secondary-200 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">CAS {chemical.cas_number || 'N/A'}</span>
                    <span className="bg-primary-50 text-primary-600 border border-primary-100 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">{chemical.formula || 'NO FORMULA'}</span>
                 </div>

                 <div className={`w-full py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-widest border shadow-sm ${
                    chemical.status === 'In Stock' ? 'bg-green-50 text-green-600 border-green-200' :
                    chemical.status === 'Low Stock' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    chemical.status === 'Near Expiry' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    chemical.status === 'Expired' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-secondary-50 text-secondary-600 border-secondary-200'
                 }`}>
                   {chemical.status} STATUS
                 </div>

              </div>

              {/* Hazards Panel */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-secondary-100">
                 <h3 className="text-xs font-black uppercase tracking-widest text-secondary-400 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Safety Protocols
                 </h3>
                 
                 {chemical.ghs_hazards?.signal_word && chemical.ghs_hazards.signal_word !== 'None' && (
                   <div className={`mb-4 py-2 px-4 rounded-xl text-center font-black uppercase tracking-widest text-sm shadow-md ${chemical.ghs_hazards.signal_word === 'Danger' ? 'bg-red-600 text-white animate-pulse' : 'bg-orange-500 text-white'}`}>
                     {chemical.ghs_hazards.signal_word}
                   </div>
                 )}

                 {chemical.ghs_classes && chemical.ghs_classes.length > 0 ? (
                    <div className="flex flex-col gap-3 mb-6">
                       <HazardBadge hazards={chemical.ghs_classes} showLabels={true} size="md" />
                    </div>
                 ) : (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border border-green-100 mb-6">
                       No Active Hazards Filed
                    </div>
                 )}

                 <div className="flex justify-center mb-6">
                   <NFPADiamond ratings={chemical.nfpa_rating} size="sm" />
                 </div>

                 {chemical.ppe_requirements?.length > 0 && (
                   <div className="mb-6">
                     <p className="text-[10px] font-black uppercase text-secondary-400 mb-2">Required PPE</p>
                     <div className="flex flex-wrap gap-1">
                       {chemical.ppe_requirements.map(ppe => (
                         <span key={ppe} className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-md text-[9px] font-bold uppercase">{ppe}</span>
                       ))}
                     </div>
                   </div>
                 )}

                 {chemical.sds_attached && (
                    <a href={chemical.sds_file_url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-secondary-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-black transition-all">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                       View SDS Document
                    </a>
                 )}

                 <a href={`/api/safety/export-sds/${chemical.id}`} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary-700 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Export Formal SDS (PDF)
                 </a>
              </div>

              {/* Access Control */}
              {(chemical.restricted_access || chemical.training_required) && (
                <div className="bg-orange-50 border border-orange-200 p-6 rounded-[2rem] shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-orange-700 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Access Control
                  </h3>
                  <ul className="space-y-2">
                    {chemical.restricted_access && <li className="text-[10px] font-bold text-orange-800 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div> Restricted Access Area</li>}
                    {chemical.training_required && <li className="text-[10px] font-bold text-orange-800 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div> Safety Training Required</li>}
                  </ul>
                </div>
              )}

           </div>

           {/* Right Column - Inventory Stats */}
           <div className="lg:col-span-2 space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                 {/* Stock Levels */}
                 <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-secondary-100">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-2">Total Quantity</h3>
                    <div className="flex items-end gap-2">
                       <span className="text-4xl font-black text-secondary-900 leading-none">{chemical.quantity}</span>
                       <span className="text-lg font-bold text-secondary-400 leading-none pb-0.5">{chemical.unit}</span>
                    </div>
                    {/* Visual Threshold Bar */}
                    <div className="w-full h-1.5 bg-secondary-100 rounded-full mt-4 overflow-hidden">
                       <div className={`h-full rounded-full ${chemical.quantity <= chemical.threshold ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (chemical.quantity / (chemical.threshold * 4)) * 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] font-bold text-secondary-400 mt-2">Threshold: {chemical.threshold} {chemical.unit}</p>
                 </div>

                 {/* Storage Location */}
                 <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-secondary-100">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-2">Location Log</h3>
                    <div className="text-xl font-black text-primary-600 mb-1 leading-tight line-clamp-2">
                       {chemical.location || 'Unassigned Facility'}
                    </div>
                    <p className="text-xs font-bold text-secondary-500">
                       Room {chemical.room || '-'} • Cab {chemical.cabinet || '-'} • Shelf {chemical.shelf || '-'}
                    </p>
                 </div>
              </div>

              {/* Emergency Response section */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-secondary-100 overflow-hidden">
                 <div className="p-6 border-b border-secondary-50 bg-red-50/20">
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-700 flex items-center gap-2">
                       <LifeBuoy className="w-5 h-5" />
                       Emergency Response Protocol
                    </h3>
                 </div>
                 <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                       <p className="text-[10px] font-black uppercase text-secondary-400 mb-2">First Aid Measures</p>
                       <p className="text-sm text-secondary-700 font-medium leading-relaxed bg-secondary-50 p-4 rounded-2xl border border-secondary-100">{chemical.emergency_response?.first_aid || chemical.emergency_instructions || 'Consult SDS for immediate first aid protocol.'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-secondary-400 mb-2">Spill Response</p>
                       <p className="text-sm text-secondary-700 font-medium leading-relaxed bg-secondary-50 p-4 rounded-2xl border border-secondary-100">{chemical.emergency_response?.neutralization || chemical.spill_instructions || 'Evacuate area and consult safety officer.'}</p>
                    </div>
                 </div>
                 <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                       <p className="text-[10px] font-black uppercase text-secondary-400 mb-2">Hazard Statements</p>
                       <div className="flex flex-wrap gap-1">
                         {chemical.ghs_hazards?.h_codes?.map(code => (
                           <span key={code} className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-black">{code}</span>
                         )) || <span className="text-xs text-secondary-400 italic">No H-codes assigned</span>}
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-secondary-400 mb-2">Precautionary Statements</p>
                       <div className="flex flex-wrap gap-1">
                         {chemical.ghs_hazards?.p_codes?.map(code => (
                           <span key={code} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-black">{code}</span>
                         )) || <span className="text-xs text-secondary-400 italic">No P-codes assigned</span>}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Exposure Matrix */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-secondary-100 overflow-hidden">
                 <div className="p-6 border-b border-secondary-50 bg-secondary-50/30">
                    <h3 className="text-sm font-black uppercase tracking-widest text-secondary-900 flex items-center gap-2">
                       <Zap className="w-5 h-5 text-yellow-500" />
                       Exposure Risk Management
                     </h3>
                  </div>
                  <div className="p-0">
                     <table className="w-full text-left">
                        <tbody className="divide-y divide-secondary-100/50">
                           <tr className="hover:bg-secondary-50 transition-colors">
                              <th className="py-4 px-6 text-xs font-black text-secondary-400 uppercase tracking-widest w-1/3">Risk Level</th>
                              <td className="py-4 px-6 text-sm font-black">
                                <span className={`px-3 py-1 rounded-full uppercase tracking-widest text-[10px] ${
                                  chemical.exposure_details?.risk_level === 'Extreme' ? 'bg-red-600 text-white' :
                                  chemical.exposure_details?.risk_level === 'High' ? 'bg-orange-500 text-white' :
                                  chemical.exposure_details?.risk_level === 'Medium' ? 'bg-yellow-400 text-secondary-900' :
                                  'bg-green-500 text-white'
                                }`}>{chemical.exposure_details?.risk_level || 'Low'}</span>
                              </td>
                           </tr>
                           <tr className="hover:bg-secondary-50 transition-colors">
                              <th className="py-4 px-6 text-xs font-black text-secondary-400 uppercase tracking-widest">Health Indicators</th>
                              <td className="py-4 px-6 text-sm font-bold flex gap-2">
                                {chemical.exposure_details?.carcinogenic && <span className="text-red-600 border border-red-200 bg-red-50 px-2 py-0.5 rounded text-[9px] uppercase">Carcinogenic</span>}
                                {chemical.exposure_details?.mutagenic && <span className="text-purple-600 border border-purple-200 bg-purple-50 px-2 py-0.5 rounded text-[9px] uppercase">Mutagenic</span>}
                                {!chemical.exposure_details?.carcinogenic && !chemical.exposure_details?.mutagenic && <span className="text-secondary-400">No CMR indicators</span>}
                              </td>
                           </tr>
                           <tr className="hover:bg-secondary-50 transition-colors">
                              <th className="py-4 px-6 text-xs font-black text-secondary-400 uppercase tracking-widest">Infrastructure Req.</th>
                              <td className="py-4 px-6 text-sm font-bold text-secondary-900">
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
