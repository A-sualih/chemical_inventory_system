import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../layout/Layout';
import './TransferDashboard.css';

const TransferDashboard = () => {
  const { user, hasPermission } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableLabs, setAvailableLabs] = useState([]);

  // Form state
  const [form, setForm] = useState({
    destination_lab: '',
    chemical_id: '',
    batch_number: '',
    container_id: '',
    quantity_moved: '',
    unit: 'ml',
  });

  // Chemical search
  const [chemSearch, setChemSearch] = useState('');
  const [chemResults, setChemResults] = useState([]);
  const [chemLoading, setChemLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedChem, setSelectedChem] = useState(null);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  // Outside click closes dropdown
  useEffect(() => {
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Search chemicals with debounce
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!chemSearch.trim() || selectedChem) return;

    setChemLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get('/api/chemicals', {
          params: { search: chemSearch.trim(), limit: 15 }
        });
        // API returns { data: [...], total, ... }
        const list = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
        setChemResults(list);
        setDropdownOpen(true);
      } catch (err) {
        console.error('Chem search error:', err);
        setChemResults([]);
        setDropdownOpen(false);
      } finally {
        setChemLoading(false);
      }
    }, 350);

    return () => clearTimeout(timerRef.current);
  }, [chemSearch, selectedChem]);

  const pickChem = (chem) => {
    setSelectedChem(chem);
    setChemSearch('');
    setDropdownOpen(false);
    setChemResults([]);
    setForm(f => ({
      ...f,
      chemical_id: chem.id,
      unit: chem.unit || f.unit,
      batch_number: chem.batch_number || '',
    }));
  };

  const clearChem = () => {
    setSelectedChem(null);
    setChemSearch('');
    setChemResults([]);
    setDropdownOpen(false);
    setForm(f => ({ ...f, chemical_id: '', batch_number: '' }));
  };

  const resetModal = () => {
    setForm({ destination_lab: '', chemical_id: '', batch_number: '', container_id: '', quantity_moved: '', unit: 'ml' });
    clearChem();
  };

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
      setAvailableLabs(res.data.filter(l => l._id !== user.active_lab));
    } catch {}
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/transfers/${id}/approve`);
      fetchTransfers();
    } catch (err) { alert(err.response?.data?.message || 'Approval failed'); }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`/api/transfers/${id}/reject`, { reason: 'Manually rejected' });
      fetchTransfers();
    } catch (err) { alert(err.response?.data?.message || 'Rejection failed'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.chemical_id) { alert('Please select a chemical.'); return; }
    try {
      await axios.post('/api/transfers', form);
      setIsModalOpen(false);
      resetModal();
      fetchTransfers();
    } catch (err) {
      alert(err.response?.data?.message || 'Transfer request failed');
    }
  };

  const statusBadge = (s) => {
    const cls = s === 'Pending' ? 'status-pending' : s === 'Approved' ? 'status-approved' : 'status-rejected';
    return <span className={`status-badge ${cls}`}>{s}</span>;
  };

  return (
    <Layout>
      <div className="transfer-dashboard">
        <div className="transfer-header">
          <div>
            <h1>Cross-Lab Transfers</h1>
            <p>Administer chemical movements and provenance across facilities.</p>
          </div>
          <button className="btn-primary-glow" onClick={() => { setIsModalOpen(true); resetModal(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{width:'1.25rem',height:'1.25rem',marginRight:'0.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Initiate Transfer
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="transfer-list">
          {loading ? (
            <div className="empty-state">Loading transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="empty-state">No active transfers found for this facility.</div>
          ) : (
            <table className="transfer-table">
              <thead>
                <tr>
                  <th>Date</th><th>Chemical</th><th>Quantity</th>
                  <th>From</th><th>To</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t._id}>
                    <td>{new Date(t.transfer_date).toLocaleDateString()}</td>
                    <td style={{fontWeight:700}}>{t.chemical_id?.name || 'Unknown'}</td>
                    <td>{t.quantity_moved} {t.unit}</td>
                    <td>{t.source_lab?.name}</td>
                    <td>{t.destination_lab?.name}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>
                      {t.status === 'Pending' && t.source_lab?._id === user.active_lab &&
                        (hasPermission('approve_cross_lab_transfer') || hasPermission('approve_request')) && (
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

        {/* Transfer Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="transfer-modal">
              <div className="modal-modal-header">
                <h2>Initiate Protocol Transfer</h2>
                <button className="modal-close-x" onClick={() => { setIsModalOpen(false); resetModal(); }}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Recipient Lab */}
                <div className="form-group">
                  <label>Recipient Facility *</label>
                  <select required value={form.destination_lab} onChange={e => setForm(f => ({...f, destination_lab: e.target.value}))}>
                    <option value="">Select laboratory...</option>
                    {availableLabs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>

                {/* Chemical Search */}
                <div className="form-group" ref={wrapRef} style={{position:'relative'}}>
                  <label>Chemical *</label>

                  {selectedChem ? (
                    // Show selected card
                    <div className="selected-chem-card">
                      <div className="selected-chem-info">
                        <span className="selected-chem-name">{selectedChem.name}</span>
                        <span className="selected-chem-id">
                          ID: {selectedChem.id}
                          {selectedChem.cas_number ? ` · CAS: ${selectedChem.cas_number}` : ''}
                          {` · ${selectedChem.quantity ?? '?'} ${selectedChem.unit ?? ''}`}
                        </span>
                      </div>
                      <button type="button" className="clear-chem-btn" onClick={clearChem} title="Change chemical">✕</button>
                    </div>
                  ) : (
                    // Show search input
                    <div className="chem-search-wrap">
                      <svg className="chem-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                      <input
                        type="text"
                        className="chem-search-input"
                        placeholder="Type name, CAS, formula or ID..."
                        value={chemSearch}
                        onChange={e => setChemSearch(e.target.value)}
                        onFocus={() => { if (chemResults.length > 0) setDropdownOpen(true); }}
                        autoComplete="off"
                      />
                      {chemLoading && <div className="chem-search-spinner"/>}
                    </div>
                  )}

                  {/* Dropdown */}
                  {dropdownOpen && !selectedChem && (
                    <div className="chem-dropdown">
                      {chemResults.length > 0 ? (
                        chemResults.map(chem => (
                          <div key={chem._id} className="chem-dropdown-item" onMouseDown={() => pickChem(chem)}>
                            <div className="chem-item-name">{chem.name}</div>
                            <div className="chem-item-meta">
                              <span className="chem-id-badge">{chem.id}</span>
                              {chem.cas_number && <span>CAS: {chem.cas_number}</span>}
                              {chem.formula && <span>{chem.formula}</span>}
                              <span>{chem.quantity ?? '?'} {chem.unit}</span>
                              <span className={`chem-status-dot ${
                                chem.status === 'In Stock' ? 'dot-green' :
                                chem.status === 'Low Stock' || chem.status === 'Near Expiry' ? 'dot-amber' : 'dot-red'
                              }`}>{chem.status}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="chem-no-results">
                          {chemLoading ? 'Searching...' : `No chemicals found for "${chemSearch}"`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Batch & Container */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Batch Number</label>
                    <input type="text" placeholder="Optional" value={form.batch_number}
                      onChange={e => setForm(f => ({...f, batch_number: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Container ID</label>
                    <input type="text" placeholder="Optional" value={form.container_id}
                      onChange={e => setForm(f => ({...f, container_id: e.target.value}))} />
                  </div>
                </div>

                {/* Quantity & Unit */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" required min="0.001" step="any" placeholder="Amount"
                      value={form.quantity_moved} onChange={e => setForm(f => ({...f, quantity_moved: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Unit *</label>
                    <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="mg">mg</option>
                      <option value="µL">µL</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" style={{borderRadius:'1rem',padding:'0.875rem 1.5rem'}}
                    onClick={() => { setIsModalOpen(false); resetModal(); }}>Abort</button>
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
