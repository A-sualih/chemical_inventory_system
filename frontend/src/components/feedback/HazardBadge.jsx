import React from 'react';
import { HAZARD_CLASSES } from '../../constants/hazards.jsx';
import "../../styles/components/feedback.css";

export const HazardBadge = ({ hazards = [], size = "md", showLabel = false }) => {
  if (!hazards || !Array.isArray(hazards) || hazards.length === 0) return null;

  return (
    <div className="hazard-badge-container">
      {hazards.map((hazardId) => {
        const hazard = HAZARD_CLASSES.find(h => h.id === hazardId) || 
                       HAZARD_CLASSES.find(h => h.label === hazardId);
        
        if (!hazard) return null;

        return (
          <div 
            key={hazard.id} 
            className="hazard-badge-wrapper"
            title={hazard.label}
          >
            <div className={`hazard-badge-icon hazard-badge-${size} ${hazard.color}`}>
              {hazard.icon}
            </div>
            
            {showLabel && (
              <span className="hazard-label">
                {hazard.label}
              </span>
            )}

            {/* Tooltip */}
            <div className="hazard-tooltip">
              <p className="hazard-tooltip-title">{hazard.label}</p>
              <p className="hazard-tooltip-desc">{hazard.description}</p>
              <div className="hazard-tooltip-arrow"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HazardBadge;
