import { useState, useEffect, useCallback } from "react";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import ChemicalForm from "./ChemicalForm";
import StockActionModal from "../components/StockActionModal";
import FIFOUsageModal from "../components/FIFOUsageModal";
import ChemicalHistoryModal from "../components/ChemicalHistoryModal";
import HazardBadge from "../components/HazardBadge";
import FilterPanel from "../components/FilterPanel";
import axios from "axios";
import { debounce } from "lodash-es";



const Chemicals = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    hazard: [],
    status: [],
    building: "",
    room: "",
    expiryStatus: ""
  });
  
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [showForm, setShowForm] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showFIFOModal, setShowFIFOModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingChemical, setEditingChemical] = useState(null);
  const [selectedStockChemical, setSelectedStockChemical] = useState(null);
  const [selectedFIFOChemical, setSelectedFIFOChemical] = useState(null);
  const [selectedHistoryChemical, setSelectedHistoryChemical] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const { hasPermission } = useAuth();

  const fetchChemicals = async (page = 1, search = searchTerm, currentFilters = filters, isArchived = showArchived) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        search,
        hazard: currentFilters.hazard,
        status: currentFilters.status,
        building: currentFilters.building,
        room: currentFilters.room,
        expiryStatus: currentFilters.expiryStatus,
        archived: isArchived
      };
      
      const { data } = await axios.get('/api/chemicals', { params });
      setChemicals(data.data);
      setPagination(prev => ({
        ...prev,
        page: data.page,
        total: data.total,
        totalPages: data.totalPages
      }));
    } catch (err) {
      console.error("Error fetching chemicals", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search
  const debouncedFetch = useCallback(
    debounce((q, f, isArchived) => fetchChemicals(1, q, f, isArchived), 400),
    []
  );

  useEffect(() => {
    debouncedFetch(searchTerm, filters, showArchived);
  }, [searchTerm, filters, showArchived]);

  // Hardware Scanner Listener
  useEffect(() => {
    if (searchTerm.startsWith("CIMS:")) {
      try {
        const parts = searchTerm.split('|');
        const idPart = parts[0];
        const extractedId = idPart.split(':')[1];
        
        // When scanned, we just set the search term to that ID and let the effect trigger
        setSearchTerm(extractedId);
      } catch (e) {
        console.error("Scanner parse error", e);
      }
    }
  }, [searchTerm]);

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
      fetchChemicals(pagination.page);
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
      fetchChemicals(pagination.page);
    } catch (err) {
      alert("Error saving chemical data: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black heading-font text-secondary-900 tracking-tight">Chemical Repository</h1>
          <p className="text-secondary-500 font-medium">Precision search & lifecycle management.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border shadow-sm ${showArchived ? 'bg-secondary-900 text-white border-secondary-900' : 'bg-white text-secondary-600 border-secondary-200 hover:bg-secondary-50'
              }`}
          >
            {showArchived ? "Back to Active" : "View Archive"}
          </button>
          {canCreate && (
            <button
              onClick={() => { setEditingChemical(null); setShowForm(true); }}
              className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Enroll Asset</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            onClear={() => {
              setSearchTerm("");
              setFilters({ hazard: [], status: [], building: "", room: "", expiryStatus: "" });
            }}
            buildings={['Block-A', 'Block-B', 'Lab-X']} // In real app, fetch from backend or unique locations
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-secondary-100 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-secondary-50 bg-gradient-to-r from-secondary-50/30 to-transparent">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Deep search by Name, CAS, or QR scan..."
                  className="w-full bg-white border border-secondary-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 outline-none hover:border-primary-300 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {loading && (
                  <div className="absolute right-4 top-4">
                    <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto p-4">
              {chemicals.length === 0 && !loading ? (
                <div className="py-20 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-black text-secondary-900 mb-2">No Chemicals Found</h3>
                  <p className="text-secondary-500 font-medium">Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-secondary-50/50 text-secondary-400 uppercase text-[10px] font-black tracking-widest border-b border-secondary-50">
                      <th className="px-6 py-5">Identity</th>
                      <th className="px-6 py-5">Inventory Data</th>
                      <th className="px-6 py-5 text-center">QR Code</th>
                      <th className="px-6 py-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-50">
                    {chemicals.map((item) => (
                      <tr key={item.id} className="hover:bg-primary-50/20 transition-all group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-secondary-900/10">
                              {item.id}
                            </div>
                            <div>
                              <div className="font-black text-secondary-900 text-lg leading-tight tracking-tight">{item.name}</div>
                              <div className="flex gap-2 mt-1">
                                <span className="bg-secondary-100 text-secondary-500 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">CAS: {item.cas_number || 'N/A'}</span>
                                <span className="bg-primary-50 text-primary-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">{item.formula}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                item.status === 'Expired' ? 'bg-red-50 text-red-600 border-red-100' :
                                item.status === 'Near Expiry' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-green-50 text-green-600 border-green-100'
                              }`}>
                                {item.status}
                              </span>
                              <HazardBadge hazards={item.ghs_classes} size="sm" />
                            </div>
                            <div className="text-xs font-bold text-secondary-600">
                              <span className="text-primary-600">[{item.location}]</span> • {item.quantity} {item.unit}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                           <div className="inline-block p-1.5 bg-white rounded-lg shadow-sm border border-secondary-200">
                             <QRCode value={item.id} size={48} />
                           </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex justify-center gap-2">
                            <button
                              onClick={() => { setSelectedFIFOChemical(item); setShowFIFOModal(true); }}
                              className="w-10 h-10 flex items-center justify-center bg-white border border-secondary-200 rounded-xl text-primary-600 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all shadow-sm"
                              title="Quick FIFO Use"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </button>
                            <button
                              onClick={() => { setEditingChemical(item); setShowForm(true); }}
                              className="w-10 h-10 flex items-center justify-center bg-white border border-secondary-200 rounded-xl text-secondary-400 hover:text-secondary-900 transition-all shadow-sm"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => { setSelectedHistoryChemical(item); setShowHistoryModal(true); }}
                              className="w-10 h-10 flex items-center justify-center bg-white border border-secondary-200 rounded-xl text-secondary-400 hover:text-secondary-900 transition-all shadow-sm"
                              title="History"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => toggleArchive(item.id, item.archived)}
                                className={`w-10 h-10 flex items-center justify-center bg-white border border-secondary-200 rounded-xl transition-all shadow-sm ${item.archived ? 'text-green-500 hover:text-green-700 hover:border-green-500' : 'text-red-400 hover:text-red-600 hover:border-red-500'}`}
                                title={item.archived ? "Restore" : "Archive (Soft Delete)"}
                              >
                                {item.archived ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-6 border-t border-secondary-50 bg-secondary-50/20 flex items-center justify-between">
                <div className="text-xs font-bold text-secondary-500 uppercase tracking-widest">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => fetchChemicals(pagination.page - 1)}
                    className="px-4 py-2 bg-white border border-secondary-200 rounded-xl text-xs font-black disabled:opacity-50 hover:bg-secondary-50 transition-all"
                  >
                    Prev
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => fetchChemicals(i + 1)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                        pagination.page === i + 1 
                          ? 'bg-secondary-900 text-white shadow-lg shadow-secondary-900/20' 
                          : 'bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => fetchChemicals(pagination.page + 1)}
                    className="px-4 py-2 bg-white border border-secondary-200 rounded-xl text-xs font-black disabled:opacity-50 hover:bg-secondary-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
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
          onSuccess={() => fetchChemicals(pagination.page)}
        />
      )}

      {showFIFOModal && selectedFIFOChemical && (
        <FIFOUsageModal
          chemical={selectedFIFOChemical}
          onClose={() => { setShowFIFOModal(false); setSelectedFIFOChemical(null); }}
          onSuccess={() => fetchChemicals(pagination.page)}
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