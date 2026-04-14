import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const [dbStats, setDbStats] = useState({ total: 0, flammables: 0, lowStock: 0, auditScore: 'N/A', expirations: [], storageBreakdown: [], lastAuditAgo: 'Never' });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get('/api/chemicals/stats');
        setDbStats(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchStats();
  }, []);

  // Fetch real requests from API
  useEffect(() => {
    if (hasPermission("approve_request")) {
      fetchRequests();
    } else {
      setRequestsLoading(false);
    }
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get('/api/inventory/requests');
      setPendingRequests(data);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRequestAction = async (id, status) => {
    try {
      await axios.put(`/api/inventory/requests/${id}`, { status });
      fetchRequests(); // Refresh the list
    } catch (err) {
      alert("Error updating request: " + (err.response?.data?.error || err.message));
    }
  };

  // Format relative time (e.g., "2h ago", "3d ago")
  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Fetch real audit logs for Live Activity
  useEffect(() => {
    if (hasPermission("view_audit_logs")) {
      fetchAuditLogs();
    } else {
      setAuditLoading(false);
    }
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data } = await axios.get('/api/audit');
      setAuditLogs(data.slice(0, 6)); // Latest 6 events
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const stats = [
    { label: "Total Chemicals", value: dbStats.total.toString().padStart(3, '0'), sub: "Active Listings", color: "primary", icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" /></svg>
    )},
    { label: "Flammables", value: dbStats.flammables.toString().padStart(3, '0'), sub: "Class 3 Assets", color: "orange", icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.99 7.99 0 01-2.343 5.657z" /></svg>
    )},
    { label: "Critical Stock", value: dbStats.lowStock.toString().padStart(2, '0'), sub: "Reorder Required", color: "red", icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    )},
    { label: "Safety Audit", value: dbStats.auditScore, sub: "Passing Score", color: "green", icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    )},
  ];

  const storageColors = ['bg-orange-500', 'bg-red-500', 'bg-blue-500', 'bg-primary-500'];


  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black heading-font text-secondary-950 tracking-tight leading-none">
              Welcome back, <span className="text-primary-600">{user?.name?.split(' ')[0] || "Guest"}</span>
            </h1>
            {user?.role && (
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-widest rounded-lg border border-primary-200 shadow-sm">
                {user.role}
              </span>
            )}
          </div>
          <p className="text-secondary-500 mt-2 font-medium text-sm">System status is <span className="text-green-600 font-bold">Optimal</span> • Last audit {dbStats.lastAuditAgo}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <button className="bg-white border border-secondary-200 px-4 py-2.5 rounded-2xl text-sm font-bold text-secondary-700 hover:bg-secondary-50 transition-all flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             <span className="hidden sm:inline">Search SDS</span>
           </button>
            {hasPermission("create_chemical") && (
              <Link to="/chemicals" className="bg-secondary-950 text-white px-4 py-2.5 rounded-2xl text-sm font-bold hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-secondary-900/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">New Inventory</span>
              </Link>
            )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-secondary-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700 ${
              stat.color === 'red' ? 'bg-red-500' : 
              stat.color === 'orange' ? 'bg-orange-500' :
              stat.color === 'green' ? 'bg-green-500' : 'bg-primary-500'
            }`}></div>

            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${
              stat.color === 'red' ? 'bg-red-50 text-red-600' : 
              stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
              stat.color === 'green' ? 'bg-green-50 text-green-600' : 'bg-primary-50 text-primary-600'
            }`}>
              {stat.icon}
            </div>
            <div className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="text-3xl font-black text-secondary-900">{stat.value}</div>
            <div className="text-[10px] font-bold text-secondary-500 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Storage Capacity Section */}
          <div className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 border border-secondary-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl sm:text-2xl font-black text-secondary-950 heading-font">Storage Capacity</h2>
               <span className="text-xs font-bold text-primary-600 px-3 py-1 bg-primary-50 rounded-full hidden sm:block">Automated Sensing</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {(dbStats.storageBreakdown || []).length === 0 ? (
                 <div className="col-span-2 text-center py-8">
                   <p className="text-sm font-bold text-secondary-400">No storage locations assigned yet</p>
                   <p className="text-[10px] text-secondary-500 mt-1">Add locations to chemicals to see storage breakdown.</p>
                 </div>
               ) : (dbStats.storageBreakdown || []).map((unit, i) => {
                 const storageList = dbStats.storageBreakdown || [];
                 const maxQty = Math.max(...storageList.map(u => u.totalQty), 1);
                 const fill = Math.round((unit.totalQty / maxQty) * 100);
                 return (
                   <div key={i} className="space-y-3">
                     <div className="flex justify-between text-sm font-bold text-secondary-700">
                       <span className="truncate mr-2">{unit.name}</span>
                       <span className="shrink-0">{unit.count} items • {unit.totalQty} units</span>
                     </div>
                     <div className="h-4 w-full bg-secondary-100 rounded-full overflow-hidden p-1">
                       <div className={`h-full rounded-full transition-all duration-1000 ${storageColors[i % storageColors.length]}`} style={{ width: `${fill}%` }}></div>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>

          {/* Pending Approvals Section — LIVE DATA */}
          {hasPermission("approve_request") && (
            <div className="bg-secondary-950 rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full"></div>
               <div className="flex justify-between items-center mb-6 relative z-10">
                 <h2 className="text-2xl font-black heading-font">Pending Approvals</h2>
                 <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                   {pendingRequests.filter(r => r.status === 'Pending').length} Pending
                 </span>
               </div>

               <div className="space-y-3 relative z-10">
                  {requestsLoading ? (
                    <div className="flex flex-col items-center py-10">
                      <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mb-3"></div>
                      <p className="text-xs font-bold text-secondary-500 uppercase tracking-widest">Loading requests...</p>
                    </div>
                  ) : pendingRequests.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-sm font-bold text-secondary-500">No requests found</p>
                      <p className="text-[10px] text-secondary-600 mt-1">All clear — nothing to review.</p>
                    </div>
                  ) : (
                    pendingRequests.slice(0, 5).map((req) => (
                      <div key={req._id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/10 transition-all group gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">
                              {(req.chemical_name || req.chemical_id || '?')[0].toUpperCase()}
                           </div>
                           <div className="min-w-0">
                              <div className="font-bold text-sm tracking-tight truncate">{req.chemical_name || req.chemical_id}</div>
                              <div className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest mt-0.5">
                                REQ BY {(req.user_name || 'Unknown').toUpperCase()} • {timeAgo(req.created_at)} • QTY: {req.quantity}
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                             req.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                             req.status === 'Rejected' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                           }`}>
                              {req.status}
                           </span>
                           {req.status === 'Pending' && (
                             <>
                               <button
                                 onClick={() => handleRequestAction(req._id, 'Approved')}
                                 className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white flex items-center justify-center transition-all"
                                 title="Approve"
                               >
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                               </button>
                               <button
                                 onClick={() => handleRequestAction(req._id, 'Rejected')}
                                 className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all"
                                 title="Reject"
                               >
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                               </button>
                             </>
                           )}
                           <Link to="/requests" className="p-2 rounded-lg bg-white/5 hover:bg-white text-white hover:text-secondary-950 transition-all opacity-0 group-hover:opacity-100">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                           </Link>
                        </div>
                      </div>
                    ))
                  )}
               </div>
               <Link to="/requests" className="block text-center w-full mt-6 py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-all shadow-xl shadow-primary-600/20 active:scale-[0.98] relative z-10">
                  Go to Request Center
               </Link>
            </div>
          )}

          {/* Inventory Overview Chart */}
          <div className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 border border-secondary-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-secondary-950 heading-font">Inventory Overview</h2>
              <Link to="/chemicals" className="text-primary-600 text-xs font-bold hover:underline">View All →</Link>
            </div>
            <div className="h-64 w-full flex items-end gap-3 pb-2">
              {(dbStats.storageBreakdown || []).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="text-sm text-secondary-500 font-bold mb-2">No storage data</div>
                  <div className="text-[10px] text-secondary-400">Assign locations to chemicals (e.g., 'Cabinet A', 'Shelf B') to populate this overview.</div>
                </div>
              ) : (dbStats.storageBreakdown || []).map((unit, i) => {
                const storageList = dbStats.storageBreakdown || [];
                const maxQty = Math.max(...storageList.map(u => u.totalQty), 1);
                const h = Math.max(Math.round((unit.totalQty / maxQty) * 100), 8);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className={`w-full ${storageColors[i % storageColors.length]}/20 rounded-t-xl group relative cursor-pointer hover:${storageColors[i % storageColors.length]} transition-all`} style={{ height: `${h}%` }}>
                      <div className={`absolute inset-0 rounded-t-xl ${storageColors[i % storageColors.length]} opacity-60 group-hover:opacity-100 transition-opacity`}></div>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                        {unit.totalQty} units • {unit.count} items
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-secondary-400 uppercase tracking-wider text-center leading-tight truncate w-full">{unit.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-8">
           {/* Safety Protocol */}
           <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 text-white shadow-2xl shadow-primary-900/20 border border-primary-500/20">
              <h2 className="text-xl font-black mb-2 heading-font text-white/90">Safety Protocol</h2>
              <p className="text-primary-100 text-sm font-medium leading-relaxed mb-8">All personnel must verify SDS documentation before container opening.</p>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 p-3 bg-white/10 rounded-2xl text-xs font-bold border border-white/5 truncate">
                   <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">⚖️</span>
                   HazMat Guidelines 2026
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-white/10 rounded-2xl text-xs font-bold border border-white/5 truncate">
                   <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">🧪</span>
                   Spill Kit Locations Map
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-white/10 rounded-2xl text-xs font-bold border border-white/5 truncate">
                   <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">🔥</span>
                   Emergency Extraction Plan
                 </div>
              </div>
           </div>

           {/* Expirations — LIVE DATA */}
           <div className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 border border-secondary-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-8 -mt-8"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-secondary-950 heading-font">Expirations</h2>
                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">{dbStats.expirations.length} upcoming</span>
              </div>
              <div className="space-y-5">
                 {(dbStats.expirations || []).length === 0 ? (
                   <div className="text-center py-6">
                     <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                       <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                     </div>
                     <p className="text-sm font-bold text-secondary-500">All clear</p>
                     <p className="text-[10px] text-secondary-400 mt-1">No chemicals expiring within 90 days.</p>
                   </div>
                 ) : (
                   (dbStats.expirations || []).map((item, i) => (
                     <div key={i} className="flex justify-between items-center border-b border-secondary-50 pb-4 last:border-0 last:pb-0">
                        <div>
                          <div className="text-sm font-bold text-secondary-800">{item.name}</div>
                          <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">{item.location}</div>
                        </div>
                        <div className={`text-[10px] font-black px-2 py-1 rounded ${item.days <= 7 ? 'bg-red-50 text-red-600' : item.days <= 30 ? 'bg-orange-50 text-orange-600' : 'bg-secondary-50 text-secondary-600'}`}>
                          {item.days <= 0 ? 'EXPIRED' : `IN ${item.days}D`}
                        </div>
                     </div>
                   ))
                 )}
              </div>
              <Link to="/chemicals" className="w-full mt-6 text-xs font-black text-secondary-400 hover:text-secondary-950 transition-colors uppercase tracking-[0.2em] block text-center">Manage All Expiries</Link>
           </div>

            {hasPermission("view_audit_logs") && (
              <div className="bg-secondary-950 rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 border border-white/5 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-primary-600/10 rounded-full blur-[80px]"></div>
                 <div className="flex justify-between items-center mb-6 relative z-10">
                   <h2 className="text-xl font-black text-white heading-font">Live Activity</h2>
                   <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">{auditLogs.length} Latest</span>
                 </div>
                 <div className="space-y-5 relative z-10">
                   {auditLoading ? (
                     <div className="flex flex-col items-center py-8">
                       <div className="w-7 h-7 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mb-3"></div>
                       <p className="text-xs font-bold text-secondary-500 uppercase tracking-widest">Loading activity...</p>
                     </div>
                   ) : auditLogs.length === 0 ? (
                     <div className="text-center py-8">
                       <p className="text-sm font-bold text-secondary-500">No activity recorded yet</p>
                     </div>
                   ) : (
                     auditLogs.map((log, i) => (
                       <div key={log._id || i} className="flex gap-4">
                         <div className="flex flex-col items-center">
                           <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                           {i < auditLogs.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1"></div>}
                         </div>
                         <div className="pb-4">
                           <div className="text-sm font-semibold text-white leading-tight">
                             {log.user_name || 'System'}
                           </div>
                           <div className="text-xs text-secondary-400 mt-1 leading-snug">
                             {log.action}{log.details ? ` — ${log.details}` : ''}
                           </div>
                           <div className="flex items-center gap-2 mt-1.5">
                             <span className="text-[9px] font-bold text-secondary-500 uppercase tracking-widest">{timeAgo(log.timestamp)}</span>
                             <span className="text-[9px] font-mono text-primary-400/80 bg-primary-900/40 px-1.5 py-0.5 rounded leading-none">{log.action?.split(' ')[0]?.toUpperCase()}</span>
                           </div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
                 <Link to="/audit" className="block text-center w-full mt-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white hover:text-secondary-950 transition-all relative z-10">
                   View All Audit Logs
                 </Link>
              </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
