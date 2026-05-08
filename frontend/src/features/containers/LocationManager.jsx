import { useState, useEffect, useCallback } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "../../styles/LocationManager.css";

const LocationManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "Lab Manager";

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" or "map"

  const emptyForm = { building: "", room: "", cabinet: "", shelf: "", capacity: 20, x: 0, y: 0, safety_warnings: "", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterBuilding ? { building: filterBuilding } : {};
      const { data } = await axios.get("/api/locations", { params });
      setLocations(data);
    } catch (err) {
      setError("Failed to load locations.");
    } finally {
      setLoading(false);
    }
  }, [filterBuilding]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const buildings = [...new Set(locations.map(l => l.building))].sort();

  const grouped = locations.reduce((acc, loc) => {
    const key = loc.building;
    if (!acc[key]) acc[key] = [];
    acc[key].push(loc);
    return acc;
  }, {});

  const openCreate = () => { setForm(emptyForm); setEditingLoc(null); setFormError(""); setShowForm(true); };
  const openEdit = (loc) => {
    setForm({ 
      building: loc.building, 
      room: loc.room, 
      cabinet: loc.cabinet, 
      shelf: loc.shelf, 
      capacity: loc.capacity, 
      x: loc.x || 0,
      y: loc.y || 0,
      safety_warnings: loc.safety_warnings || "", 
      notes: loc.notes || "" 
    });
    setEditingLoc(loc);
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.building || !form.room || !form.cabinet || !form.shelf) {
      return setFormError("All four location fields (Building, Room, Cabinet, Shelf) are required.");
    }
    setSaving(true);
    try {
      if (editingLoc) {
        await axios.put(`/api/locations/${editingLoc._id}`, { 
          capacity: form.capacity, 
          x: form.x,
          y: form.y,
          safety_warnings: form.safety_warnings, 
          notes: form.notes 
        });
        setSuccess("Location updated successfully.");
      } else {
        await axios.post("/api/locations", form);
        setSuccess("Location created successfully.");
      }
      setShowForm(false);
      fetchLocations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to save location.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loc) => {
    try {
      await axios.delete(`/api/locations/${loc._id}`);
      setSuccess("Location deactivated.");
      setDeleteConfirm(null);
      fetchLocations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete location.");
      setDeleteConfirm(null);
      setTimeout(() => setError(""), 5000);
    }
  };

  const getCapacityColor = (load, cap) => {
    const pct = cap > 0 ? (load / cap) * 100 : 0;
    if (pct >= 90) return { bar: "bg-red-500", text: "text-red-600", bg: "bg-red-50 border-red-100" };
    if (pct >= 70) return { bar: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50 border-amber-100" };
    return { bar: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" };
  };

  return (
    <Layout>
      <div className="loc-manager-header">
        <div>
          <h1 className="loc-title">Storage Locations</h1>
          <p className="loc-subtitle">Manage the Building → Room → Cabinet → Shelf hierarchy.</p>
        </div>
        <div className="loc-actions">
          {/* View Toggle */}
          <div className="view-toggle">
            <button 
              onClick={() => setViewMode("list")} 
              className={`view-btn ${viewMode === "list" ? "active" : ""}`}
            >
              List
            </button>
            <button 
              onClick={() => setViewMode("map")} 
              className={`view-btn ${viewMode === "map" ? "active" : ""}`}
            >
              Visual Map
            </button>
          </div>

          <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} className="building-select">
            <option value="">All Buildings</option>
            {buildings.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {isAdmin && (
            <button onClick={openCreate} className="add-loc-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Add Location
            </button>
          )}
        </div>
      </div>

      {/* Toast messages */}
      {success && <div className="toast-msg toast-success"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>{success}</div>}
      {error && <div className="toast-msg toast-error"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>{error}</div>}

      {/* Stats bar */}
      <div className="stats-grid">
        {[
          { label: "Total Slots", value: locations.length, icon: (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          ) },
          { label: "Buildings", value: buildings.length, icon: (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          ) },
          { label: "Rooms", value: [...new Set(locations.map(l => `${l.building}-${l.room}`))].length, icon: (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
          ) },
          { label: "Cabinets", value: [...new Set(locations.map(l => `${l.building}-${l.room}-${l.cabinet}`))].length, icon: (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          ) },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <span className="stat-icon">{stat.icon}</span>
            <div>
              <div className="stat-val">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Location cards grouped by building */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem 0' }}>
          <div className="spinner-primary" style={{ width: '2.5rem', height: '2.5rem', border: '4px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : locations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-box">
             <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h3 className="empty-title">No Locations Configured</h3>
          <p className="empty-desc">Add your first storage location to enable smart dropdowns in the Chemical Form.</p>
          {isAdmin && <button onClick={openCreate} className="add-loc-btn" style={{ margin: '0 auto' }}>Add First Location</button>}
        </div>
      ) : viewMode === "map" ? (
        <div className="map-view">
          <div className="map-legend">
             <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#10b981' }}></div>
                <span className="legend-label">Available</span>
             </div>
             <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#fbbf24' }}></div>
                <span className="legend-label">Near Full</span>
             </div>
             <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="legend-label">Full</span>
             </div>
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary-900)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="24" height="24" color="#2563eb" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Visual Storage Layout
          </h3>

          <div className="map-container">
             {locations.map(loc => {
               const colors = getCapacityColor(loc.current_load, loc.capacity);
               const pct = loc.capacity > 0 ? Math.round((loc.current_load / loc.capacity) * 100) : 0;
               return (
                 <div 
                   key={loc._id}
                   style={{ left: `${loc.x || 0}%`, top: `${loc.y || 0}%` }}
                   className={`map-node ${colors.bg.split(' ')[1]} ${colors.bg.split(' ')[0]}`}
                   onClick={() => isAdmin && openEdit(loc)}
                 >
                   <div className="node-header">
                     <span className={`node-shelf ${colors.bg.split(' ')[0]} ${colors.text}`}>Shelf {loc.shelf}</span>
                     <span className={`node-pct ${colors.text}`}>{pct}%</span>
                   </div>
                   <div className="node-cab">{loc.cabinet}</div>
                   <div className="node-room">{loc.building} • {loc.room}</div>
                   <div style={{ marginTop: '0.5rem', height: '0.25rem', width: '100%', backgroundColor: 'var(--secondary-100)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div className={`cap-fill ${colors.bar}`} style={{ width: `${pct}%` }}></div>
                   </div>
                 </div>
               );
             })}
          </div>
          <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--secondary-400)', fontSize: '0.75rem', fontWeight: 500, fontStyle: 'italic' }}>Locations are positioned based on their X/Y coordinates defined in settings.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([building, locs]) => (
            <div key={building} className="building-group">
              {/* Building header */}
              <div className="building-header">
                <div className="building-icon">{building.charAt(0)}</div>
                <div>
                  <h2 className="building-title">{building}</h2>
                  <p className="building-count">{locs.length} storage slot{locs.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Location rows */}
              <div>
                {locs.sort((a, b) => `${a.room}-${a.cabinet}-${a.shelf}`.localeCompare(`${b.room}-${b.cabinet}-${b.shelf}`)).map(loc => {
                  const pct = loc.capacity > 0 ? Math.min(100, Math.round((loc.current_load / loc.capacity) * 100)) : 0;
                  const colors = getCapacityColor(loc.current_load, loc.capacity);
                  return (
                    <div key={loc._id} className="loc-row">
                      {/* Path breadcrumb */}
                      <div className="loc-path">
                        <div className="path-crumbs">
                          <span className="crumb crumb-b">{loc.building}</span>
                          <svg className="path-sep" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          <span className="crumb crumb-r">{loc.room}</span>
                          <svg className="path-sep" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          <span className="crumb crumb-c">{loc.cabinet}</span>
                          <svg className="path-sep" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          <span className="crumb crumb-s">Shelf {loc.shelf}</span>
                        </div>
                        {(loc.safety_warnings || loc.notes) && (
                          <div className="loc-notes">
                            {loc.safety_warnings && <span className="loc-warn"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{loc.safety_warnings}</span>}
                            {loc.notes && <span>{loc.notes}</span>}
                          </div>
                        )}
                      </div>

                      {/* Capacity bar */}
                      <div className="cap-bar-wrapper">
                        <div className={`cap-labels ${colors.text}`}>
                          <span>Capacity</span>
                          <span>{loc.current_load}/{loc.capacity}</span>
                        </div>
                        <div className="cap-track">
                          <div className={`cap-fill ${colors.bar}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className={`status-badge ${colors.bg} ${colors.text}`}>
                        {pct >= 90 ? "Full" : pct >= 70 ? "Near Full" : "Available"}
                      </div>

                      {/* Actions */}
                      {isAdmin && (
                        <div className="loc-actions-col">
                          <button onClick={() => openEdit(loc)} className="action-btn action-edit" title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => setDeleteConfirm(loc)} className="action-btn action-del" title="Deactivate">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowForm(false)}></div>
          <div className="modal-content">
            <h2 className="modal-title">{editingLoc ? "Edit Location" : "Add New Location"}</h2>
            <p className="modal-desc">{editingLoc ? `Editing: ${editingLoc.building}/${editingLoc.room}/${editingLoc.cabinet}/Shelf-${editingLoc.shelf}` : "Define a new storage slot in the hierarchy."}</p>

            <form onSubmit={handleSave}>
              {/* Building / Room */}
              <div className="form-grid-2">
                <div>
                  <label className="field-label">Building *</label>
                  <input type="text" value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} disabled={!!editingLoc} placeholder="e.g. Block-A" className="field-input" required />
                </div>
                <div>
                  <label className="field-label">Room *</label>
                  <input type="text" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} disabled={!!editingLoc} placeholder="e.g. 101" className="field-input" required />
                </div>
              </div>
              {/* Cabinet / Shelf */}
              <div className="form-grid-2">
                <div>
                  <label className="field-label">Cabinet *</label>
                  <input type="text" value={form.cabinet} onChange={e => setForm({ ...form, cabinet: e.target.value })} disabled={!!editingLoc} placeholder="e.g. C1" className="field-input" required />
                </div>
                <div>
                  <label className="field-label">Shelf *</label>
                  <input type="text" value={form.shelf} onChange={e => setForm({ ...form, shelf: e.target.value })} disabled={!!editingLoc} placeholder="e.g. 1" className="field-input" required />
                </div>
              </div>
              {/* Capacity & Coordinates */}
              <div className="form-grid-3">
                <div>
                  <label className="field-label">Max Capacity</label>
                  <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} className="field-input" style={{ color: '#1d4ed8', fontWeight: 700 }} />
                </div>
                <div>
                  <label className="field-label">X Coord (%)</label>
                  <input type="number" min="0" max="100" value={form.x} onChange={e => setForm({ ...form, x: Number(e.target.value) })} className="field-input" style={{ color: 'var(--secondary-700)', fontWeight: 700 }} />
                </div>
                <div>
                  <label className="field-label">Y Coord (%)</label>
                  <input type="number" min="0" max="100" value={form.y} onChange={e => setForm({ ...form, y: Number(e.target.value) })} className="field-input" style={{ color: 'var(--secondary-700)', fontWeight: 700 }} />
                </div>
              </div>
              {/* Safety warnings */}
              <div className="form-field">
                <label className="field-label">Safety Warnings</label>
                <input type="text" value={form.safety_warnings} onChange={e => setForm({ ...form, safety_warnings: e.target.value })} placeholder="e.g. Flammables only, keep dry" className="field-input" />
              </div>
              {/* Notes */}
              <div className="form-field">
                <label className="field-label">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional additional notes" className="field-input" />
              </div>

              {formError && <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, marginTop: '1rem' }}>{formError}</div>}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">Cancel</button>
                <button type="submit" disabled={saving} className="btn-submit">
                  {saving ? "Saving..." : editingLoc ? "Save Changes" : "Create Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}></div>
          <div className="modal-content modal-content-sm">
            <div style={{ width: '4rem', height: '4rem', backgroundColor: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#ef4444' }}>
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary-900)', marginBottom: '0.5rem' }}>Deactivate Location?</h3>
            <p style={{ color: 'var(--secondary-500)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--secondary-900)' }}>{deleteConfirm.building}/{deleteConfirm.room}/{deleteConfirm.cabinet}/Shelf-{deleteConfirm.shelf}</span>
            </p>
            <p style={{ color: 'var(--secondary-400)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>This will hide it from dropdowns. Cannot be done if chemicals are assigned here.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn-cancel">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LocationManager;
