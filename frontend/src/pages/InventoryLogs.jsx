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
  const [unit, setUnit] = useState("L");
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
        unit,
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
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Quantity Change</label>
                  <input type="number" step="0.01" value={quantityChange} onChange={(e) => setQuantityChange(e.target.value)} required min="0.01" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" placeholder="0.0" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1 font-bold appearance-none cursor-pointer">
                    <option>L</option><option>mL</option><option>kg</option><option>g</option><option>mg</option>
                  </select>
                </div>
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
                    <th className="pb-3 px-4">Action & Role</th>
                    <th className="pb-3 px-4">Quantity & Batch</th>
                    <th className="pb-3 px-4">Location</th>
                    <th className="pb-3 px-4">User & Reference</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {logs.length === 0 && (
                    <tr><td colSpan="6" className="p-4 text-center text-secondary-500">No transactions recorded yet.</td></tr>
                  )}
                  {logs.map(log => (
                    <tr key={log._id} className="border-b border-secondary-50/50 hover:bg-secondary-50/50 transition-colors">
                      <td className="p-4 text-secondary-500 align-top">
                        <div className="font-medium text-secondary-700">{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] opacity-70">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-bold text-secondary-900">{log.chemical_name || log.chemical_id}</div>
                        <div className="text-[10px] text-primary-500 font-bold">{log.chemical_id}</div>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase block w-fit mb-1 ${
                          log.action === 'IN' ? 'bg-green-100 text-green-700' : 
                          log.action === 'DISPOSAL' ? 'bg-orange-100 text-orange-700' : 
                          log.action === 'TRANSFER' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {log.action}
                        </span>
                        {log.user_role && <span className="text-[10px] text-secondary-400 font-medium italic">{log.user_role}</span>}
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-mono font-bold text-secondary-800">
                          {log.action === 'TRANSFER' ? (
                            <span className="text-blue-600 font-bold">MOVE</span>
                          ) : (
                            `${log.quantity_change} ${log.unit}`
                          )}
                        </div>
                        {log.batch_number && (
                          <div className="text-[10px] text-secondary-500 mt-1">
                            <span className="bg-secondary-100 px-1.5 py-0.5 rounded">Batch: {log.batch_number}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        {log.action === 'TRANSFER' ? (
                          <div className="text-[11px] leading-relaxed space-y-1">
                            <div className="text-secondary-400">
                              <span className="font-bold">FROM:</span> {log.building || log.old_location || 'N/A'} {log.room ? `(${log.room})` : ''}
                            </div>
                            <div className="text-blue-600 font-bold">
                              <span>TO:</span> {log.to_building || log.new_location} {log.to_room ? `(${log.to_room})` : ''}
                            </div>
                            {log.to_cabinet && <div className="text-[10px] text-secondary-500 italic">Cab: {log.to_cabinet}, Sh: {log.to_shelf}</div>}
                          </div>
                        ) : (
                          <div className="text-[11px] text-secondary-600">
                            {log.building && <span>{log.building}, </span>}
                            {log.room && <span>Rm {log.room}, </span>}
                            {log.cabinet && <span>Cab {log.cabinet}, </span>}
                            {log.shelf && <span>Sh {log.shelf}</span>}
                            {(!log.building && !log.room) && <span className="text-secondary-400 italic">None specified</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-bold text-secondary-800">{log.user_name}</div>
                        <div className="text-[11px] text-secondary-500 italic mt-1 max-w-[200px] break-words">
                          {log.reason}
                          {log.experiment_name && <span className="block text-primary-600 not-italic font-bold mt-1">Exp: {log.experiment_name}</span>}
                          {log.department && <span className="block text-secondary-400 not-italic text-[10px]">Dept: {log.department}</span>}
                          {log.container_id && (
                            <div className="mt-1 flex gap-2">
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">📦 {log.container_id}</span>
                              {log.num_containers_moved > 1 && <span className="text-[10px] text-secondary-400">x{log.num_containers_moved} units</span>}
                            </div>
                          )}
                          {log.transfer_approved_by && <span className="block text-[10px] text-secondary-400 mt-1 font-bold">Auth: {log.transfer_approved_by}</span>}
                          {log.disposal_method && (
                            <div className="mt-1 space-y-1">
                              <span className="block text-red-500 not-italic font-bold">Method: {log.disposal_method}</span>
                              {log.disposal_approved_by && <span className="block text-[10px] text-secondary-600 font-bold bg-secondary-100 px-1 py-0.5 rounded w-fit">Auth: {log.disposal_approved_by} ({log.disposal_approved_role || 'N/A'})</span>}
                              {log.compliance_notes && <span className="block text-[10px] text-secondary-400 mt-1">📝 {log.compliance_notes}</span>}
                            </div>
                          )}
                        </div>
                      </td>
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
