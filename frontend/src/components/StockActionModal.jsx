import { useState } from "react";
import axios from "axios";

const StockActionModal = ({ chemical, onClose, onSuccess }) => {
  const [action, setAction] = useState("OUT"); // Default to OUT as it's most common
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState(chemical.unit || "L");
  const [reason, setReason] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        reason,
        new_location: action === 'TRANSFER' ? newLocation : undefined
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
      
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-secondary-100">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black heading-font text-secondary-900 tracking-tight">Stock Adjustment</h2>
              <p className="text-secondary-500 text-sm font-medium">{chemical.name} ({chemical.id})</p>
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

            <div className="group">
              <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Reason / Reference</label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-medium h-24 resize-none"
                placeholder={action === 'OUT' ? "Project ID or Experiment Name" : "Batch Number or Receipt ID"}
                required
              />
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
