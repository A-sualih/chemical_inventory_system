import { useState, useEffect, useCallback } from "react";
import Layout from "../layout/Layout";
import axios from "axios";
import { useAuth } from "../AuthContext";

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

  const emptyForm = { building: "", room: "", cabinet: "", shelf: "", capacity: 20, safety_warnings: "", notes: "" };
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
    setForm({ building: loc.building, room: loc.room, cabinet: loc.cabinet, shelf: loc.shelf, capacity: loc.capacity, safety_warnings: loc.safety_warnings || "", notes: loc.notes || "" });
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
        await axios.put(`/api/locations/${editingLoc._id}`, { capacity: form.capacity, safety_warnings: form.safety_warnings, notes: form.notes });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black heading-font text-secondary-900 tracking-tight">Storage Locations</h1>
          <p className="text-secondary-500 font-medium">Manage the Building → Room → Cabinet → Shelf hierarchy.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Building filter */}
          <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} className="px-4 py-2.5 rounded-2xl border border-secondary-200 bg-white text-sm font-bold text-secondary-600 shadow-sm">
            <option value="">All Buildings</option>
            {buildings.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {isAdmin && (
            <button onClick={openCreate} className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary-600/20 transition-all active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Add Location
            </button>
          )}
        </div>
      </div>

      {/* Toast messages */}
      {success && <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl font-semibold text-sm flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>{success}</div>}
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-semibold text-sm flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>{error}</div>}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Slots", value: locations.length, icon: <img src="/icons/box.svg" alt="Total Slots" className="w-6 h-6 select-none" draggable="false" /> },
          { label: "Buildings", value: buildings.length, icon: <img src="/icons/building.svg" alt="Buildings" className="w-6 h-6 select-none" draggable="false" /> },
          { label: "Rooms", value: [...new Set(locations.map(l => `${l.building}-${l.room}`))].length, icon: <img src="/icons/door.svg" alt="Rooms" className="w-6 h-6 select-none" draggable="false" /> },
          { label: "Cabinets", value: [...new Set(locations.map(l => `${l.building}-${l.room}-${l.cabinet}`))].length, icon: <img src="/icons/cabinet.svg" alt="Cabinets" className="w-6 h-6 select-none" draggable="false" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-secondary-100 p-4 shadow-sm flex items-center gap-3">
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <div className="text-2xl font-black text-secondary-900">{stat.value}</div>
              <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Location cards grouped by building */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      ) : locations.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-secondary-100 shadow-xl py-24 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <img src="/icons/empty-location.svg" alt="No locations" className="w-10 h-10 select-none" draggable="false" />
          </div>
          <h3 className="text-xl font-black text-secondary-900 mb-2">No Locations Configured</h3>
          <p className="text-secondary-500 font-medium mb-6">Add your first storage location to enable smart dropdowns in the Chemical Form.</p>
          {isAdmin && <button onClick={openCreate} className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-primary-600/20">Add First Location</button>}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([building, locs]) => (
            <div key={building} className="bg-white rounded-[2rem] border border-secondary-100 shadow-xl overflow-hidden">
              {/* Building header */}
              <div className="px-6 py-4 bg-gradient-to-r from-secondary-900 to-secondary-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center text-white font-black text-sm">{building.charAt(0)}</div>
                <div>
                  <h2 className="text-white font-black text-lg">{building}</h2>
                  <p className="text-secondary-400 text-xs font-medium">{locs.length} storage slot{locs.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Location rows */}
              <div className="divide-y divide-secondary-50">
                {locs.sort((a, b) => `${a.room}-${a.cabinet}-${a.shelf}`.localeCompare(`${b.room}-${b.cabinet}-${b.shelf}`)).map(loc => {
                  const pct = loc.capacity > 0 ? Math.min(100, Math.round((loc.current_load / loc.capacity) * 100)) : 0;
                  const colors = getCapacityColor(loc.current_load, loc.capacity);
                  return (
                    <div key={loc._id} className="px-6 py-4 flex flex-wrap items-center gap-4 hover:bg-secondary-50/40 transition-all group">
                      {/* Path breadcrumb */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-secondary-900 flex-wrap">
                          <span className="bg-secondary-100 text-secondary-600 px-2 py-0.5 rounded-lg text-xs font-mono">{loc.building}</span>
                          <svg className="w-3 h-3 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-xs font-mono">{loc.room}</span>
                          <svg className="w-3 h-3 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg text-xs font-mono">{loc.cabinet}</span>
                          <svg className="w-3 h-3 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          <span className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded-lg text-xs font-mono">Shelf {loc.shelf}</span>
                        </div>
                        {(loc.safety_warnings || loc.notes) && (
                          <div className="mt-1 text-xs text-secondary-500 truncate flex items-center gap-1">
                            {loc.safety_warnings && <span className="text-amber-600 font-semibold mr-2 flex items-center gap-1"><img src="/icons/warning.svg" alt="Warning" className="w-3.5 h-3.5 select-none" draggable="false" />{loc.safety_warnings}</span>}
                            {loc.notes && <span>{loc.notes}</span>}
                          </div>
                        )}
                      </div>

                      {/* Capacity bar */}
                      <div className="w-36 shrink-0">
                        <div className={`flex justify-between text-[10px] font-bold uppercase mb-1 ${colors.text}`}>
                          <span>Capacity</span>
                          <span>{loc.current_load}/{loc.capacity}</span>
                        </div>
                        <div className="h-1.5 bg-secondary-100 rounded-full">
                          <div className={`h-full rounded-full transition-all ${colors.bar}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${colors.bg} ${colors.text}`}>
                        {pct >= 90 ? "Full" : pct >= 70 ? "Near Full" : "Available"}
                      </div>

                      {/* Actions */}
                      {isAdmin && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEdit(loc)} className="w-8 h-8 flex items-center justify-center bg-white border border-secondary-200 rounded-xl text-secondary-400 hover:text-secondary-900 transition-all shadow-sm" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => setDeleteConfirm(loc)} className="w-8 h-8 flex items-center justify-center bg-white border border-secondary-200 rounded-xl text-red-400 hover:text-red-600 hover:border-red-400 transition-all shadow-sm" title="Deactivate">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-md" onClick={() => setShowForm(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-secondary-100 p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-secondary-900 mb-1">{editingLoc ? "Edit Location" : "Add New Location"}</h2>
            <p className="text-secondary-500 text-sm font-medium mb-6">{editingLoc ? `Editing: ${editingLoc.building}/${editingLoc.room}/${editingLoc.cabinet}/Shelf-${editingLoc.shelf}` : "Define a new storage slot in the hierarchy."}</p>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Building / Room */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1.5 block">Building *</label>
                  <input type="text" value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} disabled={!!editingLoc} placeholder="e.g. Block-A" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-primary-400" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1.5 block">Room *</label>
                  <input type="text" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} disabled={!!editingLoc} placeholder="e.g. 101" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-primary-400" required />
                </div>
              </div>
              {/* Cabinet / Shelf */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1.5 block">Cabinet *</label>
                  <input type="text" value={form.cabinet} onChange={e => setForm({ ...form, cabinet: e.target.value })} disabled={!!editingLoc} placeholder="e.g. C1" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-primary-400" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1.5 block">Shelf *</label>
                  <input type="text" value={form.shelf} onChange={e => setForm({ ...form, shelf: e.target.value })} disabled={!!editingLoc} placeholder="e.g. 1" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-primary-400" required />
                </div>
              </div>
              {/* Capacity */}
              <div>
                <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1.5 block">Max Capacity (chemicals)</label>
                <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-bold text-primary-700 focus:outline-none focus:border-primary-400" />
              </div>
              {/* Safety warnings */}
              <div>
                <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1.5 block">Safety Warnings</label>
                <input type="text" value={form.safety_warnings} onChange={e => setForm({ ...form, safety_warnings: e.target.value })} placeholder="e.g. Flammables only, keep dry" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-amber-400" />
              </div>
              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1.5 block">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional additional notes" className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-primary-400" />
              </div>

              {formError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold">{formError}</div>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-secondary-200 rounded-2xl text-secondary-600 font-bold hover:bg-secondary-50 transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-[2] bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-2xl font-black shadow-xl shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-60">
                  {saving ? "Saving..." : editingLoc ? "Save Changes" : "Create Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-md" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl border border-secondary-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-black text-secondary-900 mb-2">Deactivate Location?</h3>
            <p className="text-secondary-500 text-sm mb-1 font-medium">
              <span className="font-bold text-secondary-900">{deleteConfirm.building}/{deleteConfirm.room}/{deleteConfirm.cabinet}/Shelf-{deleteConfirm.shelf}</span>
            </p>
            <p className="text-secondary-400 text-xs mb-6">This will hide it from dropdowns. Cannot be done if chemicals are assigned here.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 border border-secondary-200 rounded-2xl text-secondary-600 font-bold hover:bg-secondary-50 transition-all">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-black transition-all">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LocationManager;
