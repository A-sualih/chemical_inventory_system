import { useState, useEffect, useCallback } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "../../styles/LocationManager.css";

const LocationManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "Lab Manager";

  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalType, setModalType] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [shelfCapacity, setShelfCapacity] = useState(50); // Default 50

  const fetchHierarchy = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/locations/hierarchy/full");
      setHierarchy(data);
    } catch (err) {
      setError("Failed to load hierarchical locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHierarchy(); }, [fetchHierarchy]);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openModal = (type, parentId = null) => {
    setModalType(type);
    setTargetId(parentId);
    setBulkInput("");
    setShelfCapacity(50);
    setError("");
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    if (!bulkInput.trim()) return setError("Please enter at least one name.");

    setSaving(true);
    setError("");
    const names = bulkInput.split(",").map(n => n.trim()).filter(n => n);

    try {
      if (modalType === 'block') {
        for (const name of names) {
          await axios.post("/api/locations/blocks", { name });
        }
      } else if (modalType === 'room') {
        await axios.post("/api/locations/rooms/bulk", {
          blockId: targetId,
          rooms: names.map(name => ({ name }))
        });
      } else if (modalType === 'cabinet') {
        await axios.post("/api/locations/cabinets/bulk", {
          roomId: targetId,
          cabinets: names.map(name => ({ name }))
        });
      } else if (modalType === 'shelf') {
        const capacity = parseInt(shelfCapacity) || 50;
        await axios.post("/api/locations/shelves/bulk", {
          cabinetId: targetId,
          shelves: names.map(name => ({ name, capacity_limit: capacity }))
        });
      }
      setSuccess(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)}s created successfully.`);
      setModalType(null);
      fetchHierarchy();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create items.");
    } finally {
      setSaving(false);
    }
  };

  const getCapacityColor = (load, cap) => {
    const pct = cap > 0 ? (load / cap) * 100 : 0;
    if (pct >= 90) return "text-red-600 bg-red-50";
    if (pct >= 70) return "text-amber-600 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
  };

  return (
    <Layout>
      <div className="loc-manager-header">
        <div>
          <h1 className="loc-title">Hierarchical Storage</h1>
          <p className="loc-subtitle">Manage Building (Block) → Room → Cabinet → Shelf Hierarchy</p>
        </div>
        {isAdmin && (
          <button onClick={() => openModal('block')} className="add-loc-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            Add Block
          </button>
        )}
      </div>

      {success && <div className="toast-msg toast-success">{success}</div>}
      {error && !modalType && <div className="toast-msg toast-error">{error}</div>}

      <div className="hierarchy-tree-container">
        {loading ? (
          <div className="flex justify-center p-20"><div className="spinner-primary"></div></div>
        ) : hierarchy.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-title">No Blocks Configured</h3>
            <p className="empty-desc">Begin by adding your first building block.</p>
            {isAdmin && <button onClick={() => openModal('block')} className="add-loc-btn mx-auto">Add Block</button>}
          </div>
        ) : (
          <div className="tree-view">
            {hierarchy.map(block => (
              <div key={block._id} className="tree-block">
                <div className="tree-item block-item" onClick={() => toggleExpand(block._id)}>
                  <span className={`expand-icon ${expanded[block._id] ? 'expanded' : ''}`}>▶</span>
                  <span className="item-icon">🏢</span>
                  <span className="item-name">{block.name}</span>
                  {isAdmin && (
                    <button className="tree-add-btn" onClick={(e) => { e.stopPropagation(); openModal('room', block._id); }}>+ Add Room</button>
                  )}
                </div>

                {expanded[block._id] && (
                  <div className="tree-children">
                    {(!block.children || block.children.length === 0) ? <div className="tree-empty">No rooms</div> :
                      block.children.map(room => (
                        <div key={room._id} className="tree-room">
                          <div className="tree-item room-item" onClick={() => toggleExpand(room._id)}>
                            <span className={`expand-icon ${expanded[room._id] ? 'expanded' : ''}`}>▶</span>
                            <span className="item-icon">🚪</span>
                            <span className="item-name">{room.name}</span>
                            {isAdmin && (
                              <button className="tree-add-btn" onClick={(e) => { e.stopPropagation(); openModal('cabinet', room._id); }}>+ Add Cabinet</button>
                            )}
                          </div>

                          {expanded[room._id] && (
                            <div className="tree-children">
                              {(!room.children || room.children.length === 0) ? <div className="tree-empty">No cabinets</div> :
                                room.children.map(cabinet => (
                                  <div key={cabinet._id} className="tree-cabinet">
                                    <div className="tree-item cabinet-item" onClick={() => toggleExpand(cabinet._id)}>
                                      <span className={`expand-icon ${expanded[cabinet._id] ? 'expanded' : ''}`}>▶</span>
                                      <span className="item-icon">🗄️</span>
                                      <span className="item-name">{cabinet.name}</span>
                                      {isAdmin && (
                                        <button className="tree-add-btn" onClick={(e) => { e.stopPropagation(); openModal('shelf', cabinet._id); }}>+ Add Shelf</button>
                                      )}
                                    </div>

                                    {expanded[cabinet._id] && (
                                      <div className="tree-children">
                                        {(!cabinet.children || cabinet.children.length === 0) ? <div className="tree-empty">No shelves</div> :
                                          <div className="shelf-grid">
                                            {cabinet.children.map(shelf => {
                                              const colors = getCapacityColor(shelf.current_load, shelf.capacity_limit);
                                              const pct = shelf.capacity_limit > 0 ? Math.round((shelf.current_load / shelf.capacity_limit) * 100) : 0;
                                              return (
                                                <div key={shelf._id} className={`shelf-card ${colors}`}>
                                                  <div className="shelf-info">
                                                    <span className="shelf-name">📦 {shelf.name}</span>
                                                    <span className="shelf-load">
                                                      {shelf.current_load} / <strong>{shelf.capacity_limit}</strong> max
                                                    </span>
                                                  </div>
                                                  <div className="shelf-progress">
                                                    <div
                                                      className="shelf-fill"
                                                      style={{ width: `${pct}%` }}
                                                    ></div>
                                                  </div>
                                                  <div className="shelf-pct-label">{pct}% full</div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        }
                                      </div>
                                    )}
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalType && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setModalType(null)}></div>
          <div className="modal-content">
            <h2 className="modal-title">
              {modalType === 'shelf' ? '📦 Add Shelves' : `Bulk Add ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}s`}
            </h2>
            <p className="modal-desc">Enter names separated by commas (e.g. A1, A2, A3)</p>
            <form onSubmit={handleBulkCreate}>
              <div className="form-field">
                <label className="field-label">Names *</label>
                <textarea
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  className="field-input"
                  rows="3"
                  placeholder="Alpha, Beta, Gamma..."
                  required
                />
              </div>

              {/* Capacity limit input — only for shelves */}
              {modalType === 'shelf' && (
                <div className="form-field">
                  <label className="field-label">
                    Max Capacity per Shelf
                    <span className="field-hint"> (number of chemical units/containers)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={shelfCapacity}
                    onChange={e => setShelfCapacity(e.target.value)}
                    className="field-input"
                    placeholder="50"
                    required
                  />
                  <p className="field-note">
                    💡 All shelves in this batch will share this limit. You can update individual shelves later.
                  </p>
                </div>
              )}

              {error && <div className="modal-err">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setModalType(null)} className="btn-cancel">Cancel</button>
                <button type="submit" disabled={saving} className="btn-submit">
                  {saving ? "Creating..." : "Create Items"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LocationManager;
