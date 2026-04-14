import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import axios from "axios";

const InventoryLogs = () => {
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Action Form
  const [chemicalId, setChemicalId] = useState("");
  const [action, setAction] = useState("IN");
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");

  const fetchLogs = async () => {
    try {
      const { data } = await axios.get('/api/inventory/logs');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/inventory/transaction', {
        chemical_id: chemicalId,
        action,
        quantity_change: Number(quantityChange),
        reason
      });
      alert(`Transaction logged successfully.`);
      setChemicalId("");
      setQuantityChange("");
      setReason("");
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.error || "Transaction failed");
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold heading-font text-secondary-900">Inventory Tracking</h1>
        <p className="text-secondary-500 mt-1 text-sm">Real-time stock logs and fast transaction logging.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Rapid Logging Panel */}
        {hasPermission("update_stock") && (
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-secondary-100 shadow-sm lg:col-span-1 h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <h2 className="text-xl font-bold">Fast Check-In/Out</h2>
            </div>
            
            <form onSubmit={handleTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAction("IN")} className={`p-3 rounded-xl border text-sm font-bold transition-all ${action === 'IN' ? 'bg-green-500 text-white border-green-600' : 'bg-secondary-50 text-secondary-500 border-secondary-200 hover:bg-secondary-100'}`}>
                  STOCK IN
                </button>
                <button type="button" onClick={() => setAction("OUT")} className={`p-3 rounded-xl border text-sm font-bold transition-all ${action === 'OUT' ? 'bg-red-500 text-white border-red-600' : 'bg-secondary-50 text-secondary-500 border-secondary-200 hover:bg-secondary-100'}`}>
                  STOCK OUT
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Chemical ID</label>
                <input type="text" value={chemicalId} onChange={(e) => setChemicalId(e.target.value)} required className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" placeholder="Search or Scan Barcode..." />
              </div>
              <div>
                <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Quantity Change</label>
                <input type="number" step="0.01" value={quantityChange} onChange={(e) => setQuantityChange(e.target.value)} required min="0.01" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" placeholder="0.0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Reason / Reference</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} required className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" placeholder="e.g. Experiment 4A" />
              </div>
              <button type="submit" className="w-full bg-secondary-950 hover:bg-secondary-800 text-white p-3 rounded-xl font-bold transition-all mt-4 tracking-widest uppercase">
                Log Transaction
              </button>
            </form>
          </div>
        )}

        {/* Master Logging Table */}
        <div className={`bg-white p-6 sm:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-secondary-100 shadow-sm ${hasPermission("update_stock") ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h2 className="text-xl font-bold mb-4">Master Ledger</h2>
          {loading ? <p className="text-sm text-secondary-400">Loading ledger...</p> : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left min-w-[540px]">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-secondary-400 tracking-widest border-b border-secondary-100">
                    <th className="pb-3 px-4">Timestamp</th>
                    <th className="pb-3 px-4">Chemical</th>
                    <th className="pb-3 px-4">Action</th>
                    <th className="pb-3 px-4">Quantity</th>
                    <th className="pb-3 px-4">User</th>
                    <th className="pb-3 px-4">Reference</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {logs.length === 0 && (
                    <tr><td colSpan="6" className="p-4 text-center text-secondary-500">No transactions recorded yet.</td></tr>
                  )}
                  {logs.map(log => (
                    <tr key={log._id} className="border-b border-secondary-50/50 hover:bg-secondary-50/50 transition-colors">
                      <td className="p-4 text-secondary-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 font-bold text-secondary-900">{log.chemical_name || log.chemical_id}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${log.action === 'IN' ? 'bg-green-100 text-green-700' : log.action === 'DISPOSAL' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-medium">{log.quantity_change}</td>
                      <td className="p-4">{log.user_name}</td>
                      <td className="p-4 text-secondary-500 italic max-w-[150px] truncate" title={log.reason}>{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default InventoryLogs;
