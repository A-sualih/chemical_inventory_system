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
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest">Material Transfer</div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-secondary-100/50 p-2 rounded-xl">
                              <div className="text-[10px] text-secondary-400 uppercase font-black px-1">Source</div>
                              <div className="text-sm font-bold text-secondary-700">{log.building || log.old_location || 'N/A'} {log.room && <span className="text-secondary-400 text-xs font-medium">({log.room})</span>}</div>
                            </div>
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            <div className="flex-1 bg-blue-50 p-2 rounded-xl border border-blue-100">
                              <div className="text-[10px] text-blue-400 uppercase font-black px-1">Destination</div>
                              <div className="text-sm font-bold text-blue-700">{log.to_building || log.new_location} {log.to_room && <span className="text-blue-400 text-xs font-medium">({log.to_room})</span>}</div>
                            </div>
                          </div>
                          {log.container_id && (
                            <div className="flex items-center gap-2 text-[10px] text-secondary-500 font-bold bg-white w-fit px-2 py-1 rounded-lg shadow-sm border border-secondary-100">
                              <span>📦 ID: {log.container_id}</span>
                              {log.num_containers_moved > 1 && <span>• {log.num_containers_moved} Units</span>}
                            </div>
                          )}
                          {log.transfer_approved_by && (
                            <div className="text-[10px] text-secondary-400 mt-1 italic">
                              Approved By: <span className="font-bold text-secondary-600">{log.transfer_approved_by}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-lg font-mono font-black text-secondary-900">
                            {log.action === 'IN' ? '+' : '-'}{log.quantity_change} <span className="text-sm text-secondary-500 font-bold">{log.unit}</span>
                          </div>
                          {(log.building || log.batch_number) && (
                            <div className="flex gap-2 mt-1">
                              {log.batch_number && <span className="text-[9px] font-bold bg-secondary-200 px-1.5 py-0.5 rounded text-secondary-600">Batch: {log.batch_number}</span>}
                              {log.building && <span className="text-[9px] font-bold bg-primary-50 px-1.5 py-0.5 rounded text-primary-600">Loc: {log.building} {log.room}</span>}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2">
                        <p className="text-xs text-secondary-500 font-medium italic">
                          &ldquo;{log.reason || "No reason provided"}&rdquo;
                        </p>
                        {log.experiment_name && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[9px] font-black text-primary-500 uppercase">Usage:</span>
                            <span className="text-[10px] font-bold text-secondary-700">{log.experiment_name}</span>
                            {log.department && <span className="text-[10px] text-secondary-400">({log.department})</span>}
                          </div>
                        )}
                        {log.disposal_method && (
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-red-500 uppercase">Disposal:</span>
                              <span className="text-[10px] font-bold text-secondary-700">{log.disposal_method}</span>
                            </div>
                            {log.disposal_approved_by && (
                              <div className="text-[9px] text-secondary-500">
                                Auth: <span className="font-bold">{log.disposal_approved_by}</span> ({log.disposal_approved_role || 'N/A'})
                              </div>
                            )}
                            {log.compliance_notes && (
                              <div className="text-[9px] text-secondary-400 mt-1 flex gap-1">
                                <span>📄</span>
                                <span className="italic">{log.compliance_notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">By {log.user_role || 'User'}</div>
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
