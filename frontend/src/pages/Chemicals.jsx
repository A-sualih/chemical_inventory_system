import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import ChemicalForm from "./ChemicalForm";
import StockActionModal from "../components/StockActionModal";
import FIFOUsageModal from "../components/FIFOUsageModal";
import ChemicalHistoryModal from "../components/ChemicalHistoryModal";
import HazardBadge from "../components/HazardBadge";
import axios from "axios";

const Chemicals = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showFIFOModal, setShowFIFOModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingChemical, setEditingChemical] = useState(null);
  const [selectedStockChemical, setSelectedStockChemical] = useState(null);
  const [selectedFIFOChemical, setSelectedFIFOChemical] = useState(null);
  const [selectedHistoryChemical, setSelectedHistoryChemical] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const { hasPermission, user } = useAuth();

  const [chemicals, setChemicals] = useState([]);

  useEffect(() => {
    fetchChemicals();
  }, []);

  // Hardware Scanner Listener
  useEffect(() => {
    if (searchTerm.startsWith("CIMS:")) {
      try {
        const parts = searchTerm.split('|');
        const idPart = parts[0];
        const extractedId = idPart.split(':')[1];

        const found = chemicals.find(c => c.id === extractedId);
        if (found) {
          // Clear the scanner input
          setSearchTerm("");
          // Automatically open the record
          if (canEdit) {
            setEditingChemical(found);
            setShowForm(true);
          } else {
            setSearchTerm(extractedId); // Just filter it for read-only users
          }
        }
      } catch (e) {
        console.error("Scanner parse error", e);
      }
    }
  }, [searchTerm, chemicals]);

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

  const toggleArchive = async (id, isCurrentlyArchived) => {
    const msg = isCurrentlyArchived ? "Restore this chemical to active inventory?" : "Archive this chemical for compliance? (Soft delete)";
    if (!window.confirm(msg)) return;
    try {
      if (isCurrentlyArchived) {
        await axios.put(`/api/chemicals/${id}/restore`);
      } else {
        await axios.delete(`/api/chemicals/${id}`);
      }
      fetchChemicals();
    } catch (err) {
      alert("Error updating chemical state.");
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black heading-font text-secondary-900 tracking-tight">Chemical Repository</h1>
          <p className="text-secondary-500 text-sm mt-1 font-medium">Compliance-ready lifecycle management.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm transition-all border ${showArchived ? 'bg-secondary-900 text-white border-secondary-900' : 'bg-white text-secondary-600 border-secondary-200'
              }`}
          >
            {showArchived ? "Active" : "Archive"}
          </button>
          {canCreate && (
            <button
              onClick={() => { setEditingChemical(null); setShowForm(true); }}
              className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary-600/20 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Enroll Chemical</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] lg:rounded-[3rem] border border-secondary-100 shadow-xl overflow-hidden mb-6">
        <div className="p-4 sm:p-6 lg:p-8 border-b border-white flex flex-col sm:flex-row gap-4 justify-between items-center bg-gradient-to-r from-secondary-50/50 to-transparent">
          <div className="relative w-full sm:max-w-xl">
            <input
              type="text"
              placeholder="Search or scan barcode..."
              className="w-full bg-white border border-secondary-200 rounded-[1.5rem] pl-12 pr-4 py-3.5 text-sm focus:ring-4 focus:ring-primary-500/10 outline-none hover:border-primary-300 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Repository Status</div>
              <div className="text-sm font-bold text-secondary-900">{filtered.length} Loaded</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-2 sm:p-4 pt-0">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-secondary-50/50 text-secondary-500 uppercase text-[10px] font-black tracking-[0.2em] border-b border-secondary-100">
                <th className="px-4 sm:px-8 py-4 sm:py-6">Identity / CAS</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6">Lifecycle Status</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-secondary-50">
              {filtered.map((item) => (
                <tr key={item.id} className={`hover:bg-primary-50/30 transition-all group cursor-pointer ${!canEdit ? 'pointer-events-none' : ''}`} onClick={() => { if (canEdit) { setEditingChemical(item); setShowForm(true); } }}>
                  <td className="px-4 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black text-xs shadow-lg shrink-0">
                        {item.id}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-secondary-900 text-sm sm:text-lg leading-tight tracking-tight truncate">{item.name}</div>
                        <div className="text-xs text-secondary-400 font-mono mt-1 flex items-center gap-2">
                          <span className="bg-secondary-100 px-1.5 py-0.5 rounded uppercase font-bold text-[9px] text-secondary-600">CAS</span>
                          <span className="truncate max-w-[100px] sm:max-w-none">{item.cas || item.formula}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-[120px] mb-2 md:mb-0">
                        <span className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg border shadow-sm ${
                            item.archived ? 'bg-red-50 text-red-700 border-red-100' :
                            item.status === 'In Stock' ? 'bg-green-50 text-green-700 border-green-100' : 
                            item.status === 'In Use' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.archived ? 'bg-red-500' : 
                            item.status === 'In Stock' ? 'bg-green-500' : 
                            item.status === 'In Use' ? 'bg-blue-500 animate-pulse' :
                            'bg-orange-500'
                          }`}></span>
                          {item.status}
                        </span>
                      </div>

                      <div className="flex gap-1">
                        <HazardBadge hazards={item.ghs_classes} size="sm" />
                      </div>
                      <div className="flex flex-col">
                        <div className="font-bold text-secondary-900 flex items-center gap-2">
                          {item.building ? (
                            <><span className="text-primary-600">[{item.building}-{item.room}]</span> {item.cabinet}-{item.shelf}</>
                          ) : (
                            item.location
                          )}
                        </div>
                        <div className="text-[10px] text-secondary-400 mt-0.5 uppercase tracking-widest font-bold">
                          {item.num_containers > 1 ? (
                            <div className="flex flex-col">
                              <span className="text-secondary-500">{item.num_containers} containers × {item.quantity_per_container}{item.unit}</span>
                              <span className="text-amber-500">Alert below: {item.threshold || 5} {item.unit}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span>{item.quantity} {item.unit} Remaining</span>
                              <span className="text-amber-500">Alert below: {item.threshold || 5} {item.unit}</span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-4 sm:py-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center gap-3">
                      {!item.archived && (
                        <>
                          {hasPermission("update_stock") && (
                            <button
                              className="w-10 h-10 flex items-center justify-center text-primary-500 hover:text-primary-600 bg-primary-50 rounded-xl border border-primary-100 shadow-sm transition-all hover:scale-110"
                              title="Adjust Stock (In/Out)"
                              onClick={() => { setSelectedStockChemical(item); setShowStockModal(true); }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                            </button>
                          )}
                          {hasPermission("update_stock") && (
                            <button
                              className="w-10 h-10 flex items-center justify-center text-primary-600 hover:text-white bg-white hover:bg-primary-600 rounded-xl border border-primary-200 shadow-sm transition-all hover:scale-110"
                              title="Quick Usage (FIFO - Oldest First)"
                              onClick={() => { setSelectedFIFOChemical(item); setShowFIFOModal(true); }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </button>
                          )}
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
                              onClick={() => toggleArchive(item.id, false)}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </>
                      )}
                      {item.archived && canDelete && (
                        <button
                          className="w-10 h-10 flex items-center justify-center text-secondary-400 hover:text-green-500 bg-white rounded-xl border border-secondary-200 shadow-sm transition-all hover:scale-110"
                          title="Restore to Active Inventory"
                          onClick={() => toggleArchive(item.id, true)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        </button>
                      )}
                      <button
                        className="w-10 h-10 flex items-center justify-center text-secondary-400 hover:text-secondary-900 bg-white rounded-xl border border-secondary-200 shadow-sm transition-all"
                        title="View Full History"
                        onClick={() => { setSelectedHistoryChemical(item); setShowHistoryModal(true); }}
                      >
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

      {showHistoryModal && selectedHistoryChemical && (
        <ChemicalHistoryModal
          chemical={selectedHistoryChemical}
          onClose={() => { setShowHistoryModal(false); setSelectedHistoryChemical(null); }}
        />
      )}

      {showStockModal && selectedStockChemical && (
        <StockActionModal
          chemical={selectedStockChemical}
          onClose={() => { setShowStockModal(false); setSelectedStockChemical(null); }}
          onSuccess={fetchChemicals}
        />
      )}

      {showFIFOModal && selectedFIFOChemical && (
        <FIFOUsageModal
          chemical={selectedFIFOChemical}
          onClose={() => { setShowFIFOModal(false); setSelectedFIFOChemical(null); }}
          onSuccess={fetchChemicals}
        />
      )}

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