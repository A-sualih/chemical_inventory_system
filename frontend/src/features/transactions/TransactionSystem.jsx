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
  TruckIcon
} from '@heroicons/react/24/outline';
import Layout from '../../layout/Layout';
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
        fetchHistory();
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }, [activeTab]);

    useEffect(() => {
        let scanner = null;
        if (showCamera && !scannedData) {
            scanner = new Html5QrcodeScanner("reader", { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            });

            scanner.render((decodedText) => {
                setBarcode(decodedText);
                autoScan(decodedText);
                setShowCamera(false);
            }, (err) => {
                // Ignore errors
            });
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(e => console.warn(e));
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
            const res = await axios.get(`/api/transactions/scan/${finalCode}`);
            setScannedData(res.data);
            setBarcode(finalCode); // Update UI to show the extracted ID
        } catch (err) {
            alert(err.response?.data?.error || 'Scan failed');
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
            <div className={`scanner-viewport ${showCamera ? 'camera-active' : ''}`} style={{ display: (showCamera || scannedData) ? 'block' : 'none' }}>
                <div id="reader" style={{ width: '100%' }}></div>
                {showCamera && !scannedData && <div className="scanner-laser"></div>}
                {!showCamera && !scannedData && (
                    <div className="scan-overlay-text">System Ready</div>
                )}
                {scannedData && (
                    <div className="scan-overlay-text" style={{ color: '#10b981' }}>Resource Identified</div>
                )}
            </div>

            {!scannedData ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <button 
                            onClick={() => setShowCamera(!showCamera)}
                            className={`btn-waste-action ${showCamera ? 'action-reject' : 'action-approve'}`}
                            style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', gap: '0.5rem' }}
                        >
                            <QrCodeIcon style={{ width: '1.2rem' }} />
                            {showCamera ? 'Stop Scanner' : 'Activate Camera'}
                        </button>
                    </div>

                    <form onSubmit={handleScan} style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--secondary-400)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                            Or enter the container ID manually:
                        </p>
                        <div style={{ position: 'relative', maxWidth: '400px', margin: '0 auto' }}>
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                placeholder="Awaiting Input..."
                                className="procurement-input"
                                style={{ 
                                    textAlign: 'center', 
                                    fontSize: '1.25rem', 
                                    letterSpacing: '0.1em',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderColor: 'rgba(59, 130, 246, 0.3)'
                                }}
                            />
                            <button 
                                type="submit"
                                disabled={loading || !barcode}
                                className="btn-waste-primary"
                                style={{ marginTop: '1.5rem', width: '100%' }}
                            >
                                {loading ? 'Processing...' : 'Manual Detect'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="scanned-content">
                    <div className="chemical-display-grid">
                        <div className="detail-section">
                            <div className="detail-label">Detected Chemical</div>
                            <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BeakerIcon style={{ width: '1.5rem', color: 'var(--primary-400)' }} />
                                {scannedData.chemical.name}
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                <div>
                                    <div className="detail-label">Current Stock</div>
                                    <div className="detail-value">{scannedData.container.quantity} {scannedData.container.unit}</div>
                                </div>
                                <div>
                                    <div className="detail-label">Location</div>
                                    <div className="detail-value" style={{ fontSize: '0.9rem' }}>
                                        <MapPinIcon style={{ width: '1rem', display: 'inline', marginRight: '0.25rem' }} />
                                        {scannedData.container.location || 'B-12 Cabinet'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <div className="detail-label">Safety & PPE Required</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {scannedData.chemical.ppe_requirements?.map((ppe, i) => (
                                    <span key={i} style={{ padding: '0.25rem 0.75rem', borderRadius: '2rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700 }}>
                                        {ppe}
                                    </span>
                                ))}
                                {(!scannedData.chemical.ppe_requirements || scannedData.chemical.ppe_requirements.length === 0) && (
                                    <span style={{ color: 'var(--secondary-500)', fontSize: '0.75rem' }}>Standard Lab Attire</span>
                                )}
                            </div>
                            {scannedData.warnings.length > 0 && (
                                <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {scannedData.warnings.map((w, i) => (
                                        <div key={i} style={{ color: '#f87171', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <ExclamationTriangleIcon style={{ width: '1rem' }} />
                                            {w}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="transaction-controls" style={{ marginTop: '2.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <label className="detail-label">{activeTab === 'checkout' ? 'Check-Out Quantity' : 'Return Quantity'}</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="procurement-input"
                                        placeholder={`Max: ${scannedData.container.quantity}`}
                                    />
                                    <span style={{ alignSelf: 'center', fontWeight: 700, color: 'var(--secondary-400)' }}>{scannedData.container.unit}</span>
                                </div>
                                <div className="quantity-suggestion-grid">
                                    {[100, 250, 500].map(val => (
                                        <div key={val} className="suggestion-chip" onClick={() => setQuantity(val)}>{val}</div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="detail-label">Safety Verification</label>
                                <div className="safety-verify-box">
                                    <label className="safety-check-item">
                                        <input 
                                            type="checkbox" 
                                            checked={safetyVerified.ppe} 
                                            onChange={(e) => setSafetyVerified(prev => ({ ...prev, ppe: e.target.checked }))} 
                                        />
                                        <span style={{ color: 'white', fontSize: '0.85rem' }}>PPE Equipment Verified & Worn</span>
                                    </label>
                                    <label className="safety-check-item">
                                        <input 
                                            type="checkbox" 
                                            checked={safetyVerified.hazard} 
                                            onChange={(e) => setSafetyVerified(prev => ({ ...prev, hazard: e.target.checked }))} 
                                        />
                                        <span style={{ color: 'white', fontSize: '0.85rem' }}>Hazards & SDS Acknowledged</span>
                                    </label>
                                    {activeTab === 'checkin' && (
                                        <label className="safety-check-item" style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={isContaminated} 
                                                onChange={(e) => setIsContaminated(e.target.checked)} 
                                            />
                                            <span style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 700 }}>Flag for Contamination?</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={handleSubmit}
                                disabled={submitting}
                                className={activeTab === 'checkout' ? "btn-waste-primary" : "btn-success-glow"}
                                style={{ flex: 2, padding: '1rem', fontSize: '1rem' }}
                            >
                                {submitting ? 'Processing...' : `Confirm ${activeTab === 'checkout' ? 'Check-Out' : 'Check-In'}`}
                            </button>
                            <button 
                                onClick={resetScan}
                                className="btn-secondary-outline"
                                style={{ flex: 1 }}
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
                <div key={item._id} className="history-item">
                    <div className="history-main">
                        <div className={`type-indicator ${item.type === 'Check-Out' ? 'type-out' : 'type-in'}`}>
                            {item.type === 'Check-Out' ? <ArrowUpRightIcon style={{ width: '1.5rem' }} /> : <ArrowDownLeftIcon style={{ width: '1.5rem' }} />}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>{item.chemical_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <ClockIcon style={{ width: '0.9rem' }} />
                                {new Date(item.createdAt).toLocaleString()}
                                <span style={{ color: 'var(--secondary-700)' }}>•</span>
                                <MapPinIcon style={{ width: '0.9rem' }} />
                                {item.container_barcode}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: item.type === 'Check-Out' ? '#60a5fa' : '#34d399', fontSize: '1.2rem' }}>
                            {item.type === 'Check-Out' ? '-' : '+'}{item.quantity} {item.unit}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--secondary-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {item.user_name}
                        </div>
                    </div>
                </div>
            ))}
            {history.length === 0 && (
                <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--secondary-500)', fontStyle: 'italic' }}>
                    No recent transactions recorded.
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
                    </div>
                </header>

                {activeTab !== 'history' ? renderScannerView() : renderHistory()}
            </div>
        </Layout>
    );
};

export default TransactionSystem;
