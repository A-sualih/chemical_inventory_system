import { useState, useEffect } from "react";
import Layout from "../../layout/Layout";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "../../styles/Requests.css";

const Requests = () => {
  const { user, hasPermission } = useAuth();
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

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get('/api/requests');
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      const { data: containerData } = await axios.get(`/api/containers?chemical_id=${chemId}`);
      
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
      alert("Please fill in all required fields.");
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
      alert("Request submitted successfully and is pending approval.");
      setSelectedChem("");
      setSelectedContainer("");
      setQuantity("");
      setReason("");
      setFifoContainer(null);
      setSubmitError(null);
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
      alert(`Request ${status.toLowerCase()} successfully.`);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || `Error ${status.toLowerCase()} request`);
    }
  };

  return (
    <Layout>
      <div className="requests-header">
        <div>
          <h1 className="requests-title">Request & Approval System</h1>
          <p className="requests-subtitle">Every usage must go through a request → approval process.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <button onClick={fetchRequests} className="refresh-btn">
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
           </button>
        </div>
      </div>

      <div className="requests-layout">
        
        {/* Step 5.2 — Submit Request (Normal User Side) */}
        {hasPermission("submit_request") && (
          <div className="requests-panel col-span-1">
            <h2 className="panel-heading">
              <span className="step-indicator step-1">1</span>
              Submit Request
            </h2>
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
                      <span className="fifo-badge">🔵 FIFO auto-selected</span>
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
                          {isFifo ? '🔵 [FIFO] ' : ''}{c.container_id} — {c.available_quantity} {c.unit} available{c.location ? ` · ${c.location}` : ''}
                        </option>
                      );
                    })}
                  </select>

                  {/* FIFO deviation warning */}
                  {fifoContainer && selectedContainer && selectedContainer !== fifoContainer.fifo_container_id && (
                    <div className="fifo-warning">
                      <span style={{ color: '#f59e0b', fontSize: '1.125rem', lineHeight: 1 }}>⚠️</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>FIFO Order Warning</p>
                        <p style={{ fontSize: '11px', color: '#d97706', marginTop: '0.125rem' }}>
                          You must finish <strong>{fifoContainer.container_id}</strong> first ({fifoContainer.available_quantity} {fifoContainer.unit} left). The system will block this request.
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

                  {/* FIFO info panel when correct container is selected */}
                  {fifoContainer && selectedContainer === fifoContainer.fifo_container_id && (
                    <div className="fifo-info">
                      <span style={{ color: '#3b82f6' }}>🔵</span>
                      <p style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>
                        FIFO compliant — this is the correct container to use next ({fifoContainer.available_quantity} {fifoContainer.unit} available).
                      </p>
                    </div>
                  )}

                  {selectedChem && containers.length === 0 && (
                    <p style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, marginTop: '0.25rem', padding: '0 0.25rem' }}>
                      ⚠️ No active containers found for this chemical. It may be out of stock.
                    </p>
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

              {/* Submit error (including FIFO violations) */}
              {submitError && (
                <div className="submit-error-box">
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span>🚫</span> {submitError.error}
                  </p>
                  {submitError.fifo_container_id && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContainer(submitError.fifo_container_id);
                        setSubmitError(null);
                      }}
                      style={{ fontSize: '11px', fontWeight: 900, color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                    >
                      → Switch to correct container: {submitError.fifo_container_label} ({submitError.fifo_available_native} {submitError.fifo_unit})
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? "Submitting..." : "Submit Request"}
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </form>
          </div>
        )}

        {/* Step 5.3 — Approval System (Manager side) */}
        <div className={`requests-panel ${hasPermission("submit_request") ? 'col-span-2' : 'col-span-3'}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 className="panel-heading" style={{ marginBottom: 0 }}>
              <span className="step-indicator step-2">2</span>
              {hasPermission("approve_request") ? "Approval Dashboard" : "My Requests History"}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <span className="total-badge">
                  Total: {requests.length}
               </span>
            </div>
          </div>
          
          {loading ? (
            <div className="loading-view">
              <div className="spinner-primary"></div>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary-400)', marginTop: '1rem' }}>Loading requests ledger...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requests.length === 0 && (
                <div className="empty-state">
                  <p style={{ color: 'var(--secondary-500)', fontWeight: 500 }}>No requests in queue.</p>
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
                          <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                          Requester: <span className="req-detail-val">{req.user_id?.name || "Unknown"}</span>
                        </div>
                        <div className="req-detail-item">
                          <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                          Container: <span className="req-detail-val">{req.container_id?.container_id || "N/A"}</span>
                        </div>
                        <div className="req-detail-item">
                          <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          Requested: <span className="req-detail-val">{new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                        {req.handled_at && (
                           <div className="req-detail-item">
                            <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
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
                              if(window.confirm("Approve this usage request? Stock will be reduced.")) {
                                handleAction(req._id, 'Approved', notes);
                                setNotes("");
                              }
                            }} 
                            className="btn-approve"
                            title="Approve Request"
                          >
                            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                            <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }} className="hide-on-mobile">Approve</span>
                          </button>
                          <button 
                            onClick={() => {
                              if(window.confirm("Reject this request?")) {
                                handleAction(req._id, 'Rejected', notes);
                                setNotes("");
                              }
                            }} 
                            className="btn-reject"
                            title="Reject Request"
                          >
                            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }} className="hide-on-mobile">Reject</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Requests;

