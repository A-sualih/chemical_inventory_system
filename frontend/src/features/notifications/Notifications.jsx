import React, { useState } from 'react';
import Layout from '../../layout/Layout';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Inbox, Box, AlertTriangle, Lock, Info, ShieldAlert, Trash2,
  FlaskConical, Droplets, Thermometer, FileWarning, Siren,
  Leaf, Bell, CheckCheck, RefreshCw, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import '../../styles/Notifications.css';

// ── Static config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  LOW_STOCK:           { label: 'Low Stock',              icon: Box,           color: 'sev-high' },
  EXPIRY:              { label: 'Expiry Warning',         icon: AlertTriangle, color: 'sev-warning' },
  UNAUTHORIZED_ACCESS: { label: 'Security Alert',         icon: Lock,          color: 'sev-critical' },
  SYSTEM:              { label: 'System',                 icon: Bell,          color: 'sev-info' },
  COMPLIANCE:          { label: 'Compliance',             icon: FileWarning,   color: 'sev-warning' },
  HAZARD:              { label: 'Hazard Warning',         icon: ShieldAlert,   color: 'sev-critical' },
  DISPOSAL:            { label: 'Disposal Alert',         icon: Trash2,        color: 'sev-high' },
  INCOMPATIBILITY:     { label: 'Incompatibility',        icon: FlaskConical,  color: 'sev-high' },
  SPILL_INCIDENT:      { label: 'Spill Incident',         icon: Droplets,      color: 'sev-critical' },
  STORAGE_CONDITION:   { label: 'Unsafe Storage',         icon: Thermometer,   color: 'sev-high' },
  MISSING_DOCUMENT:    { label: 'Missing SDS',            icon: FileWarning,   color: 'sev-warning' },
  EMERGENCY:           { label: 'Emergency',              icon: Siren,         color: 'sev-critical' },
  ENVIRONMENTAL_RISK:  { label: 'Environmental Risk',     icon: Leaf,          color: 'sev-high' },
  REQUEST_UPDATE:      { label: 'Request Update',         icon: CheckCheck,    color: 'sev-info' },
  INFO:                { label: 'Info',                   icon: Info,          color: 'sev-info' },
};

// Types visible per role (mirrors backend applyRoleFilters)
const ROLE_TYPES = {
  'Admin':              ['UNAUTHORIZED_ACCESS', 'SYSTEM'],
  'Lab Manager':        ['LOW_STOCK', 'EXPIRY', 'COMPLIANCE', 'SYSTEM'],
  'Safety Officer':     ['COMPLIANCE', 'HAZARD', 'SYSTEM', 'DISPOSAL', 'INCOMPATIBILITY', 'SPILL_INCIDENT', 'STORAGE_CONDITION', 'MISSING_DOCUMENT', 'EMERGENCY', 'ENVIRONMENTAL_RISK'],
  'Lab Technician':     ['LOW_STOCK', 'EXPIRY', 'REQUEST_UPDATE', 'SYSTEM'],
  'Technician':         ['LOW_STOCK', 'EXPIRY', 'REQUEST_UPDATE', 'SYSTEM'],
};

