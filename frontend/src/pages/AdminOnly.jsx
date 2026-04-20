import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";
import axios from "axios";

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
         <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black heading-font text-secondary-900 tracking-tight">{title}</h1>
               <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                  <p className="text-secondary-500 font-medium text-sm">{description}</p>
               </div>
            </div>

            <div className="flex bg-secondary-100 p-1.5 rounded-[1.5rem] border border-secondary-200 shrink-0 shadow-inner">
               <button
                  onClick={() => setActiveTab("roles")}
                  className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all hover:scale-105 active:scale-95 ${activeTab === 'roles' ? 'bg-white text-secondary-900 shadow-xl' : 'text-secondary-500 hover:text-secondary-700'}`}
               >
                  User Roles
               </button>
               <button
                  onClick={() => setActiveTab("audit")}
                  className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all hover:scale-105 active:scale-95 ${activeTab === 'audit' ? 'bg-white text-secondary-900 shadow-xl' : 'text-secondary-500 hover:text-secondary-700'}`}
               >
                  Master Audit
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="lg:col-span-3">
               {activeTab === "roles" ? (
                  <div className="bg-white p-6 sm:p-8 rounded-[2rem] lg:rounded-[3rem] border border-secondary-100 shadow-2xl shadow-secondary-200/20 overflow-hidden">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <h2 className="text-xl font-black text-secondary-900 heading-font">Personnel Directory</h2>
                           <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest mt-0.5">Access Control List</p>
                        </div>
                        <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-100">{users.length} Active Accounts</span>
                     </div>
                     
                     {loading ? (
                        <div className="flex flex-col items-center py-20">
                           <div className="w-14 h-14 border-[6px] border-secondary-50 border-t-primary-600 rounded-full animate-spin mb-6"></div>
                           <p className="text-sm font-black text-secondary-400 uppercase tracking-widest animate-pulse">Synchronizing directory...</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           {users.map(u => (
                              <div key={u._id} className="group p-6 bg-secondary-50/50 hover:bg-white border border-secondary-100 hover:border-primary-200 rounded-[2.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary-600/10 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500"></div>
                                 <div className="flex items-start gap-4 mb-6 relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black text-lg shadow-xl shadow-secondary-900/20 group-hover:rotate-6 transition-transform">
                                       {u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 pt-1">
                                       <h3 className="font-black text-secondary-950 text-base leading-tight truncate">{u.name}</h3>
                                       <p className="text-xs text-secondary-500 font-medium truncate mt-0.5">{u.email}</p>
                                       <div className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${u.status === 'Active' ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                                          {u.status}
                                       </div>
                                    </div>
                                 </div>

                                 <div className="relative z-10 space-y-4">
                                    <div>
                                       <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2 px-1">Authority Level</label>
                                       <div className="relative">
                                          <select
                                             value={u.role}
                                             onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                             className="w-full bg-white border-2 border-secondary-100 rounded-2xl p-4 text-xs font-black text-secondary-700 focus:border-primary-500 focus:ring-0 outline-none cursor-pointer transition-all appearance-none shadow-sm"
                                             disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                          >
                                             <option value="Admin">System Administrator</option>
                                             <option value="Lab Manager">Operations Manager</option>
                                             <option value="Lab Technician">Lab Technician</option>
                                             <option value="Safety Officer">Safety Officer</option>
                                             <option value="Viewer / Auditor">External Auditor</option>
                                          </select>
                                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-400">
                                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-2">
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
                                          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-orange-100 bg-orange-50/30 text-orange-600 hover:bg-orange-500 hover:text-white transition-all group/btn active:scale-95"
                                       >
                                          <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                          <span className="text-[8px] font-black uppercase tracking-tighter">Reset</span>
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
                                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${u.status === 'Active'
                                             ? 'border-secondary-100 bg-secondary-50 text-secondary-500 hover:bg-secondary-900 hover:text-white'
                                             : 'border-green-100 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'}`}
                                          disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                       >
                                           <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={u.status === 'Active' ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                                          <span className="text-[8px] font-black uppercase tracking-tighter">{u.status === 'Active' ? 'Suspend' : 'Verify'}</span>
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
                                          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-red-100 bg-red-50/30 text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                                          disabled={u.email === 'chemicalinventorysystem@gmail.com'}
                                       >
                                           <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          <span className="text-[8px] font-black uppercase tracking-tighter">Scrub</span>
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="bg-white p-6 sm:p-8 rounded-[2rem] lg:rounded-[3rem] border border-secondary-100 shadow-2xl shadow-secondary-200/20 overflow-hidden">
                     <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
                        <div>
                           <h2 className="text-2xl font-black text-secondary-900 heading-font leading-none">Security Ledger</h2>
                           <div className="flex items-center gap-2 mt-2">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                              <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none">Immutable Audit Chain • {totalLogs} Events</span>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex flex-wrap items-center gap-3">
                           <div className="relative group flex-grow xl:max-w-xs">
                              <input 
                                 type="text" 
                                 placeholder="Search operator..." 
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 onKeyDown={handleSearch}
                                 className="pl-10 pr-4 py-3 bg-secondary-50 border-2 border-secondary-100 rounded-2xl text-[11px] font-black focus:border-primary-500 focus:bg-white outline-none w-full transition-all"
                              />
                              <svg className="w-4 h-4 text-secondary-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                           </div>
                           <select 
                              value={filterAction}
                              onChange={(e) => setFilterAction(e.target.value)}
                              className="px-4 py-3 bg-secondary-50 border-2 border-secondary-100 rounded-2xl text-[10px] font-black uppercase tracking-wider focus:border-primary-500 outline-none cursor-pointer transition-all"
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
                              className="px-4 py-3 bg-secondary-50 border-2 border-secondary-100 rounded-2xl text-[10px] font-black uppercase tracking-wider focus:border-primary-500 outline-none cursor-pointer transition-all"
                           >
                              <option value="">Entity: All</option>
                              <option value="chemical">Chemicals</option>
                              <option value="stock">Stock</option>
                              <option value="request">Requests</option>
                              <option value="user">Human Assets</option>
                           </select>
                           <button 
                              onClick={() => { setPage(1); fetchData(); }}
                              className="p-3 bg-secondary-900 text-white rounded-2xl hover:bg-primary-600 transition-all active:scale-90"
                           >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                           </button>
                        </div>
                     </div>

                     {loading ? (
                        <div className="flex flex-col items-center py-24">
                           <div className="relative">
                              <div className="w-16 h-16 border-[6px] border-secondary-50 border-t-primary-600 rounded-full animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <svg className="w-6 h-6 text-primary-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                              </div>
                           </div>
                           <p className="text-xs font-black text-secondary-400 uppercase tracking-[0.3em] mt-8 animate-pulse">Analyzing cryptographic chain...</p>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {auditLogs.length === 0 && (
                              <div className="py-24 text-center">
                                 <div className="w-20 h-20 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-6 opacity-40">
                                    <svg className="w-10 h-10 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                 </div>
                                 <p className="text-secondary-900 font-black text-xl heading-font">No match discovered</p>
                                 <p className="text-secondary-400 font-bold uppercase tracking-widest text-[10px] mt-1">Refine your search parameters</p>
                              </div>
                           )}
                           {auditLogs.map(log => (
                              <div 
                                 key={log._id || Math.random()} 
                                 className={`p-6 bg-secondary-50/30 border border-secondary-100 rounded-[2.5rem] group hover:bg-white hover:border-primary-200 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-600/5 ${selectedLog === log._id ? 'ring-2 ring-primary-500 border-transparent shadow-2xl' : ''}`}
                                 onClick={() => setSelectedLog(selectedLog === log._id ? null : log._id)}
                              >
                                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                                          log.action === 'CREATE' ? 'bg-green-500/10 text-green-600 shadow-green-500/5' :
                                          log.action === 'DELETE' ? 'bg-red-500/10 text-red-600 shadow-red-500/5' :
                                          log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-600 shadow-blue-500/5' :
                                          'bg-secondary-900 text-white shadow-secondary-900/10'
                                       }`}>
                                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             {log.action === 'CREATE' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />}
                                             {log.action === 'UPDATE' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                                             {log.action === 'DELETE' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                                             {!['CREATE', 'UPDATE', 'DELETE'].includes(log.action) && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />}
                                          </svg>
                                       </div>
                                       <div>
                                          <div className="flex items-center gap-2">
                                             <span className="text-xs font-black text-secondary-950 uppercase tracking-wider">{log.action.replace(/_/g, ' ')}</span>
                                             {log.metadata?.status === 'failed' && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-widest border border-red-200">Failure</span>
                                             )}
                                          </div>
                                          <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                                       </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-2">
                                       <span className="px-3 py-1.5 bg-white border border-secondary-100 rounded-xl text-[10px] font-black text-primary-600 uppercase tracking-tight shadow-sm">
                                          Target: {log.target?.type || log.resource}
                                       </span>
                                       <span className="px-3 py-1.5 bg-white border border-secondary-100 rounded-xl text-[10px] font-black text-secondary-600 uppercase tracking-tight shadow-sm">
                                          ID: {log.target?.id || log.resource_id}
                                       </span>
                                    </div>
                                 </div>
                                 
                                 <div className="pl-0 md:pl-16">
                                    <h4 className="text-sm font-bold text-secondary-900 leading-relaxed mb-4">{log.details}</h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                       <div className="p-3 bg-white border border-secondary-100 rounded-2xl flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-secondary-950 text-white flex items-center justify-center font-black text-[10px]">
                                             {(log.user?.name || log.user_name || '?')[0].toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                             <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Human Asset</p>
                                             <p className="text-[11px] font-black text-secondary-900 truncate">{log.user?.name || log.user_name || 'System Auto'}</p>
                                          </div>
                                       </div>
                                       <div className="p-3 bg-white border border-secondary-100 rounded-2xl flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4" /></svg>
                                          </div>
                                          <div>
                                             <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Access Role</p>
                                             <p className="text-[11px] font-black text-secondary-900">{log.user?.role || 'N/A'}</p>
                                          </div>
                                       </div>
                                       <div className="p-3 bg-white border border-secondary-100 rounded-2xl flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                          </div>
                                          <div className="min-w-0">
                                             <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Network Trace</p>
                                             <p className="text-[11px] font-mono font-black text-secondary-900 truncate">{log.metadata?.ip || log.ip_address || '—'}</p>
                                          </div>
                                       </div>
                                    </div>

                                    {selectedLog === log._id && renderChanges(log.changes)}

                                    {log.metadata?.userAgent && (
                                       <div className="mt-5 p-3 bg-secondary-50/50 rounded-xl text-[9px] font-mono text-secondary-400 truncate opacity-60 flex items-center gap-2">
                                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                          {log.metadata.userAgent}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))}

                           {/* Pagination */}
                           {totalLogs > 20 && (
                              <div className="pt-8 flex items-center justify-between">
                                 <button 
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-6 py-3 rounded-2xl bg-secondary-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all shadow-xl shadow-secondary-900/20"
                                 >
                                    Previous
                                 </button>
                                 <span className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em]">Page {page} of {Math.ceil(totalLogs / 20)}</span>
                                 <button 
                                    disabled={page * 20 >= totalLogs}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-6 py-3 rounded-2xl bg-secondary-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all shadow-xl shadow-secondary-900/20"
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

            <div className="space-y-6 sm:space-y-8">
               <div className="bg-secondary-950 p-6 sm:p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3.3rem] text-white shadow-3xl shadow-secondary-900/40 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 blur-[100px] rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="relative z-10">
                     <h2 className="text-xl font-black mb-10 text-white flex items-center gap-3">
                        <span className="w-2 h-8 bg-primary-500 rounded-full"></span>
                        Access Authority
                     </h2>
                     <div className="space-y-8">
                        {[
                           { r: "Admin", d: "Highest authority. Total system control and audit review.", color: "text-red-400" },
                           { r: "Lab Manager", d: "Operations head. Stock management and request approval.", color: "text-primary-400" },
                           { r: "Lab Technician", d: "Frontline scientist. Record transactions and requests.", color: "text-green-400" },
                           { r: "Safety Officer", d: "Compliance lead. Risk assessment and reporting.", color: "text-orange-400" },
                           { r: "External Auditor", d: "Restricted read-only access for compliance checks.", color: "text-secondary-400" },
                        ].map((item, i) => (
                           <div key={i} className="group cursor-default border-l border-white/5 pl-4 hover:border-primary-500 transition-colors">
                              <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${item.color}`}>{item.r}</h4>
                              <p className="text-xs text-secondary-400 font-medium leading-relaxed group-hover:text-white transition-colors">
                                 {item.d}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="mt-12 relative z-10 p-5 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                     <p className="text-[9px] font-black text-secondary-500 uppercase tracking-widest mb-2 px-1">Security Enforcement</p>
                     <p className="text-[11px] text-secondary-300 font-medium italic leading-relaxed">"All role modifications and critical events are sealed in the audit chain for compliance verification."</p>
                  </div>
               </div>

               <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3.3rem] border border-red-100 shadow-2xl shadow-red-600/5 group">
                  <div className="w-14 h-14 bg-red-600 text-white rounded-[1.3rem] flex items-center justify-center mb-8 shadow-xl shadow-red-600/20 group-hover:rotate-[15deg] transition-transform">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <h3 className="text-xl font-black mb-3 text-secondary-950 heading-font uppercase tracking-tight">System Purge</h3>
                  <p className="text-secondary-500 text-xs font-semibold leading-relaxed mb-8">
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
                     className="w-full bg-secondary-950 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-red-600 active:scale-95 transition-all"
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
