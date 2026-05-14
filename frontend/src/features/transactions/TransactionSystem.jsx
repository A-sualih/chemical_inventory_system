import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
  UserIcon
} from '@heroicons/react/24/outline';
import Layout from '../../layout/Layout';
import ChemicalForm from '../chemicals/ChemicalForm';
import './Transactions.css';

import { Html5QrcodeScanner } from 'html5-qrcode';

const TransactionSystem = () => {
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
        let scanner = null;
        if (showCamera && !scannedData) {
            const timer = setTimeout(() => {
                try {
                    scanner = new Html5QrcodeScanner("reader", { 
                        fps: 15, 
                        qrbox: { width: 280, height: 280 },
                        aspectRatio: 1.0,
                        rememberLastUsedCamera: true,
                        supportedScanTypes: [0] // 0 = camera (QR + barcodes)
                    });
                    scanner.render((decodedText) => {
                        setShowCamera(false);
                        setBarcode(decodedText);
                        setTimeout(() => autoScan(decodedText), 0);
                    }, () => {});
                    scannerRef.current = scanner;
                } catch (e) {
                    console.error('Scanner init error:', e);
                }
            }, 100);
            return () => {
                clearTimeout(timer);
                if (scannerRef.current) scannerRef.current.clear().catch(e => console.warn(e));
            };
        }
        return () => {
            if (scannerRef.current) scannerRef.current.clear().catch(e => console.warn(e));
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
            alert('Error enrolling asset: ' + (err.response?.data?.error || err.message));
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
            alert('Please enter a valid quantity');
            return;
        }
        if (!safetyVerified.ppe || !safetyVerified.hazard) {
            alert('Please verify all safety protocols before proceeding');
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
            alert(`${activeTab === 'checkout' ? 'Check-out' : 'Check-in'} completed successfully!`);
            resetScan();
            fetchHistory();
        } catch (err) {
            alert(err.response?.data?.error || 'Transaction failed');
        } finally {
            setSubmitting(false);
        }
    };

    const renderScannerView = () => (
        <div className="fast-track-card">
            <div className={`scanner-viewport ${showCamera ? 'camera-active' : ''}`} style={{ display: (showCamera || scannedData) ? 'flex' : 'none' }}>
                <div id="reader" style={{ width: '100%' }}></div>
                {showCamera && !scannedData && <div className="scanner-laser"></div>}
                {!showCamera && !scannedData && (
                    <div className="scan-overlay-text">System Ready</div>
                )}
                {scannedData && (
                    <div className="scan-overlay-text" style={{ color: 'var(--success)' }}>Chemical Identified</div>
                )}
            </div>

            {!scannedData ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
                        <button 
                            onClick={() => { setShowCamera(!showCamera); setScanError(null); }}
                            className={`transaction-tab-btn ${showCamera ? 'active' : ''}`}
                            style={{ 
                                background: showCamera ? 'var(--danger)' : 'var(--primary)', 
                                color: 'white', 
                                padding: '0.75rem 2rem'
                            }}
                        >
                            <QrCodeIcon style={{ width: '1.25rem' }} />
                            {showCamera ? 'Stop Scanner' : 'Launch Camera'}
                        </button>
                    </div>

                    {scanError && (
                        <div style={{
                            maxWidth: '600px', margin: '0 auto 3rem',
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            borderRadius: '1rem', padding: '2rem', textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <ExclamationTriangleIcon style={{ width: '1.5rem', color: 'var(--danger)' }} />
                                <span style={{ color: '#9f1239', fontWeight: 700, fontSize: '1.1rem' }}>Barcode Not Found</span>
                            </div>
                            <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                                This barcode is not registered in our inventory. You can enroll it as a new resource below.
                            </p>
                            <div style={{
                                background: '#fff', borderRadius: '0.5rem',
                                padding: '1rem', fontFamily: 'var(--font-mono)',
                                fontSize: '1rem', color: '#1f2937', marginBottom: '2rem',
                                border: '1px solid #e5e7eb'
                            }}>
                                Code: {scanError.scannedCode}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
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
                        <label className="detail-label" style={{ marginBottom: '1rem', display: 'block' }}>Manual Container Entry</label>
                        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                placeholder="Enter Barcode or ID..."
                                className="input-neon"
                                style={{ textAlign: 'center' }}
                            />
                            <button 
                                type="submit"
                                disabled={loading || !barcode}
                                className={`btn-submit-glow ${activeTab === 'checkout' ? 'btn-checkout' : 'btn-checkin'}`}
                                style={{ marginTop: '1.5rem' }}
                            >
                                {loading ? 'Checking Inventory...' : 'Scan Database'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="scanned-content">
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
                                <div className="safety-verify-box" style={{ background: 'transparent', border: 'none', padding: 0, marginTop: '1rem' }}>
                                    <label className="safety-check-item">
                                        <input 
                                            type="checkbox" 
                                            checked={safetyVerified.ppe} 
                                            onChange={(e) => setSafetyVerified(prev => ({ ...prev, ppe: e.target.checked }))} 
                                        />
                                        <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>PPE verified and worn</span>
                                    </label>
                                    <label className="safety-check-item">
                                        <input 
                                            type="checkbox" 
                                            checked={safetyVerified.hazard} 
                                            onChange={(e) => setSafetyVerified(prev => ({ ...prev, hazard: e.target.checked }))} 
                                        />
                                        <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>Safety guidelines read</span>
                                    </label>
                                    {activeTab === 'checkin' && (
                                        <label className="safety-check-item" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={isContaminated} 
                                                onChange={(e) => setIsContaminated(e.target.checked)} 
                                            />
                                            <span style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 700 }}>Flag for contamination?</span>
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
