import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowUpDown, Calendar, Beaker, Package, MapPin, User,
  MessageSquare, CheckCircle, XCircle, Plus, Info,
  Clock, ArrowRightLeft, Ban, UploadCloud, DownloadCloud, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../layout/Layout';
import './TransferDashboard.css';

const TransferDashboard = () => {
  const { user, hasPermission } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allLabs, setAllLabs] = useState([]);

  const [form, setForm] = useState({
    source_lab: '', chemical_id: '', batch_number: '',
    container_id: '', quantity_moved: '', unit: 'ml', reason: '',
  });

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

  // Chemical search
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!form.source_lab || selectedChem) return;
    setChemLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/transfers/lab-chemicals/${form.source_lab}`, {
          params: { search: chemSearch.trim(), limit: 15 }
        });
        const list = res.data?.data ?? [];
        setChemResults(list);
        if (list.length > 0 || chemSearch.trim()) setDropdownOpen(true);
      } catch {
        setChemResults([]);
        setDropdownOpen(false);
      } finally {
        setChemLoading(false);
      }
    }, chemSearch.trim() ? 350 : 0);
    return () => clearTimeout(timerRef.current);
  }, [chemSearch, selectedChem, form.source_lab]);

  const pickChem = (chem) => {
    setSelectedChem(chem);
    setChemSearch('');
    setDropdownOpen(false);
    setChemResults([]);
    setForm(f => ({ ...f, chemical_id: chem._id, unit: chem.unit || f.unit, batch_number: chem.batch_number || '' }));
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

  useEffect(() => { fetchTransfers(); fetchLabs(); }, [user?.active_lab]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/transfers');
      setTransfers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch transfers');
    } finally { setLoading(false); }
  };

  const fetchLabs = async () => {
    try {
      const res = await axios.get('/api/labs?all=true');
      setAllLabs(res.data.filter(l => String(l._id) !== String(user.active_lab)));
    } catch {}
  };

  const handleApprove = async (id) => {
    try { await axios.put(`/api/transfers/${id}/approve`); fetchTransfers(); }
    catch (err) { toast.error(err.response?.data?.error || 'Approval failed', { duration: 10000 }); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):') ?? 'No reason provided';
    try { await axios.put(`/api/transfers/${id}/reject`, { reason }); fetchTransfers(); }
    catch (err) { toast.error(err.response?.data?.error || 'Rejection failed', { duration: 10000 }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.source_lab)  { toast.error('Please select the provider lab.',          { duration: 10000 }); return; }
    if (!form.chemical_id) { toast.error('Please select a chemical from the list.',  { duration: 10000 }); return; }
    if (!form.quantity_moved || form.quantity_moved <= 0) { toast.error('Please enter a valid quantity.', { duration: 10000 }); return; }
    try {
      await axios.post('/api/transfers', form);
      setIsModalOpen(false);
      resetModal();
      toast.success('Requisition submitted successfully', { duration: 10000 });
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Transfer request failed', { duration: 10000 });
    }
  };

  const statusBadge = (s) => {
    const cls = s === 'Pending' ? 'status-pending' : s === 'Approved' ? 'status-approved' : 'status-rejected';
    return <span className={`status-badge ${cls}`}>{s}</span>;
  };

  const isSourceLab = (t) => String(t.source_lab?._id) === String(user.active_lab);
  const canApprove  = (t) =>
    t.status === 'Pending' && isSourceLab(t) &&
    (hasPermission('approve_cross_lab_transfer') || hasPermission('approve_request') ||
     user.role === 'Admin' || user.role === 'Lab Manager');

  return (
    <Layout>
      <div className="transfer-dashboard">

        {/* ── Header ─────────────────────────────────── */}
        <div className="transfer-header">
          <div>
            <h1>Chemical Requisitions</h1>
            <p>Request chemicals from other labs. Provider lab approves and sends them.</p>
          </div>
          <button
            className="btn-primary-glow"
            onClick={() => { setIsModalOpen(true); resetModal(); }}
          >
            <ArrowRightLeft size={16} />
            New Requisition
          </button>
        </div>

        {/* ── Legend ─────────────────────────────────── */}
        <div className="transfer-legend">
          <span className="legend-item">
            <UploadCloud size={14} />
            <strong>Outgoing</strong>: Another lab requested from you (you approve)
          </span>
          <span className="legend-item">
            <DownloadCloud size={14} />
            <strong>Incoming</strong>: You requested from another lab
          </span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* ── List ───────────────────────────────────── */}
        <div className="transfer-list">
          {loading ? (
            <div className="empty-state">Loading requisitions…</div>
          ) : transfers.length === 0 ? (
            <div className="empty-state">
              No requisitions found. Click <strong>"New Requisition"</strong> to request a chemical from another lab.
            </div>
          ) : (
            <>
              {/* ── Desktop Table (≥ 1025px) ─── */}
              <div className="table-scroll-container">
                <table className="transfer-table">
                  <colgroup>
                    <col className="col-type" />
                    <col className="col-date" />
                    <col className="col-chemical" />
                    <col className="col-qty" />
                    <col className="col-provider" />
                    <col className="col-requester" />
                    <col className="col-reason" />
                    <col className="col-status" />
                    <col className="col-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th><div className="th-flex"><ArrowRightLeft size={10} /> Type</div></th>
                      <th><div className="th-flex"><Calendar size={10} /> Date</div></th>
                      <th><div className="th-flex"><Beaker size={10} /> Chemical</div></th>
                      <th><div className="th-flex"><Package size={10} /> Quantity</div></th>
                      <th><div className="th-flex"><MapPin size={10} /> Provider</div></th>
                      <th><div className="th-flex"><User size={10} /> Requester</div></th>
                      <th><div className="th-flex"><MessageSquare size={10} /> Reason</div></th>
                      <th><div className="th-flex"><Info size={10} /> Status</div></th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t, idx) => (
                      <tr key={t._id} style={{ '--index': idx }}>
                        <td>
                          {isSourceLab(t)
                            ? <span className="dir-badge dir-out"><UploadCloud size={10} /> Outgoing</span>
                            : <span className="dir-badge dir-in"><DownloadCloud size={10} /> Incoming</span>}
                        </td>
                        <td>
                          <div className="td-with-icon">
                            <Clock size={10} className="td-icon-muted" />
                            {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div className="chem-identity-cell">
                            <span className="chem-main-name">{t.chemical_id?.name || '—'}</span>
                            <span className="chem-sub-id">{t.chemical_id?.id}</span>
                          </div>
                        </td>
                        <td>
                          <span className="qty-tag">{t.quantity_moved} <small style={{ fontSize: '0.65rem', opacity: 0.6 }}>{t.unit}</small></span>
                        </td>
                        <td>
                          <div className="td-with-icon">
                            <MapPin size={10} className="td-icon-muted" />
                            <span>{t.source_lab?.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="td-with-icon">
                            <User size={10} className="td-icon-muted" />
                            <span>{t.requested_by?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="reason-cell">{t.reason || '—'}</td>
                        <td>{statusBadge(t.status)}</td>
                        <td>
                          {canApprove(t) && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn-success-small" onClick={() => handleApprove(t._id)}>
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button className="btn-danger-small" onClick={() => handleReject(t._id)}>
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile / Tablet Cards (≤ 1024px) ─── */}
              <div className="transfer-cards-view">
                {transfers.map(t => (
                  <div key={t._id} className="transfer-mobile-card">

                    {/* Top row: direction badge + qty pill */}
                    <div className="card-top">
                      {isSourceLab(t)
                        ? <span className="dir-badge dir-out"><UploadCloud size={12} /> Outgoing</span>
                        : <span className="dir-badge dir-in"><DownloadCloud size={12} /> Incoming</span>}
                      <div className="card-qty-pill">{t.quantity_moved} {t.unit}</div>
                    </div>

                    {/* Chemical identity */}
                    <div className="card-chem-info">
                      <div className="card-chem-name">{t.chemical_id?.name || '—'}</div>
                      {t.chemical_id?.id && <div className="card-chem-id">{t.chemical_id.id}</div>}
                    </div>

                    {/* Meta rows */}
                    <div className="card-meta">
                      <div className="meta-row">
                        <Calendar size={14} className="meta-icon" />
                        {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                      <div className="meta-row">
                        <MapPin size={14} className="meta-icon" />
                        <span><strong>From:</strong> {t.source_lab?.name || '—'}</span>
                      </div>
                      <div className="meta-row">
                        <User size={14} className="meta-icon" />
                        <span><strong>By:</strong> {t.requested_by?.name || '—'}</span>
                      </div>
                      {t.reason && (
                        <div className="meta-row" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                          <MessageSquare size={14} className="meta-icon" />
                          "{t.reason}"
                        </div>
                      )}
                    </div>

                    {/* Footer: status + actions */}
                    <div className="card-footer">
                      {statusBadge(t.status)}
                      {canApprove(t) && (
                        <div className="card-actions">
                          <button className="btn-success-small" onClick={() => handleApprove(t._id)}>
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button className="btn-danger-small" onClick={() => handleReject(t._id)}>
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            MODAL – New Requisition
        ══════════════════════════════════════════════ */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="transfer-modal">

              {/* Modal Header */}
              <div className="modal-modal-header">
                <div>
                  <h2>Request Chemical</h2>
                  <p>Request a chemical FROM another lab. Their manager will approve.</p>
                </div>
                <button className="modal-close-x" onClick={() => { setIsModalOpen(false); resetModal(); }}>
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} className="transfer-form">

                {/* 1. Provider Lab */}
                <div className="form-group">
                  <label>Provider Lab (has the chemical) *</label>
                  <select
                    required
                    value={form.source_lab}
                    onChange={e => { setForm(f => ({ ...f, source_lab: e.target.value })); clearChem(); }}
                  >
                    <option value="">Select lab to request from…</option>
                    {allLabs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>

                {/* 2. Chemical Search */}
                <div className="form-group" ref={wrapRef} style={{ position: 'relative' }}>
                  <label>Chemical *</label>

                  {!form.source_lab && (
                    <div className="chem-search-hint">⬆ First select a provider lab above</div>
                  )}

                  {form.source_lab && (selectedChem ? (
                    /* Selected state */
                    <div className="selected-chem-card">
                      <div className="selected-chem-info">
                        <span className="selected-chem-name">{selectedChem.name}</span>
                        <span className="selected-chem-id">
                          ID: {selectedChem.id}
                          {selectedChem.cas_number ? ` · CAS: ${selectedChem.cas_number}` : ''}
                          {` · ${selectedChem.quantity ?? '?'} ${selectedChem.unit ?? ''}`}
                        </span>
                      </div>
                      <button type="button" className="clear-chem-btn" onClick={clearChem} title="Change chemical">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    /* Search input */
                    <div className="chem-search-wrap">
                      <svg className="chem-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Type chemical name or CAS…"
                        value={chemSearch}
                        onChange={e => setChemSearch(e.target.value)}
                        onFocus={() => { if (chemResults.length > 0 || !chemSearch.trim()) setDropdownOpen(true); }}
                        autoComplete="off"
                      />
                      {chemLoading && <div className="chem-search-spinner" />}
                    </div>
                  ))}

                  {/* Dropdown */}
                  {dropdownOpen && !selectedChem && form.source_lab && (
                    <div className="chem-dropdown">
                      {chemResults.length > 0 ? chemResults.map(chem => (
                        <div key={chem._id} className="chem-dropdown-item" onMouseDown={() => pickChem(chem)}>
                          <div className="chem-item-name">{chem.name}</div>
                          <div className="chem-item-meta">
                            <span className="chem-id-badge">{chem.id}</span>
                            {chem.cas_number && <span className="chem-cas-badge">CAS: {chem.cas_number}</span>}
                            {chem.formula    && <span className="chem-formula-badge">{chem.formula}</span>}
                            <span className="chem-qty-badge">{chem.quantity ?? '?'} {chem.unit}</span>
                            <span className={`chem-status-dot ${
                              chem.status === 'In Stock' ? 'dot-green' :
                              chem.status === 'Low Stock' || chem.status === 'Near Expiry' ? 'dot-amber' : 'dot-red'
                            }`}>{chem.status}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="chem-no-results">
                          <Ban size={22} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                          {chemLoading ? 'Searching…' : (
                            <>
                              <div style={{ fontWeight: 900, color: '#475569' }}>Chemical Not Found</div>
                              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
                                No results for "{chemSearch}" in this lab.
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Batch & Container */}
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

                {/* 4. Quantity & Unit */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" required min="0.001" step="any" placeholder="Amount"
                      value={form.quantity_moved}
                      onChange={e => setForm(f => ({ ...f, quantity_moved: e.target.value }))} />
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

                {/* 5. Reason */}
                <div className="form-group">
                  <label>Reason / Purpose</label>
                  <textarea
                    rows="3"
                    placeholder="e.g. Running low on stock for experiment #34, urgently needed…"
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  />
                </div>

                {/* Submit Row */}
                <div className="modal-actions">
                  <button type="button" className="btn-form-secondary"
                    onClick={() => { setIsModalOpen(false); resetModal(); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-glow">
                    <ArrowUpDown size={16} />
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

