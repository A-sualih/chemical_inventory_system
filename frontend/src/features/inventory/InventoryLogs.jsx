import { useState, useEffect } from "react";
import Layout from "../../layout/Layout";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import StockActionModal from "./StockActionModal";
import "../../styles/Inventory.css";

const InventoryLogs = () => {
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [initialAction, setInitialAction] = useState("OUT");

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
      <div className="inventory-header">
        <div className="header-title-section">
          <h1 className="page-title">Master Ledger</h1>
          <div className="status-badge-container">
             <div className="status-dot"></div>
             <p className="status-text">Active Audit Trail • {logs.length} events recorded</p>
          </div>
        </div>

        {hasPermission("update_stock") && (
          <div className="action-buttons-group">
            {[
              { id: 'IN', label: 'Stock IN', color: 'green', icon: 'M12 4v16m8-8H4' },
              { id: 'OUT', label: 'Stock OUT', color: 'red', icon: 'M20 12H4' },
              { id: 'TRANSFER', label: 'Transfer', color: 'blue', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
              { id: 'DISPOSAL', label: 'Disposal', color: 'orange', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => startTransaction(opt.id)}
                className="inventory-action-btn"
              >
                <svg className={`btn-icon icon-${opt.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={opt.icon} />
                </svg>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ledger-card">
        {/* Header */}
        <div className="ledger-header">
          <h2 className="ledger-title">Audit History</h2>
          <div className="ledger-controls">
            <span className="tag-badge">Real-time Feed</span>
            <button 
              onClick={() => { setLoading(true); fetchLogs(); }} 
              className={`refresh-btn ${loading ? 'loading' : ''}`}
            >
              <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-history">
            <div className="history-spinner"></div>
            <p className="loading-history-text">Synchronizing Ledger...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="inventory-table">
              <thead>
                <tr className="table-head-row">
                  <th className="table-head-cell">Timestamp & WHO</th>
                  <th className="table-head-cell">Chemical Identity</th>
                  <th className="table-head-cell">Operational Action</th>
                  <th className="table-head-cell">Delta Amount</th>
                  <th className="table-head-cell">Location Trace</th>
                  <th className="table-head-cell">Audit Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-history">
                      <div className="empty-history-content">
                        <div className="empty-icon-box">
                          <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <p className="empty-title">No records found</p>
                        <p className="empty-subtitle">Initialize a transaction to begin building the audit chain.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {logs.map(log => (
                  <tr key={log._id} className="table-row">
                    <td className="table-cell">
                      <div className="timestamp-col">
                        <div className="date-text">{new Date(log.createdAt || log.timestamp).toLocaleDateString()}</div>
                        <div className="time-text">{new Date(log.createdAt || log.timestamp).toLocaleTimeString()}</div>
                        <div className="user-tag">
                           <div className="avatar-mini">{(log.user_name || 'S')[0]}</div>
                           <div className="role-text">{log.user_role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="identity-name">{log.chemical_name || log.chemical_id}</div>
                      <div className="identity-meta">
                         <span className="id-tag">{log.chemical_id}</span>
                         {log.batch_number && <span className="batch-link">LOT {log.batch_number}</span>}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`action-badge ${
                        log.action === 'IN' ? 'badge-in' : 
                        log.action === 'OUT' ? 'badge-out' :
                        log.action === 'TRANSFER' ? 'badge-transfer' :
                        'badge-disposal'
                      }`}>
                        {log.action}
                      </span>
                      <div className="verify-tag">Audit Path Verified</div>
                    </td>
                    <td className="table-cell">
                      <div className={`delta-container ${
                        log.action === 'IN' ? 'delta-positive' : 
                        log.action === 'OUT' || log.action === 'DISPOSAL' ? 'delta-negative' : 
                        'delta-neutral'
                      }`}>
                        {log.action === 'IN' ? '+' : (log.action === 'OUT' || log.action === 'DISPOSAL' ? '-' : '')}
                        {Math.abs(log.quantity_change)}
                        <span className="unit-label">{log.unit}</span>
                      </div>
                      {log.num_containers_moved > 0 && <div className="vessels-count">{log.num_containers_moved} Individual Vessels</div>}
                    </td>
                    <td className="table-cell">
                      {log.action === 'TRANSFER' ? (
                        <div className="location-trace">
                          <div className="trace-item">
                             <span className="trace-label label-origin">Origin</span>
                             <span className="trace-val">{log.old_location || 'Archive'}</span>
                          </div>
                          <div className="trace-item">
                             <span className="trace-label label-dest">Dest</span>
                             <span className="trace-val-dest">{log.new_location}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="simple-location">
                          <div className="loc-main">
                             <svg className="loc-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                             {log.building}-{log.room || 'NA'}
                          </div>
                          {(log.cabinet || log.shelf) && (
                            <div className="loc-sub">
                              CAB {log.cabinet || '-'} / SH {log.shelf || '-'}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="table-cell audit-notes-cell">
                      <div className="audit-user">{log.user_name || 'System Auto-Log'}</div>
                      <div className="audit-reason" title={log.reason}>
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

      {/* Target Picker Modal */}
      {isPickerOpen && (
        <div className="picker-overlay">
          <div className="picker-content">
            <div className="picker-header">
              <div>
                <h3 className="picker-title">Manual Action</h3>
                <p className="picker-subtitle">Select target vessel for {initialAction}</p>
              </div>
              <button onClick={() => setIsPickerOpen(false)} className="close-btn-round">&times;</button>
            </div>
            
            <div className="picker-form">
              <div className="form-group-large">
                <label className="picker-label">Global Chemical Search</label>
                <div className="select-container-large">
                  <select 
                    className="picker-select"
                    value={selectedChemical?.id || ""}
                    onChange={handleChemicalSelect}
                  >
                    <option value="">Choose chemical system...</option>
                    {chemicals.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — LOT: {c.batch_number || 'N/A'} ({c.id})</option>
                    ))}
                  </select>
                  <div className="select-icon-absolute">
                    <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
              </div>

              <div className="waiting-card">
                <div className="waiting-content">
                   <div className="waiting-icon-box">
                      <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                   </div>
                   <p className="waiting-text">Awaiting system selection</p>
                </div>
              </div>

              <div className="picker-actions">
                <button 
                  onClick={() => setIsPickerOpen(false)} 
                  className="btn-secondary-picker"
                >
                  Global Discard
                </button>
                <button 
                  disabled={true}
                  className="btn-primary-picker"
                >
                  Select to Proceed
                </button>
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
