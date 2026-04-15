import React from 'react';
import { HAZARD_CLASSES } from '../constants/hazards.jsx';

export const HazardBadge = ({ hazards = [], size = "md", showLabel = false }) => {
  if (!hazards || !Array.isArray(hazards) || hazards.length === 0) return null;

  const sizeClasses = {
    sm: "w-6 h-6 p-1 text-xs",
    md: "w-10 h-10 p-2 text-sm",
    lg: "w-14 h-14 p-3 text-base"
  };

  return (
    <div className="flex flex-wrap gap-2">
      {hazards.map((hazardId) => {
        const hazard = HAZARD_CLASSES.find(h => h.id === hazardId) || 
                       HAZARD_CLASSES.find(h => h.label === hazardId); // Fallback for legacy labels
        
        if (!hazard) return null;

        return (
          <div 
            key={hazard.id} 
            className="group relative flex items-center"
            title={hazard.label}
          >
            <div className={`
              ${sizeClasses[size]} 
              ${hazard.color} 
              text-white rounded-xl shadow-sm 
              flex items-center justify-center 
              transition-all duration-300 
              group-hover:scale-110 group-hover:shadow-md
              hover:rotate-3
              cursor-help
            `}>
              {hazard.icon}
            </div>
            
            {showLabel && (
              <span className="ml-2 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                {hazard.label}
              </span>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-secondary-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl">
              <p className="font-bold border-b border-white/10 pb-1 mb-1">{hazard.label}</p>
              <p className="font-medium text-secondary-300 leading-tight">{hazard.description}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-secondary-900"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HazardBadge;
