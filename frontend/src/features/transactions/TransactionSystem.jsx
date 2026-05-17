import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    QrCodeIcon,
    ArrowUpRightIcon,
    ArrowDownLeftIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    BeakerIcon,
    MapPinIcon,
    ShieldCheckIcon,
    TruckIcon,
    PlusCircleIcon,
    UserIcon,
    ChartBarIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import Layout from '../../layout/Layout';
import ChemicalForm from '../chemicals/ChemicalForm';
import './Transactions.css';

import { Html5Qrcode } from 'html5-qrcode';

const TransactionSystem = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isViewer = user?.role?.toLowerCase() === 'viewer / auditor';
    const isLabStaff = user?.role?.toLowerCase() === 'laboratory staff';
    const [activeTab, setActiveTab] = useState('checkout');
    const [barcode, setBarcode] = useState('');
    const [scannedData, setScannedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [history, setHistory] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [showEnrollForm, setShowEnrollForm] = useState(false);
    const [enrollSuccess, setEnrollSuccess] = useState(null);
    const [scanError, setScanError] = useState(null);      // friendly scan-not-found state
    const [enrollPrefillBarcode, setEnrollPrefillBarcode] = useState(''); // pre-fill barcode in enroll form

    // Form state
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [safetyVerified, setSafetyVerified] = useState({
        ppe: false,
        hazard: false
    });
    const [isContaminated, setIsContaminated] = useState(false);

    const barcodeInputRef = useRef(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        const syncTransactions = async () => {
            fetchHistory();
            if (scannedData && scannedData.container && scannedData.container.container_id) {
                // Silently refresh scanned data to update quantities
                try {
                    const res = await axios.get(`/api/transactions/scan/${encodeURIComponent(barcode)}`);
                    setScannedData(res.data);
                } catch (e) { /* ignore silent refresh errors */ }
            }
        };

        syncTransactions();
        const interval = setInterval(syncTransactions, 5000);

        const handleFocus = () => syncTransactions();
        window.addEventListener('focus', handleFocus);

        if (barcodeInputRef.current && activeTab !== 'history') barcodeInputRef.current.focus();

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [activeTab, scannedData ? scannedData.container?.container_id : null]);

    useEffect(() => {
        let html5QrCode = null;
        if (showCamera && !scannedData) {
            const timer = setTimeout(async () => {
                try {
                    const element = document.getElementById("reader");
                    if (!element) return;

                    html5QrCode = new Html5Qrcode("reader");
                    scannerRef.current = html5QrCode;

                    await html5QrCode.start(
                        { facingMode: "environment" },
                        {
                            fps: 30,
                            qrbox: { width: 300, height: 300 },
                            aspectRatio: 1.0
                        },
                        (decodedText) => {
                            html5QrCode.stop().then(() => {
                                setShowCamera(false);
                                setBarcode(decodedText);
                                setTimeout(() => autoScan(decodedText), 0);
                            }).catch(err => console.warn(err));
                        },
                        () => { } // Error silenced to avoid console noise
                    );
                } catch (e) {
                    console.error('Camera access error:', e);
                }
            }, 100);
            return () => {
                clearTimeout(timer);
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(e => console.warn(e));
                }
            };
        }
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(e => console.warn(e));
            }
        };
    }, [showCamera, scannedData]);

    const autoScan = async (code) => {
        let finalCode = code;

        // Handle full URLs (e.g. from printed labels)
        if (code.includes('/chemicals/details/')) {
            const parts = code.split('/');
            finalCode = parts[parts.length - 1];
        } else if (code.includes('/containers/')) {
            const parts = code.split('/');
            finalCode = parts[parts.length - 1];
        }

        setLoading(true);
        try {
            const res = await axios.get(`/api/transactions/scan/${encodeURIComponent(finalCode)}`);

            // Lab Technician Workflow: Redirect to Request form
            if (isLabStaff && res.data.chemical) {
                navigate(`/requests?chemical_id=${res.data.chemical._id}`);
                return;
            }

            setScannedData(res.data);
            setScanError(null);
            setBarcode(finalCode);
        } catch (err) {
            const msg = err.response?.data?.error || 'Scan failed';
            setScanError({ message: msg, scannedCode: finalCode });
            setScannedData(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/transactions/history');
            setHistory(res.data);
        } catch (err) {
            console.error('Failed to fetch history');
        }
    };

    const handleEnrollSave = async (formData) => {
        try {
            const res = await axios.post('/api/chemicals', formData);
            if (res.data.safety_warnings && res.data.safety_warnings.length > 0) {
                alert('STORAGE WARNING:\n\n' + res.data.safety_warnings.join('\n\n'));
            }
            setShowEnrollForm(false);
            setEnrollSuccess(res.data);
            // Auto-switch to checkout and pre-fill the new chemical's ID
            setBarcode(res.data.id || '');
            setActiveTab('checkout');
            // Auto-load the scanned data for the newly enrolled chemical
            setTimeout(() => autoScan(res.data.id), 300);
        } catch (err) {
            toast.error('Error enrolling asset: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleScan = async (e) => {
        if (e) e.preventDefault();
        if (!barcode) return;
        autoScan(barcode);
    };

    const resetScan = () => {
        setScannedData(null);
        setBarcode('');
        setQuantity('');
        setNotes('');
        setSafetyVerified({ ppe: false, hazard: false });
        setIsContaminated(false);
        setShowCamera(false);
        setScanError(null);
        setEnrollPrefillBarcode('');
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
    };

    const handleSubmit = async () => {
        if (!scannedData) return;
        if (!quantity || quantity <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }
        if (!safetyVerified.ppe || !safetyVerified.hazard) {
            toast.error('Please verify all safety protocols before proceeding');
            return;
        }

        setSubmitting(true);
        try {
            const endpoint = activeTab === 'checkout' ? '/api/transactions/checkout' : '/api/transactions/checkin';
            const payload = {
                container_id: scannedData.container._id,
                quantity: Number(quantity),
                returned_quantity: Number(quantity),
                unit: scannedData.container.unit,
                notes,
                safety_verified: {
                    ppe_worn: safetyVerified.ppe,
                    hazard_acknowledged: safetyVerified.hazard,
                    safe_handling_verified: true
                },
                is_contaminated: isContaminated,
                device_info: showCamera ? 'Mobile Camera' : 'Desktop Browser'
            };

            await axios.post(endpoint, payload);
            toast.success(`${activeTab === 'checkout' ? 'Check-out' : 'Check-in'} completed successfully!`);
            resetScan();
            fetchHistory();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Transaction failed');
        } finally {
            setSubmitting(false);
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            // Search for active containers by chemical name
            const res = await axios.get(`/api/chemicals`, { params: { search: query, limit: 10 } });
            setSearchResults(res.data.data || []);
        } catch (err) {
            console.error('Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    const selectChemical = async (chem) => {
        setLoading(true);
        try {
            // Find the first available container for this chemical
            const res = await axios.get(`/api/containers`, { params: { chemical_id: chem._id, limit: 1 } });
            if (res.data.data && res.data.data.length > 0) {
                const containerId = res.data.data[0].container_id;
                autoScan(containerId);
            } else {
                toast.error('No active containers found for this chemical.');
            }
        } catch (err) {
            toast.error('Error fetching container details.');
        } finally {
            setLoading(false);
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    const renderScannerView = () => (
        <div className="fast-track-card">
            <div className={`scanner-dashboard-split ${scannedData ? 'mode-scanned' : 'mode-prescan'}`}>

                <div className="dashboard-camera-zone">
                    <div className={`scanner-viewport ${showCamera ? 'camera-active premium-scanner-active' : ''}`} style={{ display: (showCamera || scannedData) ? 'flex' : 'none' }}>
                        <div id="reader" style={{ width: '100%' }}></div>
                        {showCamera && !scannedData && (
                            <div className="scanner-hud-overlay">
                                <div className="hud-corner top-left"></div>
                                <div className="hud-corner top-right"></div>
                                <div className="hud-corner bottom-left"></div>
                                <div className="hud-corner bottom-right"></div>
                                <div className="scanner-laser"></div>

                                <div className="hud-status-banner">
                                    <div className="status-indicator">
                                        <span className="pulse-dot active"></span>
                                        Scanner Active
                                    </div>
                                    <div className="status-subtext">Waiting for QR / Barcode...</div>
                                </div>
                                <div className="hud-camera-status">
                                    Camera: <span style={{ color: 'var(--success)' }}>Authorized</span>
                                </div>

                                <div className="hud-target-reticle">
                                    <QrCodeIcon style={{ width: '2rem', color: 'rgba(255,255,255,0.7)', strokeWidth: 1 }} />
                                </div>
                            </div>
                        )}
                        {!showCamera && !scannedData && (
                            <div className="scan-overlay-text">System Ready</div>
                        )}
                        {scannedData && (
                            <div className="scan-overlay-text success-glitch" style={{ color: 'var(--success)' }}>CHEMICAL IDENTIFIED</div>
                        )}
                    </div>

                    {!scannedData && (
                        <div className="scanner-controls-container">
                            <div className="scanner-actions-bar">
                                <button
                                    onClick={() => { setShowCamera(!showCamera); setScanError(null); }}
                                    className={`btn-submit-glow ${showCamera ? 'btn-danger' : 'btn-checkout'}`}
                                >
                                    <QrCodeIcon style={{ width: '1.25rem' }} />
                                    {showCamera ? 'Stop Scanner' : 'Launch Camera'}
                                </button>
                                
                                <div className="search-bar-wrapper">
                                    <BeakerIcon className="search-icon-inside" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        placeholder="Search by Chemical Name..."
                                        className="input-neon"
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="search-results-dropdown premium-glass">
                                            {searchResults.map(chem => (
                                                <div
                                                    key={chem._id}
                                                    className="search-result-item"
                                                    onClick={() => selectChemical(chem)}
                                                >
                                                    <div className="search-result-info">
                                                        <div className="chem-result-name">{chem.name}</div>
                                                        <div className="chem-result-cas">CAS: {chem.cas_number || 'N/A'}</div>
                                                    </div>
                                                    <div className="chem-result-stock">
                                                        {chem.quantity} {chem.unit}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {scanError && (
                                <div className="scan-error-callout">
                                    <div className="error-header">
                                        <ExclamationTriangleIcon style={{ width: '1.5rem', color: 'var(--danger)' }} />
                                        <span className="error-title">Barcode Not Found</span>
                                    </div>
                                    <p className="error-message">
                                        This barcode is not registered in our inventory. You can enroll it as a new resource below.
                                    </p>
                                    <div className="error-code-badge">
                                        Code: {scanError.scannedCode}
                                    </div>
                                    <div className="error-actions">
                                        {!isViewer && !isLabStaff && (
                                            <button
                                                onClick={() => {
                                                    setEnrollPrefillBarcode(scanError.scannedCode);
                                                    setShowEnrollForm(true);
                                                    setScanError(null);
                                                }}
                                                className="btn-submit-glow btn-checkin"
                                                style={{ flex: 1 }}
                                            >
                                                <PlusCircleIcon style={{ width: '1.2rem' }} />
                                                Register New Asset
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setScanError(null)}
                                            className="transaction-tab-btn"
                                            style={{ background: '#f3f4f6', color: '#4b5563' }}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleScan} className="manual-scan-form">
                                <label className="detail-label">Direct ID Entry</label>
                                <div className="manual-input-group">
                                    <input
                                        ref={barcodeInputRef}
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        placeholder="Enter Barcode or ID..."
                                        className="input-neon manual-barcode-input"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !barcode}
                                        className={`btn-submit-glow ${activeTab === 'checkout' ? 'btn-checkout' : 'btn-checkin'} manual-scan-btn`}
                                    >
                                        {loading ? 'Analyzing...' : 'Scan Database'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {!scannedData && (
                    <div className="dashboard-intelligence-zone premium-dashboard-glass">
                        {isLabStaff ? (
                            <div className="intelligence-dashboard" style={{ background: 'linear-gradient(135deg, rgba(235, 253, 248, 0.95), rgba(204, 251, 241, 0.6))', borderColor: 'rgba(20, 184, 166, 0.3)', borderLeft: '6px solid var(--success)', backdropFilter: 'blur(10px)' }}>
                                <h3 className="dashboard-title" style={{ color: '#0f4c4a', fontSize: '1.2rem', marginBottom: '2rem' }}>
                                    <div style={{ background: 'rgba(20, 184, 166, 0.1)', padding: '0.6rem', borderRadius: '50%', display: 'inline-flex', marginRight: '0.75rem' }}>
                                        <UserIcon style={{width: '1.4rem', color: '#0d9488'}}/> 
                                    </div>
                                    Laboratory Assistant Station
                                </h3>

                                <div className="dashboard-metrics-grid" style={{ marginBottom: '2.5rem' }}>
                                    <div className="metric-box glass-card" style={{ background: 'white', border: '1px solid rgba(20, 184, 166, 0.2)', padding: '1.5rem' }}>
                                        <div className="metric-label" style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: '0.5rem' }}>SESSION THROUGHPUT</div>
                                        <div className="metric-value" style={{color: '#0f766e', fontSize: '1.5rem', fontWeight: 900}}>
                                            {history?.length || 0} <span style={{fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8'}}>scans</span>
                                        </div>
                                    </div>
                                    <div className="metric-box glass-card" style={{ background: 'white', border: '1px solid rgba(20, 184, 166, 0.2)', padding: '1.5rem' }}>
                                        <div className="metric-label" style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: '0.5rem' }}>SAFETY STATUS</div>
                                        <div className="metric-value" style={{color:'#10b981', fontSize:'0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800}}>
                                            <ShieldCheckIcon style={{width: '1.2rem'}}/> Active Profile
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.8)' }}>
                                    <h4 className="dashboard-subtitle" style={{marginBottom:'1.25rem', fontSize:'0.75rem', color:'#115e59', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                        <BeakerIcon style={{width: '1rem'}}/> Technician Guidelines
                                    </h4>
                                    <div className="activity-stream" style={{ gap: '1rem' }}>
                                        <div className="stream-item" style={{display:'flex', alignItems:'start', padding:'1rem', background:'white', borderRadius:'1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.03)'}}>
                                             <div className="stream-content">
                                                  <div className="stream-title" style={{fontWeight:800, color:'#134e4a', fontSize:'0.9rem', marginBottom: '0.2rem'}}>Inventory Auto-Routing</div>
                                                  <div className="stream-meta" style={{fontSize:'0.75rem', color:'#64748b', fontWeight: 500, lineHeight: 1.4}}>Any scanned item will be automatically analyzed and routed to your personalized requisition form.</div>
                                             </div>
                                        </div>
                                        <div className="stream-item" style={{display:'flex', alignItems:'start', padding:'1rem', background:'white', borderRadius:'1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.03)'}}>
                                             <div className="stream-content">
                                                  <div className="stream-title" style={{fontWeight:800, color:'#134e4a', fontSize:'0.9rem', marginBottom: '0.2rem'}}>Safety Verification</div>
                                                  <div className="stream-meta" style={{fontSize:'0.75rem', color:'#64748b', fontWeight: 500, lineHeight: 1.4}}>Please ensure all PPE requirements displayed on screen are met before physically retrieving the chemical.</div>
                                             </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(20, 184, 166, 0.05)', borderRadius: '1rem', border: '1px dashed rgba(20, 184, 166, 0.2)' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#0f766e', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.05em' }}>
                                        Scanner Telemetry: <span style={{ color: '#10b981' }}>OPTIMIZED</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="intelligence-dashboard">
                                <h3 className="dashboard-title">
                                    <ChartBarIcon style={{ width: '1.2rem', display: 'inline', marginRight: '0.5rem', color: 'var(--primary)', verticalAlign: 'middle' }} />
                                    Regional Intelligence
                                </h3>
                                <div className="dashboard-metrics-grid">
                                    <div className="metric-box glass-card">
                                        <div className="metric-label">Sensor Array</div>
                                        <div className="metric-value" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span className="pulse-dot" style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', animation: 'pulseReticle 1.5s infinite' }}></span> Online
                                        </div>
                                    </div>
                                    <div className="metric-box glass-card">
                                        <div className="metric-label">Uplink Status</div>
                                        <div className="metric-value">Secured</div>
                                    </div>
                                    <div className="metric-box glass-card">
                                        <div className="metric-label">Session Scans</div>
                                        <div className="metric-value">{history?.length || 0} Assets</div>
                                    </div>
                                    <div className="metric-box glass-card">
                                        <div className="metric-label">Last Sync</div>
                                        <div className="metric-value" style={{ fontSize: '0.8rem' }}>Runtime Active</div>
                                    </div>
                                </div>

                                <h4 className="dashboard-subtitle" style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Recent Telemetry</h4>
                                <div className="activity-stream">
                                    {history && history.length > 0 ? (
                                        history.slice(0, 4).map((item, idx) => (
                                            <div key={idx} className="stream-item" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.5)', borderRadius: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.8)' }}>
                                                <div className="stream-icon" style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '0.5rem', marginRight: '1rem' }}>
                                                    <BeakerIcon style={{ width: '1.2rem', color: 'var(--primary)' }} />
                                                </div>
                                                <div className="stream-content">
                                                    <div className="stream-title" style={{ fontWeight: 800, color: 'var(--secondary-900)', fontSize: '0.9rem' }}>{item.chemicalName}</div>
                                                    <div className="stream-meta" style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', fontWeight: 600 }}>{new Date(item.timestamp).toLocaleTimeString()} - {item.type}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="stream-empty" style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary-400)', fontStyle: 'italic', fontSize: '0.85rem', background: 'rgba(255,255,255,0.5)', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
                                            Awaiting incoming telemetry...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {scannedData && (
                <div className="scanned-content">
                    {isViewer ? (
                        <div className="professional-viewer-layout glassmorphism-theme">
                            <div className="chemical-identity-card glass-card">
                                <div className="card-header-main">
                                    <div className="header-primary">
                                        <h2 className="viewer-chem-name">
                                            {scannedData.chemical.name}
                                            {scannedData.chemical.formula && <span className="viewer-chem-formula">({scannedData.chemical.formula})</span>}
                                        </h2>
                                        <div className="professional-status-badges">
                                            {scannedData.chemical.status === 'In Stock' && <span className="status-badge-modern available">🟢 AVAILABLE</span>}
                                            {scannedData.chemical.status === 'Low Stock' && <span className="status-badge-modern low-stock">🟡 LOW STOCK</span>}
                                            {(scannedData.chemical.hazard_summary?.health || scannedData.chemical.hazard_summary?.physical) && <span className="status-badge-modern hazardous">🔴 HAZARDOUS</span>}
                                            {new Date(scannedData.chemical.expiry_date) < new Date() && <span className="status-badge-modern expired">⚫ EXPIRED</span>}
                                        </div>
                                    </div>
                                    <div className="chemical-id-callout">
                                        <code>{scannedData.chemical.id || 'N/A'}</code>
                                        <div className="callout-label">SYS_ID</div>
                                    </div>
                                </div>

                                <div className="identity-data-grid premium-grid">
                                    <div className="identity-item glass-item">
                                        <label>CAS Number</label>
                                        <span>{scannedData.chemical.cas_number || 'N/A'}</span>
                                    </div>
                                    <div className="identity-item glass-item">
                                        <label>Signal Word</label>
                                        <span style={{
                                            color: scannedData.chemical.ghs_hazards?.signal_word === 'Danger' ? 'var(--danger)' :
                                                scannedData.chemical.ghs_hazards?.signal_word === 'Warning' ? 'var(--warning-dark)' : 'inherit',
                                            fontWeight: 700
                                        }}>
                                            {scannedData.chemical.ghs_hazards?.signal_word ? scannedData.chemical.ghs_hazards.signal_word.toUpperCase() : 'NONE'}
                                        </span>
                                    </div>
                                    <div className="identity-item glass-item">
                                        <label>Category</label>
                                        <span>{scannedData.chemical.category || 'N/A'}</span>
                                    </div>
                                    <div className="identity-item glass-item">
                                        <label>Assigned Lab</label>
                                        <span>{scannedData.chemical.lab_name || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="chemical-display-grid premium-three-col" style={{ marginTop: '2rem' }}>
                                <div className="info-main-card glass-card">
                                    <div className="detail-label"><ClockIcon style={{ width: '1em', display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Storage & Stability</div>
                                    <div className="detail-section" style={{ marginTop: '1rem' }}>
                                        <div className="detail-label" style={{ fontSize: '0.75rem' }}>Current Placement</div>
                                        <div className="detail-value" style={{ fontSize: '1rem' }}>
                                            <MapPinIcon style={{ width: '1.2rem', display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle', color: 'var(--primary)' }} />
                                            {scannedData.container.location || 'Not Assigned'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '0.75rem' }}>
                                        <div>
                                            <div className="detail-label" style={{ fontSize: '0.7rem' }}>Temp</div>
                                            <div style={{ fontWeight: 700, color: 'var(--secondary-900)' }}>{scannedData.chemical.storage_temp || 'Ambient'}</div>
                                        </div>
                                        <div>
                                            <div className="detail-label" style={{ fontSize: '0.7rem' }}>Humidity</div>
                                            <div style={{ fontWeight: 700, color: 'var(--secondary-900)' }}>{scannedData.chemical.storage_humidity || 'Standard'}</div>
                                        </div>
                                    </div>
                                    <div className="detail-section" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1rem' }}>
                                        <div className="detail-label" style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <ExclamationTriangleIcon style={{ width: '1em' }} /> Keep Away From:
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem', lineHeight: 1.5 }}>
                                            {scannedData.chemical.incompatibility?.length > 0 ? scannedData.chemical.incompatibility.join(', ') : 'No special incompatibilities noted.'}
                                        </div>
                                    </div>
                                </div>

                                <div className="info-main-card glass-card" style={{ borderColor: scannedData.warnings.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'inherit' }}>
                                    <div className="detail-label">Safety & Protection</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                                        {scannedData.chemical.ppe_requirements?.map((ppe, i) => (
                                            <span key={i} className="ppe-badge-modern premium-badge">
                                                {ppe}
                                            </span>
                                        ))}
                                        {(!scannedData.chemical.ppe_requirements || scannedData.chemical.ppe_requirements.length === 0) && (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Standard Lab Protection</span>
                                        )}
                                    </div>
                                    {scannedData.warnings.length > 0 && (
                                        <div className="hazard-warning-box glass-warning">
                                            <div style={{ color: '#991b1b', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Active Hazard Alerts</div>
                                            {scannedData.warnings.map((w, i) => (
                                                <div key={i} className="hazard-warning-item">
                                                    <ExclamationTriangleIcon style={{ width: '1.1rem', flexShrink: 0 }} />
                                                    <span>{w}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {(() => {
                                        const sdsUrl = scannedData.chemical.sds_file_url || (scannedData.chemical.sds_docs && scannedData.chemical.sds_docs[0]?.file_url);
                                        if (!sdsUrl) return null;

                                        return (
                                            <div className="sds-download-section" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                <div className="detail-label" style={{ marginBottom: '0.75rem' }}>Safety Documents</div>
                                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            window.open(sdsUrl, '_blank', 'noopener,noreferrer');
                                                        }}
                                                        className="btn-submit-glow"
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                                            padding: '0.5rem 1.25rem', border: 'none', cursor: 'pointer',
                                                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                                            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                                                            color: '#fff', fontSize: '0.85rem', fontWeight: 700
                                                        }}>
                                                        <DocumentArrowDownIcon style={{ width: '1.25rem' }} />
                                                        View & Download SDS
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="info-main-card glass-card">
                                    <div className="detail-label">NFPA & Emergency Prep</div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginTop: '1rem' }}>
                                        <div className="nfpa-diamond-container">
                                            <div className="nfpa-diamond">
                                                <div className="nfpa-top">{scannedData.chemical.nfpa_rating?.flammability || 0}</div>
                                                <div className="nfpa-left">{scannedData.chemical.nfpa_rating?.health || 0}</div>
                                                <div className="nfpa-right">{scannedData.chemical.nfpa_rating?.reactivity || 0}</div>
                                                <div className="nfpa-bottom">{scannedData.chemical.nfpa_rating?.special || ''}</div>
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div className="emergency-prep-item">
                                                <div className="prep-label">First Aid:</div>
                                                <div className="prep-value">{scannedData.chemical.emergency_response?.first_aid || 'Standard Protocol'}</div>
                                            </div>
                                            <div className="emergency-prep-item" style={{ marginTop: '0.75rem' }}>
                                                <div className="prep-label">Spill Response:</div>
                                                <div className="prep-value">{scannedData.chemical.spill_instructions || 'Notify HazMat. Contain spill.'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="chemical-display-grid">
                            <div className="info-main-card">
                                <div className="detail-label">Resource Details</div>
                                <h2 className="chem-title-large">{scannedData.chemical.name}</h2>
                                <div className="chem-subtitle">
                                    <BeakerIcon style={{ width: '1rem' }} />
                                    {scannedData.chemical.cas_number || 'No CAS Recorded'}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
                                    <div className="detail-section">
                                        <div className="detail-label">Current Stock</div>
                                        <div className="detail-value">{scannedData.container.quantity} {scannedData.container.unit}</div>
                                    </div>
                                    <div className="detail-section">
                                        <div className="detail-label">Storage Location</div>
                                        <div className="detail-value" style={{ fontSize: '1rem' }}>
                                            <MapPinIcon style={{ width: '1.1rem', display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                                            {scannedData.container.location || 'Not Assigned'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="info-main-card" style={{ borderColor: scannedData.warnings.length > 0 ? 'var(--danger)' : 'var(--border-color)' }}>
                                <div className="detail-label">Safety & PPE Compliance</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                                    {scannedData.chemical.ppe_requirements?.map((ppe, i) => (
                                        <span key={i} style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', background: '#eff6ff', color: '#1e40af', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #dbeafe' }}>
                                            {ppe}
                                        </span>
                                    ))}
                                    {(!scannedData.chemical.ppe_requirements || scannedData.chemical.ppe_requirements.length === 0) && (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Standard Lab Protection</span>
                                    )}
                                </div>
                                {scannedData.warnings.length > 0 && (
                                    <div style={{ marginTop: '2rem', background: '#fef2f2', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #fee2e2' }}>
                                        <div style={{ color: '#991b1b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>Hazard Warnings:</div>
                                        {scannedData.warnings.map((w, i) => (
                                            <div key={i} style={{ color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                <ExclamationTriangleIcon style={{ width: '1.1rem' }} />
                                                {w}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!(isViewer || isLabStaff) && (
                        <div className="transaction-input-group" style={{ marginTop: '3rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                                <div>
                                    <label className="detail-label">{activeTab === 'checkout' ? 'Check-Out Quantity' : 'Return Quantity'}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            className="input-neon"
                                            placeholder={`Max: ${scannedData.container.quantity}`}
                                        />
                                        <span style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>{scannedData.container.unit}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                        {[100, 250, 500, 1000].map(val => (
                                            <button key={val} className="transaction-tab-btn" style={{ padding: '0.4rem 1rem', background: '#f1f5f9' }} onClick={() => setQuantity(val)}>+{val}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="info-main-card" style={{ padding: '1.5rem' }}>
                                    <div className="detail-label">Confirmation Check</div>
                                    <div className="safety-verify-list">
                                        <label className={`safety-check-card ${safetyVerified.ppe ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={safetyVerified.ppe}
                                                onChange={(e) => setSafetyVerified(prev => ({ ...prev, ppe: e.target.checked }))}
                                            />
                                            <span className="safety-check-label">PPE verified and worn</span>
                                        </label>
                                        <label className={`safety-check-card ${safetyVerified.hazard ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={safetyVerified.hazard}
                                                onChange={(e) => setSafetyVerified(prev => ({ ...prev, hazard: e.target.checked }))}
                                            />
                                            <span className="safety-check-label">Safety guidelines read</span>
                                        </label>
                                        {activeTab === 'checkin' && (
                                            <label className={`safety-check-card danger-check ${isContaminated ? 'checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isContaminated}
                                                    onChange={(e) => setIsContaminated(e.target.checked)}
                                                />
                                                <span className="safety-check-label">Flag for contamination?</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3.5rem' }}>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className={`btn-submit-glow ${activeTab === 'checkout' ? 'btn-checkout' : 'btn-checkin'}`}
                                    style={{ flex: 2 }}
                                >
                                    {submitting ? 'Processing...' : `Confirm ${activeTab === 'checkout' ? 'Check-Out' : 'Check-In'}`}
                                </button>
                                <button
                                    onClick={resetScan}
                                    className="transaction-tab-btn"
                                    style={{ flex: 1, justifyContent: 'center', background: '#f3f4f6' }}
                                >
                                    Cancel / New Scan
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderHistory = () => (
        <div className="history-list">
            {history.map(item => (
                <div key={item._id} className="history-card-fancy">
                    <div className="history-main" style={{ display: 'flex', alignItems: 'center' }}>
                        <div className={`history-icon-box ${item.type === 'Check-Out' ? 'history-icon-out' : 'history-icon-in'}`}>
                            {item.type === 'Check-Out' ? <ArrowUpRightIcon style={{ width: '1.5rem' }} /> : <ArrowDownLeftIcon style={{ width: '1.5rem' }} />}
                        </div>
                        <div className="history-details" style={{ marginLeft: '1rem' }}>
                            <h4>{item.chemical_name}</h4>
                            <div className="history-meta">
                                <span><UserIcon style={{ width: '0.9rem' }} /> {item.user_name}</span>
                                <span><ClockIcon style={{ width: '0.9rem' }} /> {new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: item.type === 'Check-Out' ? 'var(--danger)' : 'var(--success)' }}>
                            {item.type === 'Check-Out' ? '-' : '+'}{item.quantity} {item.unit}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {item.container_barcode.substring(0, 12)}
                        </div>
                    </div>
                </div>
            ))}
            {history.length === 0 && (
                <div style={{ textAlign: 'center', padding: '8rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No transactions found in this session.
                </div>
            )}
        </div>
    );

    return (
        <Layout>
            <div className="transactions-container">
                <header className="transactions-header">
                    <div>
                        <h1 className="transactions-title">Fast Track <span>Logistics</span></h1>
                        <p style={{ color: 'var(--secondary-500)', marginTop: '0.5rem' }}>High-speed chemical borrowing and return system.</p>
                    </div>
                    <div className="transactions-tabs">
                        {!isViewer && !isLabStaff && (
                            <>
                                <button
                                    className={`transaction-tab-btn ${activeTab === 'checkout' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('checkout')}
                                >
                                    <ArrowUpRightIcon style={{ width: '1.2rem' }} />
                                    Check-Out
                                </button>
                                <button
                                    className={`transaction-tab-btn ${activeTab === 'checkin' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('checkin')}
                                >
                                    <ArrowDownLeftIcon style={{ width: '1.2rem' }} />
                                    Check-In
                                </button>
                                <button
                                    className={`transaction-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('history')}
                                >
                                    <ClockIcon style={{ width: '1.2rem' }} />
                                    Activity
                                </button>
                            </>
                        )}
                        {!isViewer && !isLabStaff && (
                            <button
                                className={`transaction-tab-btn enroll-tab-btn`}
                                onClick={() => setShowEnrollForm(true)}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))',
                                    border: '1px solid rgba(16,185,129,0.4)',
                                    color: '#34d399'
                                }}
                            >
                                <PlusCircleIcon style={{ width: '1.2rem' }} />
                                Enroll Asset
                            </button>
                        )}
                    </div>
                </header>

                {activeTab !== 'history' ? renderScannerView() : renderHistory()}

                {showEnrollForm && (
                    <ChemicalForm
                        initialData={enrollPrefillBarcode ? { barcode: enrollPrefillBarcode } : null}
                        onClose={() => { setShowEnrollForm(false); setEnrollPrefillBarcode(''); }}
                        onSave={handleEnrollSave}
                    />
                )}
            </div>
        </Layout>
    );
};

export default TransactionSystem;

