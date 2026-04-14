import { useState } from "react";
import axios from "axios";

const StockActionModal = ({ chemical, onClose, onSuccess }) => {
  const [action, setAction] = useState("OUT"); 
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState(chemical.unit || "L");
  const [reason, setReason] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // New Detailed Fields
  const [batchNumber, setBatchNumber] = useState(chemical.batch_number || "");
  const [building, setBuilding] = useState(chemical.building || "");
  const [room, setRoom] = useState(chemical.room || "");
  const [cabinet, setCabinet] = useState(chemical.cabinet || "");
  const [shelf, setShelf] = useState(chemical.shelf || "");
  const [experimentName, setExperimentName] = useState("");
  const [department, setDepartment] = useState("");
  const [disposalMethod, setDisposalMethod] = useState("");
  const [disposalApprovedBy, setDisposalApprovedBy] = useState("");
  const [disposalApprovedRole, setDisposalApprovedRole] = useState("safety_officer");
  const [complianceNotes, setComplianceNotes] = useState("");

  // Transfer Fields
  const [toBuilding, setToBuilding] = useState("");
  const [toRoom, setToRoom] = useState("");
  const [toCabinet, setToCabinet] = useState("");
  const [toShelf, setToShelf] = useState("");
  const [containerId, setContainerId] = useState("");
  const [numContainersMoved, setNumContainersMoved] = useState(1);
  const [transferApprovedBy, setTransferApprovedBy] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await axios.post("/api/inventory/transaction", {
        chemical_id: chemical.id,
        action,
        quantity_change: action === 'TRANSFER' ? Number(amount) : Number(amount), // In transfer, we can still record the volume moved
        unit,
        reason,
        new_location: newLocation,
        to_building: toBuilding,
        to_room: toRoom,
        to_cabinet: toCabinet,
        to_shelf: toShelf,
        batch_number: batchNumber,
        building: building, // Source Building
        room: room,
        cabinet: cabinet,
        shelf: shelf,
        experiment_name: experimentName,
        department,
        disposal_method: disposalMethod,
        disposal_approved_by: disposalApprovedBy,
        disposal_approved_role: disposalApprovedRole,
        compliance_notes: complianceNotes,
        container_id: containerId,
        num_containers_moved: numContainersMoved,
        transfer_approved_by: transferApprovedBy
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
      
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-secondary-100 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-secondary-50 bg-white sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black heading-font text-secondary-900 tracking-tight">Inventory Operation</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-secondary-500 text-sm font-medium">{chemical.name}</span>
                <span className="w-1 h-1 rounded-full bg-secondary-300"></span>
                <span className="text-primary-600 text-xs font-bold bg-primary-50 px-2 py-0.5 rounded-full">{chemical.id}</span>
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
              {/* Left Column: Core Data */}
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
                      ) : chemical.state === 'Solid' ? (
                        <>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                        </>
                      ) : (
                        <>
                          <option value="L">L</option>
                          <option value="kg">kg</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

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
                    <div className="group">
                      <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Approved By (Optional)</label>
                      <input 
                        type="text" 
                        value={transferApprovedBy} 
                        onChange={e => setTransferApprovedBy(e.target.value)}
                        className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all font-bold"
                        placeholder="Lab Manager / Supervisor"
                      />
                    </div>
                  </div>
                )}

                <div className="group">
                  <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Reason (Required)</label>
                  <textarea 
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-medium h-24 resize-none"
                    placeholder={action === 'OUT' ? "e.g. Used in laboratory experiment" : "Additional comments..."}
                    required
                  />
                </div>

                {/* Disposal Specific Fields */}
                {action === 'DISPOSAL' && (
                  <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                    <h3 className="text-secondary-900 font-bold text-sm border-l-4 border-red-500 pl-3">⚠️ Disposal Method & Authorization</h3>
                    
                    <div className="group">
                      <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Disposal Method</label>
                      <input 
                        type="text" 
                        value={disposalMethod} 
                        onChange={e => setDisposalMethod(e.target.value)}
                        className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-400 outline-none transition-all font-bold"
                        placeholder="e.g. Chemical waste bin, Incineration"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Approved By</label>
                        <input 
                          type="text" 
                          value={disposalApprovedBy} 
                          onChange={e => setDisposalApprovedBy(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-400 outline-none transition-all font-bold"
                          placeholder="Name"
                          required
                        />
                      </div>
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Authorizer Role</label>
                        <select 
                          value={disposalApprovedRole} 
                          onChange={e => setDisposalApprovedRole(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-400 outline-none transition-all font-bold appearance-none cursor-pointer"
                        >
                          <option value="safety_officer">Safety Officer</option>
                          <option value="lab_manager">Lab Manager</option>
                          <option value="department_head">Dept Head</option>
                        </select>
                      </div>
                    </div>

                    <div className="group">
                      <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">📄 Compliance / Notes</label>
                      <textarea 
                        value={complianceNotes}
                        onChange={e => setComplianceNotes(e.target.value)}
                        className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-400 outline-none transition-all font-medium h-20 resize-none"
                        placeholder="e.g. Disposed according to lab safety guidelines"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Detailed Tracking (Focus on OUT) */}
              <div className="space-y-6">
                {(action === 'OUT' || action === 'IN' || action === 'TRANSFER') && (
                  <>
                    <h3 className="text-secondary-900 font-bold text-sm border-l-4 border-primary-500 pl-3">🏷️ Batch/Location Info</h3>
                    
                    <div className="group">
                      <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Batch Number</label>
                      <input 
                        type="text" 
                        value={batchNumber} 
                        onChange={e => setBatchNumber(e.target.value)}
                        className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                        placeholder="Batch ID"
                      />
                      <p className="text-[9px] text-primary-500 mt-1 font-medium">👉 Remove from correct batch (FIFO)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Building</label>
                        <input 
                          type="text" 
                          value={building} 
                          onChange={e => setBuilding(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-xs focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Room</label>
                        <input 
                          type="text" 
                          value={room} 
                          onChange={e => setRoom(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-xs focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Cabinet</label>
                        <input 
                          type="text" 
                          value={cabinet} 
                          onChange={e => setCabinet(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-xs focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Shelf</label>
                        <input 
                          type="text" 
                          value={shelf} 
                          onChange={e => setShelf(e.target.value)}
                          className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-xs focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                        />
                      </div>
                    </div>

                    {action === 'OUT' && (
                      <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                        <h3 className="text-secondary-900 font-bold text-sm border-l-4 border-primary-500 pl-3">🧪 Usage Details</h3>
                        <div className="group">
                          <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Experiment Name</label>
                          <input 
                            type="text" 
                            value={experimentName} 
                            onChange={e => setExperimentName(e.target.value)}
                            className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                            placeholder="e.g. pH Analysis"
                          />
                        </div>
                        <div className="group">
                          <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Department</label>
                          <input 
                            type="text" 
                            value={department} 
                            onChange={e => setDepartment(e.target.value)}
                            className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                            placeholder="e.g. Chemistry Lab"
                          />
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
