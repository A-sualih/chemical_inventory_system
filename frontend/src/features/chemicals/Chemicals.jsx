import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import QRCodeLib from "react-qr-code";
const QRCode = QRCodeLib.default || QRCodeLib;
import Layout from "../../layout/Layout";
import { useAuth } from "../../context/AuthContext";
import ChemicalForm from "./ChemicalForm";
import StockActionModal from "../inventory/StockActionModal";
import FIFOUsageModal from "../inventory/FIFOUsageModal";
import ChemicalHistoryModal from "./ChemicalHistoryModal";
import HazardBadge from "../../components/feedback/HazardBadge";
import FilterPanel from "../../components/forms/FilterPanel";
import axios from "axios";
import { debounce } from "lodash-es";
import "../../styles/Chemicals.css";

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

  const debouncedFetch = useCallback(
    debounce((q, f, isArchived) => fetchChemicals(1, q, f, isArchived), 400),
    []
  );

  useEffect(() => {
    debouncedFetch(searchTerm, filters, showArchived);
  }, [searchTerm, filters, showArchived]);

  useEffect(() => {
    if (searchTerm.startsWith("CIMS:")) {
      try {
        const parts = searchTerm.split('|');
        const idPart = parts[0];
        const extractedId = idPart.split(':')[1];
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
      let res;
      if (editingChemical) {
        res = await axios.put(`/api/chemicals/${editingChemical.id}`, formData);
      } else {
        res = await axios.post('/api/chemicals', formData);
      }
      
      if (res.data.safety_warnings && res.data.safety_warnings.length > 0) {
        alert("CRITICAL STORAGE INCOMPATIBILITY:\n\n" + res.data.safety_warnings.join("\n\n") + "\n\nPlease review your physical inventory placement immediately to avoid safety incidents.");
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
      <div className="repository-header">
        <div className="header-title-section">
          <h1>Chemical Repository</h1>
          <p className="header-subtitle">Precision search & lifecycle management.</p>
        </div>
        <div className="header-actions-row">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`archive-toggle-button ${showArchived ? 'archive-active' : 'archive-inactive'}`}
          >
            {showArchived ? "Back to Active" : "View Archive"}
          </button>
          {canCreate && (
            <button
              onClick={() => { setEditingChemical(null); setShowForm(true); }}
              className="enroll-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="enroll-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Enroll Asset</span>
            </button>
          )}
        </div>
      </div>

      <div className="repository-layout-grid">
        <div className="filter-sidebar-wrapper">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            onClear={() => {
              setSearchTerm("");
              setFilters({ hazard: [], status: [], building: "", room: "", expiryStatus: "" });
            }}
            buildings={['Block-A', 'Block-B', 'Lab-X']}
          />
        </div>

        <div className="main-content-wrapper">
          <div className="repository-card">
            <div className="search-bar-container">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Deep search by Name, CAS, or Barcode/ID..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {loading && (
                  <div className="loading-indicator-mini">
                    <div className="spinner-mini"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="table-container">
              {chemicals.length === 0 && !loading ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <h3 className="empty-title">No Chemicals Found</h3>
                  <p className="empty-text">Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                <table className="repository-table">
                  <thead>
                    <tr className="table-header-row">
                      <th className="table-th">Identity</th>
                      <th className="table-th">Inventory Data</th>
                      <th className="table-th text-center">QR Code</th>
                      <th className="table-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chemicals.map((item) => (
                      <tr key={item.id} className="table-tr">
                        <td className="table-td">
                          <div className="identity-cell">
                            <div className="id-badge">
                              {item.id}
                            </div>
                            <div>
                              <div className="item-name">{item.name}</div>
                              <div className="item-meta-badges">
                                <span className="meta-badge meta-cas">CAS: {item.cas_number || 'N/A'}</span>
                                <span className="meta-badge meta-formula">{item.formula}</span>
                                {item.batch_number && <span className="meta-badge meta-batch">Batch: {item.batch_number}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="inventory-data-cell">
                            <div className="status-hazard-row">
                              <span className={`status-badge ${
                                item.status === 'Expired' ? 'status-expired' :
                                item.status === 'Near Expiry' ? 'status-near-expiry' :
                                'status-active'
                              }`}>
                                {item.status}
                              </span>
                              <HazardBadge hazards={item.ghs_classes} size="sm" />
                            </div>
                            <div className="inventory-subtext">
                              <span className="location-text">[{item.location}]</span>
                              <span className="separator">•</span>
                              <span>{item.quantity} {item.unit}</span>
                              {item.batch_number && (
                                <>
                                  <span className="separator">•</span>
                                  <span className="batch-sub-badge">
                                    Batch: {item.batch_number}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="table-td qr-cell">
                           <div className="qr-mini-wrapper">
                             <QRCode value={`${window.location.origin}/chemicals/details/${item.id}`} size={72} />
                           </div>
                        </td>
                        <td className="table-td actions-cell">
                           <div className="action-buttons-group">
                            <button
                              onClick={() => { setSelectedFIFOChemical(item); setShowFIFOModal(true); }}
                              className="icon-action-button fifo-button"
                              title="Quick FIFO Use"
                            >
                               <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </button>
                            <button
                              onClick={() => { setEditingChemical(item); setShowForm(true); }}
                              className="icon-action-button edit-button"
                              title="Edit"
                            >
                               <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => { setSelectedHistoryChemical(item); setShowHistoryModal(true); }}
                              className="icon-action-button history-button"
                              title="History"
                            >
                               <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <Link
                              to={`/chemicals/details/${item.id}`}
                              className="icon-action-button view-button"
                              title="View Full Information"
                            >
                               <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                               </svg>
                            </Link>
                            <Link
                              to={`/print/${item.id}`}
                              target="_blank"
                              className="icon-action-button print-button"
                              title="Print Label"
                            >
                               <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            </Link>
                            {canDelete && (
                              <button
                                onClick={() => toggleArchive(item.id, item.archived)}
                                className={`archive-action-button ${item.archived ? 'restore-mode' : 'delete-mode'}`}
                                title={item.archived ? "Restore" : "Archive (Soft Delete)"}
                              >
                                {item.archived ? (
                                   <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                ) : (
                                   <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

            {pagination.totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                <div className="pagination-actions">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => fetchChemicals(pagination.page - 1)}
                    className="pagination-nav-button"
                  >
                    Prev
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => fetchChemicals(i + 1)}
                      className={`pagination-number-button ${
                        pagination.page === i + 1 ? 'page-active' : 'page-inactive'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => fetchChemicals(pagination.page + 1)}
                    className="pagination-nav-button"
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
