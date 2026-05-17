import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "../../layout/Layout";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { Calendar as CalendarIcon, Clock, Package as PackageIcon, CheckCircle2, ChevronRight, Hash, FlaskConical, CircleDot, AlertTriangle, Ban, PlusCircle as PlusCircleIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import "../../styles/Requests.css";

const Requests = () => {
  const { user, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New Request Form
  const [selectedChem, setSelectedChem] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [fifoContainer, setFifoContainer] = useState(null); // FIFO-correct container info
  const [submitError, setSubmitError] = useState(null);    // detailed submit error (may include FIFO info)

  // Non-Existing Chemical Request State
  const [showNewChemModal, setShowNewChemModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [inventoryRequests, setInventoryRequests] = useState([]);
  const [newChemForm, setNewChemForm] = useState({
    chemical_name: "", cas_number: "", quantity: "", unit: "kg", reason: ""
  });
  const [activeTab, setActiveTab] = useState("standard"); // "standard" or "inventory"

  // Choice B: Buy
  const [suppliers, setSuppliers] = useState([]);

  // Choice C: Transfer
  const [otherLabs, setOtherLabs] = useState([]);
  const [otherLabChemicals, setOtherLabChemicals] = useState([]);
  const [selectedTargetLab, setSelectedTargetLab] = useState("");
  const [selectedTransferChem, setSelectedTransferChem] = useState("");
  const [processingReqId, setProcessingReqId] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get('/api/requests');
      setRequests(data);

      const { data: invData } = await axios.get('/api/requests/inventory-request');
      setInventoryRequests(invData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherLabs = async () => {
    try {
      const { data } = await axios.get('/api/labs?all=true');
      const currentLabId = String(user?.active_lab || '');
      setOtherLabs(data.filter(l => String(l._id) !== currentLabId));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChemicals = async () => {
    try {
      const { data } = await axios.get('/api/chemicals');
      setChemicals(data.data || data); // data.data if it's the paginated object, data if it's an array
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContainers = async (chemId) => {
    if (!chemId) {
      setContainers([]);
      setFifoContainer(null);
      return;
    }
    try {
      // 1. Fetch containers for this chemical
      const { data: containerData } = await axios.get(`/api/containers?chemical_id=${chemId}&lab=${user?.active_lab || ''}`);

      // 2. Fetch all requests to check for pending ones
      const { data: requestData } = await axios.get('/api/requests');
      const pendingRequests = requestData.filter(r => r.status === 'Pending');

      const rates = {
        'kg': 1, 'g': 0.001, 'mg': 0.000001, 'mcg': 0.000000001,
        'L': 1, 'l': 1, 'mL': 0.001, 'ml': 0.001, 'ul': 0.000001, 'nl': 0.000000001
      };

      // 3. Adjust container quantities based on pending requests
      const adjustedContainers = containerData
        .filter(c => c.status !== 'Empty' && c.status !== 'Disposed')
        .map(container => {
          const containerPending = pendingRequests.filter(r =>
            r.container_id?._id === container._id || r.container_id === container._id
          );

          let pendingTotalBase = 0;
          containerPending.forEach(pr => {
            pendingTotalBase += Number(pr.quantity) * (rates[pr.unit] || 1);
          });

          const currentInBase = container.quantity * (rates[container.unit] || 1);
          const adjustedInBase = Math.max(0, currentInBase - pendingTotalBase);

          return {
            ...container,
            available_quantity: (adjustedInBase / (rates[container.unit] || 1)).toFixed(3),
            is_oversubscribed: pendingTotalBase > currentInBase
          };
        });

      setContainers(adjustedContainers);

      // 4. Fetch the FIFO-correct container from backend and auto-select it
      try {
        const { data: fifo } = await axios.get(`/api/requests/fifo-container?chemical_id=${chemId}`);
        setFifoContainer(fifo);
        setSelectedContainer(fifo.fifo_container_id); // auto-select FIFO container
      } catch {
        setFifoContainer(null);
      }
    } catch (err) {
      console.error(err);
    }
  };


  useEffect(() => {
    fetchRequests();
    if (hasPermission("submit_request")) {
      fetchChemicals();
    }
  }, [hasPermission]);

  useEffect(() => {
    const chemId = searchParams.get("chemical_id");
    if (chemId && chemicals.length > 0) {
      setSelectedChem(chemId);
    }
  }, [searchParams, chemicals]);

  useEffect(() => {
    if (selectedChem) {
      const chem = chemicals.find(c => c._id === selectedChem);
      if (chem) {
        setUnit(chem.unit);
        setFifoContainer(null);
        setSubmitError(null);
        fetchContainers(selectedChem);
      }
    } else {
      setContainers([]);
      setSelectedContainer("");
      setFifoContainer(null);
      setSubmitError(null);
    }
  }, [selectedChem]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!selectedChem || !selectedContainer || !quantity || !reason) {
      toast.error("Please fill in all required fields.", { duration: 10000 });
      return;
    }

    const container = containers.find(c => c._id === selectedContainer);
    if (container) {
      const rates = {
        'kg': 1, 'g': 0.001, 'mg': 0.000001, 'mcg': 0.000000001,
        'L': 1, 'l': 1, 'mL': 0.001, 'ml': 0.001, 'ul': 0.000001, 'nl': 0.000000001
      };
      const requestedInBase = Number(quantity) * (rates[unit] || 1);
      const availableInBase = Number(container.available_quantity) * (rates[container.unit] || 1);
      if (requestedInBase > availableInBase + 0.000001) {
        const availableInRequestedUnit = (availableInBase / (rates[unit] || 1)).toFixed(2);
        setSubmitError({ error: `Insufficient amount! This container only has ${availableInRequestedUnit} ${unit} truly available.` });
        return;
      }
    }

    setSubmitting(true);
    try {
      await axios.post('/api/requests', {
        chemical_id: selectedChem,
        container_id: selectedContainer,
        quantity: Number(quantity),
        unit,
        reason
      });
      toast.success("Request submitted successfully and is pending approval.", { duration: 10000 });
      setSelectedChem("");
      setSelectedContainer("");
      setQuantity("");
      setReason("");
      setFifoContainer(null);
      setSubmitError(null);
      setShowRequestModal(false); // Close modal
      fetchRequests();
    } catch (err) {
      const errData = err.response?.data;
      setSubmitError(errData || { error: "Error submitting request" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id, status, actionNotes) => {
    try {
      const endpoint = status === 'Approved' ? 'approve' : 'reject';
      await axios.patch(`/api/requests/${id}/${endpoint}`, { notes: actionNotes });
      toast.success(`Request ${status.toLowerCase()} successfully.`, { duration: 10000 });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || `Error ${status.toLowerCase()} request`, { duration: 10000 });
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) return;
    try {
      await axios.patch(`/api/requests/${id}/cancel`);
      toast.success("Request cancelled successfully.", { duration: 10000 });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error cancelling request", { duration: 10000 });
    }
  };

  const handleSubmitInventoryRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/requests/inventory-request', newChemForm);
      toast.success("New chemical request submitted successfully.", { duration: 10000 });
      setNewChemForm({ chemical_name: "", cas_number: "", quantity: "", unit: "kg", reason: "" });
      setShowNewChemModal(false);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error submitting inventory request", { duration: 10000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInventoryReject = async () => {
    try {
      await axios.patch(`/api/requests/inventory-request/${processingReqId}/reject`, { notes: rejectNotes });
      toast.success("Request rejected and technician notified.", { duration: 10000 });
      setShowRejectModal(false);
      setRejectNotes("");
      fetchRequests();
    } catch (err) {
      alert("Failed to reject request");
    }
  };

  const handleInventoryEnroll = (req) => {
    const params = new URLSearchParams({
      name: req.chemical_name || '',
      cas: req.cas_number || '',
      quantity: req.quantity || '',
      unit: req.unit || 'kg'
    });
    navigate(`/chemicals/new?${params.toString()}`);
  };

  const handleInventoryTransfer = async () => {
    if (!selectedTargetLab || !selectedTransferChem) {
      toast.error("Select lab and chemical", { duration: 10000 });
      return;
    }
    try {
      await axios.patch(`/api/requests/inventory-request/${processingReqId}/transfer`, {
        target_lab_id: selectedTargetLab,
        chemical_id: selectedTransferChem
      });
      toast.success("Transfer request sent to the other lab manager.", { duration: 10000 });
      setShowTransferModal(false);
      fetchRequests();
    } catch (err) {
      toast.error("Failed to send transfer request", { duration: 10000 });
    }
  };

  const handleCancelInventoryRequest = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) return;
    try {
      await axios.patch(`/api/requests/inventory-request/${id}/cancel`);
      toast.success("Request cancelled successfully.", { duration: 10000 });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error cancelling request", { duration: 10000 });
    }
  };

  useEffect(() => {
    if (selectedTargetLab) {
      axios.get(`/api/chemicals?lab=${selectedTargetLab}`)
        .then(res => setOtherLabChemicals(res.data.data || res.data))
        .catch(err => console.error(err));
    }
  }, [selectedTargetLab]);

  return (
    <Layout>
      <div className="requests-header">
        <div>
          <h1 className="requests-title">Request & Approval System</h1>
          <p className="requests-subtitle">Every usage must go through a request → approval process.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {hasPermission("submit_request") && user?.role !== "Lab Manager" && (
            <>
              <button onClick={() => setShowRequestModal(true)} className="btn-primary" style={{ height: '2.5rem', width: 'auto', padding: '0 1.25rem', margin: 0 }}>
                <PackageIcon size={18} /> Submit Usage Request
              </button>
              <button onClick={() => setShowNewChemModal(true)} className="btn-secondary" style={{ height: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FlaskConical size={18} /> Request New Chemical
              </button>
            </>
          )}
          <button onClick={fetchRequests} className="refresh-btn">
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      <div className="requests-layout">

        {/* Step 5.2 — Submit Request (Normal User Side) - NOW IN MODAL */}
        {showRequestModal && (
          <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
            <div className="requests-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="panel-heading" style={{ marginBottom: 0 }}>
                  <span className="step-indicator step-1">1</span>
                  Submit Request
                </h2>
                <button onClick={() => setShowRequestModal(false)} className="close-modal-btn">
                  <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmitRequest} className="form-layout">
                <div>
                  <label className="form-label">Select Chemical</label>
                  <select
                    value={selectedChem}
                    onChange={(e) => setSelectedChem(e.target.value)}
                    required
                    className="form-input"
                  >
                    <option value="">-- Choose Chemical --</option>
                    {chemicals.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.id})</option>
                    ))}
                  </select>
                </div>

                {selectedChem && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', padding: '0 0.25rem' }}>
                      <label className="form-label" style={{ padding: 0 }}>Select Container</label>
                      {fifoContainer && (
                        <span className="fifo-badge"><CircleDot className="w-4 h-4 inline-block mr-1 text-blue-500" /> FIFO auto-selected</span>
                      )}
                    </div>
                    <select
                      value={selectedContainer}
                      onChange={(e) => { setSelectedContainer(e.target.value); setSubmitError(null); }}
                      required
                      className="form-input"
                    >
                      <option value="">-- Choose Container --</option>
                      {containers.map(c => {
                        const isFifo = fifoContainer && c._id === fifoContainer.fifo_container_id;
                        return (
                          <option key={c._id} value={c._id}>
                            {isFifo ? "[FIFO] " : ""}{c.container_id} — {c.available_quantity} {c.unit} available{c.location ? ` · ${c.location}` : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* FIFO deviation warning */}
                    {fifoContainer && selectedContainer && selectedContainer !== fifoContainer.fifo_container_id && (
                      <div className="fifo-warning">
                        <span style={{ color: '#f59e0b', fontSize: '1.125rem', lineHeight: 1 }}><AlertTriangle className="w-5 h-5 inline-block" /></span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>FIFO Order Warning</p>
                          <p style={{ fontSize: '11px', color: '#d97706', marginTop: '0.125rem' }}>
                            You must finish <strong>{fifoContainer.container_id}</strong> first ({fifoContainer.available_quantity} {fifoContainer.unit} left).
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedContainer(fifoContainer.fifo_container_id)}
                            style={{ marginTop: '0.375rem', fontSize: '11px', fontWeight: 900, color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            → Switch to FIFO container
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid-cols-quantity">
                  <div className="col-span-q">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      className="form-input"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="form-label">Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="form-input"
                      style={{ fontWeight: 700, color: 'var(--secondary-900)' }}
                    >
                      {chemicals.find(c => c._id === selectedChem)?.state?.toLowerCase() === 'liquid' ||
                        chemicals.find(c => c._id === selectedChem)?.unit === 'L' ||
                        chemicals.find(c => c._id === selectedChem)?.unit === 'mL' ? (
                        <>
                          <option value="L">L</option>
                          <option value="mL">mL</option>
                          <option value="ul">µL</option>
                        </>
                      ) : (
                        <>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="mg">mg</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Reason (Experiment/Project)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="form-input"
                    rows="3"
                    placeholder="Why do you need this?"
                  ></textarea>
                </div>

                {submitError && (
                  <div className="submit-error-box">
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>
                      <Ban className="w-4 h-4 inline-block text-red-500 mr-2" /> {submitError.error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 5.3 — Approval System (Manager side) */}
        <div className="requests-panel col-span-3">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <h2
                className={`panel-heading ${activeTab === 'standard' ? 'active-tab' : 'inactive-tab'}`}
                onClick={() => setActiveTab('standard')}
                style={{ marginBottom: 0, cursor: 'pointer', borderBottom: activeTab === 'standard' ? '3px solid var(--waste-primary)' : 'none', paddingBottom: '0.5rem' }}
              >
                Standard Usage
              </h2>
              <h2
                className={`panel-heading ${activeTab === 'inventory' ? 'active-tab' : 'inactive-tab'}`}
                onClick={() => setActiveTab('inventory')}
                style={{ marginBottom: 0, cursor: 'pointer', borderBottom: activeTab === 'inventory' ? '3px solid var(--waste-primary)' : 'none', paddingBottom: '0.5rem' }}
              >
                New Chemical Requests
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="total-badge">
                Total: {activeTab === 'standard' ? requests.length : inventoryRequests.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="loading-view">
              <div className="spinner-primary"></div>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary-400)', marginTop: '1rem' }}>Loading requests ledger...</p>
            </div>
          ) : activeTab === 'standard' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requests.length === 0 && (
                <div className="empty-state">
                  <PackageIcon size={48} style={{ color: 'var(--secondary-200)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--secondary-500)', fontWeight: 500, marginBottom: '1.5rem' }}>No requests in queue.</p>
                  {hasPermission("submit_request") && user?.role !== "Lab Manager" && (
                    <button onClick={() => setShowRequestModal(true)} className="btn-primary" style={{ width: 'auto', margin: '0 auto', padding: '0 2rem' }}>
                      Start Usage Request
                    </button>
                  )}
                </div>
              )}

              {requests.map(req => (
                <div key={req._id} className="request-card">
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="req-header">
                        <span className="req-title">{req.chemical_id?.name || "Unknown Chemical"}</span>
                        <span className={`req-status status-${req.status}`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="req-details-grid">
                        <div className="req-detail-item">
                          <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Requester: <span className="req-detail-val">{req.user_id?.name || "Unknown"}</span>
                        </div>
                        <div className="req-detail-item">
                          <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                          Container: <span className="req-detail-val">{req.container_id?.container_id || "N/A"}</span>
                        </div>
                        <div className="req-detail-item">
                          <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Requested: <span className="req-detail-val">{new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                        {req.handled_at && (
                          <div className="req-detail-item">
                            <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Handled: <span className="req-detail-val">{new Date(req.handled_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="req-reason-box">
                        <p style={{ color: 'var(--secondary-400)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.25rem' }}>Reason for usage</p>
                        <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--secondary-700)' }}>"{req.reason}"</p>
                      </div>

                      {req.notes && (
                        <div className="req-notes-box">
                          <p style={{ color: '#60a5fa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.25rem' }}>Decision Notes</p>
                          <p style={{ fontSize: '0.875rem', color: '#1d4ed8', fontWeight: 500 }}>{req.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="req-action-col">
                    <div className="amount-box">
                      <span className="amount-label">Amount Needed</span>
                      <span className="amount-val">{req.quantity} <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#60a5fa' }}>{req.unit}</span></span>
                    </div>

                    {req.status === 'Pending' && req.user_id?._id === user?.id && (
                      <button
                        onClick={() => handleCancelRequest(req._id)}
                        className="btn-cancel"
                        style={{ marginTop: '0.5rem' }}
                      >
                        <Ban size={14} className="mr-2" /> Cancel Request
                      </button>
                    )}

                    {req.status === 'Pending' && hasPermission("approve_request") && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <textarea
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Decision notes..."
                          className="action-textarea"
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              if (window.confirm("Approve this usage request? Stock will be reduced.")) {
                                handleAction(req._id, 'Approved', notes);
                                setNotes("");
                              }
                            }}
                            className="btn-approve"
                            title="Approve Request"
                          >
                            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }} className="hide-on-mobile">Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Reject this request?")) {
                                handleAction(req._id, 'Rejected', notes);
                                setNotes("");
                              }
                            }}
                            className="btn-reject"
                            title="Reject Request"
                          >
                            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }} className="hide-on-mobile">Reject</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {inventoryRequests.length === 0 && (
                <div className="empty-state">
                  <p style={{ color: 'var(--secondary-500)', fontWeight: 500 }}>No new chemical requests found.</p>
                </div>
              )}
              {inventoryRequests.map(req => (
                <div key={req._id} className="request-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="req-header">
                        <span className="req-title" style={{ color: '#6d28d9' }}>{req.chemical_name} {req.cas_number && `(${req.cas_number})`}</span>
                        <span className={`req-status status-${req.status.toLowerCase().replace(' ', '-')}`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="req-details-grid">
                        <div className="req-detail-item">
                          <PackageIcon size={14} /> Amount: <span className="req-detail-val">{req.quantity} {req.unit}</span>
                        </div>
                        <div className="req-detail-item">
                          <Clock size={14} /> Requested: <span className="req-detail-val">{new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="req-detail-item">
                          <CheckCircle2 size={14} /> Action Taken: <span className="req-detail-val">{req.action_taken}</span>
                        </div>
                      </div>

                      <div className="req-reason-box" style={{ background: '#f5f3ff' }}>
                        <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: '#5b21b6' }}>"{req.reason}"</p>
                      </div>

                      {req.manager_notes && (
                        <div className="req-notes-box">
                          <p style={{ color: '#6d28d9', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.25rem' }}>Manager Notes</p>
                          <p style={{ fontSize: '0.875rem', color: '#4c1d95', fontWeight: 500 }}>{req.manager_notes}</p>
                        </div>
                      )}
                    </div>

                    {req.status === 'Pending' && hasPermission("approve_request") && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                        {req.requester?._id === user?.id && (
                          <button
                            onClick={() => handleCancelInventoryRequest(req._id)}
                            className="btn-cancel"
                            style={{ height: '2.5rem' }}
                          >
                            <Ban size={14} className="mr-2" /> Cancel
                          </button>
                        )}
                        <button
                          onClick={() => { setProcessingReqId(req._id); setShowRejectModal(true); }}
                          className="btn-reject" style={{ height: '2.5rem', borderColor: '#f87171', color: '#000', fontWeight: 900 }}
                        >
                          <Ban size={14} className="mr-2" /> Reject
                        </button>
                        <button
                          onClick={() => handleInventoryEnroll(req)}
                          className="btn-primary" style={{ height: '2.5rem', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                        >
                          <PlusCircleIcon size={14} className="mr-2" /> Enroll Chemical
                        </button>
                        <button
                          onClick={() => { setProcessingReqId(req._id); fetchOtherLabs(); setShowTransferModal(true); }}
                          className="btn-secondary" style={{ height: '2.5rem' }}
                        >
                          <ChevronRight size={14} className="mr-2" /> Ask Lab
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* --- Modals --- */}

      {showNewChemModal && (
        <div className="premium-modal-overlay" onClick={() => setShowNewChemModal(false)}>
          <div className="premium-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Request New Chemical</h2>
              <button onClick={() => setShowNewChemModal(false)} className="close-btn">
                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitInventoryRequest} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="form-layout" style={{ padding: '2rem' }}>
                <div>
                  <label className="form-label">Chemical Name *</label>
                  <input required value={newChemForm.chemical_name} onChange={e => setNewChemForm({ ...newChemForm, chemical_name: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">CAS Number</label>
                  <input value={newChemForm.cas_number} onChange={e => setNewChemForm({ ...newChemForm, cas_number: e.target.value })} className="form-input" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Quantity *</label>
                    <input required type="number" step="0.01" value={newChemForm.quantity} onChange={e => setNewChemForm({ ...newChemForm, quantity: e.target.value })} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Unit *</label>
                    <select value={newChemForm.unit} onChange={e => setNewChemForm({ ...newChemForm, unit: e.target.value })} className="form-input">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Reason *</label>
                  <textarea required value={newChemForm.reason} onChange={e => setNewChemForm({ ...newChemForm, reason: e.target.value })} className="form-input" rows="3" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowNewChemModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ width: 'auto' }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="premium-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="premium-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Reject Request</h2>
              <button onClick={() => setShowRejectModal(false)} className="close-btn">
                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="form-layout" style={{ padding: '2rem' }}>
                <div>
                  <label className="form-label">Rejection Reason *</label>
                  <textarea required value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} className="form-input" rows="3" placeholder="Explain why this request is denied..." />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleInventoryReject} className="btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', width: 'auto' }}>Reject & Notify</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="premium-modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="premium-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Request Transfer from Another Lab</h2>
              <button onClick={() => setShowTransferModal(false)} className="close-btn">
                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="form-layout" style={{ padding: '2rem' }}>
                <div>
                  <label className="form-label">Select Target Lab</label>
                  <select value={selectedTargetLab} onChange={e => setSelectedTargetLab(e.target.value)} className="form-input">
                    <option value="">-- Choose Lab --</option>
                    {otherLabs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>
                {selectedTargetLab && (
                  <div>
                    <label className="form-label">Available Chemicals in {otherLabs.find(l => l._id === selectedTargetLab)?.name}</label>
                    <select value={selectedTransferChem} onChange={e => setSelectedTransferChem(e.target.value)} className="form-input">
                      <option value="">-- Choose Chemical --</option>
                      {otherLabChemicals.map(c => <option key={c._id} value={c._id}>{c.name} ({c.quantity} {c.unit})</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowTransferModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleInventoryTransfer} className="btn-primary" style={{ width: 'auto' }}>Send Transfer Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Requests;

