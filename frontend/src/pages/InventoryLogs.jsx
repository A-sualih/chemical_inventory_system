import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import axios from "axios";
import StockActionModal from "../components/StockActionModal";

const InventoryLogs = () => {
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [initialAction, setInitialAction] = useState("IN");

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

  const fetchChemicals = async () => {
    try {
      const { data } = await axios.get('/api/inventory/chemicals');
      setChemicals(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchChemicals();
  }, []);

  const startTransaction = (actionType) => {
    setInitialAction(actionType);
    setIsPickerOpen(true);
  };

  const handleChemicalSelect = (e) => {
    const chem = chemicals.find(c => c.id === e.target.value);
    if (chem) {
      setSelectedChemical(chem);
      setIsPickerOpen(false);
      setIsActionModalOpen(true);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="animate-in slide-in-from-left duration-700">
          <h1 className="text-3xl font-black heading-font text-secondary-950 tracking-tight">Master Ledger</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <p className="text-secondary-500 font-medium text-sm">Active Audit Trail • {logs.length} events recorded</p>
          </div>
        </div>

        {hasPermission("update_stock") && (
          <div className="flex flex-wrap gap-2 animate-in slide-in-from-right duration-700">
            {[
              { id: 'IN', label: 'Stock IN', color: 'green', icon: 'M12 4v16m8-8H4' },
              { id: 'OUT', label: 'Stock OUT', color: 'red', icon: 'M20 12H4' },
              { id: 'TRANSFER', label: 'Transfer', color: 'blue', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
              { id: 'DISPOSAL', label: 'Disposal', color: 'orange', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => startTransaction(opt.id)}
                className="group relative px-6 py-3 rounded-2xl font-black text-xs bg-white border border-secondary-200 hover:border-black hover:bg-black hover:text-white transition-all duration-300 shadow-xl shadow-secondary-200/40 flex items-center gap-3 active:scale-95"
              >
                <svg className={`w-4 h-4 text-${opt.color}-500 group-hover:text-white transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={opt.icon} />
                </svg>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 sm:p-8 rounded-[3rem] border border-secondary-100 shadow-xl shadow-secondary-200/20 relative overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-secondary-900 heading-font tracking-tight">Audit History</h2>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest bg-secondary-50 px-3 py-1.5 rounded-full">Real-time Feed</span>
              <button 
                onClick={() => { setLoading(true); fetchLogs(); }} 
                className={`p-2.5 rounded-xl border border-secondary-100 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-all ${loading ? 'animate-spin' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-20">
              <div className="w-12 h-12 border-[6px] border-secondary-50 border-t-primary-600 rounded-full animate-spin"></div>
              <p className="mt-6 text-sm font-black text-secondary-400 uppercase tracking-widest animate-pulse">Synchronizing Ledger...</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left min-w-[1100px]">
                <thead>
                  <tr className="text-[11px] uppercase font-black text-secondary-400 tracking-[0.15em] border-b-2 border-secondary-50">
                    <th className="pb-5 px-6">Timestamp & WHO</th>
                    <th className="pb-5 px-6">Chemical Identity</th>
                    <th className="pb-5 px-6">Operational Action</th>
                    <th className="pb-5 px-6">Delta Amount</th>
                    <th className="pb-5 px-6">Location Trace</th>
                    <th className="pb-5 px-6">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {logs.length === 0 && (
                    <tr><td colSpan="6" className="py-32 text-center">
                      <div className="max-w-xs mx-auto">
                        <div className="w-20 h-20 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4 text-secondary-200">
                          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <p className="text-secondary-900 font-black text-lg">No records found</p>
                        <p className="text-secondary-400 font-medium text-sm mt-1">Initialize a transaction to begin building the audit chain.</p>
                      </div>
                    </td></tr>
                  )}
                  {logs.map(log => (
                    <tr key={log._id} className="group hover:bg-secondary-50/50 transition-all duration-300">
                      <td className="py-6 px-6 align-top">
                        <div className="font-black text-secondary-900 whitespace-nowrap">{new Date(log.createdAt || log.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-secondary-400 font-bold mt-0.5">{new Date(log.createdAt || log.timestamp).toLocaleTimeString()}</div>
                        <div className="mt-3 flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center text-[8px] font-black text-secondary-500 uppercase">{(log.user_name || 'S')[0]}</div>
                           <div className="text-[10px] font-black text-primary-600 uppercase tracking-tight">{log.user_role}</div>
                        </div>
                      </td>
                      <td className="py-6 px-6 align-top">
                        <div className="font-black text-secondary-950 text-base leading-tight group-hover:text-primary-600 transition-colors">{log.chemical_name || log.chemical_id}</div>
                        <div className="text-[10px] text-secondary-400 font-black tracking-widest mt-1.5 flex items-center gap-2">
                           <span className="bg-secondary-50 px-2 py-0.5 rounded-md border border-secondary-100">{log.chemical_id}</span>
                           {log.batch_number && <span className="text-primary-500/80 underline decoration-primary-500/20 decoration-2 underline-offset-4">LOT {log.batch_number}</span>}
                        </div>
                      </td>
                      <td className="py-6 px-6 align-top">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase inline-block mb-2 border shadow-sm ${
                          log.action === 'IN' ? 'bg-green-500 text-white border-green-600' : 
                          log.action === 'OUT' ? 'bg-red-500 text-white border-red-600' :
                          log.action === 'TRANSFER' ? 'bg-blue-500 text-white border-blue-600' :
                          'bg-orange-500 text-white border-orange-600'
                        }`}>
                          {log.action}
                        </span>
                        <div className="text-[10px] text-secondary-400 font-black uppercase tracking-widest pl-1">Audit Path Verified</div>
                      </td>
                      <td className="py-6 px-6 align-top">
                        <div className={`text-lg font-black ${
                          log.action === 'IN' ? 'text-green-600 bg-green-50/50 px-3 py-1 rounded-xl w-fit' : 
                          log.action === 'OUT' || log.action === 'DISPOSAL' ? 'text-red-600 bg-red-50/50 px-3 py-1 rounded-xl w-fit' : 
                          'text-secondary-900 bg-secondary-50 px-3 py-1 rounded-xl w-fit'
                        }`}>
                          {log.action === 'IN' ? '+' : (log.action === 'OUT' || log.action === 'DISPOSAL' ? '-' : '')}
                          {Math.abs(log.quantity_change)}
                          <span className="text-xs ml-1 font-black uppercase">{log.unit}</span>
                        </div>
                        {log.num_containers_moved > 0 && <div className="text-[10px] text-secondary-400 font-bold mt-1 uppercase tracking-tighter">{log.num_containers_moved} Individual Vessels</div>}
                      </td>
                      <td className="py-6 px-6 align-top">
                        {log.action === 'TRANSFER' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest px-1.5 py-0.5 bg-secondary-50 rounded">Origin</span>
                               <span className="text-xs font-bold text-secondary-600">{log.old_location || 'Archive'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest px-1.5 py-0.5 bg-blue-50 rounded">Dest</span>
                               <span className="text-xs font-black text-blue-700">{log.new_location}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-secondary-700">
                               <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                               {log.building}-{log.room || 'NA'}
                            </div>
                            {(log.cabinet || log.shelf) && (
                              <div className="text-[10px] text-secondary-400 font-black uppercase tracking-widest pl-5">
                                CAB {log.cabinet || '-'} / SH {log.shelf || '-'}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-6 px-6 align-top">
                        <div className="font-bold text-secondary-800">{log.user_name || 'System Auto-Log'}</div>
                        <div className="text-[11px] text-secondary-500 font-medium leading-relaxed mt-2 max-w-[220px] bg-secondary-50/50 p-2 rounded-xl border border-secondary-100/50 italic" title={log.reason}>
                          "{log.reason || 'No specific operational reason provided.'}"
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

      {/* Target Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-secondary-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-3xl font-black text-secondary-950 heading-font tracking-tight">Manual Action</h3>
                <p className="text-sm text-secondary-500 font-bold uppercase tracking-widest mt-1 text-[11px]">Select target vessel for {initialAction}</p>
              </div>
              <button onClick={() => setIsPickerOpen(false)} className="w-10 h-10 rounded-2xl bg-secondary-50 text-secondary-400 hover:bg-red-50 hover:text-red-500 transition-all font-bold text-xl">&times;</button>
            </div>
            
            <div className="space-y-6">
              <div className="group">
                <label className="text-[11px] font-black text-secondary-500 uppercase tracking-widest block mb-3 px-1">Global Chemical Search</label>
                <div className="relative">
                  <select 
                    className="w-full bg-secondary-50 border-2 border-secondary-100 rounded-[2rem] p-5 text-base font-black appearance-none cursor-pointer focus:border-primary-500 transition-all shadow-inner outline-none"
                    value={selectedChemical?.id || ""}
                    onChange={handleChemicalSelect}
                  >
                    <option value="">Choose chemical system...</option>
                    {chemicals.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — LOT: {c.batch_number || 'N/A'} ({c.id})</option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-400 font-bold">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
              </div>

              <div className="bg-secondary-50/50 p-6 rounded-[2rem] border-2 border-dashed border-secondary-200 flex items-center justify-center py-10 opacity-60">
                <div className="text-center">
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-secondary-300 shadow-sm">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                   </div>
                   <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Awaiting system selection</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => setIsPickerOpen(false)} 
                  className="px-6 py-5 rounded-[2rem] font-black text-sm text-secondary-500 bg-secondary-50 hover:bg-secondary-100 transition-all"
                >
                  Global Discard
                </button>
                <div className="relative">
                   <div className="absolute inset-0 bg-primary-600 blur-2xl opacity-20"></div>
                   <button 
                    disabled={true}
                    className="w-full relative px-6 py-5 rounded-[2rem] font-black text-sm text-white bg-secondary-300 cursor-not-allowed uppercase tracking-widest"
                  >
                    Select to Proceed
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* The Actual Transaction Modal */}
      {isActionModalOpen && selectedChemical && (
        <StockActionModal 
          isOpen={true}
          onClose={() => {
            setIsActionModalOpen(false);
            setSelectedChemical(null);
          }}
          chemical={selectedChemical}
          initialAction={initialAction}
          onSuccess={() => {
            fetchLogs();
            setIsActionModalOpen(false);
            setSelectedChemical(null);
          }}
        />
      )}
    </Layout>
  );
};

export default InventoryLogs;
