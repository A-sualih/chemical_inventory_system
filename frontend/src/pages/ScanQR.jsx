import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import Layout from "../layout/Layout";
import axios from "axios";

const ScanQR = () => {
  const [scannerActive, setScannerActive] = useState(false);
  const [scanMode, setScanMode] = useState("view"); // view, in, out
  const [lastScanResult, setLastScanResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!scannerActive) return;

    async function onScanSuccess(decodedText) {
      if (processing) return;
      
      let exactId = decodedText;
      // Handle the new full URL format
      if (decodedText.includes("/chemicals/details/")) {
         exactId = decodedText.split("/chemicals/details/")[1].split("/")[0].split("?")[0];
      }
      else if (decodedText.startsWith("CIMS:")) {
         exactId = decodedText.split("|")[0].split(":")[1];
      }

      if (scanMode === "view") {
        setScannerActive(false); 
        navigate(`/chemicals/details/${exactId}`);
      } else {
        // Fast Check-In / Check-Out Logic
        setProcessing(true);
        try {
          const action = scanMode === "in" ? "IN" : "OUT";
          const { data } = await axios.post("/api/inventory/quick-scan", {
            chemical_id: exactId,
            action: action
          });
          
          setLastScanResult({
            success: true,
            message: data.message,
            chemical: data.chemicalName,
            newQty: `${data.newQty} ${data.unit}`
          });

          // Reset result after 3 seconds but keep scanner active for next item
          setTimeout(() => setLastScanResult(null), 4000);
        } catch (err) {
          setLastScanResult({
            success: false,
            message: err.response?.data?.error || "Transaction failed"
          });
          setTimeout(() => setLastScanResult(null), 5000);
        } finally {
          setProcessing(false);
        }
      }
    }

    function onScanFailure() { /* ignore */ }

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerRef.current = html5QrcodeScanner;
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);

    return () => {
      try {
        if (scannerRef.current) {
           scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
        }
      } catch (err) { }
    };
  }, [scannerActive, scanMode, navigate, processing]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header and Mode Selection */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-secondary-200/50 border border-secondary-100 mb-8 mt-4 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] rounded-full pointer-events-none"></div>
           
           <div className="relative z-10">
              <h1 className="text-3xl font-black heading-font tracking-tight mb-2 text-secondary-900">Adaptive Scanner</h1>
              <p className="text-secondary-500 text-sm font-medium mb-8">Select operation mode and scan labels for instant processing.</p>
              
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'view', label: 'Quick View', desc: 'Read details', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', color: 'primary' },
                  { id: 'in', label: 'Check-In', desc: '+1 Container', icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green' },
                  { id: 'out', label: 'Check-Out', desc: '-1 Container', icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z', color: 'orange' },
                ].map((mode) => (
                  <button 
                    key={mode.id}
                    onClick={() => {
                      setScanMode(mode.id);
                      setLastScanResult(null);
                    }}
                    className={`flex flex-col items-center p-5 rounded-[2rem] border-2 transition-all cursor-pointer ${
                      scanMode === mode.id 
                      ? `bg-secondary-900 border-secondary-900 text-white shadow-2xl scale-[1.02] shadow-secondary-900/20` 
                      : `bg-secondary-50 border-secondary-100 text-secondary-600 hover:bg-white hover:border-primary-200`
                    }`}
                  >
                    <svg className={`w-8 h-8 mb-3 ${scanMode === mode.id ? 'text-primary-400' : 'text-secondary-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={mode.icon} />
                    </svg>
                    <span className="text-xs font-black uppercase tracking-widest">{mode.label}</span>
                    <span className={`text-[10px] mt-1 font-bold ${scanMode === mode.id ? 'text-secondary-400' : 'text-secondary-400'}`}>{mode.desc}</span>
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* Scanner Engine */}
        <div className="bg-secondary-950 rounded-[3rem] p-6 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center border border-white/5">
           
           {/* Success/Error Overlay */}
           {lastScanResult && (
             <div className={`absolute inset-0 z-20 backdrop-blur-md flex items-center justify-center p-8 transition-all duration-500 animate-in fade-in zoom-in-95`}>
               <div className={`w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl text-center border-4 ${
                 lastScanResult.success ? 'bg-white border-green-500' : 'bg-white border-red-500'
               }`}>
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                   lastScanResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                 }`}>
                   {lastScanResult.success ? (
                     <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                   ) : (
                     <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                   )}
                 </div>
                 <h2 className="text-xl font-black text-secondary-900 mb-1">{lastScanResult.success ? 'Action Recorded' : 'Process Error'}</h2>
                 <p className="text-secondary-500 text-sm font-bold mb-4">{lastScanResult.message}</p>
                 {lastScanResult.success && (
                   <div className="bg-secondary-50 p-4 rounded-2xl">
                      <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Current Inventory</div>
                      <div className="text-2xl font-black text-secondary-900">{lastScanResult.newQty}</div>
                      <div className="text-xs font-bold text-primary-600 truncate">{lastScanResult.chemical}</div>
                   </div>
                 )}
               </div>
             </div>
           )}

           {processing && (
             <div className="absolute inset-0 z-30 bg-secondary-900/40 backdrop-blur-sm flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
             </div>
           )}

           {!scannerActive ? (
             <div className="flex flex-col items-center py-12 px-8 text-center relative z-10">
                <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner mb-8">
                   <svg className="w-12 h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                </div>
                <h3 className="text-2xl font-black text-white mb-3">Ready to Process</h3>
                <p className="text-secondary-400 text-sm font-medium mb-10 max-w-xs leading-relaxed">Initialize your camera to start scanning containers in <span className="text-primary-400 font-bold uppercase tracking-widest">{scanMode}</span> mode.</p>
                <button 
                  onClick={() => setScannerActive(true)}
                  className="px-10 py-5 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-3xl shadow-2xl shadow-primary-600/40 transition-all hover:-translate-y-1 w-full max-w-xs uppercase tracking-widest text-sm cursor-pointer"
                >
                  Activate Camera
                </button>
             </div>
           ) : (
             <div className="w-full h-full min-h-[400px] flex flex-col items-center">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] p-4 shadow-2xl border-8 border-white/10 relative">
                   <div id="reader" className="w-full rounded-[2rem] overflow-hidden bg-black aspect-square"></div>
                   
                   {/* Visual scan line animation */}
                   <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-primary-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan-line z-10 pointer-events-none"></div>
                </div>
                
                <button 
                  onClick={() => setScannerActive(false)}
                  className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all cursor-pointer backdrop-blur-md border border-white/10"
                >
                  Stop Scanning
                </button>
             </div>
           )}
        </div>

        {/* Recent Activity Mini-Feed (Optional Polish) */}
        <div className="mt-8 mb-12 bg-secondary-50/50 p-6 rounded-[2.5rem] border border-secondary-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-secondary-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Scanner Status</div>
                <div className="text-xs font-bold text-secondary-900">{scannerActive ? 'Optical Recognition Active' : 'Sensors Standby'}</div>
              </div>
           </div>
           <div className="h-4 w-[1px] bg-secondary-200"></div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Real-time Sync Enabled</span>
           </div>
        </div>

      </div>
      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(-120px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120px); opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2s infinite linear;
        }
      `}</style>
    </Layout>
  );
};

export default ScanQR;
