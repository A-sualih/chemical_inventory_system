import { useState, useEffect } from "react";
import Layout from "../../layout/Layout";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import axios from "axios";
import "../../styles/AdminOnly.css";

const AdminOnlyPage = ({ title, description }) => {
   const { user, hasPermission } = useAuth();
   const [users, setUsers] = useState([]);
   const [auditLogs, setAuditLogs] = useState([]);
   const [totalLogs, setTotalLogs] = useState(0);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState(title.includes("Audit") ? "audit" : "roles");
   const [selectedLog, setSelectedLog] = useState(null);
   
   // Pagination & Filters
   const [page, setPage] = useState(1);
   const [searchQuery, setSearchQuery] = useState("");
   const [filterTarget, setFilterTarget] = useState("");
   const [filterAction, setFilterAction] = useState("");
   const [dateRange, setDateRange] = useState({ start: "", end: "" });

   if (!hasPermission("assign_roles") && !hasPermission("view_audit_logs")) {
      return <Navigate to="/" replace />;
   }

   const fetchData = async () => {
      setLoading(true);
      try {
         if (activeTab === "roles") {
            const { data } = await axios.get('/api/auth/users');
            setUsers(data);
         } else {
            const params = {
               page,
               user: searchQuery,
               action: filterAction,
               targetType: filterTarget,
               startDate: dateRange.start,
               endDate: dateRange.end,
               limit: 20
            };
            const { data } = await axios.get('/api/audit', { params });
            setAuditLogs(data.logs);
            setTotalLogs(data.total);
         }
      } catch (err) {
         console.error("Failed to fetch admin data", err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, [activeTab, page, filterAction, filterTarget, dateRange]);

   // Handle search with debounce or manual trigger
   const handleSearch = (e) => {
      if (e.key === 'Enter') fetchData();
   };

   const handleRoleChange = async (userId, newRole) => {
      try {
         await axios.put(`/api/auth/users/${userId}/role`, { role: newRole });
         fetchData();
      } catch (err) {
         alert("Error updating role");
      }
   };

   const renderChanges = (changes) => {
      return null;
   };

   return (
      <Layout>
         <div className="admin-header">
            <div>
               <h1 className="admin-title">{title}</h1>
               <div className="admin-subtitle">
                  <div className="admin-pulse-dot"></div>
                  <p className="admin-desc">{description}</p>
               </div>
            </div>

            <div className="admin-tabs">
               <button
                  onClick={() => setActiveTab("roles")}
                  className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`}
               >
                  User Roles
               </button>
               <button
                  onClick={() => setActiveTab("audit")}
                  className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
               >
                  Master Audit
               </button>
            </div>
         </div>

         <div className="admin-layout">
            <div className="admin-main">
               {activeTab === "roles" ? (
                  <div className="admin-panel">
                     <div className="panel-header">
                        <div>
                           <h2 className="panel-title">Personnel Directory</h2>
                           <p className="panel-subtitle">Access Control List</p>
                        </div>
                        <span className="panel-badge">{users.length} Active Accounts</span>
                     </div>
                     
                     {loading ? (
                        <div className="loader-container">
                           <div className="loader-spinner"></div>
                           <p className="loader-text">Synchronizing directory...</p>
                        </div>
                     ) : (
                        <div className="user-grid">
                           {users.map(u => (
                              <div key={u._id} className="user-card">
                                 <div className="user-card-bg-effect"></div>
                                 <div className="user-card-header">
                                    <div className="user-avatar" style={{ padding: u.profile_photo ? '0' : '', overflow: 'hidden' }}>
                                       {u.profile_photo ? (
                                          <img src={u.profile_photo} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                       ) : (
                                          u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                       )}
                                    </div>
                                    <div className="user-info">
                                       <h3 className="user-name">{u.name}</h3>
                                       <p className="user-email">{u.email}</p>
                                       <div className={`status-tag ${u.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                                          {u.status}
                                       </div>
                                    </div>
                                 </div>

                                 <div className="user-card-body">
                                    <div>
                                       <label className="role-label">Authority Level</label>
                                       <div className="role-select-wrapper">
                                          <select
                                             value={u.role}
                                             onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                             className="role-select"
                                             disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                          >
                                             <option value="Admin">System Administrator</option>
                                             <option value="Lab Manager">Operations Manager</option>
                                             <option value="Laboratory Staff">Lab Technician / Staff</option>
                                             <option value="Safety Officer">Safety Officer</option>
                                             <option value="Procurement Officer">Procurement Officer</option>
                                             <option value="Viewer / Auditor">Viewer / Auditor</option>
                                          </select>
                                          <div className="role-select-icon">
                                             <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="action-buttons">
                                       <button
                                          onClick={async () => {
                                             if (window.confirm(`Reset password for ${u.name}?`)) {
                                                try {
                                                   const { data } = await axios.put(`/api/auth/users/${u._id}/reset-password`);
                                                   alert(`RESTORE SUCCESSFUL\n\nTemporary Password: ${data.tempPassword}\n\nSecurity notice: User must change this upon next login.`);
                                                } catch (err) {
                                                   alert(err.response?.data?.error || "Reset failed");
                                                }
                                             }
                                          }}
                                          className="action-btn btn-reset"
                                       >
                                          <svg className="btn-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                          <span className="btn-label">Reset</span>
                                       </button>
                                       <button
                                          onClick={async () => {
                                             const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
                                             if (window.confirm(`${newStatus === 'Inactive' ? 'Suspend' : 'Heal'} credentials for ${u.name}?`)) {
                                                try {
                                                   await axios.put(`/api/auth/users/${u._id}/status`, { status: newStatus });
                                                   fetchData();
                                                } catch (err) {
                                                   alert(err.response?.data?.error || "Status update failed");
                                                }
                                             }
                                          }}
                                          className={`action-btn ${u.status === 'Active' ? 'btn-suspend' : 'btn-verify'}`}
                                          disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                       >
                                           <svg className="btn-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={u.status === 'Active' ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                                          <span className="btn-label">{u.status === 'Active' ? 'Suspend' : 'Verify'}</span>
                                       </button>
                                       <button
                                          onClick={async () => {
                                             if (window.confirm(`PERMANENTLY OVERWRITE: This will scrub ${u.name} from the user registry. Confirm destructive action.`)) {
                                                try {
                                                   await axios.delete(`/api/auth/users/${u._id}`);
                                                   fetchData();
                                                } catch (err) {
                                                   alert(err.response?.data?.error || "Scrub failed");
                                                }
                                             }
                                          }}
                                          className="action-btn btn-scrub"
                                          disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                       >
                                           <svg className="btn-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          <span className="btn-label">Scrub</span>
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="admin-panel">
                     <div className="audit-header">
                        <div>
                           <h2 className="audit-title">Security Ledger</h2>
                           <div className="audit-meta">
                              <span className="audit-meta-dot"></span>
                              <span className="audit-meta-text">Immutable Audit Chain • {totalLogs} Events</span>
                           </div>
                        </div>
                        
                        <div className="audit-filters">
                           <div className="audit-search-wrapper">
                              <input 
                                 type="text" 
                                 placeholder="Search operator..." 
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 onKeyDown={handleSearch}
                                 className="audit-search-input"
                              />
                              <svg className="audit-search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                           </div>
                           <select 
                              value={filterAction}
                              onChange={(e) => setFilterAction(e.target.value)}
                              className="audit-filter-select"
                           >
                              <option value="">Actions: All</option>
                              <option value="CREATE">Creation</option>
                              <option value="UPDATE">Modification</option>
                              <option value="DELETE">Removal</option>
                              <option value="APPROVE">Approvals</option>
                              <option value="TRANSFER">Movements</option>
                              <option value="LOGIN">Security: Access</option>
                           </select>
                           <select 
                              value={filterTarget}
                              onChange={(e) => setFilterTarget(e.target.value)}
                              className="audit-filter-select"
                           >
                              <option value="">Entity: All</option>
                              <option value="chemical">Chemicals</option>
                              <option value="stock">Stock</option>
                              <option value="request">Requests</option>
                              <option value="user">Human Assets</option>
                           </select>
                           <button 
                              onClick={() => { setPage(1); fetchData(); }}
                              className="audit-refresh-btn"
                           >
                              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                           </button>
                        </div>
                     </div>

                     {loading ? (
                        <div className="loader-container">
                           <div style={{ position: 'relative' }}>
                              <div className="loader-spinner" style={{ marginBottom: 0 }}></div>
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 <svg style={{ color: 'var(--primary-500)', animation: 'pulse 2s infinite', width: '1.5rem', height: '1.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                              </div>
                           </div>
                           <p className="loader-text" style={{ marginTop: '2rem', fontSize: '0.75rem', letterSpacing: '0.3em' }}>Analyzing cryptographic chain...</p>
                        </div>
                     ) : (
                        <div className="audit-list">
                           {auditLogs.length === 0 && (
                              <div className="audit-empty">
                                 <div className="audit-empty-icon">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                 </div>
                                 <p className="audit-empty-title">No match discovered</p>
                                 <p className="audit-empty-subtitle">Refine your search parameters</p>
                              </div>
                           )}
                           {auditLogs.map(log => (
                              <div 
                                 key={log._id || Math.random()} 
                                 className={`audit-log-item ${selectedLog === log._id ? 'selected' : ''}`}
                                 onClick={() => setSelectedLog(selectedLog === log._id ? null : log._id)}
                              >
                                 <div className="audit-log-header">
                                    <div className="audit-log-info">
                                       <div className={`audit-log-icon ${
                                          log.action === 'CREATE' ? 'icon-create' :
                                          log.action === 'DELETE' ? 'icon-delete' :
                                          log.action === 'UPDATE' ? 'icon-update' :
                                          'icon-default'
                                       }`}>
                                          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             {log.action === 'CREATE' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />}
                                             {log.action === 'UPDATE' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                                             {log.action === 'DELETE' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                                             {!['CREATE', 'UPDATE', 'DELETE'].includes(log.action) && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />}
                                          </svg>
                                       </div>
                                       <div>
                                          <div className="audit-log-action-wrap">
                                             <span className="audit-log-action">{log.action.replace(/_/g, ' ')}</span>
                                             {log.metadata?.status === 'failed' && (
                                                <span className="audit-log-fail">Failure</span>
                                             )}
                                          </div>
                                          <p className="audit-log-time">{new Date(log.timestamp).toLocaleString()}</p>
                                       </div>
                                    </div>
                                    
                                    <div className="audit-log-tags">
                                       <span className="audit-tag tag-target">
                                          Target: {log.target?.type || log.resource}
                                       </span>
                                       <span className="audit-tag tag-id">
                                          ID: {log.target?.id || log.resource_id}
                                       </span>
                                    </div>
                                 </div>
                                 
                                 <div className="audit-log-body">
                                    <h4 className="audit-log-details">{log.details}</h4>
                                    
                                    <div className="audit-meta-grid">
                                       <div className="audit-meta-card">
                                          <div className="audit-meta-icon icon-user">
                                             {(log.user?.name || log.user_name || '?')[0].toUpperCase()}
                                          </div>
                                          <div className="audit-meta-content">
                                             <p className="audit-meta-label">Human Asset</p>
                                             <p className="audit-meta-value">{log.user?.name || log.user_name || 'System Auto'}</p>
                                          </div>
                                       </div>
                                       <div className="audit-meta-card">
                                          <div className="audit-meta-icon icon-role">
                                             <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4" /></svg>
                                          </div>
                                          <div className="audit-meta-content">
                                             <p className="audit-meta-label">Access Role</p>
                                             <p className="audit-meta-value">{log.user?.role || 'N/A'}</p>
                                          </div>
                                       </div>
                                       <div className="audit-meta-card">
                                          <div className="audit-meta-icon icon-ip">
                                             <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                          </div>
                                          <div className="audit-meta-content">
                                             <p className="audit-meta-label">Network Trace</p>
                                             <p className="audit-meta-value value-mono">{log.metadata?.ip || log.ip_address || '—'}</p>
                                          </div>
                                       </div>
                                    </div>

                                    {selectedLog === log._id && renderChanges(log.changes)}

                                    {log.metadata?.userAgent && (
                                       <div className="audit-user-agent">
                                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                          {log.metadata.userAgent}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))}

                           {/* Pagination */}
                           {totalLogs > 20 && (
                              <div className="audit-pagination">
                                 <button 
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="pagination-btn"
                                 >
                                    Previous
                                 </button>
                                 <span className="pagination-info">Page {page} of {Math.ceil(totalLogs / 20)}</span>
                                 <button 
                                    disabled={page * 20 >= totalLogs}
                                    onClick={() => setPage(p => p + 1)}
                                    className="pagination-btn"
                                 >
                                    Next
                                 </button>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               )}
            </div>

            <div className="sidebar-panels">
               <div className="authority-panel">
                  <div className="authority-bg-glow"></div>
                  <div className="authority-content">
                     <h2 className="authority-title">
                        <span className="authority-title-bar"></span>
                        Access Authority
                     </h2>
                     <div className="authority-roles">
                        {[
                           { r: "Admin", d: "Highest authority. Total system control and audit review.", color: "color-admin" },
                           { r: "Lab Manager", d: "Operations head. Stock management and request approval.", color: "color-manager" },
                           { r: "Lab Technician", d: "Frontline scientist. Record transactions and requests.", color: "color-tech" },
                           { r: "Safety Officer", d: "Compliance lead. Risk assessment and reporting.", color: "color-safety" },
                           { r: "Viewer / Auditor", d: "Restricted read-only access for compliance and stock audit.", color: "color-viewer" },
                        ].map((item, i) => (
                           <div key={i} className="authority-role">
                              <h4 className={`role-name ${item.color}`}>{item.r}</h4>
                              <p className="role-desc">
                                 {item.d}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="security-enforcement">
                     <p className="enforcement-title">Security Enforcement</p>
                     <p className="enforcement-desc">"All role modifications and critical events are sealed in the audit chain for compliance verification."</p>
                  </div>
               </div>

               <div className="purge-panel">
                  <div className="purge-icon">
                     <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <h3 className="purge-title">System Purge</h3>
                  <p className="purge-desc">
                     Instantly terminate all personnel accounts and wipe historical records. This action is irreversible and recorded in the permanent audit trail.
                  </p>
                  <button
                     onClick={async () => {
                        if (window.confirm("FATAL ACTION: This will purge all users and audit logs. Proceed with complete wipe?")) {
                           try {
                              await axios.post('/api/auth/users/wipe-all');
                              alert("SYSTEM PURGE COMPLETED");
                              fetchData();
                           } catch (err) {
                              alert(err.response?.data?.error || "Purge failed");
                           }
                        }
                     }}
                     className="purge-btn"
                  >
                     Execute Global Wipe
                  </button>
               </div>
            </div>
         </div>
      </Layout>
   );
};

export default AdminOnlyPage;
