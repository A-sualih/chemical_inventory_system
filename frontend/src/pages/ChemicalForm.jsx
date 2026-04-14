import { useState, useEffect } from "react";
import axios from "axios";

const ChemicalForm = ({ initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    cas: initialData.cas_number || "",
    iupac: initialData.iupac_name || "",
    storageTemp: initialData.storage_temp || "",
    storageHumidity: initialData.storage_humidity || "",
    purity: initialData.purity || "",
    concentration: initialData.concentration || "",
    location: initialData.location || "",
    building: initialData.building || "",
    room: initialData.room || "",
    cabinet: initialData.cabinet || "",
    shelf: initialData.shelf || "",
    batch: initialData.batch_number || "",
    mfgDate: initialData.manufacturing_date || "",
    purchaseDate: initialData.purchase_date || "",
    expiry: initialData.expiry_date || "",
    numContainers: initialData.num_containers || 1,
    qtyPerContainer: initialData.quantity_per_container || "",
    containerType: initialData.container_type || "Plastic Bottle",
    containerId: initialData.container_id_series || "",
    remarks: initialData.remarks || "",
    sds_file_name: initialData.sds_file_name || "",
    sds_file_url: initialData.sds_file_url || "",
    sdsAttached: initialData.sds_attached === 1 || initialData.sds_attached === true,
    ghs: initialData.ghs_classes || []
  } : {
    name: "",
    iupac: "",
    cas: "",
    formula: "",
    quantity: "",
    unit: "L",
    purity: "99%",
    concentration: "Default",
    location: "",
    building: "",
    room: "",
    cabinet: "",
    shelf: "",
    state: "Liquid",
    storageTemp: "20",
    storageHumidity: "45",
    supplier: "",
    batch: "",
    mfgDate: "",
    purchaseDate: "",
    expiry: "",
    numContainers: 1,
    qtyPerContainer: "",
    containerType: "Plastic Bottle",
    containerId: "",
    remarks: "",
    ghs: [],
    sdsAttached: false
  });

  const [errors, setErrors] = useState({});
  const [sdsFile, setSdsFile] = useState(null);
  const [qrCodeData, setQrCodeData] = useState("");

  useEffect(() => {
    const liquidUnits = ['L', 'mL', 'uL'];
    const solidUnits = ['kg', 'g', 'mg'];
    
    if (formData.state === 'Liquid' && !liquidUnits.includes(formData.unit)) {
      setFormData(prev => ({ ...prev, unit: 'L' }));
    } else if (formData.state === 'Solid' && !solidUnits.includes(formData.unit)) {
      setFormData(prev => ({ ...prev, unit: 'g' }));
    }
  }, [formData.state]);

  useEffect(() => {
    const total = (Number(formData.numContainers) || 0) * (Number(formData.qtyPerContainer) || 0);
    if (total > 0) {
      setFormData(prev => ({ ...prev, quantity: total }));
    }
  }, [formData.numContainers, formData.qtyPerContainer]);

  useEffect(() => {
    if (initialData && initialData.id) {
      axios.get(`/api/chemicals/${initialData.id}/qrcode`)
        .then(res => setQrCodeData(res.data.qrCode))
        .catch(err => console.error("QR Fetch Error", err));
    }
  }, [initialData]);

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

  const ghsMap = [
    { cat: "Flammable", emoji: "🔥" },
    { cat: "Toxic", emoji: "💀" },
    { cat: "Irritant", emoji: "⚠️" },
    { cat: "Biohazard", emoji: "☣️" },
    { cat: "Corrosive", emoji: "🧪" },
    { cat: "Environmental", emoji: "🌊" },
    { cat: "Explosive", emoji: "💣" },
    { cat: "Oxidizer", emoji: "⚡" }
  ];

  const toggleGhs = (catStr) => {
    const newGhs = formData.ghs.includes(catStr)
      ? formData.ghs.filter(c => c !== catStr)
      : [...formData.ghs, catStr];
    setFormData({ ...formData, ghs: newGhs });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-secondary-900/40 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-5xl bg-secondary-50 text-secondary-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[92vh] sm:h-[90vh] md:h-[80vh] animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 border border-white/40">
        
        {/* Left Control Panel */}
        <div className="w-full md:w-[300px] lg:w-[340px] bg-white p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-secondary-100 relative overflow-hidden shrink-0 md:overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary-50/50 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30 mb-6">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" /></svg>
            </div>
            
            <h2 className="text-3xl font-black heading-font text-secondary-900 tracking-tight leading-none mb-2">
              {initialData ? "Edit Lifecycle" : "Enroll Asset"}
            </h2>
            <p className="text-secondary-500 text-sm font-medium mb-8">
              {initialData ? `Updating records for ${initialData.id}` : "Systemize a new chemical into the repository."}
            </p>

            <div className="bg-secondary-50 rounded-[1.5rem] p-4 mb-6 border border-secondary-100 hidden md:block">
              <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-3">System Identity Badge</div>
              <div className="flex items-center gap-4">
                 {qrCodeData ? (
                   <div className="bg-white p-1.5 rounded-xl shadow-sm border border-secondary-200">
                     <img src={qrCodeData} alt="QR Code" className="w-16 h-16 object-contain" />
                   </div>
                 ) : (
                   <div className="w-20 h-20 bg-secondary-900 rounded-xl flex flex-wrap p-2 gap-0.5 shadow-inner">
                      {Array.from({length: 16}).map((_, i) => (
                        <div key={i} className={`w-3.5 h-3.5 ${Math.random() > 0.5 ? 'bg-primary-400' : 'bg-transparent'}`}></div>
                      ))}
                   </div>
                 )}
                 <div>
                   <div className="text-xs font-mono text-secondary-500 font-bold leading-tight">
                     {initialData ? (
                       <><span className="text-primary-600">TAG ACTIVE</span><br/>CIMS-{initialData.id}</>
                     ) : (
                       <><span className="text-secondary-400">PENDING</span><br/>AUTO-GENERATE</>
                     )}
                   </div>
                 </div>
              </div>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary-400 block mb-3">Global Hazard Classification</label>
              <div className="grid grid-cols-4 gap-2">
                {ghsMap.map((item) => (
                  <button 
                    key={item.cat} 
                    type="button"
                    onClick={() => toggleGhs(item.cat)}
                    className={`h-12 rounded-[1rem] flex items-center justify-center text-xl transition-all border-2 ${
                      formData.ghs.includes(item.cat) ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' : 'bg-secondary-50 border-transparent hover:bg-secondary-100'
                    }`}
                    title={item.cat}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={onClose} className="w-full mt-4 py-3 text-sm font-bold text-secondary-500 hover:text-secondary-900 hover:bg-secondary-100 rounded-2xl transition-all">
              Cancel &amp; Discard
            </button>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
           <form onSubmit={(e) => { 
               e.preventDefault(); 
               const payload = new FormData();
               Object.keys(formData).forEach(k => {
                 if (k === 'ghs') payload.append('ghs', JSON.stringify(formData.ghs));
                 else payload.append(k, formData[k]);
               });
               if (sdsFile) payload.append('sds_file', sdsFile);
               onSave(payload); 
             }} 
             className="p-5 sm:p-8 md:p-12 space-y-8"
           >
              
              {/* SECTION: IDENTIFICATION */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                   <div className="h-px bg-secondary-200 flex-1"></div>
                   <div className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Nomenclature & Identity</div>
                   <div className="h-px bg-secondary-200 flex-1 md:hidden"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div className="group">
                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block group-focus-within:text-primary-600 transition-colors">Common Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none hover:border-secondary-300 transition-all font-medium text-secondary-900 shadow-sm" placeholder="e.g. Sodium Chloride" required />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block group-focus-within:text-primary-600 transition-colors">CAS Registry Number</label>
                    <input type="text" value={formData.cas} onChange={handleCasChange} className={`w-full bg-white border rounded-[1rem] p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none hover:border-secondary-300 transition-all font-mono font-medium shadow-sm ${errors.cas ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-secondary-200'}`} placeholder="7647-14-5" required />
                    {errors.cas && <div className="text-[10px] font-bold text-red-500 ml-1 mt-1.5 uppercase">{errors.cas}</div>}
                  </div>
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block group-focus-within:text-primary-600 transition-colors">IUPAC Name</label>
                  <input type="text" value={formData.iupac} onChange={e => setFormData({...formData, iupac: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none hover:border-secondary-300 transition-all font-medium text-secondary-900 shadow-sm" placeholder="Systematic name..." />
                </div>
              </section>

               {/* SECTION: PROPERTIES & CONTAINERS */}
               <section>
                 <div className="flex items-center gap-3 mb-5">
                    <div className="h-px bg-secondary-200 flex-1"></div>
                    <div className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Physicality & Containers</div>
                    <div className="h-px bg-secondary-200 flex-1 md:hidden"></div>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  <div className="group">
                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">State</label>
                    <div className="relative">
                      <select value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none hover:border-secondary-300 transition-all font-medium appearance-none cursor-pointer">
                         <option>Liquid</option><option>Solid</option><option>Gas</option>
                      </select>
                      <svg className="w-4 h-4 absolute right-4 top-4 text-secondary-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block">Unit</label>
                    <div className="relative">
                      <select 
                        value={formData.unit} 
                        onChange={e => setFormData({...formData, unit: e.target.value})} 
                        className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none hover:border-secondary-300 transition-all font-medium shadow-sm appearance-none cursor-pointer"
                      >
                         {formData.state === 'Liquid' ? (
                           <>
                             <option value="L">Liters (L)</option>
                             <option value="mL">Milliliters (mL)</option>
                             <option value="uL">Microliters (µL)</option>
                           </>
                         ) : formData.state === 'Solid' ? (
                           <>
                             <option value="kg">Kilograms (kg)</option>
                             <option value="g">Grams (g)</option>
                             <option value="mg">Milligrams (mg)</option>
                           </>
                         ) : (
                           <>
                             <option value="L">Liters (L)</option>
                             <option value="mL">Milliliters (mL)</option>
                           </>
                         )}
                      </select>
                      <svg className="w-4 h-4 absolute right-4 top-4 text-secondary-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                   <div className="group">
                     <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block transition-colors">Total Qty</label>
                     <input type="number" value={formData.quantity} readOnly className="w-full bg-secondary-50 border border-secondary-200 rounded-[1rem] p-4 text-sm font-mono font-bold shadow-sm text-primary-700" placeholder="0.0" />
                   </div>
                   <div className="group">
                     <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest ml-1 mb-1.5 block transition-colors">Purity (%)</label>
                     <input type="text" value={formData.purity} onChange={e => setFormData({...formData, purity: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm outline-none hover:border-secondary-300 focus:border-primary-400 transition-all font-medium shadow-sm" placeholder="99.9%" />
                   </div>
                 </div>

                 <div className="bg-white border border-secondary-200 rounded-[1.5rem] p-5 mb-5 shadow-sm space-y-4">
                    <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                       Bottle & Container Metrics
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="group">
                         <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Count</label>
                         <input type="number" value={formData.numContainers} onChange={e => setFormData({...formData, numContainers: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm font-bold" />
                      </div>
                      <div className="group">
                         <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Qty/Container</label>
                         <input type="number" value={formData.qtyPerContainer} onChange={e => setFormData({...formData, qtyPerContainer: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm font-bold" />
                      </div>
                      <div className="group">
                         <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Type</label>
                         <input type="text" value={formData.containerType} onChange={e => setFormData({...formData, containerType: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm font-medium" />
                      </div>
                      <div className="group">
                         <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Container ID</label>
                         <input type="text" value={formData.containerId} onChange={e => setFormData({...formData, containerId: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm font-mono" placeholder="CONT-X" />
                      </div>
                    </div>
                 </div>
               </section>

               {/* SECTION: STORAGE & LOCATION */}
               <section>
                 <div className="flex items-center gap-3 mb-5">
                    <div className="h-px bg-secondary-200 flex-1"></div>
                    <div className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Facility & Storage Taxonomy</div>
                    <div className="h-px bg-secondary-200 flex-1 md:hidden"></div>
                 </div>

                 <div className="bg-white border border-secondary-200 rounded-[1.5rem] p-5 mb-5 shadow-sm space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="group">
                         <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Building</label>
                         <input type="text" value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm" placeholder="A" />
                      </div>
                      <div className="group">
                         <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Room</label>
                         <input type="text" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm" placeholder="102" />
                      </div>
                      <div className="group">
                         <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Cabinet</label>
                         <input type="text" value={formData.cabinet} onChange={e => setFormData({...formData, cabinet: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm" placeholder="C2" />
                      </div>
                      <div className="group">
                         <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Shelf</label>
                         <input type="text" value={formData.shelf} onChange={e => setFormData({...formData, shelf: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm" placeholder="1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="group col-span-2">
                          <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Combined Identifier (Auto)</label>
                          <input type="text" readOnly value={formData.building ? `${formData.building}-${formData.room}-${formData.cabinet}-${formData.shelf}`.replace(/-+$/, '') : formData.location} className="w-full bg-secondary-100 border-transparent rounded-xl p-3 text-xs font-mono text-secondary-600" />
                       </div>
                       <div className="group">
                          <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Temp (°C)</label>
                          <input type="number" value={formData.storageTemp} onChange={e => setFormData({...formData, storageTemp: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm" />
                       </div>
                       <div className="group">
                          <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Humidity (%)</label>
                          <input type="number" value={formData.storageHumidity} onChange={e => setFormData({...formData, storageHumidity: e.target.value})} className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-3 text-sm" />
                       </div>
                    </div>
                 </div>
               </section>

               {/* SECTION: PROCUREMENT & BATCH */}
               <section>
                 <div className="flex items-center gap-3 mb-5">
                    <div className="h-px bg-secondary-200 flex-1"></div>
                    <div className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Procurement & Traceability</div>
                    <div className="h-px bg-secondary-200 flex-1 md:hidden"></div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                   <div className="space-y-4">
                     <div className="group">
                       <label className="text-[10px] font-bold text-secondary-500 uppercase ml-1 mb-1.5 block">Vendor Name</label>
                       <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm font-medium shadow-sm" placeholder="LabChem Supplies" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                          <label className="text-[10px] font-bold text-secondary-500 uppercase ml-1 mb-1.5 block">Purchase Date</label>
                          <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm font-medium shadow-sm" />
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-secondary-500 uppercase ml-1 mb-1.5 block">MFG Date</label>
                          <input type="date" value={formData.mfgDate} onChange={e => setFormData({...formData, mfgDate: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm font-medium shadow-sm" />
                        </div>
                     </div>
                   </div>
                   <div className="space-y-4">
                      <div className="group">
                        <label className="text-[10px] font-bold text-secondary-500 uppercase ml-1 mb-1.5 block">Lot / Batch Number</label>
                        <input type="text" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm font-mono font-bold shadow-sm" placeholder="LOT-2025-X" />
                      </div>
                      <div className="group">
                        <label className="text-[10px] font-bold text-secondary-500 uppercase ml-1 mb-1.5 block">Expiry Date</label>
                        <input type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm font-medium shadow-sm text-red-600" required />
                      </div>
                   </div>
                 </div>
                 <div className="group">
                    <label className="text-[10px] font-bold text-secondary-500 uppercase ml-1 mb-1.5 block">Safety Remarks & Tracking Notes</label>
                    <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full bg-white border border-secondary-200 rounded-[1rem] p-4 text-sm font-medium shadow-sm h-24 resize-none" placeholder="Initial stock entry, handle with care..."></textarea>
                 </div>
               </section>

              {/* ACTION FOOTER */}
              <div className="pt-4 flex flex-col md:flex-row gap-4">
                
                <div 
                  className={`flex-[1.2] p-4 rounded-[1.2rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group ${
                  sdsFile || formData.sds_file_name ? 'bg-primary-50/50 border-primary-200 text-primary-700' : 'bg-white border-secondary-200 text-secondary-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/20'
                }`} onClick={() => document.getElementById('sds-upload').click()}>
                  <svg className={`w-6 h-6 transition-transform group-hover:-translate-y-1 ${sdsFile || formData.sds_file_name ? 'text-primary-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-center truncate w-full px-2" title={sdsFile ? sdsFile.name : formData.sds_file_name}>
                     {sdsFile ? sdsFile.name : (formData.sds_file_name ? `Stored: ${formData.sds_file_name}` : "Attach SDS File (.pdf)")}
                  </span>
                  <input id="sds-upload" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setSdsFile(e.target.files[0])} />
                </div>
                
                {formData.sds_file_url && !sdsFile && (
                  <a href={process.env.NODE_ENV === 'production' ? formData.sds_file_url : `http://localhost:5001${formData.sds_file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center px-6 rounded-[1.2rem] bg-secondary-900 text-white hover:bg-secondary-800 transition-all shadow-md group border border-secondary-800" title="View Current SDS">
                     <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </a>
                )}
                
                <button type="submit" className="flex-[2] bg-primary-600 hover:bg-primary-500 text-white rounded-[1.2rem] py-5 font-black text-lg transition-all shadow-xl shadow-primary-600/30 active:scale-[0.98] border border-primary-500">
                  {initialData ? "Apply Lifecycle Update" : "Authorize System Entry"}
                </button>
              </div>

           </form>
        </div>

      </div>
    </div>
  );
};

export default ChemicalForm;
