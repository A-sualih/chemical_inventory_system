import { useState, useEffect } from "react";
import axios from "axios";

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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className={`relative w-full ${action === 'IN' || action === 'OUT' ? 'max-w-3xl' : 'max-w-2xl'} bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-secondary-100 flex flex-col max-h-[90vh]`}>
        <div className="p-8 border-b border-secondary-50 bg-white sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black heading-font text-secondary-900 tracking-tight">Inventory Operation</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-secondary-500 text-sm font-medium">{chemical.name}</span>
                <span className="w-1 h-1 rounded-full bg-secondary-300"></span>
                <span className="text-primary-600 text-xs font-bold bg-primary-50 px-2 py-0.5 rounded-full">{chemical.container_id_series || chemical.id}</span>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary-50 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form id="stock-action-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Action Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] ml-1 block">Transaction Type</label>
              <div className="grid grid-cols-4 gap-2 bg-secondary-50 p-1.5 rounded-2xl border border-secondary-100">
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
                    className={`py-3 px-2 rounded-xl font-bold text-xs transition-all duration-200 ${
                      action === opt.id 
                        ? `bg-white text-${opt.color === 'primary' ? 'primary-600' : opt.color + '-600'} shadow-sm ring-1 ring-secondary-200` 
                        : 'text-secondary-400 hover:text-secondary-600 hover:bg-white/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Primary Data */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Quantity {action === 'TRANSFER' ? 'Moved' : (action === 'OUT' ? 'Removed' : 'Added')}</label>
                    <input 
                      type="number" 
                      step="any"
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-mono font-bold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="group">
                    <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Unit</label>
                    <select 
                      value={unit} 
                      onChange={e => setUnit(e.target.value)}
                      className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold appearance-none cursor-pointer"
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
                  </div>
                </div>

                {action === 'IN' && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <h3 className="text-secondary-900 font-bold text-sm border-l-4 border-green-500 pl-3 uppercase tracking-wider">📦 Batch & Container Initialization</h3>
                    <div className="group">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Batch / Lot Number 🔥</label>
                      <input type="text" value={batch} onChange={e => setBatch(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-4 text-sm font-mono font-bold text-primary-600" placeholder="LOT-2026-A" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Count (Units)</label>
                        <input type="number" value={numContainers} onChange={e => setNumContainers(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-lg p-3 text-sm font-bold" />
                      </div>
                      <div className="group">
                        <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Qty / Unit</label>
                        <input type="number" value={qtyPerContainer} onChange={e => setQtyPerContainer(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-lg p-3 text-sm font-bold" placeholder="1.0" required={action === 'IN'} />
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Container Type</label>
                      <select value={containerType} onChange={e => setContainerType(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-lg p-3 text-sm font-bold">
                        <option value="Plastic Bottle">Plastic Bottle</option>
                        <option value="Glass Bottle">Glass Bottle</option>
                        <option value="Drum">Drum</option>
                        <option value="Vial">Vial</option>
                      </select>
                    </div>
                  </div>
                )}

                {action === 'TRANSFER' && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 pt-4">
                    <h3 className="text-secondary-900 font-bold text-sm border-l-4 border-blue-500 pl-3">📍 Destination Location (TO)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">To Building</label>
                        <input 
                          type="text" 
                          value={toBuilding} 
                          onChange={e => setToBuilding(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all font-bold"
                          placeholder="Building ID"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">To Room</label>
                        <input 
                          type="text" 
                          value={toRoom} 
                          onChange={e => setToRoom(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all font-bold"
                          placeholder="Room #"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">To Cabinet</label>
                        <input 
                          type="text" 
                          value={toCabinet} 
                          onChange={e => setToCabinet(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all font-bold"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">To Shelf</label>
                        <input 
                          type="text" 
                          value={toShelf} 
                          onChange={e => setToShelf(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all font-bold"
                        />
                      </div>
                    </div>

                    <h3 className="text-secondary-900 font-bold text-sm border-l-4 border-blue-400 pl-3">📦 Container & Approval</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Container ID</label>
                        <input 
                          type="text" 
                          value={containerId} 
                          onChange={e => setContainerId(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all font-bold"
                          placeholder="CONT-00x"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Qty Containers</label>
                        <input 
                          type="number" 
                          value={numContainersMoved} 
                          onChange={e => setNumContainersMoved(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="group">
                   <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Reason / Purpose (Required)</label>
                   <textarea 
                     value={reason}
                     onChange={e => setReason(e.target.value)}
                     className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-medium h-24 resize-none"
                     placeholder={action === 'OUT' ? "e.g. pH Analysis experiment" : "Additional details..."}
                     required
                   />
                </div>
              </div>

              {/* Right Column: Detailed Tracking (Context Specific) */}
              <div className="space-y-6">
                {(action === 'OUT' || action === 'IN' || action === 'TRANSFER' || action === 'DISPOSAL') && (
                  <>
                    <h3 className={`text-secondary-900 font-bold text-sm border-l-4 ${action === 'DISPOSAL' ? 'border-red-500' : 'border-primary-500'} pl-3`}>🏷️ Identification & Location</h3>
                    
                    <div className="group mt-4">
                      <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Target Container {action !== 'IN' ? ' (Select for Auto-Status)' : ''}</label>
                      {action === 'IN' ? (
                        <input 
                          type="text" 
                          value={containerId} 
                          onChange={e => setContainerId(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all font-bold"
                          placeholder="CONT-00x"
                        />
                      ) : (
                        <select 
                          value={containerId}
                          onChange={e => handleContainerSelect(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold cursor-pointer"
                        >
                          <option value="">Select a specific vessel...</option>
                          {availableContainers.map(c => (
                            <option key={c._id} value={c.container_id}>
                              {c.container_id} ({c.quantity} {c.unit}) - {c.status}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    <div className="group">
                      <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Batch Reference</label>
                      <input 
                        type="text" 
                        value={batch} 
                        onChange={e => setBatch(e.target.value)}
                        className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                        placeholder="Batch ID"
                        readOnly={action === 'IN'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {['building', 'room', 'cabinet', 'shelf'].map(field => (
                        <div key={field} className="group">
                          <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block uppercase text-[10px] tracking-widest">{field}</label>
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
                            className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-xs focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                          />
                        </div>
                      ))}
                    </div>

                    {action === 'IN' && (
                      <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 space-y-4 animate-in fade-in duration-300">
                        <label className="text-[10px] font-black text-green-700 uppercase tracking-widest block mb-2">📅 Batch Timeline</label>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="group">
                            <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Expiry Date</label>
                            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="w-full bg-white border border-secondary-100 rounded-lg p-2 text-sm font-bold text-red-600" required={action === 'IN'} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                              <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">MFG Date</label>
                              <input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} className="w-full bg-white border border-secondary-100 rounded-lg p-2 text-xs" />
                            </div>
                            <div className="group">
                              <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Purchase Date</label>
                              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full bg-white border border-secondary-100 rounded-lg p-2 text-xs" />
                            </div>
                          </div>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Supplier</label>
                          <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full bg-white border border-secondary-100 rounded-lg p-2 text-sm font-bold" placeholder="LabChem Vendor" />
                        </div>
                      </div>
                    )}

                    {action === 'OUT' && (
                      <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                        <h3 className="text-secondary-900 font-bold text-sm border-l-4 border-primary-500 pl-3 uppercase tracking-wider">🧪 Usage Context</h3>
                        <div className="group">
                          <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Experiment Name</label>
                          <input type="text" value={experimentName} onChange={e => setExperimentName(e.target.value)} className="w-full bg-white border border-secondary-100 rounded-xl p-4 text-sm font-bold" placeholder="e.g. Titration Analysis" />
                        </div>
                        <div className="group">
                          <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Department</label>
                          <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className="w-full bg-white border border-secondary-100 rounded-xl p-4 text-sm font-bold" placeholder="Chemistry Dept" />
                        </div>
                      </div>
                    )}

                    {action === 'DISPOSAL' && (
                      <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                        <h3 className="text-secondary-900 font-bold text-sm border-l-4 border-red-500 pl-3 italic uppercase tracking-widest">⚠️ Disposal Protocol</h3>
                        <div className="group">
                          <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Disposal Method</label>
                          <input type="text" value={disposalMethod} onChange={e => setDisposalMethod(e.target.value)} className="w-full bg-red-50/30 border border-red-100 rounded-xl p-4 text-sm font-black text-red-700" placeholder="e.g. Incineration" required={action === 'DISPOSAL'} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="group">
                            <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Approved By</label>
                            <input type="text" value={disposalApprovedBy} onChange={e => setDisposalApprovedBy(e.target.value)} className="w-full bg-white border border-secondary-100 rounded-xl p-3 text-xs font-bold" required={action === 'DISPOSAL'} />
                          </div>
                          <div className="group">
                            <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Role</label>
                            <select value={disposalApprovedRole} onChange={e => setDisposalApprovedRole(e.target.value)} className="w-full bg-white border border-secondary-100 rounded-xl p-3 text-xs font-bold">
                              <option value="safety_officer">Safety Officer</option>
                              <option value="lab_manager">Lab Manager</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-pulse">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}
          </form>
        </div>

        <div className="p-8 border-t border-secondary-50 bg-secondary-50/30 sticky bottom-0 z-10 backdrop-blur-md">
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 transition-all"
            >
              Cancel
            </button>
            <button 
              form="stock-action-form"
              type="submit" 
              disabled={loading}
              className={`flex-[2] py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                action === 'IN' ? 'bg-green-600 hover:bg-green-500 shadow-green-600/20' : 
                action === 'DISPOSAL' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 
                action === 'TRANSFER' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' :
                'bg-primary-600 hover:bg-primary-500 shadow-primary-600/20'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Confirm {action} Operation</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
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
