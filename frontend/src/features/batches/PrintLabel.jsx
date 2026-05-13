import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import axios from "axios";
import NFPADiamond from "../../components/feedback/NFPADiamond";
import { HAZARD_CLASSES } from "../../constants/hazards";
import { PrinterIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import "./PrintLabel.css";

const PrintLabel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chemical, setChemical] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await axios.get(`/api/chemicals/${id}/label`);
        setChemical(data);
      } catch (err) {
        console.error("Failed to load details for printing", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return (
    <div className="print-label-page">
        <div className="text-white text-xl font-bold animate-pulse">Initializing Secure Print Protocol...</div>
    </div>
  );
  
  if (!chemical) return (
    <div className="print-label-page">
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-6 rounded-2xl">Chemical data unavailable for this ID.</div>
    </div>
  );

  return (
    <div className="print-label-page">
      
      <div className="print-controls print:hidden">
         <button onClick={() => window.print()} className="print-btn print-btn-primary">
            <PrinterIcon className="w-5 h-5" />
            Print Label
         </button>
         <Link to={`/chemicals/details/${chemical.id}`} className="print-btn print-btn-secondary">
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Asset
         </Link>
      </div>

      <div className="label-container">
        {/* Top Header */}
        <div className="label-header">
           <div className="flex flex-col">
              <h1 className="label-title">{chemical.name}</h1>
              <span className="label-cas">CAS: {chemical.cas_number || 'N/A'}</span>
           </div>
           <div className="text-right">
              <div className="text-[7pt] font-black text-gray-400 uppercase tracking-widest">Safety Ready</div>
              <div className="text-[6pt] font-bold text-gray-500">v2.1 CIMS LOGISTICS</div>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="label-body">
           {/* Left: QR Code */}
           <div className="label-qr-section">
              <div className="qr-code-wrapper">
                 <QRCode value={`${window.location.origin}/chemicals/details/${chemical.id}`} size={64} />
              </div>
              <span className="label-id">ID: {chemical.id}</span>
           </div>

           {/* Middle: Hazards & Signal Word */}
           <div className="label-hazards-section">
              <div>
                 {chemical.ghs_hazards?.signal_word && chemical.ghs_hazards.signal_word !== 'None' && (
                   <span className={`signal-word ${chemical.ghs_hazards.signal_word.toUpperCase()}`}>
                      {chemical.ghs_hazards.signal_word}
                   </span>
                 )}
                 <div className="ghs-icons">
                    {chemical.ghs_classes?.slice(0, 5).map(hId => {
                      const h = HAZARD_CLASSES.find(x => x.id === hId || x.label === hId);
                      return h ? (
                        <div key={hId} className="ghs-icon-box" title={h.label}>
                          {h.icon}
                        </div>
                      ) : null;
                    })}
                 </div>
              </div>
              
              <div className="text-[7pt] font-bold text-gray-700 leading-tight">
                 {chemical.ghs_hazards?.h_codes?.slice(0, 3).join(', ') || 'Standard safety precautions apply.'}
              </div>
           </div>

           {/* Right: NFPA Diamond */}
           <div className="label-nfpa-section">
              <NFPADiamond ratings={chemical.nfpa_rating} size="sm" />
           </div>
        </div>

        {/* Footer Area */}
        <div className="label-footer">
           <div className="flex flex-col gap-1">
              <span className="text-[6pt] uppercase tracking-tighter">Required PPE:</span>
              <div className="ppe-badges">
                 {chemical.ppe_requirements?.slice(0, 4).map(ppe => (
                   <span key={ppe} className="ppe-badge">{ppe}</span>
                 ))}
                 {(!chemical.ppe_requirements || chemical.ppe_requirements.length === 0) && (
                   <span className="ppe-badge">Standard Lab</span>
                 )}
              </div>
           </div>
           <div className="text-right">
              <div className="text-[6pt] font-bold">Printed: {new Date().toLocaleDateString()}</div>
              <div className="text-[6pt] font-black uppercase text-blue-600">CIMS Certified Label</div>
           </div>
        </div>
      </div>

    </div>
  );
};

export default PrintLabel;
