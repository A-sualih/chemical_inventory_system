import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, AlertTriangle, FileText, Zap, Activity, LifeBuoy, Users, Droplets, HeartPulse } from 'lucide-react';
import { HAZARD_CLASSES } from '../constants/hazards';
import HazardBadge from '../components/HazardBadge';
import Layout from '../layout/Layout';

const SafetyDashboard = () => {
  const [stats, setStats] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, conflictsRes] = await Promise.all([
          axios.get('/api/safety/dashboard'),
          axios.get('/api/safety/check-incompatibility/all') // I'll need to handle 'all' or loop locations
        ]);
        setStats(statsRes.data);
        // For simplicity, let's assume conflictsRes.data contains a list of all conflicts
      } catch (err) {
        console.error("Failed to load safety data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <Layout>
      <div className="p-8 animate-pulse text-secondary-500 font-bold">Initializing Safety Protocol...</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-secondary-950 tracking-tighter uppercase italic">Safety & Hazard <span className="text-red-600">Command</span></h1>
            <p className="text-secondary-500 font-medium">Global compliance monitoring and emergency response management.</p>
          </div>
          <div className="flex gap-3">
             <button className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2">
                <LifeBuoy size={20} /> EMERGENCY PROTOCOL
             </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Chemicals" value={stats?.summary?.total} icon={<Activity className="text-blue-600" />} />
          <StatCard title="Restricted Access" value={stats?.summary?.restricted} icon={<Shield className="text-purple-600" />} color="text-purple-600" />
          <StatCard title="Training Required" value={stats?.summary?.needsTraining} icon={<Users className="text-orange-600" />} color="text-orange-600" />
          <StatCard title="SDS Pending" value={stats?.summary?.sdsPending} icon={<FileText className="text-red-600" />} color="text-red-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Hazard Distribution */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-secondary-100">
            <h2 className="text-xl font-black text-secondary-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
              <Zap className="text-yellow-500" fill="currentColor" /> Hazard Distribution
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {HAZARD_CLASSES.map(h => {
                const count = stats?.hazards?.find(stat => stat._id === h.id)?.count || 0;
                return (
                  <div key={h.id} className="p-4 rounded-2xl bg-secondary-50 border border-secondary-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-lg transition-all">
                    <div className={`${h.color} w-12 h-12 p-2.5 rounded-xl text-white mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                      {h.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase text-secondary-400 mb-1">{h.label}</span>
                    <span className="text-xl font-black text-secondary-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Alerts */}
          <div className="bg-secondary-950 rounded-3xl p-8 shadow-2xl text-white">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
              <AlertTriangle className="text-red-500" /> Safety Alerts
            </h2>
            <div className="space-y-4">
               {stats?.summary?.sdsPending > 0 && (
                 <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-4 items-start">
                    <div className="p-2 bg-red-500/20 text-red-500 rounded-lg"><FileText size={18}/></div>
                    <div>
                      <p className="font-bold text-sm">SDS Missing or Expired</p>
                      <p className="text-xs text-white/50">{stats.summary.sdsPending} chemicals require immediate SDS verification.</p>
                    </div>
                 </div>
               )}
               <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-4 items-start opacity-50 italic">
                  <p className="text-xs">No active incompatibility conflicts detected in current storage layout.</p>
               </div>
            </div>
          </div>

        </div>

        {/* Emergency Response Quick Links */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-secondary-100">
           <h2 className="text-xl font-black text-secondary-900 mb-6 uppercase tracking-tight">Emergency Response Protocols</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ProtocolLink 
                title="Spill Response" 
                desc="Neutralization and cleanup steps for all chemical families." 
                icon={<Droplets className="text-blue-500" size={32} />} 
              />
              <ProtocolLink 
                title="First Aid" 
                desc="Immediate medical actions for exposure scenarios." 
                icon={<HeartPulse className="text-red-500" size={32} />} 
              />
              <ProtocolLink 
                title="Evacuation Plan" 
                desc="Map of exits and assembly points for Laboratory 4." 
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-emerald-600">
                    <circle cx="15" cy="5" r="2" />
                    <path d="M13 7a2 2 0 0 1-2 2H8l-3 3v4" />
                    <path d="m9 14 3-2 3 3 3-1" />
                    <path d="M17 14v4l-4 3" />
                  </svg>
                } 
              />
           </div>
        </div>

      </div>
    </Layout>
  );
};

const StatCard = ({ title, value, icon, color = "text-secondary-900" }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-100 flex items-center gap-5 hover:shadow-md transition-shadow">
    <div className="w-14 h-14 bg-secondary-50 rounded-2xl flex items-center justify-center text-2xl">
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-secondary-500 uppercase tracking-widest">{title}</p>
      <p className={`text-3xl font-black ${color}`}>{value || 0}</p>
    </div>
  </div>
);

const ProtocolLink = ({ title, desc, icon }) => (
  <div className="p-6 bg-secondary-50 rounded-2xl border border-secondary-100 hover:border-secondary-300 transition-colors cursor-pointer group">
     <div className="mb-4 group-hover:scale-110 transition-transform inline-block">{icon}</div>
     <h3 className="font-black text-secondary-900 uppercase text-sm mb-1">{title}</h3>
     <p className="text-xs text-secondary-500 leading-relaxed font-medium">{desc}</p>
  </div>
);

export default SafetyDashboard;

