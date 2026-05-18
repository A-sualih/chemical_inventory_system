import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../layout/Layout';
import { Mail, Clock, AlertCircle, Filter, CheckCircle, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import '../styles/SupportInbox.css';

const SupportInbox = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/support', { params: filter });
      setRequests(data.data);
    } catch (err) {
      console.error('Failed to fetch support requests', err);
      toast.error('Failed to load support requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(`/api/support/${id}/status`, { status: newStatus });
      toast.success(`Request marked as ${newStatus}`);
      fetchRequests();
    } catch (err) {
      console.error('Failed to update status', err);
      toast.error('Failed to update request status');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Emergency': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      default: return '#22c55e';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'In Progress': return 'status-approved';
      case 'Resolved': return 'status-approved';
      case 'Closed': return 'status-rejected';
      default: return '';
    }
  };

  return (
    <Layout>
      <div className="dashboard-header">
        <div>
          <h1 className="welcome-title">Support <span>Inbox</span></h1>
          <p className="system-status-text">Manage user inquiries and technical support requests.</p>
        </div>
        <div className="header-actions">
           <div className="search-sds-btn" style={{ background: 'rgba(255,255,255,0.05)', cursor: 'default' }}>
             <Filter size={18} style={{ marginRight: '0.5rem' }} />
             <select 
               value={filter.status} 
               onChange={(e) => setFilter({...filter, status: e.target.value})}
               style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', cursor: 'pointer' }}
             >
               <option value="" style={{ background: '#333' }}>All Statuses</option>
               <option value="Pending" style={{ background: '#333' }}>Pending</option>
               <option value="In Progress" style={{ background: '#333' }}>In Progress</option>
               <option value="Resolved" style={{ background: '#333' }}>Resolved</option>
               <option value="Closed" style={{ background: '#333' }}>Closed</option>
             </select>
           </div>
        </div>
      </div>

      <div className="support-inbox-container">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <div className="spinner-mini"></div>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <Mail size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--secondary-500)' }}>No Support Requests Found</h3>
            <p className="stat-subtext">Everything is caught up!</p>
          </div>
        ) : (
          <div className="support-list">
            {requests.map((req) => (
              <div key={req._id} className="support-request-card">
                <div className="support-request-info">
                  <div className="priority-avatar" style={{ background: getPriorityColor(req.priority), color: '#fff' }}>
                    {req.priority[0]}
                  </div>
                  <div className="support-content">
                    <div className="support-subject">
                      {req.subject}
                      <span className={`status-tag ${getStatusBadgeClass(req.status)}`} style={{ fontSize: '0.7rem' }}>
                        {req.status}
                      </span>
                    </div>
                    <div className="support-meta">
                      <span>FROM: {req.fullName} ({req.email})</span>
                      <span className="meta-dot">•</span>
                      <span>LAB: {req.department || 'N/A'}</span>
                      <span className="meta-dot">•</span>
                      <span>{new Date(req.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="support-message-body">
                      {req.message}
                    </div>
                  </div>
                </div>
                
                <div className="support-actions">
                  <button 
                    onClick={() => handleStatusUpdate(req._id, 'In Progress')}
                    className="action-btn-circle approve-btn" 
                    title="Mark In Progress"
                    style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}
                  >
                    <Clock size={20} />
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(req._id, 'Resolved')}
                    className="action-btn-circle approve-btn" 
                    title="Mark Resolved"
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(req._id, 'Closed')}
                    className="action-btn-circle reject-btn" 
                    title="Close Request"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SupportInbox;
