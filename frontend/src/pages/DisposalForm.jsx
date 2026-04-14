import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../layout/Layout";

const DisposalForm = () => {
  const navigate = useNavigate();
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedChemical, setSelectedChemical] = useState(null);
  
  const [formData, setFormData] = useState({
    chemical_id: "",
    container_id: "",
    quantity: "",
    unit: "",
    reason: "",
    method: "",
    notes: ""
  });

  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchChemicals = async () => {
      try {
        const { data } = await axios.get("/api/chemicals");
        setChemicals(data);
      } catch (err) {
        console.error("Failed to fetch chemicals", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChemicals();
  }, []);

  const filteredChemicals = chemicals.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.cas_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectChemical = (chem) => {
    setSelectedChemical(chem);
    setFormData({
      ...formData,
      chemical_id: chem.id,
      unit: chem.unit,
      container_id: chem.container_id_series || ""
    });
    setSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      await axios.post("/api/disposal", formData);
      setMessage({ type: "success", text: "Disposal recorded successfully! Redirection in 2s..." });
      setTimeout(() => navigate("/chemicals"), 2000);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to record disposal" });
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = ["Expired", "Contaminated", "Damaged container", "Safety hazard", "No longer needed", "Other"];
  const methods = ["Neutralization", "Incineration", "Chemical waste bin", "Specialized Facility", "Other"];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black heading-font text-secondary-950 tracking-tight">Chemical Disposal Form</h1>
          <p className="text-secondary-500 mt-2 font-medium">Record the safe disposal of hazardous assets from the repository.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Chemical Search & Selection */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-sm">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-4 block">1. Select Chemical</label>
              
              {!selectedChemical ? (
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search name, CAS, or ID..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                    />
                    <svg className="w-4 h-4 absolute right-3 top-3.5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                    {loading ? (
                      <div className="py-10 text-center text-xs font-bold text-secondary-400 uppercase animate-pulse">Scanning Inventory...</div>
                    ) : filteredChemicals.length === 0 ? (
                      <div className="py-10 text-center text-xs font-bold text-secondary-400 uppercase">No matches found</div>
                    ) : (
                      filteredChemicals.map(c => (
                        <button 
                          key={c.id} 
                          onClick={() => handleSelectChemical(c)}
                          className="w-full text-left p-3 rounded-xl hover:bg-primary-50 border border-transparent hover:border-primary-100 transition-all group"
                        >
                          <div className="font-bold text-secondary-900 group-hover:text-primary-700 text-sm truncate">{c.name}</div>
                          <div className="text-[10px] font-mono text-secondary-500 mt-1">{c.id} • {c.cas_number || "No CAS"}</div>
                          <div className="text-[10px] font-bold text-primary-600 mt-0.5">{c.quantity} {c.unit} Available</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-primary-50 border border-primary-100 p-4 rounded-2xl relative overflow-hidden group">
                   <button 
                    onClick={() => setSelectedChemical(null)}
                    className="absolute top-2 right-2 text-primary-400 hover:text-primary-600 p-1"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                   <div className="font-black text-primary-700 text-lg leading-tight mb-1">{selectedChemical.name}</div>
                   <div className="text-[10px] font-mono font-bold text-primary-500 uppercase tracking-widest">{selectedChemical.id} • {selectedChemical.cas_number || "No CAS"}</div>
                   <div className="mt-4 flex items-center justify-between">
                     <div className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Current Stock</div>
                     <div className="text-xl font-black text-primary-700">{selectedChemical.quantity} {selectedChemical.unit}</div>
                   </div>
                </div>
              )}
            </div>

            {selectedChemical && (
              <div className="bg-secondary-900 p-6 rounded-[2rem] text-white shadow-xl shadow-secondary-900/20">
                <div className="text-[10px] font-black uppercase tracking-widest text-secondary-500 mb-4">Safety Warning</div>
                <div className="flex gap-3 items-start">
                   <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">⚠️</div>
                   <p className="text-xs font-medium leading-relaxed text-secondary-300">
                     Disposal of <span className="text-white font-bold">{selectedChemical.name}</span> must follow environmental protocol E-204. Ensure neutralizing agents are nearby.
                   </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Disposal Details Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-secondary-100 shadow-sm space-y-8">
              {message.text && (
                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                   {message.type === 'success' ? '✅' : '❌'} {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary-400 ml-1 group-focus-within:text-primary-600 transition-colors">2. Select Container 🔥</label>
                  <input 
                    type="text" 
                    value={formData.container_id}
                    onChange={(e) => setFormData({...formData, container_id: e.target.value})}
                    placeholder="e.g. CONT-009"
                    className="w-full bg-secondary-50 border border-secondary-100 rounded-2xl p-4 text-sm font-mono focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all"
                    required
                  />
                  <p className="text-[10px] text-secondary-400 ml-1">Specify which container is being disposed.</p>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary-400 ml-1 group-focus-within:text-primary-600 transition-colors">3. Quantity to Dispose</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      placeholder="500"
                      className="flex-1 bg-secondary-50 border border-secondary-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all"
                      required
                    />
                    <select 
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="bg-secondary-50 border border-secondary-100 rounded-2xl px-4 text-sm font-bold focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="L">L</option>
                      <option value="mL">mL</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="mg">mg</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary-400 ml-1 group-focus-within:text-primary-600 transition-colors">4. Disposal Reason (REQUIRED) 🔥</label>
                  <select 
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    className="w-full bg-secondary-50 border border-secondary-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all cursor-pointer appearance-none"
                    required
                  >
                    <option value="" disabled>Select Reason...</option>
                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary-400 ml-1 group-focus-within:text-primary-600 transition-colors">5. Disposal Method 🔥</label>
                  <select 
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                    className="w-full bg-secondary-50 border border-secondary-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all cursor-pointer appearance-none"
                    required
                  >
                    <option value="" disabled>Select Method...</option>
                    {methods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary-400 ml-1 group-focus-within:text-primary-600 transition-colors">6. Notes (Optional)</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="e.g. Bottle leaked and cannot be used..."
                  className="w-full bg-secondary-50 border border-secondary-100 rounded-3xl p-5 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all min-h-[120px] resize-none"
                ></textarea>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={submitting || !selectedChemical}
                  className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-secondary-200 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary-600/30 active:scale-[0.98] border border-primary-500"
                >
                  {submitting ? "Processing Disposals..." : "Authorize Disposal & Update Inventory"}
                </button>
                <p className="text-[10px] text-center text-secondary-400 mt-4 uppercase tracking-[0.2em] font-black">Electronic Signature Required Upon Approval</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DisposalForm;
