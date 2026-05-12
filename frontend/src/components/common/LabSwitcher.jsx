import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './LabSwitcher.css';

const LabSwitcher = () => {
  const { user, switchActiveLab } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fetch all labs to display names instead of IDs
    const fetchLabs = async () => {
      try {
        const response = await axios.get('/api/labs');
        setLabs(response.data);
      } catch (err) {
        console.error('Failed to fetch labs', err);
      }
    };
    fetchLabs();
  }, []);

  if (!user || (!user.labs?.length && user.role !== 'Admin')) return null;

  // Admins can see all labs; regular users see only their assigned labs
  const accessibleLabs = user.role === 'Admin' 
    ? labs 
    : labs.filter(lab => user.labs?.includes(lab._id));

  // Find active lab object
  const activeLabObj = labs.find(l => l._id === user.active_lab);

  const handleSwitch = async (labId) => {
    setLoading(true);
    await switchActiveLab(labId);
    setLoading(false);
    setIsOpen(false);
    // Reload to refresh all components to the new lab dataset
    window.location.reload();
  };

  return (
    <div className="lab-switcher-container">
      <div 
        className="lab-switcher-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="lab-switcher-info">
          <span className="lab-label">Active Lab</span>
          <span className="lab-name">{activeLabObj ? activeLabObj.name : 'No Lab Selected'}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`chevron-icon ${isOpen ? 'open' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="lab-switcher-dropdown">
          <div className="lab-switcher-header">Select Lab Context</div>
          {accessibleLabs.length === 0 ? (
            <div className="lab-item-empty">No accessible labs</div>
          ) : (
            accessibleLabs.map(lab => (
              <div 
                key={lab._id} 
                className={`lab-item ${user.active_lab === lab._id ? 'active' : ''}`}
                onClick={() => handleSwitch(lab._id)}
              >
                <div className="lab-item-name">{lab.name}</div>
                {user.active_lab === lab._id && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))
          )}
          {loading && <div className="lab-switcher-loading">Switching...</div>}
        </div>
      )}
    </div>
  );
};

export default LabSwitcher;
