import { useState, useEffect } from "react";
import axios from "axios";

const StockActionModal = ({ chemical, onClose, onSuccess }) => {
  const [action, setAction] = useState("OUT"); // Default to OUT as it's most common
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState(chemical.unit || "L");
  const [reason, setReason] = useState("");
  const [newLocation, setNewLocation] = useState("");
  
  // IN Action Granular Fields
  const [batch, setBatch] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expiry, setExpiry] = useState("");
  const [numContainers, setNumContainers] = useState("1");
  const [qtyPerContainer, setQtyPerContainer] = useState("");
  const [containerType, setContainerType] = useState("Plastic Bottle");
  const [containerId, setContainerId] = useState("");
  const [building, setBuilding] = useState(chemical.building || "");
  const [room, setRoom] = useState(chemical.room || "");
  const [cabinet, setCabinet] = useState(chemical.cabinet || "");
  const [shelf, setShelf] = useState(chemical.shelf || "");
  const [supplier, setSupplier] = useState(chemical.supplier || "");
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-calculate amount for IN action
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

    try {
      await axios.post("/api/inventory/transaction", {
        chemical_id: chemical.id,
        action,
        quantity_change: action === 'TRANSFER' ? 0 : Number(amount),
        unit,
        reason: action === 'IN' ? (remarks || reason) : reason,
        new_location: action === 'TRANSFER' ? newLocation : undefined,
        // Detailed IN fields
        batch,
        mfgDate,
        purchaseDate,
        expiry,
        numContainers,
        qtyPerContainer,
        containerType,
        containerId,
        building,
        room,
        cabinet,
        shelf,
        supplier,
        remarks
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
      
      <div className={`relative w-full ${action === 'IN' ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-secondary-100`}>
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black heading-font text-secondary-900 tracking-tight">Stock Adjustment</h2>
              <p className="text-secondary-500 text-sm font-medium">
                {chemical.name} 
                <span className="ml-2 px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded text-[10px] font-bold uppercase tracking-wider">
                  {chemical.container_id_series || chemical.id}
                </span>
              </p>
            </div>
            <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex bg-secondary-50 p-1 rounded-2xl border border-secondary-100">
              <button 
                type="button"
                onClick={() => setAction("OUT")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${action === 'OUT' ? 'bg-white text-primary-600 shadow-sm border border-secondary-100' : 'text-secondary-500 hover:text-secondary-700'}`}
              >
                Stock Out
              </button>
              <button 
                type="button"
                onClick={() => setAction("IN")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${action === 'IN' ? 'bg-white text-green-600 shadow-sm border border-secondary-100' : 'text-secondary-500 hover:text-secondary-700'}`}
              >
                Stock In
              </button>
              <button 
                type="button"
                onClick={() => setAction("DISPOSAL")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${action === 'DISPOSAL' ? 'bg-white text-red-600 shadow-sm border border-secondary-100' : 'text-secondary-500 hover:text-secondary-700'}`}
              >
                Disposal
              </button>
              <button 
                type="button"
                onClick={() => setAction("TRANSFER")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${action === 'TRANSFER' ? 'bg-white text-blue-600 shadow-sm border border-secondary-100' : 'text-secondary-500 hover:text-secondary-700'}`}
              >
                Transfer
              </button>
            </div>

            {action === 'TRANSFER' ? (
              <div className="group animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">New Destination / Location</label>
                <input 
                  type="text" 
                  value={newLocation} 
                  onChange={e => setNewLocation(e.target.value)}
                  className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                  placeholder="e.g. Lab Bench 4, Cabinet 2"
                  required
                />
              </div>
            ) : action === 'IN' ? (
              <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Batch / Lot Number 🔥</label>
                      <input type="text" value={batch} onChange={e => setBatch(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm font-mono font-bold" placeholder="LOT-2026-A" required />
                      <p className="text-[8px] text-primary-500 mt-1 font-bold uppercase tracking-tight">Traceability Required</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="group">
                        <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Count</label>
                        <input type="number" value={numContainers} onChange={e => setNumContainers(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-lg p-2.5 text-sm font-bold" />
                      </div>
                      <div className="group">
                        <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Qty/Bottle</label>
                        <input type="number" value={qtyPerContainer} onChange={e => setQtyPerContainer(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-lg p-2.5 text-sm font-bold" placeholder="1.0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                       <div className="group">
                          <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Total Qty</label>
                          <input readOnly type="text" value={`${amount} ${unit}`} className="w-full bg-primary-50 border-transparent rounded-xl p-3 text-sm font-black text-primary-700 font-mono" />
                       </div>
                       <div className="group">
                          <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Unit</label>
                          <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm font-bold">
                             {chemical.state === 'Liquid' ? (<><option>L</option><option>mL</option></>) : (<><option>kg</option><option>g</option></>)}
                          </select>
                       </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Expiry Date</label>
                      <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm font-bold text-red-600" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <input type="text" value={building} onChange={e => setBuilding(e.target.value)} placeholder="Bldg" className="bg-secondary-50 border border-secondary-100 rounded-lg p-2 text-xs" />
                       <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="Room" className="bg-secondary-50 border border-secondary-100 rounded-lg p-2 text-xs" />
                       <input type="text" value={cabinet} onChange={e => setCabinet(e.target.value)} placeholder="Cab" className="bg-secondary-50 border border-secondary-100 rounded-lg p-2 text-xs" />
                       <input type="text" value={shelf} onChange={e => setShelf(e.target.value)} placeholder="Shelf" className="bg-secondary-50 border border-secondary-100 rounded-lg p-2 text-xs" />
                    </div>
                     <div className="group">
                        <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Vendor (Optional)</label>
                        <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-xs" placeholder="LabChem" />
                     </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div className="group">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Amount</label>
                  <input 
                    type="number" 
                    step="any"
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-mono font-bold"
                    placeholder="0.0"
                    required
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Unit</label>
                  <select 
                    value={unit} 
                    onChange={e => setUnit(e.target.value)}
                    className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold appearance-none cursor-pointer"
                  >
                    {chemical.state === 'Liquid' ? (
                      <>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                        <option value="uL">µL</option>
                      </>
                    ) : chemical.state === 'Solid' ? (
                      <>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="mg">mg</option>
                      </>
                    ) : (
                      <>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="group">
                <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  {action === 'OUT' ? "Purpose / Experiment ID (REQUIRED) 🔥" : "Reason / Reference"}
                </label>
                <input 
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
                  placeholder={action === 'OUT' ? "e.g. EXP-21" : "Batch Number or Receipt ID"}
                  required
                />
              </div>

              {action === 'OUT' && (
                <div className="group animate-in fade-in duration-300">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Optional Note</label>
                  <textarea 
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-medium h-20 resize-none"
                    placeholder="e.g. Used for titration test..."
                  />
                </div>
              )}
              
              {action === 'IN' && (
                <div className="group">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Remarks</label>
                  <textarea 
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-medium h-20 resize-none"
                    placeholder="Additional details about this batch..."
                  />
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-black text-white shadow-lg transition-all active:scale-[0.98] ${
                action === 'IN' ? 'bg-green-600 hover:bg-green-500 shadow-green-600/20' : 
                action === 'DISPOSAL' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 
                action === 'TRANSFER' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' :
                'bg-primary-600 hover:bg-primary-500 shadow-primary-600/20'
              }`}
            >
              {loading ? "Processing..." : `Confirm ${action}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StockActionModal;
