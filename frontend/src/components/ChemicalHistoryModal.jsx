import { useState, useEffect } from "react";
import axios from "axios";

const ChemicalHistoryModal = ({ chemical, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await axios.get(`/api/inventory/logs/${chemical.id}`);
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [chemical.id]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-secondary-100 flex flex-col max-h-[80vh]">
        <div className="p-8 border-b border-secondary-100">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black heading-font text-secondary-900 tracking-tight">Activity Ledger</h2>
              <p className="text-secondary-500 text-sm font-medium">{chemical.name} • {chemical.id}</p>
            </div>
            <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-secondary-400">
              <svg className="w-8 h-8 animate-spin mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <p className="text-sm font-bold tracking-widest uppercase">Retrieving Audit Trail...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
               <p className="text-secondary-400 font-medium">No transaction history found for this asset.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="group relative bg-secondary-50 hover:bg-white hover:shadow-md transition-all rounded-2xl p-5 border border-secondary-100">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      log.action === 'IN' ? 'bg-green-100 text-green-700' : 
                      log.action === 'DISPOSAL' ? 'bg-red-100 text-red-700' : 
                      log.action === 'TRANSFER' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      {log.action === 'TRANSFER' ? (
                        <div className="text-sm">
                           <span className="text-secondary-400 font-medium">Moved from </span>
                           <span className="text-secondary-900 font-bold">{log.old_location}</span>
                           <span className="text-secondary-400 font-medium"> to </span>
                           <span className="text-secondary-900 font-bold">{log.new_location}</span>
                        </div>
                      ) : (
                        <div className="text-lg font-mono font-black text-secondary-900">
                          {log.action === 'IN' ? '+' : '-'}{log.quantity_change} <span className="text-sm text-secondary-500 font-bold">{log.unit}</span>
                        </div>
                      )}
                      <p className="text-xs text-secondary-500 mt-1.5 font-medium italic">
                        &ldquo;{log.reason || "No reason provided"}&rdquo;
                      </p>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Authenticated User</div>
                       <div className="text-xs font-bold text-secondary-700 flex items-center justify-end gap-1.5">
                         <div className="w-5 h-5 rounded-full bg-secondary-900 text-white flex items-center justify-center text-[8px]">
                           {log.user_name?.charAt(0) || 'U'}
                         </div>
                         {log.user_name}
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 bg-secondary-50 border-t border-secondary-100 text-center">
           <p className="text-[10px] font-bold text-secondary-400 mt-1 uppercase tracking-widest">Logs are immutable and system-verified for compliance.</p>
        </div>
      </div>
    </div>
  );
};

export default ChemicalHistoryModal;
