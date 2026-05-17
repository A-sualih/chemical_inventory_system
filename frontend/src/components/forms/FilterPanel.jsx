import React from 'react';
import "../../styles/components/forms.css";

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
    <div className="filter-panel">
      <div>
        <div className="filter-section-header">
          <h3 className="filter-section-title">Hazard Classes</h3>
          <button onClick={() => setFilters({ ...filters, hazard: [] })} className="filter-reset-btn">Reset</button>
        </div>
        <div className="filter-tag-container">
          {hazardLevels.map(h => (
            <button
              key={h}
              onClick={() => handleToggleHazard(h)}
              className={`filter-tag-btn ${filters.hazard?.includes(h) ? 'active' : ''}`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="filter-section-header">
          <h3 className="filter-section-title">Inventory Status</h3>
        </div>
        <div className="filter-checkbox-list">
          {statuses.map(s => (
            <label key={s} className="filter-checkbox-item">
              <input
                type="checkbox"
                className="filter-checkbox"
                checked={filters.status?.includes(s)}
                onChange={(e) => {
                  const current = filters.status || [];
                  if (e.target.checked) setFilters({ ...filters, status: [...current, s] });
                  else setFilters({ ...filters, status: current.filter(item => item !== s) });
                }}
              />
              <span className="filter-checkbox-label">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="filter-section-title" style={{ marginBottom: '1rem' }}>Location Drilling</h3>
        <div className="filter-input-group">
          <div className="filter-field">
            <label className="filter-field-label">Building</label>
            <select
              className="filter-select"
              value={filters.building || ''}
              onChange={(e) => setFilters({ ...filters, building: e.target.value })}
            >
              <option value="">All Buildings</option>
              {buildings?.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-field-label">Room</label>
            <input
              type="text"
              placeholder="e.g. 101"
              className="filter-input"
              value={filters.room || ''}
              onChange={(e) => setFilters({ ...filters, room: e.target.value })}
            />
          </div>
        </div>
      </div>

      <button
        onClick={onClear}
        className="filter-clear-btn"
      >
        Clear All Filters
      </button>
    </div>
  );
};

export default FilterPanel;

