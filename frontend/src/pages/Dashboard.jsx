import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const [dbStats, setDbStats] = useState({ total: 0, flammables: 0, lowStock: 0, auditScore: "94%" });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get('/api/chemicals/stats');
        setDbStats(data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchStats();
  }, []);

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

  const storageUnits = [
    { name: "Flammable Cabinet A", fill: 85, color: "bg-orange-500" },
    { name: "Acid Storage B-1", fill: 42, color: "bg-red-500" },
    { name: "Cold Storage Room", fill: 68, color: "bg-blue-500" },
    { name: "General Shelf C-4", fill: 92, color: "bg-primary-500" },
  ];

  const recentRequests = [
    { id: "REQ-01", user: "Ahmed Sualih", item: "Ethanol (ACS)", status: "Approved", time: "2h ago" },
    { id: "REQ-02", user: "Dr. Sarah", item: "Hydrochloric Acid", status: "Pending", time: "5h ago" },
    { id: "REQ-03", user: "Kevin M.", item: "Methanol 500ml", status: "Denied", time: "1d ago" },
  ];

  const recentActivity = [
    { user: "Ahmed Sualih", action: "Approved request for Acetone", time: "14 mins ago", code: "REQ-0932" },
    { user: "Amir Mesfin", action: "Updated storage location for HCl", time: "2 hours ago", code: "LOC-4412" },
    { user: "Abu mahi", action: "Automated stock alert: Sulfuric Acid", time: "5 hours ago", code: "ALT-0012" },
    { user: "Tesegazeab", action: "New chemical registered: KMnO4", time: "Yesterday", code: "REG-8821" },
  ];

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black heading-font text-secondary-950 tracking-tight leading-none">
              Welcome back, <span className="text-primary-600">{user?.name?.split(' ')[0] || "Guest"}</span>
            </h1>
            {user?.role && (
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-widest rounded-lg border border-primary-200 shadow-sm mt-1">
                {user.role}
              </span>
            )}
          </div>
          <p className="text-secondary-500 mt-2 font-medium">System status is <span className="text-green-600 font-bold">Optimal</span> • Last audit 14h ago</p>
        </div>
        
        <div className="flex gap-3">
           <button className="bg-white border border-secondary-200 px-5 py-2.5 rounded-2xl text-sm font-bold text-secondary-700 hover:bg-secondary-50 transition-all flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             Search SDS
           </button>
            {hasPermission("chemicals:create") && (
              <Link to="/chemicals" className="bg-secondary-950 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-secondary-900/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                New Inventory
              </Link>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-secondary-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Storage Capacity Section */}
          <div className="bg-white rounded-[3rem] p-10 border border-secondary-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-black text-secondary-950 heading-font">Storage Capacity</h2>
               <span className="text-xs font-bold text-primary-600 px-3 py-1 bg-primary-50 rounded-full">Automated Sensing</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {storageUnits.map((unit, i) => (
                 <div key={i} className="space-y-3">
                    <div className="flex justify-between text-sm font-bold text-secondary-700">
                      <span>{unit.name}</span>
                      <span>{unit.fill}%</span>
                    </div>
                    <div className="h-4 w-full bg-secondary-100 rounded-full overflow-hidden p-1">
                      <div className={`h-full rounded-full transition-all duration-1000 ${unit.color}`} style={{ width: `${unit.fill}%` }}></div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Pending Approvals Section */}
          {hasPermission("requests:approve") && (
            <div className="bg-secondary-950 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full"></div>
               <h2 className="text-2xl font-black mb-8 heading-font relative z-10">Pending Approvals</h2>
               <div className="space-y-4 relative z-10">
                  {recentRequests.map((req, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm">
                            {req.item[0]}
                         </div>
                         <div>
                            <div className="font-bold text-sm tracking-tight">{req.item}</div>
                            <div className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest mt-0.5">REQ BY {req.user.toUpperCase()} • {req.time}</div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                           req.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                           req.status === 'Denied' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                         }`}>
                            {req.status}
                         </span>
                         <Link to="/requests" className="p-2 rounded-lg bg-white/5 hover:bg-white text-white hover:text-secondary-950 transition-all opacity-0 group-hover:opacity-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                         </Link>
                      </div>
                    </div>
                  ))}
               </div>
               <Link to="/requests" className="block text-center w-full mt-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-all shadow-xl shadow-primary-600/20 active:scale-[0.98]">
                  Go to Request Center
               </Link>
            </div>
          )}

          {/* Inventory Trend (Local) */}
          <div className="bg-white rounded-[3rem] p-10 border border-secondary-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-secondary-950 heading-font">Inventory Trend</h2>
              <button className="text-primary-600 text-xs font-bold hover:underline">Full Analytics →</button>
            </div>
            <div className="h-64 w-full flex items-end gap-2 pb-2">
              {[40, 65, 45, 90, 65, 45, 75, 55, 80, 45, 90, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-primary-100/50 rounded-t-xl group relative cursor-pointer hover:bg-primary-500 transition-all" style={{ height: `${h}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                    {h} Units
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 text-[10px] font-bold text-secondary-400 uppercase tracking-widest border-t border-secondary-50">
              <span>April 01</span>
              <span>April 15</span>
              <span>April 30</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
           {/* Safety Protocol */}
           <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[3rem] p-10 text-white shadow-2xl shadow-primary-900/20 border border-primary-500/20">
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

           {/* Expirations */}
           <div className="bg-white rounded-[3rem] p-10 border border-secondary-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-8 -mt-8"></div>
              <h2 className="text-xl font-black text-secondary-950 mb-6 heading-font">Expirations</h2>
              <div className="space-y-5">
                 {[
                   { name: "Silver Nitrate", days: 3, cat: "Reactive" },
                   { name: "Dichloromethane", days: 12, cat: "Solvent" },
                   { name: "Sodium Azide", days: 14, cat: "Toxic" },
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center border-b border-secondary-50 pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="text-sm font-bold text-secondary-800">{item.name}</div>
                        <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">{item.cat}</div>
                      </div>
                      <div className={`text-[10px] font-black px-2 py-1 rounded ${item.days <= 3 ? 'bg-red-50 text-red-600' : 'bg-secondary-50 text-secondary-600'}`}>
                        IN {item.days}D
                      </div>
                   </div>
                 ))}
              </div>
              <button className="w-full mt-8 text-xs font-black text-secondary-400 hover:text-secondary-950 transition-colors uppercase tracking-[0.2em]">Manage All Expiries</button>
           </div>

            {hasPermission("audit:view") && (
              <div className="bg-secondary-950 rounded-[3rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-primary-600/10 rounded-full blur-[80px]"></div>
                 <h2 className="text-xl font-black text-white mb-6 heading-font relative z-10">Live Activity</h2>
                 <div className="space-y-6 relative z-10">
                   {recentActivity.map((activity, i) => (
                     <div key={i} className="flex gap-4">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                       <div>
                         <div className="text-sm font-semibold text-white leading-tight">
                           {activity.user}
                         </div>
                         <div className="text-xs text-secondary-400 mt-1 leading-snug">
                           {activity.action}
                         </div>
                         <div className="flex items-center gap-2 mt-1.5">
                           <span className="text-[9px] font-bold text-secondary-500 uppercase tracking-widest">{activity.time}</span>
                           <span className="text-[9px] font-mono text-primary-400/80 bg-primary-900/40 px-1.5 py-0.5 rounded leading-none">{activity.code}</span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
                 <Link to="/inventory" className="block text-center w-full mt-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white hover:text-secondary-950 transition-all">
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
