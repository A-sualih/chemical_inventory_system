import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import ChemicalForm from "./ChemicalForm";
import axios from "axios";

const Chemicals = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingChemical, setEditingChemical] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const { hasPermission, user } = useAuth();

  const [chemicals, setChemicals] = useState([]);
  
  useEffect(() => {
    fetchChemicals();
  }, []);

  const fetchChemicals = async () => {
    try {
      const { data } = await axios.get('/api/chemicals');
      setChemicals(data);
    } catch (err) {
      console.error("Error fetching chemicals", err);
    }
  };

  const canCreate = hasPermission("create_chemical");
  const canEdit = hasPermission("edit_chemical");
  const canDelete = hasPermission("delete_chemical");

  const toggleArchive = async (id) => {
    if (!window.confirm("Archive this chemical for compliance? (Soft delete)")) return;
    try {
      await axios.delete(`/api/chemicals/${id}`);
      fetchChemicals();
    } catch (err) {
      alert("Error archiving chemical.");
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingChemical) {
        await axios.put(`/api/chemicals/${editingChemical.id}`, formData);
      } else {
        await axios.post('/api/chemicals', formData);
      }
      setShowForm(false);
      setEditingChemical(null);
      fetchChemicals();
    } catch (err) {
      alert("Error saving chemical data: " + (err.response?.data?.error || err.message));
    }
  };

  const filtered = chemicals.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (showArchived ? c.archived : !c.archived);
  });

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black heading-font text-secondary-900 tracking-tight">Chemical Repository</h1>
          <p className="text-secondary-500 text-sm mt-1 font-medium">Compliance-ready lifecycle management.</p>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => setShowArchived(!showArchived)}
             className={`px-6 py-2.5 rounded-2xl font-bold text-sm transition-all border ${
               showArchived ? 'bg-secondary-900 text-white border-secondary-900' : 'bg-white text-secondary-600 border-secondary-200'
             }`}
           >
             {showArchived ? "View Active" : "View Archive"}
           </button>
           {canCreate && (
             <button 
               onClick={() => { setEditingChemical(null); setShowForm(true); }}
               className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary-600/20 active:scale-95"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
               </svg>
               Enroll Chemical
             </button>
           )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-xl overflow-hidden mb-6">
        <div className="p-8 border-b border-white flex flex-col md:flex-row gap-6 justify-between items-center bg-gradient-to-r from-secondary-50/50 to-transparent">
          <div className="relative w-full max-w-xl">
            <input 
              type="text" 
              placeholder="Search by name, ID or CAS..." 
              className="w-full bg-white border border-secondary-200 rounded-[1.5rem] pl-14 pr-4 py-4 text-sm focus:ring-4 focus:ring-primary-500/10 outline-none hover:border-primary-300 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-5 top-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-4">
             <div className="text-right">
                <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Repository Status</div>
                <div className="text-sm font-bold text-secondary-900">{filtered.length} Objects Loaded</div>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto p-4 pt-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary-50/50 text-secondary-500 uppercase text-[10px] font-black tracking-[0.2em] border-b border-secondary-100">
                <th className="px-8 py-6">Identity / CAS</th>
                <th className="px-8 py-6">Lifecycle Status</th>
                <th className="px-8 py-6 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-secondary-50">
              {filtered.map((item) => (
                <tr key={item.id} className={`hover:bg-primary-50/30 transition-all group cursor-pointer ${!canEdit ? 'pointer-events-none' : ''}`} onClick={() => { if(canEdit) { setEditingChemical(item); setShowForm(true); } }}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black text-xs shadow-lg">
                          {item.id}
                       </div>
                       <div>
                          <div className="font-bold text-secondary-900 text-lg leading-tight tracking-tight">{item.name}</div>
                          <div className="text-xs text-secondary-400 font-mono mt-1 flex items-center gap-2">
                             <span className="bg-secondary-100 px-1.5 py-0.5 rounded uppercase font-bold text-[9px] text-secondary-600">CAS</span> {item.cas || item.formula}
                          </div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="flex-1 min-w-[120px] mb-2 md:mb-0">
                          <span className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg border shadow-sm ${
                            item.archived ? 'bg-red-50 text-red-700 border-red-100' :
                            item.status === 'In Stock' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.archived ? 'bg-red-500' : item.status === 'In Stock' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                            {item.status}
                          </span>
                       </div>
                       
                       <div className="flex gap-1">
                         {(item.ghs_classes || []).map(cat => {
                            const emoji = cat === 'Flammable' ? '🔥' : cat === 'Toxic' ? '💀' : cat === 'Irritant' ? '⚠️' : cat === 'Biohazard' ? '☣️' : cat === 'Corrosive' ? '🧪' : cat === 'Environmental' ? '🌊' : cat === 'Explosive' ? '💣' : '⚡';
                            return <span key={cat} title={cat} className="w-8 h-8 flex items-center justify-center bg-secondary-50 border border-secondary-200 rounded-lg text-lg hover:scale-110 transition-transform cursor-help">{emoji}</span>
                         })}
                       </div>
                       <div className="text-xs text-secondary-500">
                          <div className="font-bold">{item.location}</div>
                          <div className="text-[10px] text-secondary-400 mt-0.5 uppercase tracking-widest">{item.quantity} {item.unit} Remaining</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center gap-3">
                      {!item.archived && (
                        <>
                          {canEdit && (
                            <button 
                              className="w-10 h-10 flex items-center justify-center text-secondary-400 hover:text-primary-600 bg-white rounded-xl border border-secondary-200 shadow-sm transition-all hover:scale-110" 
                              title="Edit Record"
                              onClick={() => { setEditingChemical(item); setShowForm(true); }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              className="w-10 h-10 flex items-center justify-center text-secondary-400 hover:text-red-500 bg-white rounded-xl border border-secondary-200 shadow-sm transition-all hover:scale-110" 
                              title="Archive (Soft Delete)"
                              onClick={() => toggleArchive(item.id)}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </>
                      )}
                      <button className="w-10 h-10 flex items-center justify-center text-secondary-400 hover:text-secondary-900 bg-white rounded-xl border border-secondary-200 shadow-sm transition-all" title="View Full History">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ChemicalForm 
          initialData={editingChemical} 
          onClose={() => setShowForm(false)} 
          onSave={handleSave} 
        />
      )}
    </Layout>
  );
};
export default Chemicals;