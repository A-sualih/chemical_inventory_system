import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import Layout from "../../layout/Layout";
import axios from "axios";
import "../../styles/ScanQR.css";

const ScanQR = () => {
  const [scannerActive, setScannerActive] = useState(false);
  const [scanMode, setScanMode] = useState("view"); // view, in, out
  const [lastScanResult, setLastScanResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const [manualId, setManualId] = useState("");

  const handleProcess = useCallback(async (decodedText) => {
    if (processing) return;

    let exactId = decodedText;
    if (decodedText.includes("/chemicals/details/")) {
      exactId = decodedText.split("/chemicals/details/")[1].split("/")[0].split("?")[0];
    } else if (decodedText.startsWith("CIMS:")) {
      exactId = decodedText.split("|")[0].split(":")[1];
    }

    if (scanMode === "view") {
      setScannerActive(false);
      navigate(`/chemicals/details/${exactId}`);
    } else {
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
  }, [processing, scanMode, navigate]);

  useEffect(() => {
    if (!scannerActive) return;

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerRef.current = html5QrcodeScanner;
    html5QrcodeScanner.render(handleProcess, () => {});

    return () => {
      try {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
        }
      } catch (err) {}
    };
  }, [scannerActive, handleProcess]);

  const modes = [
    { id: 'view', label: 'Quick View', desc: 'Read details', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { id: 'in', label: 'Check-In', desc: '+1 Container', icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'out', label: 'Check-Out', desc: '-1 Container', icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <Layout>
      <div className="scan-page-wrapper">
        {/* Header & Mode Selection */}
        <div className="scan-header-card">
          <div className="scan-header-glow"></div>
          <div className="scan-header-content">
            <h1 className="scan-main-title">Adaptive Scanner</h1>
            <p className="scan-main-desc">Select operation mode and scan labels for instant processing.</p>

            <div className="scan-mode-grid">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => { setScanMode(mode.id); setLastScanResult(null); }}
                  className={`scan-mode-btn ${scanMode === mode.id ? 'active' : ''}`}
                >
                  <svg className="scan-mode-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={mode.icon} />
                  </svg>
                  <span className="scan-mode-label">{mode.label}</span>
                  <span className="scan-mode-desc">{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Entry */}
          <div className="scan-manual-section">
            <div className="scan-manual-row">
              <div className="scan-manual-input-wrap">
                <svg className="scan-manual-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualId.trim()) {
                      handleProcess(manualId.trim());
                      setManualId("");
                    }
                  }}
                  placeholder="Manual Barcode Entry / Handheld Scan"
                  className="scan-manual-input"
                />
              </div>
              <button
                onClick={() => { if (manualId.trim()) { handleProcess(manualId.trim()); setManualId(""); } }}
                disabled={!manualId.trim() || processing}
                className="scan-manual-btn"
              >
                Process ID
              </button>
            </div>
            <p className="scan-hint-text">Scanning with a handheld device? Focus the input above and pull the trigger.</p>
          </div>
        </div>

        {/* Scanner Engine */}
        <div className="scan-engine-card">
          {/* Result Overlay */}
          {lastScanResult && (
            <div className="scan-result-overlay">
              <div className={`scan-result-card ${lastScanResult.success ? 'success' : 'error'}`}>
                <div className={`scan-result-icon ${lastScanResult.success ? 'success' : 'error'}`}>
                  {lastScanResult.success ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <h2 className="scan-result-title">{lastScanResult.success ? 'Action Recorded' : 'Process Error'}</h2>
                <p className="scan-result-msg">{lastScanResult.message}</p>
                {lastScanResult.success && (
                  <div className="scan-qty-box">
                    <p className="scan-qty-label">Current Inventory</p>
                    <div className="scan-qty-value">{lastScanResult.newQty}</div>
                    <div className="scan-qty-chem">{lastScanResult.chemical}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing Overlay */}
          {processing && (
            <div className="scan-processing-overlay">
              <div className="scan-spinner"></div>
            </div>
          )}

          {/* Idle / Active States */}
          {!scannerActive ? (
            <div className="scan-idle-state">
              <div className="scan-idle-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="scan-idle-title">Ready to Process</h3>
              <p className="scan-idle-desc">
                Initialize your camera to start scanning containers in{' '}
                <span className="scan-mode-highlight">{scanMode}</span> mode.
              </p>
              <button onClick={() => setScannerActive(true)} className="btn-activate-camera">
                Activate Camera
              </button>
            </div>
          ) : (
            <div className="scan-active-state">
              <div className="scan-reader-wrap">
                <div id="reader" className="scan-reader-box"></div>
                <div className="scan-line"></div>
              </div>
              <button onClick={() => setScannerActive(false)} className="btn-stop-scan">
                Stop Scanning
              </button>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="scan-status-bar">
          <div className="scan-status-left">
            <div className="scan-status-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="scan-status-label">Scanner Status</div>
              <div className="scan-status-value">{scannerActive ? 'Optical Recognition Active' : 'Sensors Standby'}</div>
            </div>
          </div>
          <div className="scan-divider"></div>
          <div className="scan-sync-indicator">
            <div className="scan-sync-dot"></div>
            <span className="scan-sync-label">Real-time Sync Enabled</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ScanQR;