const Notifications = () => {
  const { notifications, loading, markAsRead, dismissNotification, refresh } = useNotifications();
  const { user } = useAuth();
  const [filter, setFilter] = useState({ type: '', severity: '', status: '' });
  const [cleaning, setCleaning] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testType, setTestType] = useState('SYSTEM');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Role-aware type options for the filter
  const roleTypes = ROLE_TYPES[user?.role] || Object.keys(TYPE_CONFIG);

  const handleTestAlert = async () => {
    setSendingTest(true);
    try {
      await axios.post(`/api/notifications/test/${testType}`);
      refresh();
      showToast(`[${testType}] test alert fired successfully.`);
    } catch (err) {
      showToast('Failed to trigger test alert.', true);
    } finally {
      setSendingTest(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Delete all read and dismissed notifications older than 30 days?')) return;
    setCleaning(true);
    try {
      await axios.delete('/api/notifications/cleanup');
      refresh();
      showToast('Cleanup complete.');
    } catch (err) {
      showToast('Cleanup failed.', true);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Layout>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: toastMsg.isError ? '#ef4444' : '#10b981',
          color: 'white', padding: '0.875rem 1.5rem', borderRadius: '0.875rem',
          fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          {toastMsg.isError ? '✕' : '✓'} {toastMsg.msg}
        </div>
      )}

      <div className="notif-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="header-icon-container" style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary-50)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)' }}>
            <Bell size={26} />
          </div>
          <div>
            <h1 className="notif-title">Notification Center</h1>
            <p className="notif-subtitle">Manage your alerts, safety warnings, and security events.</p>
          </div>
        </div>
        <div className="notif-actions">
          {/* Typed test selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              value={testType}
              onChange={e => setTestType(e.target.value)}
              className="filter-select"
              style={{ minWidth: '160px', fontSize: '0.8rem' }}
            >
              {roleTypes.map(t => (
                <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>
              ))}
            </select>
            <button
              onClick={handleTestAlert}
              disabled={sendingTest}
              className="btn-test"
            >
              {sendingTest ? 'Sending…' : 'Test Alert'}
            </button>
          </div>
          <button onClick={refresh} className="btn-refresh" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleCleanup} disabled={cleaning} className="btn-cleanup">
            {cleaning ? 'Cleaning…' : 'Cleanup Old Alerts'}
          </button>
        </div>
      </div>

      <div className="notif-layout">
        {/* Filters */}
        <div className="notif-filters-col">
          <div className="filter-card">
            <h3 className="filter-title">Filters</h3>

            <div>
              <div className="filter-group">
                <label className="filter-label">Alert Type</label>
                <select
                  className="filter-select"
                  value={filter.type}
                  onChange={(e) => setFilter({...filter, type: e.target.value})}
                >
                  <option value="">All Types</option>
                  {roleTypes.map(t => (
                    <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Severity</label>
                <select 
                  className="filter-select"
                  value={filter.severity}
                  onChange={(e) => setFilter({...filter, severity: e.target.value})}
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Status</label>
                <select 
                  className="filter-select"
                  value={filter.status}
                  onChange={(e) => setFilter({...filter, status: e.target.value})}
                >
                  <option value="">All Status</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="notif-list-col">
          <div className="list-container">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p className="loading-text">Accessing notification vault...</p>
              </div>
            ) : (() => {
              const filteredNotifications = notifications.filter(notif => {
                if (filter.type && notif.type !== filter.type) return false;
                if (filter.severity && notif.severity !== filter.severity) return false;
                if (filter.status && notif.status !== filter.status) return false;
                return true;
              });

              if (filteredNotifications.length === 0) {
                return (
                  <div className="empty-state">
                    <div className="empty-icon"><Inbox className="empty-svg-icon" /></div>
                    <p className="empty-title">Inbox is Empty</p>
                    <p className="empty-desc">No alerts matching your criteria.</p>
                  </div>
                );
              }

              return (
                <div className="notif-cards-wrapper">
                  {filteredNotifications.map((notif) => {
                    
                    // Resolve type config
                    const tc = TYPE_CONFIG[notif.type] || TYPE_CONFIG.INFO;
                    const IconComp = tc.icon;

                    // Severity colour class
                    let sevClass = tc.color;
                    if (notif.severity === 'critical') sevClass = 'sev-critical';
                    else if (notif.severity === 'high') sevClass = 'sev-high';
                    else if (notif.severity === 'medium') sevClass = 'sev-warning';

                    return (
                      <div key={notif._id} className={`notif-item ${notif.status === 'unread' ? 'unread' : ''}`}>
                        <div className={`icon-box ${sevClass}`}>
                          <IconComp className="notif-svg-icon" />
                        </div>
                        
                        <div className="notif-content">
                          <div className="notif-top-row">
                            <div>
                              <h3 className="notif-heading">{notif.title}</h3>
                              <div className="notif-meta">
                                <span className={`severity-badge ${sevClass}-badge`}>
                                  {notif.severity}
                                </span>
                                <span className="related-tag" style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.85 }}>
                                  {tc.label}
                                </span>
                                <span className="time-badge">
                                  {new Date(notif.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="notif-actions-btns">
                              {notif.status === 'unread' && (
                                <button 
                                  onClick={() => markAsRead(notif._id)}
                                  className="btn-mark-read"
                                >
                                  Mark Read
                                </button>
                              )}
                              <button 
                                onClick={() => dismissNotification(notif._id)}
                                className="btn-dismiss"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                          <p className="notif-message">
                            {notif.message}
                          </p>
                          
                          {notif.related && (
                            <div className="notif-related">
                              {notif.related.chemicalName && (
                                <span className="related-tag">
                                  Chemical: {notif.related.chemicalName}
                                </span>
                              )}
                              {notif.related.containerId && (
                                <span className="related-tag">
                                  Container: {notif.related.containerId}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;



