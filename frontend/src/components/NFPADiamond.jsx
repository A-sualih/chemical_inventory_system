import React from 'react';

const NFPADiamond = ({ ratings = { health: 0, flammability: 0, reactivity: 0, special: "" }, size = "md" }) => {
  const sizeMap = {
    sm: "w-24 h-24",
    md: "w-40 h-40",
    lg: "w-56 h-56"
  };

  const textMap = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl"
  };

  return (
    <div className={`relative ${sizeMap[size]} rotate-45 border-2 border-secondary-900/10 overflow-hidden shadow-2xl`}>
      {/* Health (Blue) */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-600 flex items-center justify-center border-r border-b border-white/20">
        <span className={`${textMap[size]} font-black text-white -rotate-45`}>{ratings.health}</span>
      </div>
      
      {/* Flammability (Red) */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-red-600 flex items-center justify-center border-l border-b border-white/20">
        <span className={`${textMap[size]} font-black text-white -rotate-45`}>{ratings.flammability}</span>
      </div>
      
      {/* Reactivity (Yellow) */}
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-yellow-400 flex items-center justify-center border-l border-t border-white/20">
        <span className={`${textMap[size]} font-black text-secondary-900 -rotate-45`}>{ratings.reactivity}</span>
      </div>
      
      {/* Special (White) */}
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-white flex items-center justify-center border-r border-t border-secondary-900/10">
        <span className={`${textMap[size === 'sm' ? 'sm' : 'md']} font-black text-secondary-900 -rotate-45`}>{ratings.special || ""}</span>
      </div>
    </div>
  );
};

export default NFPADiamond;
