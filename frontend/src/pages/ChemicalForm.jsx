import { useState } from "react";

const ChemicalForm = ({ initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState(initialData || {
    name: "",
    iupac: "",
    cas: "",
    formula: "",
    quantity: "",
    unit: "L",
    purity: "99%",
    state: "Liquid",
    storageTemp: "20",
    storageHumidity: "45",
    supplier: "",
    batch: "",
    expiry: "",
    ghs: [],
    sdsAttached: false
  });

  const [errors, setErrors] = useState({});

  const validateCas = (val) => {
    // Simple CAS: 2 to 7 digits, hyphen, 2 digits, hyphen, 1 digit
    const regex = /^\d{2,7}-\d{2}-\d$/;
    return regex.test(val);
  };

  const handleCasChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, cas: val });
    if (val && !validateCas(val)) {
      setErrors({ ...errors, cas: "Invalid CAS format (e.g. 67-64-1)" });
    } else {
      const newErrors = { ...errors };
      delete newErrors.cas;
      setErrors(newErrors);
    }
  };

  const toggleGhs = (cat) => {
    const newGhs = formData.ghs.includes(cat)
      ? formData.ghs.filter(c => c !== cat)
      : [...formData.ghs, cat];
    setFormData({ ...formData, ghs: newGhs });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-950/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex h-[85vh]">
          {/* Left Sidebar - Status & GHS */}
          <div className="w-1/3 bg-secondary-50 p-8 border-r border-secondary-100 flex flex-col">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-primary-600/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" /></svg>
            </div>
            <h2 className="text-2xl font-black heading-font text-secondary-900 mb-2">{initialData ? "Edit Chemical" : "Register Chemical"}</h2>
            <p className="text-secondary-500 text-sm mb-8 font-medium">Compliance-ready lifecycle enrollment.</p>

            <div className="space-y-6 flex-1">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary-400 block mb-3">Hazard Classification (GHS)</label>
                <div className="grid grid-cols-4 gap-2">
                  {["🔥", "💀", "⚠️", "☣️", "🧪", "🌊", "💣", "⚡"].map((emoji, i) => (
                    <button 
                      key={i} 
                      onClick={() => toggleGhs(i)}
                      className={`h-12 rounded-xl flex items-center justify-center text-xl transition-all border-2 ${
                        formData.ghs.includes(i) ? 'bg-white border-primary-500 shadow-md ring-4 ring-primary-500/10' : 'bg-white border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-secondary-200">
                <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-2">QR / Barcode Token</div>
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-secondary-900 rounded-lg flex flex-wrap p-1 opacity-80">
                      {Array.from({length: 16}).map((_, i) => (
                        <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`}></div>
                      ))}
                   </div>
                   <div className="text-[10px] font-mono text-secondary-500">AUTO-GENERATE<br/>CIMS-X992-B</div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
               <button onClick={onClose} className="w-full py-4 text-sm font-bold text-secondary-400 hover:text-secondary-900 transition-colors">Discard Draft</button>
            </div>
          </div>

          {/* Right Content - Form Fields */}
          <div className="flex-1 p-10 overflow-y-auto bg-white custom-scrollbar">
             <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-8">
                <section className="space-y-4">
                  <div className="text-xs font-black text-primary-600 uppercase tracking-widest border-b border-primary-100 pb-2">Identification</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">Common Nomenclature</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none hover:border-primary-300 transition-all" placeholder="Acetone" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">CAS Registry Number</label>
                      <input type="text" value={formData.cas} onChange={handleCasChange} className={`w-full bg-secondary-50 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none transition-all ${errors.cas ? 'border-red-300' : 'border-secondary-200 hover:border-primary-300'}`} placeholder="67-64-1" required />
                      {errors.cas && <div className="text-[9px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-tighter">{errors.cas}</div>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">IUPAC Nomenclature</label>
                    <input type="text" value={formData.iupac} onChange={e => setFormData({...formData, iupac: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none hover:border-primary-300 transition-all" placeholder="Propan-2-one" />
                  </div>
                </section>


                <section className="space-y-4 pt-4">
                  <div className="text-xs font-black text-primary-600 uppercase tracking-widest border-b border-primary-100 pb-2">Physical Properties & Stock</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">Initial Qty</label>
                      <input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="2.5" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">Unit</label>
                      <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none appearance-none">
                         <option>L</option>
                         <option>mL</option>
                         <option>kg</option>
                         <option>g</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">Physical State</label>
                      <select value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none appearance-none">
                         <option>Liquid</option>
                         <option>Solid</option>
                         <option>Gas</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 pt-4">
                  <div className="text-xs font-black text-primary-600 uppercase tracking-widest border-b border-primary-100 pb-2">Storage & Procurement</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">Storage Temp (°C)</label>
                      <input type="number" value={formData.storageTemp} onChange={e => setFormData({...formData, storageTemp: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">Batch / Lot Number</label>
                      <input type="text" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="BT-8892-Z" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">Supplier / Vendor</label>
                      <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="Sigma Aldrich" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1">Expiry Date</label>
                      <input type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none" required />
                    </div>
                  </div>
                </section>

                <div className="flex gap-4 pt-8">
                  <div className={`flex-1 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    formData.sdsAttached ? 'bg-green-50 border-green-200 text-green-700' : 'bg-secondary-50 border-secondary-200 text-secondary-400 hover:border-primary-400 hover:text-primary-600'
                  }`} onClick={() => setFormData({...formData, sdsAttached: !formData.sdsAttached})}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{formData.sdsAttached ? "SDS Attached" : "Attach Safety Data Sheet"}</span>
                  </div>
                  <button type="submit" className="flex-[2] bg-primary-600 hover:bg-primary-500 text-white rounded-2xl py-4 font-black transition-all shadow-xl shadow-primary-600/20 active:scale-[0.98]">
                    {initialData ? "Confirm System Update" : "Authorize Lifecycle Enrollment"}
                  </button>
                </div>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChemicalForm;
