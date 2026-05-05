import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield, AlertTriangle, FileText, Zap, Activity, LifeBuoy,
  Users, Droplets, HeartPulse, CheckCircle2, XCircle, ChevronDown,
  ChevronUp, MapPin, FlaskConical, BookOpen, AlertOctagon, TrendingUp
} from 'lucide-react';
import { HAZARD_CLASSES } from '../../constants/hazards';
import HazardBadge from '../../components/feedback/HazardBadge';
import Layout from '../../layout/Layout';

/* ─────────────────────────────────────────────
   Helper sub-components
───────────────────────────────────────────── */

const StatCard = ({ title, value, icon, color = 'text-secondary-900', bg = 'bg-white' }) => (
  <div className={`${bg} p-6 rounded-3xl shadow-sm border border-secondary-100 flex items-center gap-5 hover:shadow-md transition-all group`}>
    <div className="w-14 h-14 bg-secondary-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-secondary-500 uppercase tracking-widest">{title}</p>
      <p className={`text-3xl font-black ${color}`}>{value ?? 0}</p>
    </div>
  </div>
);

const SeverityBadge = ({ severity }) => {
  const map = {
    Critical: 'bg-red-100 text-red-700 border-red-200',
    High:     'bg-orange-100 text-orange-700 border-orange-200',
    Medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low:      'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${map[severity] || map.Low}`}>
      {severity}
    </span>
  );
};

const RiskBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-secondary-600 uppercase tracking-wide">{label}</span>
        <span className="text-xs font-black text-secondary-900">{count} <span className="font-medium text-secondary-400">({pct}%)</span></span>
      </div>
      <div className="h-2.5 bg-secondary-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const ProtocolLink = ({ title, desc, icon }) => (
  <div className="p-6 bg-secondary-50 rounded-2xl border border-secondary-100 hover:border-secondary-300 hover:shadow-md transition-all cursor-pointer group">
    <div className="mb-4 group-hover:scale-110 transition-transform inline-block">{icon}</div>
    <h3 className="font-black text-secondary-900 uppercase text-sm mb-1">{title}</h3>
    <p className="text-xs text-secondary-500 leading-relaxed font-medium">{desc}</p>
  </div>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */

