import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../layout/Layout';
import './TransferDashboard.css';

const TransferDashboard = () => {
  const { user, hasPermission } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    destination_lab: '',
    chemical_id: '',
    batch_number: '',
    container_id: '',
    quantity_moved: '',
    unit: 'ml',
  });
  const [availableLabs, setAvailableLabs] = useState([]);

  useEffect(() => {
    fetchTransfers();
    fetchLabs();
  }, [user?.active_lab]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/transfers');
      setTransfers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchLabs = async () => {
    try {
      const res = await axios.get('/api/labs');
      // Filter out the active lab so they can't transfer to themselves
      setAvailableLabs(res.data.filter(l => l._id !== user.active_lab));
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/transfers/${id}/approve`);
      fetchTransfers(); // Refresh
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`/api/transfers/${id}/reject`, { reason: 'Manually rejected' });
      fetchTransfers(); // Refresh
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/transfers', newTransfer);
      setIsModalOpen(false);
      fetchTransfers();
    } catch (err) {
      alert(err.response?.data?.message || 'Creation failed');
    }
  };

  const renderStatus = (status) => {
    switch(status) {
      case 'Pending': return <span className="status-badge status-pending">Pending</span>;
      case 'Approved': return <span className="status-badge status-approved">Approved</span>;
      case 'Rejected': return <span className="status-badge status-rejected">Rejected</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <Layout>
      <div className="transfer-dashboard">
        <div className="transfer-header">
          <div>
            <h1>Cross-Lab Transfers</h1>
            <p>Administer chemical movements and provenance across facilities.</p>
          </div>
          <button className="btn-primary-glow" onClick={() => setIsModalOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{width: '1.25rem', height: '1.25rem', marginRight: '0.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Initiate Transfer
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="transfer-list">
          {loading ? (
            <div className="empty-state">Synchronizing transfer logs...</div>
          ) : transfers.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" style={{width: '3rem', height: '3rem', margin: '0 auto 1rem', display: 'block', opacity: 0.3}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              No active transfers found for this facility.
            </div>
          ) : (
            <table className="transfer-table">
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Chemical Identity</th>
                  <th>Payload</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t._id}>
                    <td>{new Date(t.transfer_date).toLocaleDateString()}</td>
                    <td style={{fontWeight: 700}}>{t.chemical_id?.name || 'Unknown'}</td>
                    <td>{t.quantity_moved} {t.unit}</td>
                    <td>{t.source_lab?.name}</td>
                    <td>{t.destination_lab?.name}</td>
                    <td>{renderStatus(t.status)}</td>
                    <td>
                      {t.status === 'Pending' && t.source_lab?._id === user.active_lab && (hasPermission('approve_cross_lab_transfer') || hasPermission('approve_request')) && (
                        <div className="action-buttons">
                          <button className="btn-success-sm" onClick={() => handleApprove(t._id)}>Authorize</button>
                          <button className="btn-danger-sm" onClick={() => handleReject(t._id)}>Decline</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal for creating a new transfer */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="transfer-modal">
              <h2>Initiate Protocol Transfer</h2>
              <form onSubmit={handleSubmitRequest}>
                <div className="form-group">
                  <label>Recipient Facility</label>
                  <select 
                    required 
                    value={newTransfer.destination_lab}
                    onChange={(e) => setNewTransfer({...newTransfer, destination_lab: e.target.value})}
                  >
                    <option value="">Select laboratory...</option>
                    {availableLabs.map(l => (
                      <option key={l._id} value={l._id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chemical Resource ID</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter Chemical ObjectPath"
                    value={newTransfer.chemical_id}
                    onChange={(e) => setNewTransfer({...newTransfer, chemical_id: e.target.value})}
                  />
                  <small>System Identifier required for provenance tracking.</small>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Batch Ref</label>
                    <input 
                      type="text" 
                      placeholder="Optional"
                      value={newTransfer.batch_number}
                      onChange={(e) => setNewTransfer({...newTransfer, batch_number: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Container Ref</label>
                    <input 
                      type="text" 
                      placeholder="Optional"
                      value={newTransfer.container_id}
                      onChange={(e) => setNewTransfer({...newTransfer, container_id: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{gridColumn: 'span 2'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem'}}>
                      <div>
                        <label>Magnitude</label>
                        <input 
                          type="number" 
                          required 
                          value={newTransfer.quantity_moved}
                          onChange={(e) => setNewTransfer({...newTransfer, quantity_moved: e.target.value})}
                        />
                      </div>
                      <div>
                        <label>Unit</label>
                        <select 
                          value={newTransfer.unit}
                          onChange={(e) => setNewTransfer({...newTransfer, unit: e.target.value})}
                        >
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" style={{borderRadius: '1rem', padding: '0.875rem 1.5rem'}} onClick={() => setIsModalOpen(false)}>Abort</button>
                  <button type="submit" className="btn-primary-glow">Authorize Request</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TransferDashboard;
