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
            <p>Manage and approve chemical movements across departments</p>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            Request Transfer
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="transfer-list">
          {loading ? (
            <p>Loading transfers...</p>
          ) : transfers.length === 0 ? (
            <div className="empty-state">No transfers active for this lab.</div>
          ) : (
            <table className="transfer-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Chemical</th>
                  <th>Qty</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t._id}>
                    <td>{new Date(t.transfer_date).toLocaleDateString()}</td>
                    <td>{t.chemical_id?.name || 'Unknown'}</td>
                    <td>{t.quantity_moved} {t.unit}</td>
                    <td>{t.source_lab?.name}</td>
                    <td>{t.destination_lab?.name}</td>
                    <td>{renderStatus(t.status)}</td>
                    <td>
                      {t.status === 'Pending' && t.source_lab?._id === user.active_lab && (hasPermission('approve_cross_lab_transfer') || hasPermission('approve_request')) && (
                        <div className="action-buttons">
                          <button className="btn-success" onClick={() => handleApprove(t._id)}>Approve</button>
                          <button className="btn-danger" onClick={() => handleReject(t._id)}>Reject</button>
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
              <h2>Request Chemical Transfer</h2>
              <form onSubmit={handleSubmitRequest}>
                <div className="form-group">
                  <label>Destination Lab (Receiving)</label>
                  <select 
                    required 
                    value={newTransfer.destination_lab}
                    onChange={(e) => setNewTransfer({...newTransfer, destination_lab: e.target.value})}
                  >
                    <option value="">Select a Lab...</option>
                    {availableLabs.map(l => (
                      <option key={l._id} value={l._id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chemical ID</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. ObjectID of Chemical"
                    value={newTransfer.chemical_id}
                    onChange={(e) => setNewTransfer({...newTransfer, chemical_id: e.target.value})}
                  />
                  <small>ObjectId required.</small>
                </div>
                <div className="form-group">
                  <label>Batch Number (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. BATCH-A01"
                    value={newTransfer.batch_number}
                    onChange={(e) => setNewTransfer({...newTransfer, batch_number: e.target.value})}
                  />
                  <small>If migrating a specific Batch.</small>
                </div>
                <div className="form-group">
                  <label>Container ID (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. C001-1"
                    value={newTransfer.container_id}
                    onChange={(e) => setNewTransfer({...newTransfer, container_id: e.target.value})}
                  />
                  <small>If migrating a strictly defined Container.</small>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input 
                      type="number" 
                      required 
                      value={newTransfer.quantity_moved}
                      onChange={(e) => setNewTransfer({...newTransfer, quantity_moved: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
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
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Submit Request</button>
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
