import React from 'react';
import "../../styles/components/feedback.css";

const NFPADiamond = ({ ratings = { health: 0, flammability: 0, reactivity: 0, special: "" }, size = "md" }) => {
  return (
    <div className={`nfpa-diamond-mini nfpa-diamond-${size}`}>
      {/* Health (Blue) */}
      <div className="nfpa-square nfpa-health">
        <span className={`nfpa-text nfpa-text-${size}`}>{ratings.health}</span>
      </div>
      
      {/* Flammability (Red) */}
      <div className="nfpa-square nfpa-flammability">
        <span className={`nfpa-text nfpa-text-${size}`}>{ratings.flammability}</span>
      </div>
      
      {/* Reactivity (Yellow) */}
      <div className="nfpa-square nfpa-reactivity">
        <span className={`nfpa-text nfpa-text-${size}`}>{ratings.reactivity}</span>
      </div>
      
      {/* Special (White) */}
      <div className="nfpa-square nfpa-special">
        <span className={`nfpa-text nfpa-text-${size === 'sm' ? 'sm' : 'md'}`}>{ratings.special || ""}</span>
      </div>
    </div>
  );
};

export default NFPADiamond;
