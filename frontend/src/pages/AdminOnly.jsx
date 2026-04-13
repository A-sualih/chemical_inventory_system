import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";
import axios from "axios";

const AdminOnlyPage = ({ title, description }) => {
   const { user, hasPermission } = useAuth();
   const [users, setUsers] = useState([]);
   const [auditLogs, setAuditLogs] = useState([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState(title.includes("Audit") ? "audit" : "roles");

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
            const { data } = await axios.get('/api/audit');
            setAuditLogs(data);
         }
      } catch (err) {
         console.error("Failed to fetch admin data", err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, [activeTab]);

   const handleRoleChange = async (userId, newRole) => {
      try {
         await axios.put(`/api/auth/users/${userId}/role`, { role: newRole });
         fetchData();
      } catch (err) {
         alert("Error updating role");
      }
   };

   return (
      <Layout>
         <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
               <h1 className="text-4xl font-black heading-font text-secondary-900 tracking-tight">{title}</h1>
               <p className="text-secondary-500 mt-1 font-medium">{description}</p>
            </div>

            <div className="flex bg-secondary-100 p-1.5 rounded-[1.5rem] border border-secondary-200">
               <button
                  onClick={() => setActiveTab("roles")}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'roles' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
               >
                  User Roles
               </button>
               <button
                  onClick={() => setActiveTab("audit")}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
               >
                  Master Audit
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
               {activeTab === "roles" ? (
                  <div className="bg-white p-8 rounded-[3rem] border border-secondary-100 shadow-xl overflow-hidden">
                     <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-secondary-900">Personnel Directory</h2>
                        <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em]">{users.length} Registered Accounts</span>
                     </div>
                     {loading ? (
                        <div className="flex flex-col items-center py-20">
                           <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                           <p className="text-sm font-bold text-secondary-400 uppercase tracking-widest">Encrypting Directory...</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {users.map(u => (
                              <div key={u._id} className="group p-6 bg-secondary-50 hover:bg-white border border-secondary-100 hover:border-primary-200 rounded-[2rem] transition-all hover:shadow-lg hover:shadow-primary-600/5 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-8 -mt-8"></div>
                                 <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black text-sm">
                                       {u.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                       <h3 className="font-bold text-secondary-900 truncate">{u.name}</h3>
                                       <p className="text-xs text-secondary-500 truncate">{u.email}</p>
                                    </div>
                                 </div>

                                 <div className="relative z-10 flex flex-col gap-3">
                                    <div>
                                       <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest block mb-1.5 ml-1">Access Authority</label>
                                       <select
                                          value={u.role}
                                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                          className="w-full bg-white border border-secondary-200 rounded-xl p-3 text-sm font-bold text-secondary-700 focus:ring-4 focus:ring-primary-500/10 outline-none cursor-pointer hover:border-primary-300 transition-all appearance-none"
                                          disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                       >
                                          <option value="Admin">Admin</option>
                                          <option value="Lab Manager">Lab Manager</option>
                                          <option value="Lab Technician">Lab Technician</option>
                                          <option value="Safety Officer">Safety Officer</option>
                                          <option value="Viewer / Auditor">Viewer / Auditor</option>
                                       </select>
                                    </div>
                                    <div className="flex gap-2">
                                       <button
                                          onClick={async () => {
                                             if (window.confirm(`Reset password for ${u.name}?`)) {

                                                try {
                                                   const { data } = await axios.put(`/api/auth/users/${u._id}/reset-password`);
                                                   alert(`Password Reset!\n\nTemporary Password: ${data.tempPassword}\n\nPlease share this securely with the user.`);
                                                } catch (err) {
                                                   const msg = err.response?.data?.error || "Error resetting password";
                                                   alert(msg);
                                                }
                                             }
                                          }}
                                          className="flex-1 text-[10px] font-bold text-orange-500 hover:text-white hover:bg-orange-500 py-2 rounded-lg border border-orange-500/20 transition-all uppercase tracking-widest"
                                       >
                                          Reset Pass
                                       </button>
                                       <button
                                          onClick={async () => {
                                             const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
                                             if (window.confirm(`${newStatus === 'Inactive' ? 'Suspend' : 'Activate'} user ${u.name}?`)) {
                                                try {
                                                   await axios.put(`/api/auth/users/${u._id}/status`, { status: newStatus });
                                                   fetchData();
                                                } catch (err) {
                                                   alert(err.response?.data?.error || "Error updating status");
                                                }
                                             }
                                          }}
                                          className={`flex-1 text-[10px] font-bold py-2 rounded-lg border transition-all uppercase tracking-widest ${u.status === 'Active'
                                             ? 'text-secondary-400 border-secondary-200 hover:bg-secondary-100'
                                             : 'text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white'
                                             }`}
                                          disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                       >
                                          {u.status === 'Active' ? 'Suspend' : 'Activate'}
                                       </button>
                                       <button
                                          onClick={async () => {
                                             if (window.confirm(`PERMANENTLY DELETE account for ${u.name}?\nThis action cannot be undone.`)) {
                                                try {
                                                   await axios.delete(`/api/auth/users/${u._id}`);
                                                   fetchData();
                                                } catch (err) {
                                                   alert(err.response?.data?.error || "Error deleting user");
                                                }
                                             }
                                          }}
                                          className="flex-1 text-[10px] font-bold text-red-500 hover:text-white hover:bg-red-500 py-2 rounded-lg border border-red-500/20 transition-all uppercase tracking-widest"
                                          disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                       >
                                          Delete
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="bg-white p-8 rounded-[3rem] border border-secondary-100 shadow-xl overflow-hidden">
                     <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-secondary-900">Security event Ledger</h2>
                        <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em]">Latest {auditLogs.length} Events</span>
                     </div>

                     {loading ? (
                        <div className="flex flex-col items-center py-20">
                           <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                           <p className="text-sm font-bold text-secondary-400 uppercase tracking-widest">Scanning Ledger...</p>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {auditLogs.length === 0 && <p className="text-center py-10 text-secondary-500 font-medium">No security events recorded.</p>}
                           {auditLogs.map(log => (
                              <div key={log._id} className="p-5 bg-secondary-50 border border-secondary-100 rounded-2xl group hover:bg-white hover:border-primary-200 transition-all">
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                       <span className={`w-2 h-2 rounded-full ${log.action.includes('CHANGE') ? 'bg-orange-500 shadow-[0_0_8px_#f97316]' : 'bg-primary-500 shadow-[0_0_8px_#3b82f6]'}`}></span>
                                       <span className="text-sm font-black text-secondary-900 uppercase tracking-wide">{log.action.replace(/_/g, ' ')}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-secondary-400 uppercase font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                                 </div>
                                 <p className="text-sm text-secondary-600 font-medium pl-5 mb-3">{log.details}</p>
                                 <div className="flex flex-wrap items-center gap-4 pl-5">
                                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-secondary-100">
                                       <span className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest">Operator</span>
                                       <span className="text-[11px] font-bold text-secondary-700">{log.user_name || 'System'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-secondary-100">
                                       <span className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest">Target</span>
                                       <span className="text-[11px] font-bold text-secondary-700">{log.resource} #{log.resource_id}</span>
                                    </div>
                                    {log.ip_address && (
                                       <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-secondary-100">
                                          <span className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest">IP</span>
                                          <span className="text-[11px] font-mono font-bold text-secondary-700">{log.ip_address}</span>
                                       </div>
                                    )}
                                 </div>
                                 {log.user_agent && (
                                    <div className="mt-3 pl-5 text-[10px] text-secondary-400 font-mono truncate max-w-full opacity-60 italic" title={log.user_agent}>
                                       {log.user_agent}
                                    </div>
                                 )}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </div>

            <div className="space-y-8">
               <div className="bg-secondary-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 blur-[100px] rounded-full"></div>
                  <h2 className="text-xl font-black mb-8 text-white relative z-10">Access Hierarchies</h2>
                  <div className="space-y-6 relative z-10">
                     {[
                        { r: "Admin", d: "Full system authority. Manage roles & audits.", color: "text-red-400 bg-red-400/10" },
                        { r: "Lab Manager", d: "Operations control. Manage stock & approvals.", color: "text-primary-400 bg-primary-400/10" },
                        { r: "Lab Technician", d: "Standard user. Log transactions & requests.", color: "text-green-400 bg-green-400/10" },
                        { r: "Safety Officer", d: "Compliance focus. View hazards & reports.", color: "text-orange-400 bg-orange-400/10" },
                        { r: "Viewer/Auditor", d: "Read-only access to records & analytics.", color: "text-secondary-400 bg-secondary-400/10" },
                     ].map((item, i) => (
                        <div key={i} className="group cursor-default">
                           <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 ${item.color}`}>
                                 {item.r}
                              </span>
                           </div>
                           <p className="text-xs text-secondary-400 font-medium leading-relaxed group-hover:text-white transition-colors">
                              {item.d}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="bg-red-600/10 p-10 rounded-[3rem] border border-red-500/20 shadow-2xl shadow-red-900/10">
                  <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center mb-6">
                     <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <h3 className="text-lg font-black mb-2 text-red-500 uppercase tracking-tight">Danger Zone</h3>
                  <p className="text-secondary-500 text-xs font-medium leading-relaxed mb-6">
                     Remove all registered users and their transaction history immediately. This action is irreversible.
                  </p>
                  <button
                     onClick={async () => {
                        if (window.confirm("CRITICAL WARNING: This will permanently delete ALL users (except you) and all their associated requests/logs. Are you absolutely sure?")) {
                           try {
                              await axios.post('/api/auth/users/wipe-all');
                              alert("System Reset Successful. All other users have been removed.");
                              fetchData();
                           } catch (err) {
                              alert(err.response?.data?.error || "Reset failed");
                           }
                        }
                     }}
                     className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                  >
                     Wipe All Users
                  </button>
               </div>
            </div>
         </div>
      </Layout>
   );
};

export default AdminOnlyPage;
