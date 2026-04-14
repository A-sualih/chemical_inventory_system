import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import axios from "axios";

const Requests = () => {
  const { user, hasPermission } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Request Form
  const [chemicalId, setChemicalId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [justification, setJustification] = useState("");

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get('/api/inventory/requests');
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission("approve_request") || hasPermission("submit_request")) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/inventory/requests', {
        chemical_id: chemicalId,
        quantity: Number(quantity),
        justification
      });
      alert("Request submitted successfully and is pending approval.");
      setChemicalId("");
      setQuantity("");
      setJustification("");
      if (hasPermission("approve_request")) fetchRequests();
    } catch (err) {
      alert("Error submitting request");
    }
  };

  const handleAction = async (id, status) => {
    try {
      await axios.put(`/api/inventory/requests/${id}`, { status });
      fetchRequests();
    } catch (err) {
      alert("Error updating request");
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold heading-font text-secondary-900">Request Center</h1>
        <p className="text-secondary-500 mt-1 text-sm">Submit new chemical requests or review pending approvals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Make a Request Panel */}
        {hasPermission("submit_request") && (
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-secondary-100 shadow-sm lg:col-span-1 h-fit">
            <h2 className="text-xl font-bold mb-4">Request Chemicals</h2>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Chemical ID</label>
                <input type="text" value={chemicalId} onChange={(e) => setChemicalId(e.target.value)} required className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" placeholder="e.g. CHEM-123" />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Quantity</label>
                <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Justification</label>
                <textarea value={justification} onChange={(e) => setJustification(e.target.value)} required className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 outline-none mt-1" rows="3" placeholder="Reason for request..."></textarea>
              </div>
              <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-xl font-bold transition-all mt-4">
                Submit Request
              </button>
            </form>
          </div>
        )}

        {/* Approval Dashboard */}
        {(hasPermission("approve_request") || hasPermission("submit_request")) && (
          <div className={`bg-white p-6 sm:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-secondary-100 shadow-sm ${hasPermission("submit_request") ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <h2 className="text-xl font-bold mb-4">{hasPermission("approve_request") ? "Pending Approvals" : "My Requests"}</h2>
            {loading ? <p className="text-sm text-secondary-400">Loading requests...</p> : (
              <div className="space-y-4">
                {requests.length === 0 && <p className="text-sm text-secondary-500">No requests found.</p>}
                {requests.map(req => (
                  <div key={req._id} className="p-5 border border-secondary-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary-200 hover:bg-primary-50/10 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-secondary-900">{req.chemical_name || req.chemical_id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-500">Requested by <span className="font-semibold text-secondary-700">{req.user_name}</span> • {new Date(req.created_at).toLocaleString()}</p>
                      <p className="text-sm font-medium mt-2 bg-secondary-50 p-2 rounded-lg border border-secondary-100">
                        "{req.justification}"
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      <div className="text-center bg-secondary-950 text-white rounded-lg py-2 px-4 shadow-inner">
                        <span className="block text-[10px] uppercase text-secondary-400 font-bold mb-0.5">Quantity</span>
                        <span className="font-mono font-bold">{req.quantity}</span>
                      </div>
                      {req.status === 'Pending' && hasPermission("approve_request") && (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button onClick={() => handleAction(req._id, 'Approved')} className="bg-green-500 hover:bg-green-400 text-white rounded-lg p-1 transition-colors">
                            <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                          </button>
                          <button onClick={() => handleAction(req._id, 'Rejected')} className="bg-red-500 hover:bg-red-400 text-white rounded-lg p-1 transition-colors">
                            <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Requests;
