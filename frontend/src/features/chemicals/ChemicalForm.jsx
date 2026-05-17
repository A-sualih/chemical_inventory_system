import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import axios from "axios";
import { Html5QrcodeScanner } from 'html5-qrcode';
import { HAZARD_CLASSES, PPE_OPTIONS, NFPA_RATINGS, EXPOSURE_RISKS } from "../../constants/hazards.jsx";
import { Camera } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import "../../styles/ChemicalForm.css";

const ChemicalForm = ({ initialData, onClose, onSave }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCancelClick = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1); // Go back if no onClose prop (e.g. when on /chemicals/new)
    }
  };
  
  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    cas_number: initialData.cas_number || "",
    iupac_name: initialData.iupac_name || "",
    storage_temp: initialData.storage_temp || "",
    storage_humidity: initialData.storage_humidity || "",
    purity: initialData.purity || "",
    concentration: initialData.concentration || "",
    location: initialData.location || "",
    building: initialData.building || "",
    room: initialData.room || "",
    cabinet: initialData.cabinet || "",
    shelf: initialData.shelf || "",
    batch_number: initialData.batch_number || "",
    manufacturing_date: initialData.manufacturing_date || "",
    purchase_date: initialData.purchase_date || "",
    expiry_date: initialData.expiry_date || "",
    chemical_family: initialData.chemical_family || "General",
    spill_instructions: initialData.spill_instructions || "",
    emergency_instructions: initialData.emergency_instructions || "",
    exposure_risks: initialData.exposure_risks || [],
    num_containers: initialData.num_containers || 1,
    quantity_per_container: initialData.quantity_per_container || "",
    container_type: initialData.container_type || "Plastic Bottle",
    container_id_series: initialData.container_id_series || "",
    barcode: initialData.barcode || "",
    remarks: initialData.remarks || "",
    sds_file_name: initialData.sds_file_name || "",
    sds_file_url: initialData.sds_file_url || "",
    sds_attached: initialData.sds_attached === 1 || initialData.sds_attached === true,
    ghs_classes: initialData.ghs_classes || [],
    threshold: initialData.threshold || 5,
    // Advanced Safety Fields
    ghs_hazards: initialData.ghs_hazards || { categories: [], signal_word: 'None', h_codes: [], p_codes: [], pictograms: [] },
    nfpa_rating: initialData.nfpa_rating || { health: 0, flammability: 0, reactivity: 0, special: "" },
    hazard_summary: initialData.hazard_summary || { health: false, physical: false, environmental: false },
    ppe_requirements: initialData.ppe_requirements || [],
    incompatibility: initialData.incompatibility || [],
    emergency_response: initialData.emergency_response || { first_aid: "", fire_response: "", evacuation: "", neutralization: "", shutdown_steps: "", contacts: [] },
    exposure_details: initialData.exposure_details || { acute_toxicity: "", chronic_toxicity: "", carcinogenic: false, mutagenic: false, exposure_limits: "", risk_level: "Low", ventilation_required: false, fume_hood_required: false },
    restricted_access: initialData.restricted_access || false,
    training_required: initialData.training_required || false
  } : {
    name: searchParams.get("name") || "",
    iupac_name: "",
    cas_number: searchParams.get("cas") || "",
    formula: "",
    quantity: searchParams.get("quantity") || "",
    unit: searchParams.get("unit") || "L",
    threshold: 5,
    purity: "99%",

    concentration: "Default",
    location: "",
    building: "",
    room: "",
    cabinet: "",
    shelf: "",
    state: "Liquid",
    storage_temp: "20",
    storage_humidity: "45",
    supplier: "",
    batch_number: "",
    manufacturing_date: "",
    purchase_date: "",
    expiry_date: "",
    num_containers: 1,
    quantity_per_container: "",
    container_type: "Plastic Bottle",
    container_id_series: "",
    barcode: "",
    remarks: "",
    chemical_family: "General",
    spill_instructions: "",
    emergency_instructions: "",
    exposure_risks: [],
    ghs_classes: [],
    sds_attached: false,
    // Advanced Safety Fields Defaults
    ghs_hazards: { categories: [], signal_word: 'None', h_codes: [], p_codes: [], pictograms: [] },
    nfpa_rating: { health: 0, flammability: 0, reactivity: 0, special: "" },
    hazard_summary: { health: false, physical: false, environmental: false },
    ppe_requirements: [],
    incompatibility: [],
    emergency_response: { first_aid: "", fire_response: "", evacuation: "", neutralization: "", shutdown_steps: "", contacts: [] },
    exposure_details: { acute_toxicity: "", chronic_toxicity: "", carcinogenic: false, mutagenic: false, exposure_limits: "", risk_level: "Low", ventilation_required: false, fume_hood_required: false },
    restricted_access: false,
    training_required: false
  });

    const [locError, setLocError] = useState("");
    const [sdsFile, setSdsFile] = useState(null);
    const [disposalFile, setDisposalFile] = useState(null);
    const [errors, setErrors] = useState({});
  const [qrCodeData, setQrCodeData] = useState("");
  const [incompatibilityWarning, setIncompatibilityWarning] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const barcodeScannerRef = useRef(null);

  const [locHierarchy, setLocHierarchy] = useState({ buildings: [], rooms: [], cabinets: [], shelves: [] });
  const [locLoading, setLocLoading] = useState(false);

  // Barcode scanner lifecycle
  useEffect(() => {
    let scanner = null;
    if (showBarcodeScanner) {
      // Small delay to ensure the DOM div is mounted before initializing
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner("barcode-reader", {
            fps: 15,
            qrbox: { width: 350, height: 120 }, // Wide rectangle for 1D barcodes
            aspectRatio: 3.5,
            rememberLastUsedCamera: true,
            supportedScanTypes: [0] // 0 = CAMERA (only), allows both QR and barcodes
          });
          scanner.render((decodedText) => {
            setFormData(prev => ({ ...prev, barcode: decodedText }));
            setShowBarcodeScanner(false);
            scanner.clear().catch(() => { });
          }, () => { });
          barcodeScannerRef.current = scanner;
        } catch (e) {
          console.error('Barcode scanner init error:', e);
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        if (barcodeScannerRef.current) barcodeScannerRef.current.clear().catch(() => { });
      };
    }
  }, [showBarcodeScanner]);

  useEffect(() => {
    axios.get('/api/locations/hierarchy').then(res => setLocHierarchy(prev => ({ ...prev, buildings: res.data.buildings })));
  }, []);

  useEffect(() => {
    if (!formData.building) return setLocHierarchy(prev => ({ ...prev, rooms: [], cabinets: [], shelves: [] }));
    setLocLoading(true);
    axios.get('/api/locations/hierarchy', { params: { building: formData.building } })
      .then(res => setLocHierarchy(prev => ({ ...prev, rooms: res.data.rooms, cabinets: [], shelves: [] })))
      .finally(() => setLocLoading(false));
  }, [formData.building]);

  useEffect(() => {
    if (!formData.building || !formData.room) return setLocHierarchy(prev => ({ ...prev, cabinets: [], shelves: [] }));
    axios.get('/api/locations/hierarchy', { params: { building: formData.building, room: formData.room } })
      .then(res => setLocHierarchy(prev => ({ ...prev, cabinets: res.data.cabinets, shelves: [] })));
  }, [formData.room]);

  useEffect(() => {
    if (!formData.building || !formData.room || !formData.cabinet) return setLocHierarchy(prev => ({ ...prev, shelves: [] }));
    axios.get('/api/locations/hierarchy', { params: { building: formData.building, room: formData.room, cabinet: formData.cabinet } })
      .then(res => setLocHierarchy(prev => ({ ...prev, shelves: res.data.shelves })));
  }, [formData.cabinet]);

  useEffect(() => {
    if (formData.building && formData.room && formData.cabinet && formData.shelf) {
      const targetLoc = `${formData.building}-${formData.room}-${formData.cabinet}-${formData.shelf}`;
      axios.get(`/api/safety/check-incompatibility/${targetLoc}`, { params: { chemicalId: initialData?.id } })
        .then(res => {
          if (res.data.incompatible) {
            setIncompatibilityWarning(res.data);
          } else {
            setIncompatibilityWarning(null);
          }
        })
        .catch(err => console.error("Incompatibility check failed", err));
    } else {
      setIncompatibilityWarning(null);
    }
  }, [formData.building, formData.room, formData.cabinet, formData.shelf]);

  useEffect(() => {
    const total = (Number(formData.num_containers) || 0) * (Number(formData.quantity_per_container) || 0);
    if (total > 0) {
      setFormData(prev => ({ ...prev, quantity: total }));
    }
  }, [formData.num_containers, formData.quantity_per_container]);

  const renderIncompatibilityWarning = () => {
    if (!incompatibilityWarning) return null;
    return (
      <div className="incompatibility-warning">
        <div className="warning-header">
          <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span className="warning-title">Incompatible Storage Conflict</span>
        </div>
        <p className="warning-message">
          Storing this chemical here is <span className="dangerous-text">Dangerous</span>.
          This shelf already contains <span className="underline-text">{incompatibilityWarning.conflicting_chemical}</span>.
        </p>
      </div>
    );
  };

  useEffect(() => {
    if (initialData && initialData.id) {
      axios.get(`/api/chemicals/${initialData.id}/qrcode`)
        .then(res => setQrCodeData(res.data.qrCode))
        .catch(err => console.error("QR Fetch Error", err));
    }
  }, [initialData]);

  const validateCas = (val) => {
    const regex = /^\d{2,7}-\d{2}-\d$/;
    return regex.test(val);
  };

  const toggleGhs = (hazardId) => {
    const newGhs = formData.ghs_classes.includes(hazardId)
      ? formData.ghs_classes.filter(c => c !== hazardId)
      : [...formData.ghs_classes, hazardId];
    setFormData({ ...formData, ghs_classes: newGhs });
  };

  return (
    <div className="chemical-form-overlay">
      <div className="chemical-form-backdrop" onClick={handleCancelClick}></div>

      <div className="chemical-form-container">

        {/* Left Control Panel */}
        <div className="sidebar-panel">
          <div className="sidebar-gradient"></div>

          <div className="sidebar-content">
            <div className="sidebar-icon-container">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" /></svg>
            </div>

            <h2 className="sidebar-title">
              {initialData ? "Edit Lifecycle" : "Enroll Asset"}
            </h2>
            <p className="sidebar-subtitle">
              {initialData ? `Updating records for ${initialData.id}` : "Systemize a new chemical into the repository."}
            </p>

            <div className="identity-badge">
              <div className="badge-label">System Identity Badge</div>
              <div className="qr-container">
                {initialData?.id ? (
                  <>
                    <div className="qr-box">
                      <QRCode value={`${window.location.origin}/chemicals/details/${initialData.id}`} size={220} />
                      <div className="scan-label">SCAN READY</div>
                    </div>
                    <a href={`/print/${initialData.id}`} target="_blank" rel="noopener noreferrer" className="print-button">
                      <svg className="print-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Print Label (Sticker)
                    </a>
                  </>
                ) : (
                  <div className="pending-id-box">
                    <div className="id-pending-grid">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="pending-square" style={{ backgroundColor: Math.random() > 0.5 ? 'var(--primary-400)' : 'rgba(255,255,255,0.1)' }}></div>
                      ))}
                    </div>
                    <span className="badge-label-pending">WAITING FOR ID</span>
                  </div>
                )}
                <div className="id-display">
                  <div className="id-text">
                    {initialData ? (
                      <span className="id-active">CIMS-{initialData.id}</span>
                    ) : (
                      <span style={{ color: 'var(--secondary-400)', opacity: 0.5 }}>CIMS-YYYY</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="ghs-section">
              <label className="badge-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Global Hazard Classification</label>
              <div className="ghs-grid">
                {HAZARD_CLASSES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleGhs(item.id)}
                    className={`ghs-button ${formData.ghs_classes.includes(item.id) || formData.ghs_classes.includes(item.label) ? `active ${item.color}` : ''}`}
                  >
                    <div className="w-6 h-6">
                      {item.icon}
                    </div>
                    <div className="ghs-tooltip">
                      <p style={{ fontWeight: 'bold', marginBottom: '2px' }}>{item.label}</p>
                      <p style={{ color: 'var(--secondary-400)', lineHeight: '1.1' }}>{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              {formData.ghs_classes.length > 0 && (
                <div className="hazard-profiles">
                  <div className="section-title" style={{ fontSize: '9px', marginBottom: '0.25rem' }}>Active Hazard Profiles</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {formData.ghs_classes.map(id => {
                      const h = HAZARD_CLASSES.find(x => x.id === id || x.label === id);
                      return h ? (
                        <span key={id} className={`hazard-badge ${h.color}`}>{h.label}</span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <button type="button" onClick={handleCancelClick} className="cancel-button">
              Cancel & Discard
            </button>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="form-content-area">
          <form onSubmit={(e) => {
            e.preventDefault();
            const payload = new FormData();
            Object.keys(formData).forEach(k => {
              if (['ghs_classes', 'exposure_risks', 'ghs_hazards', 'nfpa_rating', 'hazard_summary', 'ppe_requirements', 'incompatibility', 'emergency_response', 'exposure_details'].includes(k)) {
                payload.append(k, JSON.stringify(formData[k]));
              } else {
                payload.append(k, formData[k]);
              }
            });
            if (sdsFile) payload.append('sds_file', sdsFile);
            if (disposalFile) payload.append('disposal_file', disposalFile);
            onSave(payload);
          }}
            className="form-main"
          >
            <fieldset disabled={user?.role === 'Safety Officer'} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
            {/* SECTION: IDENTIFICATION */}
            <section className="form-section">
              <div className="section-header">
                <div className="header-line"></div>
                <div className="section-title">Nomenclature & Identity</div>
                <div className="header-line hide-mobile"></div>
              </div>

              <div className="grid-cols-1-2">
                <div className="form-group">
                  <label className="form-label">Common Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="form-input" placeholder="e.g. Sodium Chloride" required />
                </div>
                <div className="form-group">
                  <label className="form-label">CAS Registry Number</label>
                  <input type="text" value={formData.cas_number} onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, cas_number: val });
                    if (val && !validateCas(val)) {
                      setErrors({ ...errors, cas_number: "Invalid CAS format (e.g. 67-64-1)" });
                    } else {
                      const newErrors = { ...errors };
                      delete newErrors.cas_number;
                      setErrors(newErrors);
                    }
                  }} className={`form-input font-mono ${errors.cas_number ? 'error' : ''}`} placeholder="7647-14-5" required />
                  {errors.cas_number && <div className="error-text">{errors.cas_number}</div>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">IUPAC Name</label>
                <input type="text" value={formData.iupac_name} onChange={e => setFormData({ ...formData, iupac_name: e.target.value })} className="form-input" placeholder="Systematic name..." />
              </div>
            </section>

            <section className="form-section">
              <div className="section-header">
                <div className="header-line"></div>
                <div className="section-title">Physicality & Containers</div>
                <div className="header-line hide-mobile"></div>
              </div>

              <div className="grid-cols-2-4">
                <div className="form-group">
                  <label className="form-label">State</label>
                  <div className="select-wrapper">
                    <select value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="form-select">
                      <option>Liquid</option><option>Solid</option><option>Gas</option>
                    </select>
                    <svg className="select-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <div className="select-wrapper">
                    <select
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      className="form-select"
                    >
                      {formData.state === 'Liquid' ? (
                        <>
                          <option value="L">Liters (L)</option>
                          <option value="mL">Milliliters (mL)</option>
                          <option value="uL">Microliters (µL)</option>
                        </>
                      ) : formData.state === 'Solid' ? (
                        <>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="g">Grams (g)</option>
                          <option value="mg">Milligrams (mg)</option>
                        </>
                      ) : (
                        <>
                          <option value="L">Liters (L)</option>
                          <option value="mL">Milliliters (mL)</option>
                        </>
                      )}
                    </select>
                    <svg className="select-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Qty</label>
                  <input type="number" step="any" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} className="form-input font-mono qty-input" placeholder="0.0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Purity (%)</label>
                  <input type="text" value={formData.purity} onChange={e => setFormData({ ...formData, purity: e.target.value })} className="form-input" placeholder="99.9%" />
                </div>
                <div className="form-group">
                  <label className="form-label">Alert Threshold</label>
                  <input type="number" step="any" value={formData.threshold} onChange={e => setFormData({ ...formData, threshold: Number(e.target.value) })} className="form-input threshold-input" placeholder="5" />
                </div>
              </div>


              <div className="card-container">
                <div className="card-title">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  Bottle & Container Metrics
                </div>
                <div className="grid-cols-2-4" style={{ marginBottom: 0 }}>
                  <div className="form-group">
                    <label className="form-label">Count</label>
                    <input type="number" value={formData.num_containers} onChange={e => setFormData({ ...formData, num_containers: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qty/Container</label>
                    <input type="number" value={formData.quantity_per_container} onChange={e => setFormData({ ...formData, quantity_per_container: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <input type="text" value={formData.container_type} onChange={e => setFormData({ ...formData, container_type: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Container ID</label>
                    <input type="text" value={formData.container_id_series} onChange={e => setFormData({ ...formData, container_id_series: e.target.value })} className="form-input font-mono" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} placeholder="CONT-X" />
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Mfg. Barcode
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: '2rem', fontWeight: 600 }}>OPTIONAL</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                        className="form-input font-mono"
                        style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem', flex: 1 }}
                        placeholder="Type or scan manufacturer barcode..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowBarcodeScanner(prev => !prev)}
                        style={{
                          padding: '0.75rem 1rem',
                          background: showBarcodeScanner ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                          border: `1px solid ${showBarcodeScanner ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
                          borderRadius: '0.5rem',
                          color: showBarcodeScanner ? '#f87171' : '#818cf8',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H2a2 2 0 00-2 2v10a2 2 0 002 2h3" />
                        </svg>
                        {showBarcodeScanner ? 'Close Camera' : 'Scan Barcode'}
                      </button>
                    </div>
                    {showBarcodeScanner && (
                      <div style={{ marginTop: '0.75rem', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.75rem', overflow: 'hidden', background: '#0f172a' }}>
                        <div style={{ padding: '0.5rem 1rem', background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.2)', fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                          <Camera className="w-4 h-4 inline-block mr-2" /> Point camera at the manufacturer barcode on the bottle
                        </div>
                        <div id="barcode-reader" style={{ width: '100%' }} />
                      </div>
                    )}
                    {formData.barcode && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Barcode captured: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formData.barcode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="form-section">
              <div className="section-header">
                <div className="header-line"></div>
                <div className="section-title">Facility & Storage Taxonomy</div>
                <div className="header-line hide-mobile"></div>
              </div>
              <div className="card-container" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div className="card-title">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Select Storage Location
                  {locLoading && <span style={{ marginLeft: 'auto', color: 'var(--primary-500)' }} className="animate-pulse">Loading...</span>}
                </div>

                <div className="location-grid">
                  <div className="form-group">
                    <label className="form-label">Building</label>
                    <div className="select-wrapper">
                      {locHierarchy.buildings.length > 0 ? (
                        <select value={formData.building} onChange={e => setFormData({ ...formData, building: e.target.value, room: '', cabinet: '', shelf: '' })} className="form-select" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }}>
                          <option value="">-- Select --</option>
                          {locHierarchy.buildings.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={formData.building} onChange={e => setFormData({ ...formData, building: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} placeholder="e.g. Block-A" />
                      )}
                      {locHierarchy.buildings.length > 0 && <svg className="select-icon" style={{ right: '0.75rem', top: '0.875rem', width: '0.75rem', height: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Room</label>
                    <div className="select-wrapper">
                      {locHierarchy.rooms.length > 0 ? (
                        <select value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value, cabinet: '', shelf: '' })} className="form-select" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }}>
                          <option value="">-- Select --</option>
                          {locHierarchy.rooms.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} placeholder="e.g. 102" />
                      )}
                      {locHierarchy.rooms.length > 0 && <svg className="select-icon" style={{ right: '0.75rem', top: '0.875rem', width: '0.75rem', height: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cabinet</label>
                    <div className="select-wrapper">
                      {locHierarchy.cabinets.length > 0 ? (
                        <select value={formData.cabinet} onChange={e => setFormData({ ...formData, cabinet: e.target.value, shelf: '' })} className="form-select" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }}>
                          <option value="">-- Select --</option>
                          {locHierarchy.cabinets.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={formData.cabinet} onChange={e => setFormData({ ...formData, cabinet: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} placeholder="e.g. C2" />
                      )}
                      {locHierarchy.cabinets.length > 0 && <svg className="select-icon" style={{ right: '0.75rem', top: '0.875rem', width: '0.75rem', height: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shelf</label>
                    <div className="select-wrapper">
                      {locHierarchy.shelves.length > 0 ? (
                        <select value={formData.shelf} onChange={e => {
                          setFormData({ ...formData, shelf: e.target.value });
                        }} className="form-select" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }}>
                          <option value="">-- Select --</option>
                          {locHierarchy.shelves.map(s => (
                            <option key={s._id} value={s.shelf}>
                              Shelf {s.shelf} ({s.current_load}/{s.capacity} used)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" value={formData.shelf} onChange={e => setFormData({ ...formData, shelf: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} placeholder="e.g. 1" />
                      )}
                      {locHierarchy.shelves.length > 0 && <svg className="select-icon" style={{ right: '0.75rem', top: '0.875rem', width: '0.75rem', height: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                    </div>
                  </div>
                </div>

                {formData.shelf && locHierarchy.shelves.length > 0 && (() => {
                  const sel = locHierarchy.shelves.find(s => s.shelf === formData.shelf);
                  if (!sel) return null;
                  const pct = Math.min(100, Math.round((sel.current_load / sel.capacity) * 100));
                  return (
                    <div className="capacity-indicator">
                      <div className="capacity-header">
                        <span>Shelf Capacity</span>
                        <span style={{ color: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#16a34a' }}>{sel.current_load}/{sel.capacity} slots</span>
                      </div>
                      <div className="capacity-bar-bg">
                        <div className="capacity-bar-fill" style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? '#ef4444' : pct >= 70 ? '#fbbf24' : '#22c55e' }}></div>
                      </div>
                      {sel.safety_warnings && <p className="safety-warning"><AlertTriangle className="w-4 h-4 inline-block mr-1" /> {sel.safety_warnings}</p>}
                    </div>
                  );
                })()}

                <div className="location-grid" style={{ marginTop: '1.25rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Combined Identifier (Auto)</label>
                    {renderIncompatibilityWarning()}
                    <input type="text" readOnly value={formData.building ? `${formData.building}-${formData.room}-${formData.cabinet}-${formData.shelf}`.replace(/-+$/, '') : formData.location} className="form-input combined-id" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temp (°C)</label>
                    <input type="number" value={formData.storage_temp} onChange={e => setFormData({ ...formData, storage_temp: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Humidity (%)</label>
                    <input type="number" value={formData.storage_humidity} onChange={e => setFormData({ ...formData, storage_humidity: e.target.value })} className="form-input" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-100)', padding: '0.75rem' }} />
                  </div>
                </div>
              </div>
            </section>
            </fieldset>

            <section className="form-section">
              <div className="section-header">
                <div className="header-line"></div>
                <div className="section-title">Procurement & Traceability</div>
                <div className="header-line hide-mobile"></div>
              </div>

              <fieldset disabled={user?.role === 'Safety Officer'} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
              <div className="grid-cols-1-2">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Vendor Name</label>
                    <input type="text" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} className="form-input" placeholder="LabChem Supplies" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Purchase Date</label>
                      <input type="date" value={formData.purchase_date} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">MFG Date</label>
                      <input type="date" value={formData.manufacturing_date} onChange={e => setFormData({ ...formData, manufacturing_date: e.target.value })} className="form-input" />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Lot / Batch Number</label>
                    <input type="text" value={formData.batch_number} onChange={e => setFormData({ ...formData, batch_number: e.target.value })} className="form-input font-mono" style={{ fontWeight: 'bold' }} placeholder="LOT-2025-X" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date</label>
                    <input type="date" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} className="form-input" style={{ color: '#dc2626' }} required />
                  </div>
                </div>
              </div>
              </fieldset>
              <div className="form-group">
                <label className="form-label">Safety Remarks & Tracking Notes</label>
                <textarea value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="textarea-input" placeholder="Initial stock entry, handle with care..."></textarea>
              </div>
            </section>

            <section className="form-section">
              <div className="section-header">
                <div className="header-line"></div>
                <div className="section-title critical-title">CRITICAL SAFETY & HAZARD DIRECTIVES</div>
                <div className="header-line hide-mobile"></div>
              </div>

              <div className="grid-cols-1-2" style={{ marginBottom: '2rem' }}>
                {/* GHS Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="ghs-signal-header">
                    <label className="badge-label">GHS Signal Word</label>
                    <div className="signal-word-group">
                      {['None', 'Warning', 'Danger'].map(word => (
                        <button key={word} type="button" onClick={() => setFormData({ ...formData, ghs_hazards: { ...formData.ghs_hazards, signal_word: word } })} className={`signal-word-btn ${formData.ghs_hazards.signal_word === word ? 'active' : ''}`}>
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">H-Codes (Hazard Statements)</label>
                    <input type="text" value={formData.ghs_hazards.h_codes.join(', ')} onChange={e => setFormData({ ...formData, ghs_hazards: { ...formData.ghs_hazards, h_codes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })} className="form-input" style={{ padding: '0.75rem' }} placeholder="e.g. H225, H319" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">P-Codes (Precautionary)</label>
                    <input type="text" value={formData.ghs_hazards.p_codes.join(', ')} onChange={e => setFormData({ ...formData, ghs_hazards: { ...formData.ghs_hazards, p_codes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })} className="form-input" style={{ padding: '0.75rem' }} placeholder="e.g. P210, P280" />
                  </div>
                </div>

                {/* NFPA Diamond Logic */}
                <div className="nfpa-diamond-card">
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '8rem', height: '8rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '9999px', marginRight: '-4rem', marginTop: '-4rem', filter: 'blur(48px)' }}></div>
                  <label className="badge-label" style={{ color: 'var(--secondary-400)', marginBottom: '1rem', display: 'block' }}>NFPA 704 Diamond Rating</label>
                  <div className="nfpa-grid">
                    {NFPA_RATINGS.map(rating => (
                      <div key={rating.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label className="nfpa-label" style={{ color: rating.color === 'red' ? '#f87171' : rating.color === 'blue' ? '#60a5fa' : rating.color === 'yellow' ? '#fbbf24' : 'white' }}>{rating.label}</label>

                        {rating.label === 'Special' ? (
                          <select
                            value={formData.nfpa_rating.special}
                            onChange={e => setFormData({ ...formData, nfpa_rating: { ...formData.nfpa_rating, special: e.target.value } })}
                            className="nfpa-select"
                          >
                            {rating.options.map(opt => <option key={opt} value={opt} style={{ color: 'var(--secondary-900)' }}>{opt || "None"}</option>)}
                          </select>
                        ) : (
                          <select
                            value={formData.nfpa_rating[rating.label === 'Instability' ? 'reactivity' : rating.label.toLowerCase()]}
                            onChange={e => {
                              const key = rating.label === 'Instability' ? 'reactivity' : rating.label.toLowerCase();
                              setFormData({ ...formData, nfpa_rating: { ...formData.nfpa_rating, [key]: Number(e.target.value) } });
                            }}
                            className="nfpa-select"
                          >
                            {[0, 1, 2, 3, 4].map(num => <option key={num} value={num} style={{ color: 'var(--secondary-900)' }}>{num} - {rating.levels[num]}</option>)}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid-cols-1-2" style={{ marginBottom: '2rem' }}>
                {/* PPE Requirements */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label className="form-label">Mandatory PPE</label>
                  <div className="ppe-grid">
                    {PPE_OPTIONS.map(ppe => (
                      <button key={ppe} type="button" onClick={() => setFormData(prev => ({ ...prev, ppe_requirements: prev.ppe_requirements.includes(ppe) ? prev.ppe_requirements.filter(p => p !== ppe) : [...prev.ppe_requirements, ppe] }))} className={`ppe-button ${formData.ppe_requirements.includes(ppe) ? 'active' : ''}`}>
                        {ppe}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Access & Training */}
                <div className="access-control-card">
                  <label className="form-label" style={{ marginBottom: '0.5rem' }}>Access Control</label>
                  <div className="toggle-item">
                    <span className="toggle-label">Restricted Access</span>
                    <input type="checkbox" checked={formData.restricted_access} onChange={e => setFormData({ ...formData, restricted_access: e.target.checked })} className="toggle-checkbox" />
                  </div>
                  <div className="toggle-item">
                    <span className="toggle-label">Safety Training Required</span>
                    <input type="checkbox" checked={formData.training_required} onChange={e => setFormData({ ...formData, training_required: e.target.checked })} className="toggle-checkbox" />
                  </div>
                </div>
              </div>

              <div className="grid-cols-1-2">
                <div className="form-group">
                  <label className="form-label">Exposure Risks (CMR / Special)</label>
                  <div className="ppe-grid">
                    {['Carcinogen', 'Mutagen', 'Teratogen', 'Sensitizer', 'Asphyxiant'].map(risk => (
                      <button
                        key={risk} type="button"
                        onClick={() => setFormData(prev => ({ ...prev, exposure_risks: prev.exposure_risks.includes(risk) ? prev.exposure_risks.filter(r => r !== risk) : [...prev.exposure_risks, risk] }))}
                        className={`risk-button ${formData.exposure_risks.includes(risk) ? 'active' : ''}`}
                      >
                        {risk}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Chemical Family / Compatibility Class</label>
                  <select value={formData.chemical_family} onChange={e => setFormData({ ...formData, chemical_family: e.target.value })} className="form-select family-select" style={{ height: 'auto' }}>
                    <option value="General">General / Non-Reactive</option>
                    <option value="Acid">Acid</option>
                    <option value="Base">Base</option>
                    <option value="Oxidizer">Oxidizer</option>
                    <option value="Flammable">Flammable / Solvent</option>
                    <option value="Reactive">Highly Reactive / Unstable</option>
                  </select>
                </div>
              </div>

              <div className="risk-procedures-grid" style={{ marginTop: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Emergency Spill Procedures</label>
                  <textarea value={formData.spill_instructions} onChange={e => setFormData({ ...formData, spill_instructions: e.target.value })} className="textarea-input procedure-textarea" placeholder="e.g. Neutralize with sodium bi-carbonate, ventilate area..."></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Medical Emergency Instructions</label>
                  <textarea value={formData.emergency_instructions} onChange={e => setFormData({ ...formData, emergency_instructions: e.target.value })} className="textarea-input procedure-textarea" placeholder="e.g. Wash eyes for 15 mins, administer calcium gluconate if skin contact..."></textarea>
                </div>
              </div>
            </section>

            {/* ACTION FOOTER */}
            <div className="action-footer">

              <div
                className={`sds-upload-box ${sdsFile || formData.sds_file_name ? 'active' : ''}`}
                onClick={() => document.getElementById('sds-upload').click()}
              >
                <svg className="sds-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="sds-text" title={sdsFile ? sdsFile.name : formData.sds_file_name}>
                  {sdsFile ? sdsFile.name : (formData.sds_file_name ? `Stored: ${formData.sds_file_name}` : "Attach SDS File (.pdf)")}
                </span>
                <input id="sds-upload" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setSdsFile(e.target.files[0])} />
              </div>
              
              <div
                className={`sds-upload-box ${disposalFile || formData.disposal_file_name ? 'active' : ''}`}
                onClick={() => document.getElementById('disposal-upload').click()}
                style={{ marginLeft: '1rem', background: disposalFile || formData.disposal_file_name ? 'rgba(239, 68, 68, 0.1)' : 'var(--secondary-50)', color: disposalFile || formData.disposal_file_name ? '#ef4444' : 'var(--secondary-900)' }}
              >
                <svg className="sds-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span className="sds-text" title={disposalFile ? disposalFile.name : formData.disposal_file_name}>
                  {disposalFile ? disposalFile.name : (formData.disposal_file_name ? `Protocol: ${formData.disposal_file_name}` : "Disposal Protocol (.pdf)")}
                </span>
                <input id="disposal-upload" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setDisposalFile(e.target.files[0])} />
              </div>

              {formData.disposal_file_url && !disposalFile && (
                <a href={process.env.NODE_ENV === 'production' ? formData.disposal_file_url : `http://localhost:5001${formData.disposal_file_url}`} target="_blank" rel="noopener noreferrer" className="sds-view-button" style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }} title="View Original Protocol">
                  <svg className="sds-view-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </a>
              )}

              <button type="submit" className="submit-button" style={{ marginLeft: 'auto' }}>
                {initialData ? "Apply Lifecycle Update" : "Authorize System Entry"}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default ChemicalForm;


