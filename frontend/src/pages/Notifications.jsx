import React, { useState, useEffect } from 'react';
import Layout from '../layout/Layout';
import { useNotifications } from '../NotificationContext';
import axios from 'axios';

const Notifications = () => {
  const { notifications, loading, markAsRead, dismissNotification, refresh } = useNotifications();
  const [filter, setFilter] = useState({ type: '', severity: '', status: '' });
  const [cleaning, setCleaning] = useState(false);

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-secondary-100 text-secondary-700 border-secondary-200';
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black heading-font text-secondary-900 tracking-tight">Notification Center</h1>
          <p className="text-secondary-500 font-medium">Manage your alerts, safety warnings, and security events.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleTestAlert}
            disabled={sendingTest}
            className="px-6 py-3 bg-primary-100 text-primary-700 rounded-xl font-black text-sm hover:bg-primary-200 transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            {sendingTest ? 'Sending...' : 'Send Test Alert'}
          </button>
          <button 
            onClick={refresh}
            className="p-3 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all text-secondary-600 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <button 
            onClick={handleCleanup}
            disabled={cleaning}
            className="px-6 py-3 bg-secondary-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-secondary-900/20 flex items-center gap-2"
          >
            {cleaning ? 'Cleaning...' : 'Cleanup Old Alerts'}
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-sm">
            <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-4">Filters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-secondary-500 uppercase tracking-tighter mb-1.5 block">Alert Type</label>
                <select 
                  className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
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

              <div>
                <label className="text-[10px] font-black text-secondary-500 uppercase tracking-tighter mb-1.5 block">Severity</label>
                <select 
                  className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
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

              <div>
                <label className="text-[10px] font-black text-secondary-500 uppercase tracking-tighter mb-1.5 block">Status</label>
                <select 
                  className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
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
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2.5rem] border border-secondary-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-20 text-center">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-secondary-500 font-bold tracking-tight">Accessing notification vault...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-20 text-center">
                <div className="text-6xl mb-6">🏜️</div>
                <p className="text-xl font-black text-secondary-900 tracking-tight">Inbox is Empty</p>
                <p className="text-secondary-500 font-medium">No alerts matching your criteria.</p>
              </div>
            ) : (
              <div className="divide-y divide-secondary-50">
                {notifications.map((notif) => (
                  <div key={notif._id} className={`p-6 hover:bg-secondary-50 transition-all flex gap-6 items-start group ${notif.status === 'unread' ? 'bg-primary-50/20' : ''}`}>
                    <div className="w-14 h-14 rounded-2xl bg-secondary-50 border border-secondary-100 flex items-center justify-center text-2xl shadow-sm">
                      {notif.type === 'LOW_STOCK' ? '📦' : notif.type === 'EXPIRY' ? '⚠️' : notif.type === 'UNAUTHORIZED_ACCESS' ? '🔒' : 'ℹ️'}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-black text-secondary-900 mb-1">{notif.title}</h3>
                          <div className="flex items-center gap-3">
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider border ${getSeverityStyles(notif.severity)}`}>
                              {notif.severity}
                            </span>
                            <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                              {new Date(notif.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {notif.status === 'unread' && (
                            <button 
                              onClick={() => markAsRead(notif._id)}
                              className="px-4 py-2 bg-primary-100 text-primary-600 rounded-xl text-xs font-black hover:bg-primary-200 transition-all"
                            >
                              Mark Read
                            </button>
                          )}
                          <button 
                            onClick={() => dismissNotification(notif._id)}
                            className="px-4 py-2 bg-secondary-100 text-secondary-400 rounded-xl text-xs font-black hover:bg-secondary-200 transition-all"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <p className="text-secondary-600 font-medium leading-relaxed max-w-2xl">
                        {notif.message}
                      </p>
                      
                      {notif.related && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {notif.related.chemicalName && (
                            <span className="bg-secondary-50 text-secondary-500 text-[10px] font-bold px-2 py-1 rounded-md border border-secondary-100">
                              Chemical: {notif.related.chemicalName}
                            </span>
                          )}
                           {notif.related.containerId && (
                            <span className="bg-secondary-50 text-secondary-500 text-[10px] font-bold px-2 py-1 rounded-md border border-secondary-100">
                              Container: {notif.related.containerId}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