const SafetyDashboard = () => {
  const [stats, setStats] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedConflicts, setExpandedConflicts] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, conflictsRes, matrixRes] = await Promise.all([
          axios.get('/api/safety/dashboard'),
          axios.get('/api/safety/incompatibility/global'),
          axios.get('/api/safety/matrix'),
        ]);
        setStats(statsRes.data);
        setConflicts(conflictsRes.data?.conflicts || []);
        setMatrix(matrixRes.data || []);
      } catch (err) {
        console.error('Failed to load safety data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ── Derived values ── */
  const riskLevels = ['Low', 'Medium', 'High', 'Extreme'];
  const riskColors = {
    Low: 'bg-green-500',
    Medium: 'bg-yellow-500',
    High: 'bg-orange-500',
    Extreme: 'bg-red-600',
  };
  const totalRisk = stats?.risks?.reduce((s, r) => s + r.count, 0) || 0;

  const criticalConflicts = conflicts.filter(c => c.severity === 'Critical');
  const displayedConflicts = expandedConflicts ? conflicts : conflicts.slice(0, 4);

  /* ── Loading state ── */
  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
        <p className="text-secondary-500 font-bold tracking-widest uppercase text-xs animate-pulse">
          Initializing Safety Protocol...
        </p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-secondary-950 tracking-tighter uppercase italic">
              Safety &amp; Hazard <span className="text-red-600">Command</span>
            </h1>
            <p className="text-secondary-500 font-medium mt-1">
              Global compliance monitoring, storage safety, and emergency response management.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2">
              <LifeBuoy size={20} /> EMERGENCY PROTOCOL
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Chemicals"
            value={stats?.summary?.total}
            icon={<Activity className="text-blue-600" />}
          />
          <StatCard
            title="Restricted Access"
            value={stats?.summary?.restricted}
            icon={<Shield className="text-purple-600" />}
            color="text-purple-700"
          />
          <StatCard
            title="Training Required"
            value={stats?.summary?.needsTraining}
            icon={<Users className="text-orange-600" />}
            color="text-orange-700"
          />
          <StatCard
            title="SDS Pending"
            value={stats?.summary?.sdsPending}
            icon={<FileText className="text-red-600" />}
            color="text-red-700"
          />
        </div>

        {/* ── Row: Hazard Distribution + Risk Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Hazard Distribution */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-secondary-100">
            <h2 className="text-xl font-black text-secondary-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
              <Zap className="text-yellow-500" fill="currentColor" /> GHS Hazard Distribution
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {HAZARD_CLASSES.map(h => {
                const count = stats?.hazards?.find(s => s._id === h.id)?.count || 0;
                return (
                  <div
                    key={h.id}
                    className="p-4 rounded-2xl bg-secondary-50 border border-secondary-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-lg transition-all cursor-default"
                  >
                    <div className={`${h.color} w-11 h-11 p-2 rounded-xl text-white mb-2.5 shadow-md group-hover:scale-110 transition-transform`}>
                      {h.icon}
                    </div>
                    <span className="text-[9px] font-black uppercase text-secondary-400 mb-0.5 leading-tight">{h.label}</span>
                    <span className={`text-xl font-black ${count > 0 ? 'text-secondary-900' : 'text-secondary-300'}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Level Breakdown */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-secondary-100 flex flex-col">
            <h2 className="text-xl font-black text-secondary-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
              <TrendingUp className="text-blue-600" /> Risk Profile
            </h2>
            <div className="space-y-5 flex-1">
              {riskLevels.map(level => {
                const count = stats?.risks?.find(r => r._id === level)?.count || 0;
                return (
                  <RiskBar
                    key={level}
                    label={level}
                    count={count}
                    total={totalRisk}
                    color={riskColors[level]}
                  />
                );
              })}
            </div>
            <div className="mt-6 pt-5 border-t border-secondary-100 text-center">
              <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Total Assessed</p>
              <p className="text-3xl font-black text-secondary-900">{totalRisk}</p>
            </div>
          </div>
        </div>

        {/* ── Row: Incompatibility Conflicts + Safety Alerts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Incompatibility Conflicts */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-secondary-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-secondary-900 flex items-center gap-2 uppercase tracking-tight">
                <AlertOctagon className="text-orange-500" /> Storage Conflicts
              </h2>
              {conflicts.length > 0 && (
                <span className="bg-orange-100 text-orange-700 border border-orange-200 text-xs font-black px-3 py-1 rounded-full">
                  {conflicts.length} Detected
                </span>
              )}
            </div>

            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="text-green-500" size={32} />
                </div>
                <p className="font-black text-secondary-900 text-lg">All Clear</p>
                <p className="text-sm text-secondary-400 font-medium">No incompatible chemicals detected in any storage location.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedConflicts.map((c, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border flex gap-4 items-start ${
                      c.severity === 'Critical'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${c.severity === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                      <XCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-sm text-secondary-900 truncate">
                          {c.chemicals[0]} ↔ {c.chemicals[1]}
                        </span>
                        <SeverityBadge severity={c.severity} />
                      </div>
                      <p className="text-xs text-secondary-500 font-medium">{c.reason}</p>
                      <div className="flex items-center gap-1 mt-1.5 text-secondary-400">
                        <MapPin size={11} />
                        <span className="text-[11px] font-bold">{c.location}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {conflicts.length > 4 && (
                  <button
                    onClick={() => setExpandedConflicts(v => !v)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-black text-secondary-500 hover:text-secondary-900 uppercase tracking-wide py-2 transition-colors"
                  >
                    {expandedConflicts
                      ? <><ChevronUp size={14} /> Show Less</>
                      : <><ChevronDown size={14} /> Show {conflicts.length - 4} More</>
                    }
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Safety Alerts */}
          <div className="bg-secondary-950 rounded-3xl p-8 shadow-2xl text-white flex flex-col">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
              <AlertTriangle className="text-red-500" /> Safety Alerts
            </h2>
            <div className="space-y-3 flex-1">

              {stats?.summary?.sdsPending > 0 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3 items-start">
                  <div className="p-2 bg-red-500/20 text-red-400 rounded-lg shrink-0"><FileText size={16} /></div>
                  <div>
                    <p className="font-black text-sm">SDS Missing / Pending</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                      {stats.summary.sdsPending} chemical{stats.summary.sdsPending > 1 ? 's' : ''} require SDS verification.
                    </p>
                  </div>
                </div>
              )}

              {stats?.summary?.needsTraining > 0 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3 items-start">
                  <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg shrink-0"><Users size={16} /></div>
                  <div>
                    <p className="font-black text-sm">Training Required</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                      {stats.summary.needsTraining} chemical{stats.summary.needsTraining > 1 ? 's' : ''} mandate handling training before use.
                    </p>
                  </div>
                </div>
              )}

              {criticalConflicts.length > 0 && (
                <div className="p-4 bg-white/5 border border-red-500/30 rounded-2xl flex gap-3 items-start">
                  <div className="p-2 bg-red-500/20 text-red-400 rounded-lg shrink-0"><AlertOctagon size={16} /></div>
                  <div>
                    <p className="font-black text-sm text-red-400">Critical Storage Conflict</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                      {criticalConflicts.length} critical incompatibilit{criticalConflicts.length > 1 ? 'ies' : 'y'} found in current storage layout.
                    </p>
                  </div>
                </div>
              )}

              {stats?.summary?.restricted > 0 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3 items-start">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg shrink-0"><Shield size={16} /></div>
                  <div>
                    <p className="font-black text-sm">Restricted Access</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                      {stats.summary.restricted} chemical{stats.summary.restricted > 1 ? 's' : ''} have restricted access controls active.
                    </p>
                  </div>
                </div>
              )}

              {/* All clear fallback */}
              {!stats?.summary?.sdsPending &&
               !stats?.summary?.needsTraining &&
               !criticalConflicts.length &&
               !stats?.summary?.restricted && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3 items-center">
                  <CheckCircle2 className="text-green-400 shrink-0" size={20} />
                  <p className="text-xs text-white/60 font-medium">No active safety alerts. All systems nominal.</p>
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${conflicts.length > 0 || stats?.summary?.sdsPending > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
                {conflicts.length > 0 || stats?.summary?.sdsPending > 0 ? 'Attention Required' : 'System Nominal'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Incompatibility Matrix ── */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-secondary-100">
          <h2 className="text-xl font-black text-secondary-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
            <FlaskConical className="text-blue-600" /> Chemical Family Incompatibility Matrix
          </h2>
          {matrix.length === 0 ? (
            <p className="text-secondary-400 text-sm font-medium">Matrix data unavailable.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-black text-secondary-500 uppercase tracking-widest pb-4 pr-6 whitespace-nowrap">
                      Chemical Family
                    </th>
                    <th className="text-left text-xs font-black text-secondary-500 uppercase tracking-widest pb-4">
                      Incompatible With
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {matrix.map((row, i) => (
                    <tr key={i} className="group hover:bg-secondary-50 transition-colors">
                      <td className="py-4 pr-6 font-black text-secondary-900 whitespace-nowrap">
                        {row.family}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          {row.incompatibleWith.map((item, j) => (
                            <span
                              key={j}
                              className="text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Emergency Response Protocols ── */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-secondary-100">
          <h2 className="text-xl font-black text-secondary-900 mb-6 uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="text-emerald-600" /> Emergency Response Protocols
          </h2>
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
              desc="Map of exits and assembly points for all laboratory zones."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-emerald-600">
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

export default SafetyDashboard;
