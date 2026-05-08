import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Layout from "../layout/Layout";
import { useAuth } from "../context/AuthContext";
import { HAZARD_CLASSES } from "../constants/hazards.jsx";
import "../styles/Dashboard.css";

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

  useEffect(() => {
    if (hasPermission("approve_request")) {
      fetchRequests();
    } else {
      setRequestsLoading(false);
    }
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get('/api/requests');
      setPendingRequests(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRequestAction = async (id, status) => {
    try {
      await axios.put(`/api/inventory/requests/${id}`, { status });
      fetchRequests();
    } catch (err) {
      alert("Error updating request: " + (err.response?.data?.error || err.message));
    }
  };

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
      const logsArray = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setAuditLogs(logsArray.slice(0, 6));
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const stats = [
    { label: "Total Chemicals", value: dbStats.total.toString().padStart(3, '0'), sub: "Active Listings", color: "primary", icon: (
      <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" /></svg>
    )},
    { label: "Flammables", value: dbStats.flammables.toString().padStart(3, '0'), sub: "Class 3 Assets", color: "orange", icon: (
      <div className="icon-md">
        {HAZARD_CLASSES.find(h => h.id === 'Flammable')?.icon}
      </div>
    )},
    { label: "Critical Stock", value: dbStats.lowStock.toString().padStart(2, '0'), sub: "Reorder Required", color: "red", icon: (
      <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    )},
    { label: "Safety Audit", value: dbStats.auditScore, sub: "Passing Score", color: "green", icon: (
      <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    )},
  ];

  const storageThemes = [
    { bg: 'bg-blue-500', fill: 'theme-blue', ring: 'ring-blue', text: 'text-blue-600' },
    { bg: 'bg-violet-500', fill: 'theme-violet', ring: 'ring-violet', text: 'text-violet-600' },
    { bg: 'bg-emerald-500', fill: 'theme-emerald', ring: 'ring-emerald', text: 'text-emerald-600' },
    { bg: 'bg-amber-500', fill: 'theme-amber', ring: 'ring-amber', text: 'text-amber-600' },
  ];

  return (
    <Layout>
      <div className="dashboard-header">
        <div>
          <div className="welcome-section">
            <h1 className="welcome-title">
              Welcome back, <span>{user?.name?.split(' ')[0] || "Guest"}</span>
            </h1>
            {user?.role && (
              <span className="role-badge-pill">
                {user.role}
              </span>
            )}
          </div>
          <p className="system-status-text">System status is <span className="status-optimal">Optimal</span> • Last audit {dbStats.lastAuditAgo}</p>
        </div>
        
        <div className="header-actions">
           <button className="search-sds-btn">
             <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             <span className="hidden-mobile">Search SDS</span>
           </button>
            {hasPermission("create_chemical") && (
              <Link to="/chemicals" className="new-inventory-btn">
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span className="hidden-mobile">New Inventory</span>
              </Link>
            )}
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-bg-icon ${
              stat.color === 'red' ? 'bg-red-500' : 
              stat.color === 'orange' ? 'bg-orange-500' :
              stat.color === 'green' ? 'bg-green-500' : 'bg-primary-500'
            }`}></div>

            <div className={`stat-icon-wrapper ${
              stat.color === 'red' ? 'bg-red-50 text-red-600' : 
              stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
              stat.color === 'green' ? 'bg-green-50 text-green-600' : 'bg-primary-50 text-primary-600'
            }`}>
              {stat.icon}
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-subtext">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-col-left">
          <div className="dashboard-section" style={{marginBottom: '2rem'}}>
            <div className="section-header">
               <h2 className="section-title">Storage Capacity</h2>
               <span className="section-badge">Automated Sensing</span>
            </div>
            <div className="storage-units-grid">
               {(dbStats.storageBreakdown || []).length === 0 ? (
                 <div style={{gridColumn: 'span 2', textAlign: 'center', padding: '2rem 0'}}>
                   <p className="stat-label" style={{fontSize: '0.875rem'}}>No storage locations assigned yet</p>
                   <p className="stat-subtext">Add locations to chemicals to see storage breakdown.</p>
                 </div>
               ) : (dbStats.storageBreakdown || []).map((unit, i) => {
                 const theme = storageThemes[i % storageThemes.length];
                 const storageList = dbStats.storageBreakdown || [];
                 const maxQty = Math.max(...storageList.map(u => u.totalQty), 1);
                 const fill = Math.round((unit.totalQty / maxQty) * 100);
                 return (
                   <div key={i} className="storage-unit-item">
                     <div className="storage-unit-label-row">
                       <span className="unit-name-wrapper">
                         <div className={`unit-status-dot ${theme.bg}`}></div>
                         {unit.name}
                       </span>
                       <span className="unit-stats-summary">{unit.count} items • {unit.totalQty} units</span>
                     </div>
                     <div className="progress-track">
                       <div className={`progress-fill ${theme.fill}`} style={{ width: `${fill}%` }}></div>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>

          {hasPermission("approve_request") && (
            <div className="dashboard-section approvals-section" style={{marginBottom: '2rem'}}>
               <div className="approvals-bg-glow"></div>
               <div className="section-header" style={{position: 'relative', zIndex: 10}}>
                 <h2 className="section-title" style={{color: 'white'}}>Pending Approvals</h2>
                 <span className="stat-label">
                   {pendingRequests.filter(r => r.status === 'Pending').length} Pending
                 </span>
               </div>

               <div className="approval-list">
                  {requestsLoading ? (
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 0'}}>
                      <div className="spinner-mini" style={{width: '2rem', height: '2rem'}}></div>
                      <p className="stat-label" style={{marginTop: '0.75rem'}}>Loading requests...</p>
                    </div>
                  ) : pendingRequests.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '2.5rem 0'}}>
                      <div style={{width: '3rem', height: '3rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem'}}>
                        <svg className="icon-md" style={{ color: 'var(--secondary-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-500)'}}>No requests found</p>
                      <p className="stat-subtext" style={{marginTop: '0.25rem'}}>All clear — nothing to review.</p>
                    </div>
                  ) : (
                    pendingRequests.slice(0, 5).map((req) => (
                      <div key={req._id} className="approval-card">
                        <div className="approval-info">
                           <div className="approval-avatar">
                              {(req.chemical_name || req.chemical_id?.name || '?')[0].toUpperCase()}
                           </div>
                           <div className="approval-details">
                              <div className="approval-item-name">{req.chemical_name || req.chemical_id?.name || req.chemical_id}</div>
                              <div className="approval-meta">
                                REQ BY {(req.user_name || req.user_id?.name || 'Unknown').toUpperCase()} • {timeAgo(req.created_at)} • QTY: {req.quantity}
                              </div>
                           </div>
                        </div>
                        <div className="approval-actions">
                           <span className={`status-tag ${
                             req.status === 'Approved' ? 'status-approved' :
                             req.status === 'Rejected' ? 'status-rejected' : 'status-pending'
                           }`}>
                              {req.status}
                           </span>
                           {req.status === 'Pending' && (
                             <>
                               <button
                                 onClick={() => handleRequestAction(req._id, 'Approved')}
                                 className="action-btn-circle approve-btn"
                                 title="Approve"
                               >
                                 <svg className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                               </button>
                               <button
                                 onClick={() => handleRequestAction(req._id, 'Rejected')}
                                 className="action-btn-circle reject-btn"
                                 title="Reject"
                               >
                                 <svg className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                               </button>
                             </>
                           )}
                           <Link to="/requests" className="view-more-arrow">
                              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                           </Link>
                        </div>
                      </div>
                    ))
                  )}
               </div>
               <Link to="/requests" className="request-center-btn">
                  Go to Request Center
               </Link>
            </div>
          )}

          <div className="dashboard-section inventory-chart-section">
            <div className="chart-grid-bg"></div>
            
            <div className="section-header" style={{position: 'relative', zIndex: 10}}>
              <div>
                <h2 className="section-title">Inventory Overview</h2>
                <p className="stat-subtext" style={{fontSize: '0.75rem', marginTop: '0.375rem'}}>Volume distribution across locations</p>
              </div>
              <Link to="/chemicals" className="section-badge" style={{textDecoration: 'none'}}>View All →</Link>
            </div>
            
            <div className="chart-container">
              <div className="chart-y-axis">
                 {[100, 75, 50, 25, 0].map(val => (
                   <div key={val} className="y-grid-line">
                     {val > 0 && <span className="y-axis-label">{val}%</span>}
                   </div>
                 ))}
              </div>

              {(dbStats.storageBreakdown || []).length === 0 ? (
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: '3rem', position: 'relative', zIndex: 10}}>
                  <div style={{width: '4rem', height: '4rem', backgroundColor: 'var(--secondary-50)', color: 'var(--secondary-300)', borderRadius: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid rgba(226, 232, 240, 0.5)'}}>
                    <svg className="icon-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <div style={{fontSize: '0.875rem', color: 'var(--secondary-900)', fontWeight: 700, marginBottom: '0.25rem'}}>No Storage Data Found</div>
                  <div style={{fontSize: '10px', color: 'var(--secondary-500)', maxWidth: '200px', lineHeight: 1.5}}>Assign locations to chemicals (e.g. Cabinet A) to generate volumetric charts.</div>
                </div>
              ) : (dbStats.storageBreakdown || []).map((unit, i) => {
                const theme = storageThemes[i % storageThemes.length];
                const storageList = dbStats.storageBreakdown || [];
                const maxQty = Math.max(...storageList.map(u => u.totalQty), 1);
                const h = Math.max(Math.round((unit.totalQty / maxQty) * 100), 8);
                return (
                  <div key={i} className="bar-column">
                    <div className="chart-tooltip">
                      <div className="tooltip-val">{unit.totalQty} Units</div>
                      <div className="tooltip-sub">{unit.count} unique items</div>
                      <div className="tooltip-arrow"></div>
                    </div>
                    
                    <div className="bar-wrapper">
                       <div className={`bar-actual bg-secondary-100`} style={{ height: `${h}%` }}>
                         <div className={`bar-gradient ${theme.fill}`}></div>
                         <div className="bar-highlight-glass"></div>
                         <div className="bar-dots-pattern"></div>
                       </div>
                    </div>

                    <span className={`bar-label ${theme.text}`}>{unit.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="dashboard-col-right">
           <div className="dashboard-section">
              <div className="section-header">
                 <h2 className="section-title" style={{fontSize: '1.25rem'}}>Risk Profile</h2>
                 <span className="stat-label" style={{fontSize: '10px'}}>Global GHS Analysis</span>
              </div>
              <div className="hazard-profile-grid">
                 {(dbStats.hazardSummary || []).length === 0 ? (
                   <div style={{gridColumn: 'span 2', textAlign: 'center', padding: '1rem 0', backgroundColor: 'var(--secondary-50)', borderRadius: '1rem', border: '1px dashed var(--secondary-200)'}}>
                     <p className="stat-label" style={{fontSize: '10px'}}>No hazards logged</p>
                   </div>
                 ) : (dbStats.hazardSummary || []).map(h => {
                   const hazardInfo = HAZARD_CLASSES.find(x => x.id === h.id || x.label === h.id);
                   if (!hazardInfo) return null;
                   return (
                     <div key={h.id} className="hazard-mini-card">
                        <div className={`hazard-mini-icon ${hazardInfo.color}`}>
                           {hazardInfo.icon}
                        </div>
                        <div className="hazard-mini-info">
                           <div className="hazard-mini-name">{hazardInfo.label}</div>
                           <div className="hazard-mini-count">{h.count} Chemicals</div>
                        </div>
                     </div>
                   );
                 })}
              </div>
              <div className="primary-threat-box">
                 <div className="threat-label">Primary Threat</div>
                 <div className="threat-value-row">
                    <div className="threat-name">
                       {(dbStats.hazardSummary || [])[0]?.id || "None Reported"}
                    </div>
                    <div className="threat-divider"></div>
                    <div className="threat-subtext">Highest occurrence</div>
                 </div>
              </div>
           </div>

           <div className="safety-protocol-card">
              <h2 className="safety-title">Safety Protocol</h2>
              <p className="safety-description">All personnel must verify SDS documentation before container opening.</p>
              <div className="safety-items-list">
                 <div className="safety-item-pill">
                   <span className="safety-item-icon-box">
                     <svg className="icon-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                   </span>
                   HazMat Guidelines 2026
                 </div>
                 <div className="safety-item-pill">
                   <span className="safety-item-icon-box">
                     <svg className="icon-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" /></svg>
                   </span>
                   Spill Kit Locations Map
                 </div>
                 <div className="safety-item-pill">
                   <span className="safety-item-icon-box">
                     <svg className="icon-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.55,11.2C17.42,10.6 17.22,10.06 16.94,9.57C16.36,8.56 15.5,7.74 14.5,7.11C15.2,8.87 14.3,10.45 13.5,11.3C13.2,11.62 12.86,11.9 12.5,12.11C11.5,12.7 10.32,12.94 9.2,12.83C7.54,12.67 6.13,11.85 5.31,10.63C5.11,11.23 5,11.87 5,12.54C5,16.4 8.13,19.54 12,19.54C15.87,19.54 19,16.4 19,12.54C19,12.08 18.96,11.64 18.87,11.21C18.84,11.2 18.8,11.21 18.77,11.21C18.36,11.21 17.95,11.21 17.55,11.21V11.2M12,2C12,2 12,5 10,7C10,7 13.5,5.5 14,9C14,9 16,8 16,11C16,11 19,10 17,5C17,5 20,9 17,14C17,14 18,11 15,10C15,10 16,13 13,15C13,15 15,14 14,11C14,11 12,12 11,10C11,10 12,14 8,15C8,15 11,14 10,11C10,11 9,13 7,13C7,13 8,11 7,9C7,9 5,11 5,14C5,14 6,10 10,8C10,8 9,7 10,5C10,5 11,6 12,2Z" /></svg>
                   </span>
                   Emergency Extraction Plan
                 </div>
              </div>
           </div>

           <div className="dashboard-section expirations-card">
              <div className="expirations-bg-accent"></div>
              <div className="section-header">
                <h2 className="section-title" style={{fontSize: '1.25rem'}}>Expirations</h2>
                <span className="stat-label" style={{fontSize: '10px'}}>{dbStats.expirations.length} upcoming</span>
              </div>
              <div className="expiration-list">
                 {(dbStats.expirations || []).length === 0 ? (
                   <div style={{textAlign: 'center', padding: '1.5rem 0'}}>
                     <div style={{width: '2.5rem', height: '2.5rem', backgroundColor: '#f0fdf4', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem'}}>
                       <svg className="icon-sm" style={{ color: '#22c55e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                     </div>
                     <p style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-500)'}}>All clear</p>
                     <p className="stat-subtext" style={{marginTop: '0.25rem'}}>No chemicals expiring within 90 days.</p>
                   </div>
                 ) : (
                   (dbStats.expirations || []).map((item, i) => (
                     <div key={i} className="expiration-item">
                        <div className="exp-item-info">
                          <div className="exp-item-name">{item.name}</div>
                          <div className="exp-item-meta">
                            {item.location} {item.batch_number && `• Batch: ${item.batch_number}`}
                          </div>
                        </div>
                        <div className={`exp-days-badge ${item.days <= 7 ? 'exp-urgent' : item.days <= 30 ? 'exp-warning' : 'exp-normal'}`}>
                          {item.days <= 0 ? 'EXPIRED' : `IN ${item.days}D`}
                        </div>
                     </div>
                   ))
                 )}
              </div>
              <Link to="/chemicals" className="manage-expiries-link">Manage All Expiries</Link>
           </div>

            {hasPermission("view_audit_logs") && (
              <div className="dashboard-section activity-card">
                 <div className="activity-bg-glow"></div>
                 <div className="section-header" style={{position: 'relative', zIndex: 10}}>
                   <h2 className="section-title" style={{color: 'white', fontSize: '1.25rem'}}>Live Activity</h2>
                   <span className="stat-label" style={{fontSize: '10px'}}>{auditLogs.length} Latest</span>
                 </div>
                 <div className="activity-timeline">
                   {auditLoading ? (
                     <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0'}}>
                       <div className="spinner-mini" style={{width: '1.75rem', height: '1.75rem'}}></div>
                       <p className="stat-label" style={{marginTop: '0.75rem'}}>Loading activity...</p>
                     </div>
                   ) : auditLogs.length === 0 ? (
                     <div style={{textAlign: 'center', padding: '2rem 0'}}>
                       <p style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary-500)'}}>No activity recorded yet</p>
                     </div>
                   ) : (
                     auditLogs.map((log, i) => (
                       <div key={log._id || i} className="timeline-item">
                         <div className="timeline-indicator">
                           <div className="indicator-dot"></div>
                           {i < auditLogs.length - 1 && <div className="indicator-line"></div>}
                         </div>
                         <div className="timeline-content">
                           <div className="timeline-user">
                             {log.user_name || 'System'}
                           </div>
                           <div className="timeline-action">
                             {log.action}{log.details ? ` — ${log.details}` : ''}
                           </div>
                           <div className="timeline-meta-row">
                             <span className="timeline-time">{timeAgo(log.timestamp)}</span>
                             <span className="action-type-tag">{log.action?.split(' ')[0]?.toUpperCase()}</span>
                           </div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
                 <Link to="/audit" className="view-all-audit-btn">
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
