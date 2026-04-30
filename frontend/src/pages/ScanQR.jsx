import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import Layout from "../layout/Layout";

const ScanQR = () => {
  const [scanResult, setScanResult] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Only init scanner when active flag is set to avoid runaway camera instances
    if (!scannerActive) return;

    function onScanSuccess(decodedText, decodedResult) {
      setScanResult(decodedText);
      setScannerActive(false); // Stop scanner on success
      
      // Auto-navigate to chemicals list with search term
      // Or in a fully complete version, we could navigate to an exact chemical details modal.
      // Since chemicals list handles "CIMS:ID" scanners, we can redirect there.
      // However the QR Code is currently purely just the unique ID (e.g. C001) based on our backend fix!
      
      setTimeout(() => {
         navigate(`/chemicals?search=${encodeURIComponent(decodedText)}`);
      }, 1500);
    }

    function onScanFailure(error) {
      // Ignore failures continuously
    }

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    scannerRef.current = html5QrcodeScanner;

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);

    return () => {
      try {
        if (scannerRef.current) {
           scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
        }
      } catch (err) {
        console.error("Cleanup error", err);
      }
    };
  }, [scannerActive, navigate]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        
        <div className="w-full bg-secondary-950 p-8 sm:p-12 text-center text-white rounded-[3rem] shadow-2xl relative overflow-hidden mt-8">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary-500/10 blur-[80px] rounded-full -ml-16 -mb-16"></div>
           
           <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/5 shadow-inner mb-6">
                 <svg className="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              </div>
              <h1 className="text-3xl font-black heading-font tracking-tight mb-3">Inventory Scanner</h1>
              <p className="text-secondary-400 text-sm font-medium leading-relaxed max-w-sm mb-10">Use your device camera to scan chemical QR codes and instantly view safety data & quantities.</p>
              
              {!scannerActive && !scanResult && (
                 <button 
                  onClick={() => setScannerActive(true)}
                  className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-2xl shadow-xl shadow-primary-600/30 transition-all hover:-translate-y-1 w-full max-w-xs uppercase tracking-widest text-sm"
                 >
                   Launch Camera
                 </button>
              )}

              {scannerActive && (
                 <div className="w-full bg-white rounded-[2rem] p-4 shadow-xl border-4 border-white">
                    <div id="reader" className="w-full rounded-[1.5rem] overflow-hidden bg-black aspect-square"></div>
                    <button 
                      onClick={() => setScannerActive(false)}
                      className="mt-4 px-6 py-3 w-full bg-secondary-100 text-secondary-600 font-bold rounded-xl hover:bg-secondary-200 transition-all"
                    >
                      Cancel Scanning
                    </button>
                 </div>
              )}

              {scanResult && (
                 <div className="bg-green-500/20 border border-green-500/40 p-6 rounded-2xl w-full max-w-xs animate-in zoom-in-95 duration-300">
                    <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div className="text-green-400 font-black text-lg mb-1">Scan Complete</div>
                    <div className="text-white font-mono bg-black/30 rounded py-1 px-3 inline-block shadow-inner">ID: {scanResult}</div>
                    <p className="text-xs text-green-300/60 font-bold mt-4 animate-pulse">Redirecting to registry...</p>
                 </div>
              )}
           </div>
        </div>

      </div>
    </Layout>
  );
};

export default ScanQR;
