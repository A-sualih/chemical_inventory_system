import { useState } from "react";
import axios from "axios";

const FIFOUsageModal = ({ chemical, onClose, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState(chemical.unit || "L");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post("/api/inventory/fifo-usage", {
        chemical_id: chemical.id,
        quantity: Number(amount),
        unit,
        reason
      });
      setSuccessData(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "FIFO Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-secondary-100 p-10 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 className="text-3xl font-black heading-font text-secondary-900 mb-2">Usage Confirmed</h2>
          <p className="text-secondary-500 mb-8 font-medium">FIFO auto-selection logic successfully deducted stock.</p>
          
          <div className="bg-secondary-50 rounded-3xl p-6 mb-8 text-left border border-secondary-100 space-y-4">
            <div className="flex justify-between items-center border-b border-secondary-200/50 pb-3">
              <span className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Total Deducted</span>
              <span className="font-mono font-black text-secondary-900 text-lg">{successData.totalDeducted} {successData.unit}</span>
            </div>
            <div className="space-y-3">
              <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest block">Containers Affected</span>
              <div className="space-y-2">
                {successData.containersUsed.map((c, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-secondary-100 text-xs shadow-sm">
                    <div className="flex flex-col">
                      <span className="font-black text-secondary-800">{c.containerId}</span>
                      <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-tighter">Batch: {c.batchId}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-primary-600 font-bold">-{c.deductedQuantity} {c.unit}</span>
                      <span className="text-[10px] text-secondary-300 font-medium">Rem: {c.remainingQuantity} {c.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-secondary-900 hover:bg-black text-white rounded-2xl font-black transition-all shadow-xl shadow-secondary-900/20 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-secondary-100">
        <div className="p-8 border-b border-secondary-50 bg-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black heading-font text-secondary-900 tracking-tight">Quick FIFO Usage</h2>
              <p className="text-secondary-500 text-sm font-medium mt-1">Oldest stock will be auto-selected first.</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary-50 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 bg-primary-50/50 p-4 rounded-3xl border border-primary-100">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <div className="font-black text-secondary-900 text-sm">{chemical.name}</div>
              <div className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">{chemical.id} • Available: {chemical.quantity} {chemical.unit}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 group">
                <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Quantity to Deduct</label>
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
                  className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-bold"
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

            <div className="group">
              <label className="text-[11px] font-bold text-secondary-500 mb-1.5 block">Usage Purpose / Experiment</label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all font-medium h-24 resize-none"
                placeholder="Why is this chemical being used?"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-pulse">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-black shadow-xl shadow-primary-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Deducting...</span>
                </>
              ) : (
                <>
                  <span>Apply FIFO Deduction</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FIFOUsageModal;
