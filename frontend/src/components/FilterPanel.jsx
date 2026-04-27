import React from 'react';

const FilterPanel = ({ filters, setFilters, onClear, buildings }) => {
  const hazardLevels = ['Flammable', 'Toxic', 'Corrosive', 'Oxidizer', 'Health Hazard', 'Environmental Hazard', 'Biohazard', 'Explosive', 'Radioactive'];
  const statuses = ['In Stock', 'In Use', 'Low Stock', 'Out of Stock', 'Near Expiry', 'Expired'];


  const handleToggleHazard = (h) => {
    const current = filters.hazard || [];
    if (current.includes(h)) {
      setFilters({ ...filters, hazard: current.filter(item => item !== h) });
    } else {
      setFilters({ ...filters, hazard: [...current, h] });
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-sm space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest">Hazard Classes</h3>
          <button onClick={() => setFilters({ ...filters, hazard: [] })} className="text-[10px] font-bold text-primary-600 hover:underline">Reset</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {hazardLevels.map(h => (
            <button
              key={h}
              onClick={() => handleToggleHazard(h)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                filters.hazard?.includes(h) 
                  ? 'bg-secondary-900 text-white border-secondary-900 shadow-md' 
                  : 'bg-white text-secondary-500 border-secondary-100 hover:border-secondary-300'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest">Inventory Status</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {statuses.map(s => (
            <label key={s} className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500/20"
                checked={filters.status?.includes(s)}
                onChange={(e) => {
                  const current = filters.status || [];
                  if (e.target.checked) setFilters({ ...filters, status: [...current, s] });
                  else setFilters({ ...filters, status: current.filter(item => item !== s) });
                }}
              />
              <span className="text-sm font-bold text-secondary-600 group-hover:text-secondary-900 transition-colors">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-4">Location Drilling</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-secondary-400 uppercase mb-1 block">Building</label>
            <select 
              className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
              value={filters.building || ''}
              onChange={(e) => setFilters({ ...filters, building: e.target.value })}
            >
              <option value="">All Buildings</option>
              {buildings?.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-secondary-400 uppercase mb-1 block">Room</label>
            <input 
              type="text" 
              placeholder="e.g. 101"
              className="w-full bg-secondary-50 border border-secondary-100 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
              value={filters.room || ''}
              onChange={(e) => setFilters({ ...filters, room: e.target.value })}
            />
          </div>
        </div>
      </div>

      <button 
        onClick={onClear}
        className="w-full py-3 bg-secondary-50 text-secondary-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-secondary-100 transition-all border border-secondary-100"
      >
        Clear All Filters
      </button>
    </div>
  );
};

export default FilterPanel;
