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

  return (
    <Layout>
      <div className="lab-management-container">
        <div className="header-actions">
          <div>
            <h1>Department & Lab Management</h1>
            <p>Create labs and assign users efficiently across the institution.</p>
          </div>
          <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            + Create New Lab
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="management-sections">
          
          <div className="section-card active-labs">
            <h2>System Labs</h2>
            {labs.length === 0 ? <p>No labs registered yet.</p> : (
              <ul className="lab-list">
                {labs.map(lab => (
                  <li key={lab._id} className="lab-card">
                    <span className="lab-name">{lab.name}</span>
                    <span className="lab-desc">{lab.description || 'No description'}</span>
                    <span className="lab-status">{lab.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="section-card user-assignment">
            <h2>User Lab Assignments</h2>
            {loading ? <p>Loading users...</p> : (
              <table className="assignment-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Assigned Labs</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>
                        <strong>{u.name}</strong><br/>
                        <small>{u.email}</small>
                      </td>
                      <td><span className="role-chip">{u.role}</span></td>
                      <td>
                        <div className="lab-toggles">
                          {labs.map(lab => {
                            const isAssigned = u.labs?.includes(lab._id);
                            return (
                              <button 
                                key={lab._id} 
                                className={`toggle-btn ${isAssigned ? 'assigned' : 'unassigned'}`}
                                onClick={() => toggleUserLab(u._id, lab._id)}
                              >
                                {isAssigned ? '✅ ' : '❌ '} {lab.name}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Register New Lab</h2>
              <form onSubmit={handleCreateLab}>
                <div className="form-group">
                  <label>Department / Lab Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Chemistry Lab"
                    value={newLab.name}
                    onChange={e => setNewLab({...newLab, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input 
                    type="text" 
                    placeholder="Optional details"
                    value={newLab.description}
                    onChange={e => setNewLab({...newLab, description: e.target.value})}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LabManagement;
