import { useState, useEffect } from "react";
import axios from "axios";
import "../../styles/ChemicalHistoryModal.css";

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
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose}></div>
      
      <div className="history-modal-content">
        <div className="history-modal-header">
          <div className="header-flex">
            <div>
              <h2 className="header-title">Activity Ledger</h2>
              <p className="header-subtitle">{chemical.name} • {chemical.id}</p>
            </div>
            <button onClick={onClose} className="close-modal-button">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="history-modal-body custom-scrollbar">
          {loading ? (
            <div className="loading-history">
              <svg className="history-spinner" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <p className="loading-history-text">Retrieving Audit Trail...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-history">
               <p className="empty-history-text">No transaction history found for this asset.</p>
            </div>
          ) : (
            <div className="history-logs-list">
              {logs.map((log) => (
                <div key={log._id} className="history-log-item">
                  <div className="log-header">
                    <span className={`log-action-badge ${
                      log.action === 'IN' ? 'action-in' : 
                      log.action === 'DISPOSAL' ? 'action-disposal' : 
                      log.action === 'TRANSFER' ? 'action-transfer' :
                      'action-default'
                    }`}>
                      {log.action}
                    </span>
                    <span className="log-timestamp">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="log-details-row">
                    <div style={{ flex: 1 }}>
                      {log.action === 'TRANSFER' ? (
                        <div className="transfer-info-section">
                          <div className="transfer-label">Material Transfer</div>
                          <div className="transfer-grid">
                            <div className="transfer-loc-card source-card">
                              <div className="loc-label-mini source-label">Source</div>
                              <div className="loc-main-text">{log.building || log.old_location || 'N/A'} {log.room && <span className="loc-sub-text">({log.room})</span>}</div>
                            </div>
                            <svg className="transfer-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            <div className="transfer-loc-card dest-card">
                              <div className="loc-label-mini dest-label">Destination</div>
                              <div className="loc-main-text dest-main-text">{log.to_building || log.new_location} {log.to_room && <span className="loc-sub-text dest-sub-text">({log.to_room})</span>}</div>
                            </div>
                          </div>
                          {log.container_id && (
                            <div className="container-info-badge">
                              <span>ID: {log.container_id}</span>
                              {log.num_containers_moved > 1 && <span>• {log.num_containers_moved} Units</span>}
                            </div>
                          )}
                          {log.transfer_approved_by && (
                            <div className="transfer-auth">
                              Approved By: <span className="auth-name">{log.transfer_approved_by}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="quantity-change-value">
                            {log.action === 'IN' ? '+' : '-'}{log.quantity_change} <span className="quantity-unit">{log.unit}</span>
                          </div>
                          {(log.building || log.batch_number) && (
                            <div className="log-meta-tags">
                              {log.batch_number && <span className="meta-badge tag-batch">Batch: {log.batch_number}</span>}
                              {log.building && <span className="meta-badge tag-loc">Loc: {log.building} {log.room}</span>}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2">
                        <p className="log-reason-text">
                          &ldquo;{log.reason || "No reason provided"}&rdquo;
                        </p>
                        {log.experiment_name && (
                          <div className="usage-info">
                            <div className="usage-row">
                              <span className="usage-label">Usage:</span>
                              <span className="usage-val">{log.experiment_name}</span>
                              {log.department && <span className="dept-val">({log.department})</span>}
                            </div>
                          </div>
                        )}
                        {log.disposal_method && (
                          <div className="disposal-info">
                            <div className="disposal-row">
                              <span className="disposal-label">Disposal:</span>
                              <span className="disposal-val">{log.disposal_method}</span>
                            </div>
                            {log.disposal_approved_by && (
                              <div className="disposal-auth">
                                Auth: <span className="font-bold">{log.disposal_approved_by}</span> ({log.disposal_approved_role || 'N/A'})
                              </div>
                            )}
                            {log.compliance_notes && (
                              <div className="compliance-row">
                                <span className="italic">{log.compliance_notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="user-info-section">
                       <div className="user-role-label">By {log.user_role || 'User'}</div>
                       <div className="user-display">
                         <div className="user-avatar-mini">
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
        
        <div className="history-modal-footer">
           <p className="footer-disclaimer">Logs are immutable and system-verified for compliance.</p>
        </div>
      </div>
    </div>
  );
};

export default ChemicalHistoryModal;

