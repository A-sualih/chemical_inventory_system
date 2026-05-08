import { useState, useEffect } from "react";
import axios from "axios";
import "../../styles/Inventory.css";

const StockActionModal = ({ chemical, onClose, onSuccess, initialAction }) => {
  const [action, setAction] = useState(initialAction || "OUT"); 
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState(chemical.unit || "L");
  const [reason, setReason] = useState("");
  const [newLocation, setNewLocation] = useState("");
  
  // High-Resolution Tracking Fields (Combined for IN/OUT/TRANSFER/DISPOSAL)
  const [batch, setBatch] = useState(chemical.batch_number || "");
  const [mfgDate, setMfgDate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expiry, setExpiry] = useState(chemical.expiry_date ? chemical.expiry_date.split('T')[0] : "");
  const [numContainers, setNumContainers] = useState("1");
  const [qtyPerContainer, setQtyPerContainer] = useState("");
  const [containerType, setContainerType] = useState(chemical.container_type || "Plastic Bottle");
  const [containerId, setContainerId] = useState("");
  const [building, setBuilding] = useState(chemical.building || "");
  const [room, setRoom] = useState(chemical.room || "");
  const [cabinet, setCabinet] = useState(chemical.cabinet || "");
  const [shelf, setShelf] = useState(chemical.shelf || "");
  const [supplier, setSupplier] = useState(chemical.supplier || "");
  const [remarks, setRemarks] = useState("");

  // Usage Details (OUT specific)
  const [experimentName, setExperimentName] = useState("");
  const [department, setDepartment] = useState("");

  // Disposal Specific
  const [disposalMethod, setDisposalMethod] = useState("");
  const [disposalApprovedBy, setDisposalApprovedBy] = useState("");
  const [disposalApprovedRole, setDisposalApprovedRole] = useState("safety_officer");
  const [complianceNotes, setComplianceNotes] = useState("");

  // Transfer specific
  const [toBuilding, setToBuilding] = useState("");
  const [toRoom, setToRoom] = useState("");
  const [toCabinet, setToCabinet] = useState("");
  const [toShelf, setToShelf] = useState("");
  const [numContainersMoved, setNumContainersMoved] = useState(1);
  const [transferApprovedBy, setTransferApprovedBy] = useState("");

  // Location hierarchy for Transfer TO dropdowns
  const [toHierarchy, setToHierarchy] = useState({ buildings: [], rooms: [], cabinets: [], shelves: [] });
  const [incompatibilityWarning, setIncompatibilityWarning] = useState(null);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);

  // Fetch buildings on mount
  useEffect(() => {
    axios.get('/api/locations/hierarchy')
      .then(res => setToHierarchy(prev => ({ ...prev, buildings: res.data.buildings })))
      .catch(() => {});
  }, []);

  // Fetch rooms when toBuilding changes
  useEffect(() => {
    if (!toBuilding) return setToHierarchy(prev => ({ ...prev, rooms: [], cabinets: [], shelves: [] }));
    axios.get('/api/locations/hierarchy', { params: { building: toBuilding } })
      .then(res => setToHierarchy(prev => ({ ...prev, rooms: res.data.rooms, cabinets: [], shelves: [] })))
      .catch(() => {});
  }, [toBuilding]);

  // Fetch cabinets when toRoom changes
  useEffect(() => {
    if (!toBuilding || !toRoom) return setToHierarchy(prev => ({ ...prev, cabinets: [], shelves: [] }));
    axios.get('/api/locations/hierarchy', { params: { building: toBuilding, room: toRoom } })
      .then(res => setToHierarchy(prev => ({ ...prev, cabinets: res.data.cabinets, shelves: [] })))
      .catch(() => {});
  }, [toRoom]);

  // Fetch shelves when toCabinet changes
  useEffect(() => {
    if (!toBuilding || !toRoom || !toCabinet) return setToHierarchy(prev => ({ ...prev, shelves: [] }));
    axios.get('/api/locations/hierarchy', { params: { building: toBuilding, room: toRoom, cabinet: toCabinet } })
      .then(res => setToHierarchy(prev => ({ ...prev, shelves: res.data.shelves })))
      .catch(() => {});
  }, [toCabinet]);

  // Check Incompatibility
  useEffect(() => {
    if ((action === 'TRANSFER' || action === 'IN') && toBuilding && toRoom && toCabinet && toShelf) {
      const targetLoc = `${toBuilding}-${toRoom}-${toCabinet}-${toShelf}`;
      axios.get(`/api/safety/check-incompatibility/${targetLoc}`, { params: { chemicalId: chemical.id } })
        .then(res => {
          if (res.data.incompatible) {
            setIncompatibilityWarning(res.data);
          } else {
            setIncompatibilityWarning(null);
          }
        })
        .catch(err => console.error("Incompatibility check failed", err));
    } else if (action === 'IN' && building && room && cabinet && shelf) {
       const targetLoc = `${building}-${room}-${cabinet}-${shelf}`;
       axios.get(`/api/safety/check-incompatibility/${targetLoc}`, { params: { chemicalId: chemical.id } })
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
  }, [toBuilding, toRoom, toCabinet, toShelf, building, room, cabinet, shelf, action, chemical.id]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableContainers, setAvailableContainers] = useState([]);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const res = await axios.get(`/api/containers/chemical/${chemical.id}`);
        setAvailableContainers(res.data.filter(c => c.status !== 'Empty'));
      } catch (err) {
        console.error("Failed to fetch containers:", err);
      }
    };
    fetchContainers();
  }, [chemical.id]);

  const handleContainerSelect = (id) => {
    const selected = availableContainers.find(c => c.container_id === id);
    if (selected) {
      setContainerId(selected.container_id);
      setBatch(selected.batch_number || "");
      setBuilding(selected.building || "");
      setRoom(selected.room || "");
      setCabinet(selected.cabinet || "");
      setShelf(selected.shelf || "");
      setExpiry(selected.expiry_date ? selected.expiry_date.split('T')[0] : "");
      setUnit(selected.unit || chemical.unit);
      if (action !== 'IN') {
        setAmount(selected.quantity || "");
      }
    } else {
      setContainerId("");
    }
  };

  // Auto-calculate amount for IN action based on container count
  useEffect(() => {
    if (action === 'IN') {
      const total = (Number(numContainers) || 0) * (Number(qtyPerContainer) || 0);
      if (total > 0) setAmount(total.toString());
    }
  }, [numContainers, qtyPerContainer, action]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Basic Quantity Validation
    const requestedAmount = Number(amount);
    if (action === 'OUT' || action === 'DISPOSAL' || action === 'TRANSFER') {
      // If a container is selected, check container quantity
      if (containerId) {
        const selected = availableContainers.find(c => c.container_id === containerId);
        if (selected && requestedAmount > selected.quantity) {
          setError(`Insufficient stock in container ${containerId}. Available: ${selected.quantity} ${selected.unit}`);
          setLoading(false);
          return;
        }
      } 
      // Otherwise check overall chemical quantity
      else if (requestedAmount > chemical.quantity) {
        setError(`Insufficient total stock. Available: ${chemical.quantity} ${chemical.unit}`);
        setLoading(false);
        return;
      }
    }

    if (action === 'TRANSFER') {
      const movedCount = Number(numContainersMoved);
      const totalAvailableCount = chemical.num_containers || 1;
      
      if (movedCount > totalAvailableCount) {
        setError(`Insufficient containers. You only have ${totalAvailableCount} vessels to move.`);
        setLoading(false);
        return;
      }
    }

    // Safety Acknowledgment Validation
    if ((chemical.restricted_access || chemical.training_required) && !safetyAcknowledged) {
      setError("Compliance Error: You must acknowledge safety training and access protocols for this restricted material.");
      setLoading(false);
      return;
    }

    try {
      await axios.post("/api/inventory/transaction", {
        chemical_id: chemical.id,
        action,
        quantity_change: Number(amount),
        unit,
        reason: action === 'IN' ? (remarks || reason) : reason,
        
        // Batch & Identity
        batch,
        batch_number: batch, // Alias for backward compatibility
        mfgDate,
        purchaseDate,
        expiry,
        
        // Container info
        numContainers,
        qtyPerContainer,
        containerType,
        containerId,
        
        // Location Info
        building,
        room,
        cabinet,
        shelf,
        new_location: action === 'TRANSFER' ? newLocation : undefined,

        // Transfer details
        to_building: toBuilding,
        to_room: toRoom,
        to_cabinet: toCabinet,
        to_shelf: toShelf,
        num_containers_moved: action === 'TRANSFER' ? numContainersMoved : undefined,
        transfer_approved_by: transferApprovedBy,

        // Usage / Audit Info
        supplier,
        remarks,
        experiment_name: experimentName,
        department,
        
        // Disposal specific
        disposal_method: disposalMethod,
        disposal_approved_by: disposalApprovedBy,
        disposal_approved_role: disposalApprovedRole,
        compliance_notes: complianceNotes,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-action">
      <div className="backdrop-blur" onClick={onClose}></div>
      
      <div className={`stock-modal-container ${action === 'IN' || action === 'OUT' ? 'modal-w-large' : 'modal-w-med'}`}>
        <div className="stock-modal-header">
          <div className="header-main-info">
            <div>
              <h2 className="stock-op-title">Inventory Operation</h2>
              <div className="header-subtitle-row">
                <span className="sub-text-med">{chemical.name}</span>
                <span className="sub-dot"></span>
                <span className="id-chip-mini">{chemical.container_id_series || chemical.id}</span>
              </div>
            </div>
            <button onClick={onClose} className="close-action-btn">
              <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="stock-modal-body custom-scrollbar">
          <form id="stock-action-form" onSubmit={handleSubmit} className="stock-form">
            {/* Action Selection */}
            <div className="action-selector-group">
              <label className="action-label-mini">Transaction Type</label>
              <div className="action-buttons-strip">
                {[
                  { id: 'OUT', label: 'Stock Out', color: 'primary' },
                  { id: 'IN', label: 'Stock In', color: 'green' },
                  { id: 'TRANSFER', label: 'Transfer', color: 'blue' },
                  { id: 'DISPOSAL', label: 'Disposal', color: 'red' }
                ].map(opt => (
                  <button 
                    key={opt.id}
                    type="button"
                    onClick={() => setAction(opt.id)}
                    className={`strip-btn ${action === opt.id ? `active active-${opt.color}` : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-grid-2col">
              {/* Left Column: Primary Data */}
              <div className="form-sub-section">
                <div className="input-row-group">
                  <div className="group">
                    <label className="input-field-label">Quantity {action === 'TRANSFER' ? 'Moved' : (action === 'OUT' ? 'Removed' : 'Added')}</label>
                    <input 
                      type="number" 
                      step="any"
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      className="stock-input font-mono-bold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="group">
                    <label className="input-field-label">Unit</label>
                    <div className="relative-select-wrapper">
                      <select 
                        value={unit} 
                        onChange={e => setUnit(e.target.value)}
                        className="stock-select"
                      >
                        {chemical.state === 'Liquid' ? (
                          <>
                            <option value="L">L</option>
                            <option value="mL">mL</option>
                          </>
                        ) : (
                          <>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                          </>
                        )}
                      </select>
                      <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {action === 'IN' && (
                  <div className="form-sub-section slide-in-top">
                    <h3 className="section-indicator-title border-green"><img src="/icons/box.svg" alt="Batch" className="input-icon-mini" /> Batch & Container Initialization</h3>
                    <div className="group">
                      <label className="input-field-label-alt">Batch / Lot Number <img src="/icons/flame.svg" alt="Flame" className="input-icon-mini text-primary-accent" /></label>
                      <input type="text" value={batch} onChange={e => setBatch(e.target.value)} className="stock-input font-mono-bold text-primary-accent" placeholder="LOT-2026-A" required />
                    </div>
                    <div className="input-row-group">
                      <div className="group">
                        <label className="input-field-label-alt">Count (Units)</label>
                        <input type="number" value={numContainers} onChange={e => setNumContainers(e.target.value)} className="stock-input" />
                      </div>
                      <div className="group">
                        <label className="input-field-label-alt">Qty / Unit</label>
                        <input type="number" value={qtyPerContainer} onChange={e => setQtyPerContainer(e.target.value)} className="stock-input" placeholder="1.0" required={action === 'IN'} />
                      </div>
                    </div>
                    <div className="group">
                      <label className="input-field-label-alt">Container Type</label>
                      <div className="relative-select-wrapper">
                        <select value={containerType} onChange={e => setContainerType(e.target.value)} className="stock-select">
                          <option value="Plastic Bottle">Plastic Bottle</option>
                          <option value="Glass Bottle">Glass Bottle</option>
                          <option value="Drum">Drum</option>
                          <option value="Vial">Vial</option>
                        </select>
                        <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                )}

                {action === 'TRANSFER' && (
                  <div className="form-sub-section slide-in-top">
                    <h3 className="section-indicator-title border-blue"><img src="/icons/location.svg" alt="Location" className="input-icon-mini" /> Destination Location (TO)</h3>
                    <div className="form-sub-section">
                      {/* TO Building */}
                      <div className="input-row-group">
                        <div className="group">
                          <label className="input-field-label">To Building</label>
                          <div className="relative-select-wrapper">
                            {toHierarchy.buildings.length > 0 ? (
                              <select value={toBuilding} onChange={e => { setToBuilding(e.target.value); setToRoom(''); setToCabinet(''); setToShelf(''); }} className="stock-select">
                                <option value="">-- Select --</option>
                                {toHierarchy.buildings.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                            ) : (
                              <input type="text" value={toBuilding} onChange={e => setToBuilding(e.target.value)} className="stock-input" placeholder="Building ID" />
                            )}
                            {toHierarchy.buildings.length > 0 && <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                          </div>
                        </div>
                        <div className="group">
                          <label className="input-field-label">To Room</label>
                          <div className="relative-select-wrapper">
                            {toHierarchy.rooms.length > 0 ? (
                              <select value={toRoom} onChange={e => { setToRoom(e.target.value); setToCabinet(''); setToShelf(''); }} className="stock-select">
                                <option value="">-- Select --</option>
                                {toHierarchy.rooms.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            ) : (
                              <input type="text" value={toRoom} onChange={e => setToRoom(e.target.value)} className="stock-input" placeholder="Room #" />
                            )}
                            {toHierarchy.rooms.length > 0 && <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                          </div>
                        </div>
                      </div>

                      <div className="input-row-group">
                        <div className="group">
                          <label className="input-field-label">To Cabinet</label>
                          <div className="relative-select-wrapper">
                            {toHierarchy.cabinets.length > 0 ? (
                              <select value={toCabinet} onChange={e => { setToCabinet(e.target.value); setToShelf(''); }} className="stock-select">
                                <option value="">-- Select --</option>
                                {toHierarchy.cabinets.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            ) : (
                              <input type="text" value={toCabinet} onChange={e => setToCabinet(e.target.value)} className="stock-input" placeholder="Cabinet" />
                            )}
                            {toHierarchy.cabinets.length > 0 && <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                          </div>
                        </div>
                        <div className="group">
                          <label className="input-field-label">To Shelf</label>
                          <div className="relative-select-wrapper">
                            {toHierarchy.shelves.length > 0 ? (
                              <select value={toShelf} onChange={e => setToShelf(e.target.value)} className="stock-select">
                                <option value="">-- Select --</option>
                                {toHierarchy.shelves.map(s => (
                                  <option key={s._id} value={s.shelf}>Shelf {s.shelf} ({s.current_load}/{s.capacity} used)</option>
                                ))}
                              </select>
                            ) : (
                              <input type="text" value={toShelf} onChange={e => setToShelf(e.target.value)} className="stock-input" placeholder="Shelf" />
                            )}
                            {toHierarchy.shelves.length > 0 && <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                          </div>
                        </div>
                      </div>

                      {/* Shelf capacity bar */}
                      {toShelf && toHierarchy.shelves.length > 0 && (() => {
                        const sel = toHierarchy.shelves.find(s => s.shelf === toShelf);
                        if (!sel) return null;
                        const pct = Math.min(100, Math.round((sel.current_load / sel.capacity) * 100));
                        return (
                          <div className="capacity-info-box">
                            <div className="capacity-bar-header">
                              <span>Shelf Capacity</span>
                              <span className={pct >= 90 ? 'text-red-accent' : pct >= 70 ? 'text-amber-accent' : 'text-green-accent'}>{sel.current_load}/{sel.capacity} used</span>
                            </div>
                            <div className="bar-bg-mini">
                              <div className={`bar-fill-mini ${pct >= 90 ? 'fill-red' : pct >= 70 ? 'fill-amber' : 'fill-green'}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            {sel.safety_warnings && <p className="warning-text-mini">⚠ {sel.safety_warnings}</p>}
                          </div>
                        );
                      })()}
                    </div>

                    <h3 className="section-indicator-title border-blue"><img src="/icons/box.svg" alt="Container" className="input-icon-mini" /> Container & Approval</h3>
                    <div className="input-row-group">
                      <div className="group">
                        <label className="input-field-label">Container ID</label>
                        <input 
                          type="text" 
                          value={containerId} 
                          onChange={e => setContainerId(e.target.value)}
                          className="stock-input"
                          placeholder="CONT-00x"
                        />
                      </div>
                      <div className="group">
                        <label className="input-field-label">Qty Containers</label>
                        <input 
                          type="number" 
                          value={numContainersMoved} 
                          onChange={e => setNumContainersMoved(e.target.value)}
                          className="stock-input"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="group">
                   <label className="input-field-label">Reason / Purpose (Required)</label>
                   <textarea 
                     value={reason}
                     onChange={e => setReason(e.target.value)}
                     className="stock-textarea"
                     placeholder={action === 'OUT' ? "e.g. pH Analysis experiment" : "Additional details..."}
                     required
                   />
                </div>
              </div>

              {/* Right Column: Detailed Tracking (Context Specific) */}
              <div className="form-sub-section">
                {(action === 'OUT' || action === 'IN' || action === 'TRANSFER' || action === 'DISPOSAL') && (
                  <>
                    <h3 className={`section-indicator-title ${action === 'DISPOSAL' ? 'border-red' : 'border-primary'}`}><img src="/icons/tag.svg" alt="Tag" className="input-icon-mini" /> Identification & Location</h3>
                    
                    <div className="group">
                      <label className="input-field-label">Target Container {action !== 'IN' ? ' (Select for Auto-Status)' : ''}</label>
                      {action === 'IN' ? (
                        <input 
                          type="text" 
                          value={containerId} 
                          onChange={e => setContainerId(e.target.value)}
                          className="stock-input"
                          placeholder="CONT-00x"
                        />
                      ) : (
                        <div className="relative-select-wrapper">
                          <select 
                            value={containerId}
                            onChange={e => handleContainerSelect(e.target.value)}
                            className="stock-select"
                          >
                            <option value="">Select a specific vessel...</option>
                            {availableContainers.map(c => (
                              <option key={c._id} value={c.container_id}>
                                {c.container_id} ({c.quantity} {c.unit}) - {c.status}
                              </option>
                            ))}
                          </select>
                          <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="group">
                      <label className="input-field-label">Batch Reference</label>
                      <input 
                        type="text" 
                        value={batch} 
                        onChange={e => setBatch(e.target.value)}
                        className="stock-input font-mono-bold"
                        placeholder="Batch ID"
                        readOnly={action === 'IN'}
                      />
                    </div>

                    <div className="input-row-group">
                      {['building', 'room', 'cabinet', 'shelf'].map(field => (
                        <div key={field} className="group">
                          <label className="input-field-label-alt">{field}</label>
                          <input 
                            type="text" 
                            value={
                              field === 'building' ? building :
                              field === 'room' ? room :
                              field === 'cabinet' ? cabinet :
                              field === 'shelf' ? shelf : ""
                            } 
                            onChange={e => {
                               if (field === 'building') setBuilding(e.target.value);
                               if (field === 'room') setRoom(e.target.value);
                               if (field === 'cabinet') setCabinet(e.target.value);
                               if (field === 'shelf') setShelf(e.target.value);
                            }}
                            className="stock-input"
                          />
                        </div>
                      ))}
                    </div>

                    {action === 'IN' && (
                      <div className="special-info-panel bg-green-alt slide-in-top">
                        <label className="panel-header-mini text-green-alt"><img src="/icons/calendar.svg" alt="Timeline" className="input-icon-mini" /> Batch Timeline</label>
                        <div className="form-sub-section">
                          <div className="group">
                            <label className="input-field-label-alt">Expiry Date</label>
                            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="stock-input stock-input-white text-red-accent" required={action === 'IN'} />
                          </div>
                          <div className="input-row-group">
                            <div className="group">
                              <label className="input-field-label-alt">MFG Date</label>
                              <input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} className="stock-input stock-input-white" />
                            </div>
                            <div className="group">
                              <label className="input-field-label-alt">Purchase Date</label>
                              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="stock-input stock-input-white" />
                            </div>
                          </div>
                        </div>
                        <div className="group" style={{ marginTop: '1rem' }}>
                          <label className="input-field-label-alt">Supplier</label>
                          <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="stock-input stock-input-white" placeholder="LabChem Vendor" />
                        </div>
                      </div>
                    )}

                    {action === 'OUT' && (
                      <div className="form-sub-section slide-in-top">
                        <h3 className="section-indicator-title border-primary"><img src="/icons/flask.svg" alt="Usage" className="input-icon-mini" /> Usage Context</h3>
                        <div className="group">
                          <label className="input-field-label">Experiment Name</label>
                          <input type="text" value={experimentName} onChange={e => setExperimentName(e.target.value)} className="stock-input stock-input-white" placeholder="e.g. Titration Analysis" />
                        </div>
                        <div className="group">
                          <label className="input-field-label">Department</label>
                          <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className="stock-input stock-input-white" placeholder="Chemistry Dept" />
                        </div>
                      </div>
                    )}

                    {action === 'DISPOSAL' && (
                      <div className="form-sub-section slide-in-top">
                        <h3 className="section-indicator-title border-red"><img src="/icons/warning-red.svg" alt="Disposal" className="input-icon-mini" /> Disposal Protocol</h3>
                        <div className="group">
                          <label className="input-field-label">Disposal Method</label>
                          <input type="text" value={disposalMethod} onChange={e => setDisposalMethod(e.target.value)} className="stock-input bg-red-alt text-red-accent font-mono-bold" placeholder="e.g. Incineration" required={action === 'DISPOSAL'} />
                        </div>
                        <div className="input-row-group">
                          <div className="group">
                            <label className="input-field-label">Approved By</label>
                            <input type="text" value={disposalApprovedBy} onChange={e => setDisposalApprovedBy(e.target.value)} className="stock-input stock-input-white" required={action === 'DISPOSAL'} />
                          </div>
                          <div className="group">
                            <label className="input-field-label">Role</label>
                            <div className="relative-select-wrapper">
                              <select value={disposalApprovedRole} onChange={e => setDisposalApprovedRole(e.target.value)} className="stock-select stock-input-white">
                                <option value="safety_officer">Safety Officer</option>
                                <option value="lab_manager">Lab Manager</option>
                              </select>
                              <svg className="select-arrow-mini" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="error-alert-box pulse-alert">
                <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                <p className="alert-text">{error}</p>
              </div>
            )}

            {incompatibilityWarning && (
              <div className="warning-alert-box slide-in-top">
                <div className="warning-header-row">
                  <svg className="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="warning-title-text">Incompatible Storage Warning</p>
                </div>
                <p className="warning-body-text">
                  This location contains <span className="italic">{incompatibilityWarning.conflicting_chemical}</span> ({incompatibilityWarning.conflicting_family}). 
                  Storing <span className="italic">{chemical.name}</span> here is <span className="font-mono-bold">Dangerous</span> due to {incompatibilityWarning.reason}.
                </p>
              </div>
            )}

            {(chemical.restricted_access || chemical.training_required) && (
              <div className="compliance-panel slide-in-top">
                <div className="compliance-header">
                  <div className="compliance-icon-box">
                    <svg className="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h4 className="compliance-title">Compliance Acknowledgment</h4>
                    <p className="compliance-body">
                      This material is under strict regulatory control. By proceeding, you confirm you have completed the required safety training and have authorization to handle this substance.
                    </p>
                  </div>
                </div>
                <label className="compliance-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={safetyAcknowledged} 
                    onChange={e => setSafetyAcknowledged(e.target.checked)}
                    className="compliance-checkbox"
                  />
                  <span className="compliance-confirm-text">I confirm safety training compliance</span>
                </label>
              </div>
            )}
          </form>
        </div>

        <div className="modal-footer-action">
          <div className="footer-btn-group">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-cancel-modal"
            >
              Cancel
            </button>
            <button 
              form="stock-action-form"
              type="submit" 
              disabled={loading}
              className={`btn-confirm-op ${
                action === 'IN' ? 'bg-in' : 
                action === 'DISPOSAL' ? 'bg-disposal' : 
                action === 'TRANSFER' ? 'bg-transfer' :
                'bg-out'
              }`}
            >
              {loading ? (
                <>
                  <svg className="refresh-btn loading h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Confirm {action} Operation</span>
                  <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockActionModal;
