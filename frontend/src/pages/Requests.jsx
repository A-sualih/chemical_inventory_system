import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import axios from "axios";

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
      setChemicals(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContainers = async (chemId) => {
    if (!chemId) {
      setContainers([]);
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
        fetchContainers(selectedChem);
      }
    } else {
      setContainers([]);
      setSelectedContainer("");
    }
  }, [selectedChem]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedChem || !selectedContainer || !quantity || !reason) {
      alert("Please fill in all required fields.");
      return;
    }

    const container = containers.find(c => c._id === selectedContainer);
    if (container) {
      // Unit conversion check
      const rates = {
        'kg': 1, 'g': 0.001, 'mg': 0.000001, 'mcg': 0.000000001,
        'L': 1, 'l': 1, 'mL': 0.001, 'ml': 0.001, 'ul': 0.000001, 'nl': 0.000000001
      };
      
      const requestedInBase = Number(quantity) * (rates[unit] || 1);
      const availableInBase = Number(container.available_quantity) * (rates[container.unit] || 1);

      if (requestedInBase > availableInBase + 0.000001) {
        // Convert available back to requested unit for the error message
        const availableInRequestedUnit = (availableInBase / (rates[unit] || 1)).toFixed(2);
        alert(`Insufficient amount! After accounting for other pending requests, this container only has ${availableInRequestedUnit} ${unit} truly available.`);
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
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || "Error submitting request");
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
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold heading-font text-secondary-900">Request & Approval System</h1>
          <p className="text-secondary-500 mt-1 text-sm">Every usage must go through a request → approval process.</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={fetchRequests} className="p-2 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-colors shadow-sm text-secondary-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Step 5.2 — Submit Request (Normal User Side) */}
        {hasPermission("submit_request") && (
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-secondary-100 shadow-sm lg:col-span-1 h-fit">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">1</span>
              Submit Request
            </h2>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Select Chemical</label>
                <select 
                  value={selectedChem} 
                  onChange={(e) => setSelectedChem(e.target.value)} 
                  required 
                  className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1"
                >
                  <option value="">-- Choose Chemical --</option>
                  {chemicals.map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              {selectedChem && (
                <div>
                  <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Select Container</label>
                  <select 
                    value={selectedContainer} 
                    onChange={(e) => setSelectedContainer(e.target.value)} 
                    required 
                    className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1"
                  >
                    <option value="">-- Choose Container --</option>
                    {containers.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.container_id} - {c.location} (Truly Available: {c.available_quantity} {c.unit})
                      </option>
                    ))}
                  </select>
                  {selectedChem && containers.length === 0 && (
                     <p className="text-[10px] text-red-500 font-bold mt-1 px-1">
                        ⚠️ No active containers found for this chemical. It may be out of stock.
                     </p>
                  )}
                </div>

              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Quantity</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    required 
                    className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1 text-secondary-900 font-bold"
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
                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Reason (Experiment/Project)</label>
                <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  required 
                  className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" 
                  rows="3" 
                  placeholder="Why do you need this?"
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-secondary-300 text-white p-4 rounded-xl font-bold transition-all mt-4 flex items-center justify-center gap-2"
              >
                {submitting ? "Submitting..." : "Submit Request"}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </form>
          </div>
        )}

        {/* Step 5.3 — Approval System (Manager side) */}
        <div className={`bg-white p-6 sm:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-secondary-100 shadow-sm ${hasPermission("submit_request") ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center text-sm font-bold">2</span>
              {hasPermission("approve_request") ? "Approval Dashboard" : "My Requests History"}
            </h2>
            <div className="flex items-center gap-2">
               <span className="bg-secondary-50 text-secondary-500 text-[10px] font-bold px-2 py-1 rounded-md border border-secondary-100 uppercase tracking-wider">
                  Total: {requests.length}
               </span>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              <p className="text-sm text-secondary-400 mt-4">Loading requests ledger...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.length === 0 && (
                <div className="text-center py-12 bg-secondary-50 rounded-3xl border border-dashed border-secondary-200">
                  <p className="text-secondary-500 font-medium">No requests in queue.</p>
                </div>
              )}
              
              {requests.map(req => (
                <div key={req._id} className="group p-5 border border-secondary-100 rounded-[1.5rem] hover:border-primary-200 hover:bg-primary-50/10 transition-all duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg text-secondary-900">{req.chemical_id?.name || "Unknown Chemical"}</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border ${
                          req.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                          req.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                          'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mb-3">
                        <div className="flex items-center gap-2 text-xs text-secondary-500">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                          Requester: <span className="font-bold text-secondary-700">{req.user_id?.name || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary-500">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                          Container: <span className="font-bold text-secondary-700">{req.container_id?.container_id || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary-500">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          Requested: <span className="font-bold text-secondary-700">{new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                        {req.handled_at && (
                           <div className="flex items-center gap-2 text-xs text-secondary-500">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Handled: <span className="font-bold text-secondary-700">{new Date(req.handled_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="bg-secondary-50 p-3 rounded-xl border border-secondary-100">
                        <p className="text-secondary-400 text-[10px] uppercase font-black mb-1">Reason for usage</p>
                        <p className="text-sm italic text-secondary-700">"{req.reason}"</p>
                      </div>

                      {req.notes && (
                        <div className="mt-2 bg-primary-50 px-3 py-2 rounded-xl border border-primary-100">
                           <p className="text-primary-400 text-[10px] uppercase font-black mb-1">Decision Notes</p>
                           <p className="text-sm text-primary-700 font-medium">{req.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[140px] w-full md:w-auto">
                      <div className="text-center bg-secondary-900 text-white rounded-[1.2rem] py-3 px-6 shadow-xl shadow-secondary-900/10">
                        <span className="block text-[10px] uppercase text-secondary-400 font-black mb-0.5 tracking-tighter">Amount Needed</span>
                        <span className="font-mono text-xl font-black">{req.quantity} <span className="text-xs uppercase text-primary-400">{req.unit}</span></span>
                      </div>

                      {req.status === 'Pending' && hasPermission("approve_request") && (
                        <div className="flex flex-col gap-2 mt-2">
                           <textarea 
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Decision notes..."
                            className="text-xs p-2 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
                           />
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => {
                                if(window.confirm("Approve this usage request? Stock will be reduced.")) {
                                  handleAction(req._id, 'Approved', notes);
                                  setNotes("");
                                }
                              }} 
                              className="bg-green-600 hover:bg-green-500 text-white rounded-xl py-2.5 transition-all shadow-md shadow-green-600/20 flex items-center justify-center"
                              title="Approve Request"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                              <span className="ml-1 text-xs font-bold md:hidden lg:inline">Approve</span>
                            </button>
                            <button 
                              onClick={() => {
                                if(window.confirm("Reject this request?")) {
                                  handleAction(req._id, 'Rejected', notes);
                                  setNotes("");
                                }
                              }} 
                              className="bg-red-600 hover:bg-red-500 text-white rounded-xl py-2.5 transition-all shadow-md shadow-red-600/20 flex items-center justify-center"
                              title="Reject Request"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                              <span className="ml-1 text-xs font-bold md:hidden lg:inline">Reject</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
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

