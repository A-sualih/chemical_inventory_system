import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../layout/Layout';
import { Mail, Clock, AlertCircle, Filter, CheckCircle, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

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
      case 'In Progress': return 'status-approved'; // Reuse existing styles
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

      <div className="dashboard-section" style={{ minHeight: '600px', marginTop: '2rem' }}>
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
          <div className="approval-list-beautiful">
            {requests.map((req) => (
              <div key={req._id} className="approval-card-beautiful" style={{ padding: '2rem', marginBottom: '1.5rem', alignItems: 'flex-start', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                <div className="approval-info" style={{ flex: 1 }}>
                  <div className="approval-avatar-beautiful" style={{ background: getPriorityColor(req.priority), color: '#fff' }}>
                    {req.priority[0]}
                  </div>
                  <div className="approval-details" style={{ flex: 1 }}>
                    <div className="approval-item-name-beautiful" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {req.subject}
                      <span className={`status-tag ${getStatusBadgeClass(req.status)}`} style={{ fontSize: '0.7rem' }}>
                        {req.status}
                      </span>
                    </div>
                    <div className="approval-meta-beautiful" style={{ marginTop: '0.5rem', marginBottom: '1rem', color: '#64748b' }}>
                      <span className="req-by" style={{ color: '#475569', fontWeight: 600 }}>FROM: {req.fullName} ({req.email})</span>
                      <span className="meta-dot" style={{ color: '#cbd5e1' }}>•</span>
                      <span className="req-by" style={{ color: '#475569', fontWeight: 600 }}>LAB: {req.department || 'N/A'}</span>
                      <span className="meta-dot" style={{ color: '#cbd5e1' }}>•</span>
                      <span className="req-time" style={{ color: '#64748b' }}>{new Date(req.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', color: '#334155', lineHeight: '1.6', fontSize: '0.95rem' }}>
                      {req.message}
                    </div>
                  </div>
                </div>
                
                <div className="approval-actions-beautiful" style={{ flexDirection: 'column', gap: '1rem', marginLeft: '2rem', paddingTop: '0.5rem' }}>
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
