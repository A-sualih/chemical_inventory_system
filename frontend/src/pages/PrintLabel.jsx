import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import axios from "axios";

const PrintLabel = () => {
  const { id } = useParams();
  const [chemical, setChemical] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We fetch details to show the name on the label
    const fetchDetails = async () => {
      try {
        const { data } = await axios.get(`/api/chemicals?search=${id}`);
        // Ensure exact match
        const exact = data.data.find(c => c.id === id);
        if (exact) setChemical(exact);
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

      {/* The Printable Label Container - Scaled to standard thermal sticker sizes (e.g. 50x50mm or 100x50mm) */}
      <div className="bg-white border-2 border-dashed border-gray-300 print:border-none p-4 rounded-xl shadow-xl print:shadow-none w-[80mm] h-[80mm] flex flex-col justify-center items-center text-center relative overflow-hidden print:w-auto print:h-auto">
        <div className="absolute top-0 inset-x-0 h-4 bg-secondary-950"></div>
        <div className="mt-4 mb-2">
           <h1 className="text-sm font-black uppercase text-secondary-950 tracking-tighter leading-tight line-clamp-2">{chemical.name}</h1>
           <p className="text-[10px] font-bold text-secondary-500 font-mono mt-0.5 tracking-wider">CIMS-{chemical.id}</p>
        </div>
        
        <div className="p-2 border-2 border-secondary-900 rounded-2xl mb-2 aspect-square flex items-center justify-center bg-white shadow-inner">
           <QRCode value={`${window.location.origin}/chemicals/details/${chemical.id}`} size={160} />
        </div>

        <div className="text-[8px] font-black text-secondary-400 uppercase tracking-widest">Property of Central Lab</div>
      </div>

    </div>
  );
};

export default PrintLabel;
