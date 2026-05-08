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
import '../../styles/SafetyDashboard.css';

/* ─────────────────────────────────────────────
   Helper sub-components
───────────────────────────────────────────── */

const StatCard = ({ title, value, icon, color = 'text-secondary-900', bg = 'bg-white' }) => (
  <div className="stat-card" style={{ backgroundColor: bg.includes('bg-') ? '' : bg }}>
    <div className="stat-card-icon">
      {icon}
    </div>
    <div>
      <p className="stat-card-label">{title}</p>
      <p className="stat-card-value" style={{ color: color.includes('text-') ? `var(--${color.replace('text-', '')})` : color }}>{value ?? 0}</p>
    </div>
  </div>
);

const SeverityBadge = ({ severity }) => {
  return (
    <span className={`severity-badge sev-${severity}`}>
      {severity}
    </span>
  );
};

const RiskBar = ({ label, count, total, fillColor }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="risk-bar-container">
      <div className="risk-bar-header">
        <span className="risk-label">{label}</span>
        <span className="risk-stats">{count} <span className="risk-pct">({pct}%)</span></span>
      </div>
      <div className="risk-track">
        <div
          className="risk-fill"
          style={{ width: `${pct}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
};

const ProtocolLink = ({ title, desc, icon }) => (
  <div className="protocol-card">
    <div className="protocol-icon">{icon}</div>
    <h3 className="protocol-title">{title}</h3>
    <p className="protocol-desc">{desc}</p>
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
    Low: '#22c55e',
    Medium: '#eab308',
    High: '#f97316',
    Extreme: '#dc2626',
  };
  const totalRisk = stats?.risks?.reduce((s, r) => s + r.count, 0) || 0;

  const criticalConflicts = conflicts.filter(c => c.severity === 'Critical');
  const displayedConflicts = expandedConflicts ? conflicts : conflicts.slice(0, 4);

  /* ── Loading state ── */
  if (loading) return (
    <Layout>
      <div className="loading-view">
        <div className="spinner-danger" />
        <p className="loading-text-danger">
          Initializing Safety Protocol...
        </p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="safety-dashboard-container">

        {/* ── Header ── */}
        <div className="safety-header">
          <div>
            <h1 className="safety-title">
              Safety &amp; Hazard <span>Command</span>
            </h1>
            <p className="safety-subtitle">
              Global compliance monitoring, storage safety, and emergency response management.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="emergency-btn">
              <LifeBuoy size={20} /> EMERGENCY PROTOCOL
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="stat-cards-grid">
          <StatCard
            title="Total Chemicals"
            value={stats?.summary?.total}
            icon={<Activity style={{ color: '#2563eb' }} />}
            color="var(--secondary-900)"
          />
          <StatCard
            title="Restricted Access"
            value={stats?.summary?.restricted}
            icon={<Shield style={{ color: '#9333ea' }} />}
            color="#7e22ce"
          />
          <StatCard
            title="Training Required"
            value={stats?.summary?.needsTraining}
            icon={<Users style={{ color: '#ea580c' }} />}
            color="#c2410c"
          />
          <StatCard
            title="SDS Pending"
            value={stats?.summary?.sdsPending}
            icon={<FileText style={{ color: '#dc2626' }} />}
            color="#b91c1c"
          />
        </div>

        {/* ── Row: Hazard Distribution + Risk Breakdown ── */}
        <div className="two-col-grid">

          {/* Hazard Distribution */}
          <div className="col-span-2 dashboard-panel">
            <h2 className="panel-title">
              <Zap style={{ color: '#eab308' }} fill="currentColor" /> GHS Hazard Distribution
            </h2>
            <div className="hazard-grid">
              {HAZARD_CLASSES.map(h => {
                const count = stats?.hazards?.find(s => s._id === h.id)?.count || 0;
                return (
                  <div key={h.id} className="hazard-item">
                    <div className={`hazard-icon-wrapper ${h.color}`} style={{ color: 'white' }}>
                      {h.icon}
                    </div>
                    <span className="hazard-label">{h.label}</span>
                    <span className={`hazard-count ${count > 0 ? 'hazard-count-active' : 'hazard-count-inactive'}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Level Breakdown */}
          <div className="dashboard-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="panel-title">
              <TrendingUp style={{ color: '#2563eb' }} /> Risk Profile
            </h2>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {riskLevels.map(level => {
                const count = stats?.risks?.find(r => r._id === level)?.count || 0;
                return (
                  <RiskBar
                    key={level}
                    label={level}
                    count={count}
                    total={totalRisk}
                    fillColor={riskColors[level]}
                  />
                );
              })}
            </div>
            <div className="risk-total-box">
              <p className="total-label">Total Assessed</p>
              <p className="total-value">{totalRisk}</p>
            </div>
          </div>
        </div>

        {/* ── Row: Incompatibility Conflicts + Safety Alerts ── */}
        <div className="two-col-grid">

          {/* Incompatibility Conflicts */}
          <div className="col-span-2 dashboard-panel">
            <div className="conflict-header-flex">
              <h2 className="panel-title" style={{ marginBottom: 0 }}>
                <AlertOctagon style={{ color: '#f97316' }} /> Storage Conflicts
              </h2>
              {conflicts.length > 0 && (
                <span className="conflict-badge">
                  {conflicts.length} Detected
                </span>
              )}
            </div>

            {conflicts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0', textAlign: 'center', gap: '0.75rem' }}>
                <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 style={{ color: '#22c55e' }} size={32} />
                </div>
                <p style={{ fontWeight: 900, color: 'var(--secondary-900)', fontSize: '1.125rem' }}>All Clear</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--secondary-400)', fontWeight: 500 }}>No incompatible chemicals detected in any storage location.</p>
              </div>
            ) : (
              <div className="conflict-list">
                {displayedConflicts.map((c, i) => (
                  <div
                    key={i}
                    className={`conflict-item ${c.severity === 'Critical' ? 'conflict-critical' : 'conflict-high'}`}
                  >
                    <div className={`conflict-icon ${c.severity === 'Critical' ? 'icon-critical' : 'icon-high'}`}>
                      <XCircle size={16} />
                    </div>
                    <div className="conflict-details">
                      <div className="conflict-title-row">
                        <span className="conflict-title">
                          {c.chemicals[0]} ↔ {c.chemicals[1]}
                        </span>
                        <SeverityBadge severity={c.severity} />
                      </div>
                      <p className="conflict-reason">{c.reason}</p>
                      <div className="conflict-location">
                        <MapPin size={11} />
                        <span className="loc-text">{c.location}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {conflicts.length > 4 && (
                  <button
                    onClick={() => setExpandedConflicts(v => !v)}
                    className="toggle-conflicts-btn"
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
          <div className="dashboard-panel-dark">
            <h2 className="panel-title-dark">
              <AlertTriangle style={{ color: '#ef4444' }} /> Safety Alerts
            </h2>
            <div className="alerts-list">

              {stats?.summary?.sdsPending > 0 && (
                <div className="alert-item">
                  <div className="alert-icon-box alert-red"><FileText size={16} /></div>
                  <div>
                    <p className="alert-title">SDS Missing / Pending</p>
                    <p className="alert-desc">
                      {stats.summary.sdsPending} chemical{stats.summary.sdsPending > 1 ? 's' : ''} require SDS verification.
                    </p>
                  </div>
                </div>
              )}

              {stats?.summary?.needsTraining > 0 && (
                <div className="alert-item">
                  <div className="alert-icon-box alert-orange"><Users size={16} /></div>
                  <div>
                    <p className="alert-title">Training Required</p>
                    <p className="alert-desc">
                      {stats.summary.needsTraining} chemical{stats.summary.needsTraining > 1 ? 's' : ''} mandate handling training before use.
                    </p>
                  </div>
                </div>
              )}

              {criticalConflicts.length > 0 && (
                <div className="alert-item critical">
                  <div className="alert-icon-box alert-red"><AlertOctagon size={16} /></div>
                  <div>
                    <p className="alert-title critical">Critical Storage Conflict</p>
                    <p className="alert-desc">
                      {criticalConflicts.length} critical incompatibilit{criticalConflicts.length > 1 ? 'ies' : 'y'} found in current storage layout.
                    </p>
                  </div>
                </div>
              )}

              {stats?.summary?.restricted > 0 && (
                <div className="alert-item">
                  <div className="alert-icon-box alert-purple"><Shield size={16} /></div>
                  <div>
                    <p className="alert-title">Restricted Access</p>
                    <p className="alert-desc">
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
                <div className="alert-item" style={{ alignItems: 'center' }}>
                  <CheckCircle2 style={{ color: '#4ade80', flexShrink: 0 }} size={20} />
                  <p className="alert-desc" style={{ marginTop: 0, fontWeight: 500, color: 'rgba(255, 255, 255, 0.6)' }}>No active safety alerts. All systems nominal.</p>
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="system-status-footer">
              <div className={`status-dot ${conflicts.length > 0 || stats?.summary?.sdsPending > 0 ? 'dot-alert' : 'dot-ok'}`} />
              <p className="status-text">
                {conflicts.length > 0 || stats?.summary?.sdsPending > 0 ? 'Attention Required' : 'System Nominal'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Incompatibility Matrix ── */}
        <div className="dashboard-panel">
          <h2 className="panel-title">
            <FlaskConical style={{ color: '#2563eb' }} /> Chemical Family Incompatibility Matrix
          </h2>
          {matrix.length === 0 ? (
            <p style={{ color: 'var(--secondary-400)', fontSize: '0.875rem', fontWeight: 500 }}>Matrix data unavailable.</p>
          ) : (
            <div className="matrix-table-container">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th className="matrix-th first">
                      Chemical Family
                    </th>
                    <th className="matrix-th">
                      Incompatible With
                    </th>
                  </tr>
                </thead>
                <tbody className="matrix-tbody">
                  {matrix.map((row, i) => (
                    <tr key={i} className="matrix-tr">
                      <td className="matrix-td-family">
                        {row.family}
                      </td>
                      <td className="matrix-td-incompat">
                        <div className="incompat-tags">
                          {row.incompatibleWith.map((item, j) => (
                            <span key={j} className="incompat-tag">
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
        <div className="dashboard-panel">
          <h2 className="panel-title">
            <BookOpen style={{ color: '#059669' }} /> Emergency Response Protocols
          </h2>
          <div className="protocols-grid">
            <ProtocolLink
              title="Spill Response"
              desc="Neutralization and cleanup steps for all chemical families."
              icon={<Droplets style={{ color: '#3b82f6' }} size={32} />}
            />
            <ProtocolLink
              title="First Aid"
              desc="Immediate medical actions for exposure scenarios."
              icon={<HeartPulse style={{ color: '#ef4444' }} size={32} />}
            />
            <ProtocolLink
              title="Evacuation Plan"
              desc="Map of exits and assembly points for all laboratory zones."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" style={{ width: '2rem', height: '2rem', color: '#059669' }}>
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
