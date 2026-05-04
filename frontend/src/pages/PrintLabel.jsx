import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import axios from "axios";
import NFPADiamond from "../components/NFPADiamond";
import { HAZARD_CLASSES } from "../constants/hazards";

const PrintLabel = () => {
  const { id } = useParams();
  const [chemical, setChemical] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We fetch details to show the name on the label
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

  useEffect(() => {
    if (chemical) {
      // Auto-trigger print dialog after slight delay allowing images to render if any
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [chemical]);

  if (loading) return <div className="p-10 font-bold animate-pulse">Loading Label Protocol...</div>;
  if (!chemical) return <div className="p-10 font-bold text-red-500">Chemical not found for printing.</div>;

  return (
    <div className="w-full min-h-screen bg-gray-100 flex items-center justify-center p-8 print:bg-white print:p-0">
      
      {/* On Screen Controls (Hidden during print) */}
      <div className="fixed top-8 right-8 flex gap-3 print:hidden">
         <button onClick={() => window.print()} className="bg-secondary-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-xl hover:bg-black transition-all">Print Now</button>
         <Link to="/chemicals" className="bg-white text-secondary-600 border border-secondary-200 px-6 py-2.5 rounded-xl font-bold hover:bg-secondary-50 transition-all shadow-sm">Return</Link>
      </div>

      {/* The Printable Label Container - Scaled to standard thermal sticker sizes */}
      <div className="bg-white border-2 border-dashed border-gray-300 print:border-none p-4 rounded-none shadow-xl print:shadow-none w-[100mm] h-[60mm] flex gap-4 items-center relative overflow-hidden print:w-[100mm] print:h-[60mm]">
        
        {/* Left Side: Identity & QR */}
        <div className="flex flex-col items-center justify-center w-1/3 border-r border-gray-100 pr-4">
           <div className="p-1 border border-secondary-900 rounded-lg mb-2 flex items-center justify-center bg-white">
              <QRCode value={`${window.location.origin}/chemicals/details/${chemical.id}`} size={80} />
           </div>
           <p className="text-[10px] font-black text-secondary-950 font-mono tracking-tighter">CIMS-{chemical.id}</p>
           <div className="text-[7px] font-black text-secondary-400 uppercase tracking-widest mt-2">Central Lab</div>
        </div>

        {/* Middle Side: Name & GHS */}
        <div className="flex-1 flex flex-col justify-between py-1 h-full">
           <div>
              <h1 className="text-sm font-black uppercase text-secondary-950 tracking-tighter leading-tight mb-1">{chemical.name}</h1>
              {chemical.ghs_hazards?.signal_word && chemical.ghs_hazards.signal_word !== 'None' && (
                <span className="bg-secondary-900 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded mr-2">{chemical.ghs_hazards.signal_word}</span>
              )}
           </div>

           <div className="flex flex-wrap gap-1 mt-auto">
              {chemical.ghs_classes?.slice(0, 4).map(hId => {
                const h = HAZARD_CLASSES.find(x => x.id === hId || x.label === hId);
                return h ? (
                  <div key={hId} className="w-8 h-8 p-1 border border-gray-200 rounded flex items-center justify-center">
                    {h.icon}
                  </div>
                ) : null;
              })}
           </div>
           
           <div className="text-[8px] font-bold text-secondary-600 mt-2 line-clamp-1">
             {chemical.ghs_hazards?.h_codes?.join(', ') || 'No H-codes'}
           </div>
        </div>

        {/* Right Side: NFPA & PPE */}
        <div className="w-24 flex flex-col items-center justify-center gap-4">
           <NFPADiamond ratings={chemical.nfpa_rating} size="sm" />
           <div className="flex flex-wrap gap-1 justify-center">
             {chemical.ppe_requirements?.slice(0, 3).map(ppe => (
               <span key={ppe} className="px-1 py-0.5 bg-gray-100 text-[6px] font-black uppercase rounded border border-gray-200">{ppe}</span>
             ))}
           </div>
        </div>

        <div className="absolute top-0 right-0 p-1">
           <div className="text-[6px] font-black text-secondary-300 rotate-90 origin-top-right">v1.2 SAFETY-READY</div>
        </div>
      </div>

    </div>
  );
};

export default PrintLabel;
