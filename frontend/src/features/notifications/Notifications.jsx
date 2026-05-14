import React, { useState, useEffect } from 'react';
import Layout from '../../layout/Layout';
import { useNotifications } from '../../context/NotificationContext';
import { Inbox, Box, AlertTriangle, Lock, Info } from 'lucide-react';
import axios from 'axios';
import '../../styles/Notifications.css';

const Notifications = () => {
  const { notifications, loading, markAsRead, dismissNotification, refresh } = useNotifications();
  const [filter, setFilter] = useState({ type: '', severity: '', status: '' });
  const [cleaning, setCleaning] = useState(false);

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'critical': return 'sev-critical';
      case 'high': return 'sev-high';
      case 'medium': return 'sev-medium';
      default: return 'sev-default';
    }
  };

  const [sendingTest, setSendingTest] = useState(false);

  const handleTestAlert = async () => {
    setSendingTest(true);
    try {
      await axios.post('/api/notifications/test');
      refresh();
      alert('Test alert triggered! Check your dashboard terminal for the SMS log and your email for the alert.');
    } catch (err) {
      alert('Failed to trigger test alert.');
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
      alert('Cleanup complete.');
    } catch (err) {
      alert('Cleanup failed.');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Layout>
      <div className="notif-header">
        <div>
          <h1 className="notif-title">Notification Center</h1>
          <p className="notif-subtitle">Manage your alerts, safety warnings, and security events.</p>
        </div>
        <div className="notif-actions">
          <button 
            onClick={handleTestAlert}
            disabled={sendingTest}
            className="btn-test"
          >
            <svg className="w-5 h-5" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            {sendingTest ? 'Sending...' : 'Send Test Alert'}
          </button>
          <button 
            onClick={refresh}
            className="btn-refresh"
          >
            <svg className="w-5 h-5" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <button 
            onClick={handleCleanup}
            disabled={cleaning}
            className="btn-cleanup"
          >
            {cleaning ? 'Cleaning...' : 'Cleanup Old Alerts'}
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
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="EXPIRY">Expiry</option>
                  <option value="UNAUTHORIZED_ACCESS">Security</option>
                  <option value="SYSTEM">System</option>
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
                    <div className="empty-icon"><Inbox /></div>
                    <p className="empty-title">Inbox is Empty</p>
                    <p className="empty-desc">No alerts matching your criteria.</p>
                  </div>
                );
              }

              return (
                <div>
                  {filteredNotifications.map((notif) => (
                  <div key={notif._id} className={`notif-item ${notif.status === 'unread' ? 'unread' : ''}`}>
                    <div className="icon-box">
                      {notif.type === 'LOW_STOCK' ? <Box color="var(--amber-500)" /> : notif.type === 'EXPIRY' ? <AlertTriangle color="var(--red-500)" /> : notif.type === 'UNAUTHORIZED_ACCESS' ? <Lock color="var(--red-500)" /> : <Info color="var(--primary-500)" />}
                    </div>
                    
                    <div className="notif-content">
                      <div className="notif-top-row">
                        <div>
                          <h3 className="notif-heading">{notif.title}</h3>
                          <div className="notif-meta">
                             <span className={`severity-badge ${getSeverityStyles(notif.severity)}`}>
                              {notif.severity}
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
                ))}
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
