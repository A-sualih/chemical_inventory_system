import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../layout/Layout';
import './LabManagement.css';

const LabManagement = () => {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLab, setNewLab] = useState({ name: '', description: '' });
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState(null);

  useEffect(() => {
    fetchLabs();
    fetchUsers();
  }, []);

  const fetchLabs = async () => {
    try {
      const res = await axios.get('/api/labs');
      setLabs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/auth/users');
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to grab users');
      setLoading(false);
    }
  };

  const handleCreateLab = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/labs', newLab);
      setNewLab({ name: '', description: '' });
      setIsCreateModalOpen(false);
      fetchLabs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create lab');
    }
  };

  const toggleUserLab = async (targetUserId, labId) => {
    try {
      const targetUser = users.find(u => u._id === targetUserId);
      const currentLabs = targetUser.labs || [];
      let newLabs = [...currentLabs];
      
      if (newLabs.includes(labId)) {
        newLabs = newLabs.filter(id => id !== labId); // remove
      } else {
        newLabs.push(labId); // add
      }

      await axios.put('/api/labs/assign', { userId: targetUserId, labs: newLabs });
      fetchUsers(); // Refresh map
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign lab');
    }
  };

  const handleDeleteLab = async () => {
    try {
      if (!labToDelete) return;
      await axios.delete(`/api/labs/${labToDelete._id}`);
      setIsDeleteModalOpen(false);
      setLabToDelete(null);
      fetchLabs();
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete lab');
    }
  };

  return (
    <Layout>
      <div className="lab-management-container">
        <div className="header-actions">
          <div>
            <h1>Lab & Access Management</h1>
            <p>Administer laboratory facilities and provision user access protocols.</p>
          </div>
          <button className="btn-primary-glow" onClick={() => setIsCreateModalOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{width: '1.25rem', height: '1.25rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Provision Lab
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="management-sections">
          
          <div className="section-card active-labs">
            <h2>
               <svg xmlns="http://www.w3.org/2000/svg" style={{width: '1.25rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
               System Facilities
            </h2>
            <div className="card-body">
              {labs.length === 0 ? <p style={{color: 'var(--secondary-500)'}}>No facilities provisioned yet.</p> : (
                <ul className="lab-list">
                  {labs.map(lab => (
                    <li key={lab._id} className="lab-card">
                      <div className="lab-info">
                        <span className="lab-name">{lab.name}</span>
                        <span className="lab-desc">{lab.description || 'No operational parameters defined.'}</span>
                        <span className="lab-status">{lab.status || 'Active'}</span>
                      </div>
                      {user.role === 'Admin' && (
                        <button 
                           className="btn-danger-sm" 
                           style={{marginTop: '0.5rem', alignSelf: 'flex-start'}}
                           onClick={() => { setLabToDelete(lab); setIsDeleteModalOpen(true); }}
                        >
                          Decommission Facility
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="section-card user-assignment">
            <h2>
              <svg xmlns="http://www.w3.org/2000/svg" style={{width: '1.25rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Identity Access Controls (Lab Scope)
            </h2>
            <div className="card-body">
              {loading ? <p style={{color: 'var(--secondary-500)'}}>Synchronizing personnel data...</p> : (
                <div className="users-grid">
                  {users.map(u => (
                    <div key={u._id} className="user-assignment-card">
                      <div className="user-assignment-header">
                        <div className="user-avatar">
                          {u.profile_photo ? <img src={u.profile_photo} alt={u.name} /> : (u.name ? u.name.charAt(0).toUpperCase() : '?')}
                        </div>
                        <div className="user-assignment-info">
                          <h3>{u.name}</h3>
                          <p>{u.email}</p>
                          <span className="role-chip">{u.role}</span>
                        </div>
                      </div>
                      
                      <div className="lab-toggles-container">
                        <div className="lab-toggles-header">Facility Access</div>
                        <div className="lab-toggles-list">
                          {labs.length === 0 ? (
                            <span style={{fontSize: '0.75rem', color: 'var(--secondary-400)'}}>No facilities available for assignment.</span>
                          ) : (
                            labs.map(lab => {
                              const isAssigned = u.labs?.includes(lab._id);
                              return (
                                <div 
                                  key={lab._id} 
                                  className={`lab-toggle-row ${isAssigned ? 'assigned' : ''}`}
                                  onClick={() => toggleUserLab(u._id, lab._id)}
                                >
                                  <span>{lab.name}</span>
                                  <div className="switch-pill">
                                    <div className="switch-circle"></div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="modal-overlay">
            <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}></div>
            <div className="modal-content lab-registration-modal">
              <div className="modal-header-visual">
                <div className="modal-icon-glow">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="modal-title">Register New Lab</h2>
                <p className="modal-subtitle">Provision a new operational facility into the repository.</p>
              </div>

              <form onSubmit={handleCreateLab} className="modal-form">
                <div className="form-group-glow">
                  <label className="field-label">Department / Lab Name</label>
                  <div className="input-wrapper">
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Molecular Synthesis Lab"
                      value={newLab.name}
                      onChange={e => setNewLab({...newLab, name: e.target.value})}
                      className="field-input-premium"
                    />
                  </div>
                </div>
                
                <div className="form-group-glow">
                  <label className="field-label">Description & Scope</label>
                  <div className="input-wrapper">
                    <textarea 
                      placeholder="Define operational parameters or facility scope..."
                      value={newLab.description}
                      onChange={e => setNewLab({...newLab, description: e.target.value})}
                      className="field-input-premium field-textarea"
                    />
                  </div>
                </div>

                <div className="modal-footer-actions">
                  <button type="button" className="btn-cancel-premium" onClick={() => setIsCreateModalOpen(false)}>
                    Discard
                  </button>
                  <button type="submit" className="btn-submit-premium">
                    Authorize Provisioning
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content delete-warning-modal">
              <h2 style={{ color: 'red' }}>⚠️ CRITICAL WARNING: CASCADING DELETION</h2>
              <p>
                You are about to permanently delete <strong>{labToDelete?.name}</strong>.
              </p>
              <p>
                This action will trigger a cascading deletion across the system. 
                <br /><br />
                <strong>ALL DATA</strong> strictly assigned to this laboratory, including:
                <br />
                - All enrolled Chemicals, Batches, and Containers <br />
                - Internal Transfer Requests and Disposals <br />
                - Facility Locations <br />
                - Audit Trails and Inventory Logs <br />
                <br />
                <strong>Will be permanently deleted from the database.</strong> This action CANNOT be undone.
              </p>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button className="btn-secondary" onClick={() => { setIsDeleteModalOpen(false); setLabToDelete(null); }}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleDeleteLab}>
                  Confirm Permanent Deletion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LabManagement;
