import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ArrowUpDown,
  Calendar,
  Beaker,
  Package,
  MapPin,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  Plus,
  Info,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../layout/Layout';
import { UploadCloud, DownloadCloud, X } from 'lucide-react';
import './TransferDashboard.css';

const TransferDashboard = () => {
  const { user, hasPermission } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allLabs, setAllLabs] = useState([]);

  // Form state
  const [form, setForm] = useState({
    source_lab: '',       // The lab that HAS the chemical (provider)
    chemical_id: '',      // Mongo _id of the chemical
    batch_number: '',
    container_id: '',
    quantity_moved: '',
    unit: 'ml',
    reason: '',
  });

  // Chemical search state
  const [chemSearch, setChemSearch] = useState('');
  const [chemResults, setChemResults] = useState([]);
  const [chemLoading, setChemLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedChem, setSelectedChem] = useState(null);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Search chemicals belonging to the selected provider lab
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!chemSearch.trim() || selectedChem || !form.source_lab) return;

    setChemLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        // Dedicated endpoint that ignores activeLabId — scoped to provider lab only
        const res = await axios.get(`/api/transfers/lab-chemicals/${form.source_lab}`, {
          params: { search: chemSearch.trim(), limit: 15 }
        });
        const list = res.data?.data ?? [];
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
  }, [chemSearch, selectedChem, form.source_lab]);

  const pickChem = (chem) => {
    setSelectedChem(chem);
    setChemSearch('');
    setDropdownOpen(false);
    setChemResults([]);
    setForm(f => ({
      ...f,
      chemical_id: chem._id,  // ← send MongoDB _id, not string id
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
    setForm({ source_lab: '', chemical_id: '', batch_number: '', container_id: '', quantity_moved: '', unit: 'ml', reason: '' });
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
      setAllLabs(res.data.filter(l => l._id !== user.active_lab));
    } catch { }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/transfers/${id}/approve`);
      fetchTransfers();
    } catch (err) { alert(err.response?.data?.error || 'Approval failed'); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):') ?? 'No reason provided';
    try {
      await axios.put(`/api/transfers/${id}/reject`, { reason });
      fetchTransfers();
    } catch (err) { alert(err.response?.data?.error || 'Rejection failed'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.source_lab) { alert('Please select the provider lab.'); return; }
    if (!form.chemical_id) { alert('Please select a chemical from the search list.'); return; }
    if (!form.quantity_moved || form.quantity_moved <= 0) { alert('Please enter a valid quantity.'); return; }
    try {
      await axios.post('/api/transfers', form);
      setIsModalOpen(false);
      resetModal();
      fetchTransfers();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Transfer request failed');
    }
  };

  const statusBadge = (s) => {
    const cls = s === 'Pending' ? 'status-pending' : s === 'Approved' ? 'status-approved' : 'status-rejected';
    return <span className={`status-badge ${cls}`}>{s}</span>;
  };

  // Whether this user's lab is the source (provider) for a given transfer
  const isSourceLab = (t) => String(t.source_lab?._id) === String(user.active_lab);
  const isDestLab = (t) => String(t.destination_lab?._id) === String(user.active_lab);

  const canApprove = (t) =>
    t.status === 'Pending' && isSourceLab(t) &&
    (hasPermission('approve_cross_lab_transfer') || hasPermission('approve_request') || user.role === 'Admin' || user.role === 'Lab Manager');

  return (
    <Layout>
      <div className="transfer-dashboard">
        <div className="transfer-header">
          <div>
            <h1>Chemical Requisitions</h1>
            <p>Request chemicals from other labs. Provider lab approves and sends them.</p>
          </div>
          <button className="btn-primary-glow" onClick={() => { setIsModalOpen(true); resetModal(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            New Requisition
          </button>
        </div>

        {/* Legend */}
        <div className="transfer-legend">
          <span className="legend-item"><UploadCloud className="w-4 h-4 inline-block mr-1" /> <strong>Outgoing</strong>: Another lab requested from you (you approve)</span>
          <span className="legend-item"><DownloadCloud className="w-4 h-4 inline-block mr-1" /> <strong>Incoming</strong>: You requested from another lab</span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="transfer-list">
          {loading ? (
            <div className="empty-state">Loading requisitions...</div>
          ) : transfers.length === 0 ? (
            <div className="empty-state">No requisitions found. Click <strong>"New Requisition"</strong> to request a chemical from another lab.</div>
          ) : (
            <table className="transfer-table">
              <thead>
                <tr>
                  <th><div className="th-flex"><ArrowRightLeft size={14} /> Type</div></th>
                  <th><div className="th-flex"><Calendar size={14} /> Date</div></th>
                  <th><div className="th-flex"><Beaker size={14} /> Chemical</div></th>
                  <th><div className="th-flex"><Package size={14} /> Quantity</div></th>
                  <th><div className="th-flex"><MapPin size={14} /> Provider</div></th>
                  <th><div className="th-flex"><User size={14} /> Requester</div></th>
                  <th><div className="th-flex"><MessageSquare size={14} /> Reason</div></th>
                  <th><div className="th-flex"><Info size={14} /> Status</div></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t, idx) => (
                  <tr key={t._id} style={{ '--index': idx }}>
                    <td data-label="Type">
                      {isSourceLab(t)
                        ? <span className="dir-badge dir-out"><UploadCloud size={12} /> Outgoing</span>
                        : <span className="dir-badge dir-in"><DownloadCloud size={12} /> Incoming</span>
                      }
                    </td>
                    <td data-label="Date">
                      <div className="td-with-icon">
                        <Clock size={14} className="td-icon-muted" />
                        {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td data-label="Chemical">
                      <div className="chem-identity-cell">
                        <span className="chem-main-name">{t.chemical_id?.name || '—'}</span>
                        <span className="chem-sub-id">{t.chemical_id?.id}</span>
                      </div>
                    </td>
                    <td data-label="Quantity">
                      <span className="qty-tag">{t.quantity_moved} <small>{t.unit}</small></span>
                    </td>
                    <td data-label="Provider Lab">
                      <div className="td-with-icon">
                        <MapPin size={14} className="td-icon-muted" />
                        {t.source_lab?.name}
                      </div>
                    </td>
                    <td data-label="Requested By">
                      <div className="td-with-icon">
                        <User size={14} className="td-icon-muted" />
                        {t.requested_by?.name || '—'}
                      </div>
                    </td>
                    <td data-label="Reason" className="reason-cell">
                      {t.reason || '—'}
                    </td>
                    <td data-label="Status">{statusBadge(t.status)}</td>
                    <td data-label="Actions">
                      {canApprove(t) && (
                        <div className="action-buttons">
                          <button className="btn-success-sm" onClick={() => handleApprove(t._id)}>
                            <CheckCircle size={14} />
                            <span>Approve</span>
                          </button>
                          <button className="btn-danger-sm" onClick={() => handleReject(t._id)}>
                            <XCircle size={14} />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Requisition Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="transfer-modal">
              <div className="modal-modal-header">
                <div>
                  <h2>Request Chemical</h2>
                  <p>Request a chemical FROM another lab. Their manager will approve.</p>
                </div>
                <button className="modal-close-x" onClick={() => { setIsModalOpen(false); resetModal(); }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="transfer-form">
                {/* Provider Lab */}
                <div className="form-group">
                  <label>Provider Lab (has the chemical) *</label>
                  <select required value={form.source_lab} onChange={e => {
                    setForm(f => ({ ...f, source_lab: e.target.value }));
                    clearChem(); // Clear chemical when lab changes
                  }}>
                    <option value="">Select lab to request from...</option>
                    {allLabs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>

                {/* Chemical Search */}
                <div className="form-group" ref={wrapRef} style={{ position: 'relative' }}>
                  <label>Chemical *</label>

                  {!form.source_lab && (
                    <div className="chem-search-hint">⬆ First select a provider lab above</div>
                  )}

                  {form.source_lab && (selectedChem ? (
                    <div className="selected-chem-card">
                      <div className="selected-chem-info">
                        <span className="selected-chem-name">{selectedChem.name}</span>
                        <span className="selected-chem-id">
                          ID: {selectedChem.id}
                          {selectedChem.cas_number ? ` · CAS: ${selectedChem.cas_number}` : ''}
                          {` · ${selectedChem.quantity ?? '?'} ${selectedChem.unit ?? ''}`}
                        </span>
                      </div>
                      <button type="button" className="clear-chem-btn" onClick={clearChem} title="Change chemical"><X className="w-4 h-4 inline-block" /></button>
                    </div>
                  ) : (
                    <div className="chem-search-wrap">
                      <svg className="chem-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        className="chem-search-input"
                        placeholder="Search by name, CAS, formula..."
                        value={chemSearch}
                        onChange={e => setChemSearch(e.target.value)}
                        onFocus={() => { if (chemResults.length > 0) setDropdownOpen(true); }}
                        autoComplete="off"
                      />
                      {chemLoading && <div className="chem-search-spinner" />}
                    </div>
                  ))}

                  {dropdownOpen && !selectedChem && form.source_lab && (
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
                              <span className={`chem-status-dot ${chem.status === 'In Stock' ? 'dot-green' :
                                chem.status === 'Low Stock' || chem.status === 'Near Expiry' ? 'dot-amber' : 'dot-red'
                                }`}>{chem.status}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="chem-no-results">
                          {chemLoading ? 'Searching...' : `No chemicals found for "${chemSearch}" in that lab`}
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
                      onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Container ID</label>
                    <input type="text" placeholder="Optional" value={form.container_id}
                      onChange={e => setForm(f => ({ ...f, container_id: e.target.value }))} />
                  </div>
                </div>

                {/* Quantity & Unit */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" required min="0.001" step="any" placeholder="Amount"
                      value={form.quantity_moved} onChange={e => setForm(f => ({ ...f, quantity_moved: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Unit *</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="mg">mg</option>
                      <option value="µL">µL</option>
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div className="form-group">
                  <label>Reason / Purpose</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Running low on stock for experiment #34, urgently needed..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    style={{
                      width: '100%',
                      background: 'var(--secondary-50)',
                      border: '1px solid var(--secondary-100)',
                      borderRadius: '1rem',
                      padding: '0.875rem 1.25rem',
                      fontSize: '0.9375rem',
                      color: 'var(--secondary-900)',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-form-secondary"
                    onClick={() => { setIsModalOpen(false); resetModal(); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-glow">
                    <ArrowUpDown size={18} />
                    Submit Requisition
                  </button>
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
