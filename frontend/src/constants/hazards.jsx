import React from 'react';

export const GHS_PICTOGRAMS = {
  "Explosive": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <circle cx="50" cy="50" r="5" fill="currentColor" />
      <path d="M50 50 L70 30 M50 50 L75 45 M50 50 L70 70 M50 50 L30 30 M50 50 L25 55 M50 50 L35 75" strokeWidth="3" />
    </svg>
  ),
  "Flammable": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <path d="M50 80 Q60 60 50 40 Q40 60 50 80 M50 70 Q55 60 50 50 Q45 60 50 70" fill="currentColor" />
    </svg>
  ),
  "Oxidizer": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <circle cx="50" cy="65" r="15" fill="none" strokeWidth="3" />
      <path d="M50 50 L50 35 M40 45 L50 35 L60 45" strokeWidth="3" />
    </svg>
  ),
  "Compressed Gas": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <rect x="35" y="40" width="30" height="40" rx="5" fill="currentColor" />
      <rect x="45" y="30" width="10" height="10" fill="currentColor" />
    </svg>
  ),
  "Corrosive": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <path d="M30 60 L45 60 M55 60 L70 60 M50 75 L50 85" strokeWidth="3" />
      <path d="M40 40 Q40 50 50 50 Q60 50 60 40" strokeWidth="3" />
    </svg>
  ),
  "Toxic": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <circle cx="50" cy="45" r="12" fill="currentColor" />
      <path d="M35 70 L65 70 M40 65 L60 75 M40 75 L60 65" strokeWidth="4" />
    </svg>
  ),
  "Irritant": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <rect x="46" y="35" width="8" height="25" fill="currentColor" />
      <circle cx="50" cy="70" r="4" fill="currentColor" />
    </svg>
  ),
  "Health Hazard": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <path d="M50 35 L40 50 L50 65 L60 50 Z" fill="currentColor" />
      <path d="M50 35 L30 50 L50 75 L70 50 Z" fill="none" strokeWidth="2" />
    </svg>
  ),
  "Environmental": (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M50 10 L90 50 L50 90 L10 50 Z" strokeWidth="4" />
      <path d="M30 70 Q50 60 70 70" strokeWidth="3" />
      <path d="M40 40 L45 50 L35 55 Z" fill="currentColor" />
    </svg>
  )
};

export const HAZARD_CLASSES = [
  { id: "Explosive", label: "Explosive", color: "bg-orange-600", icon: GHS_PICTOGRAMS["Explosive"], description: "Unstable explosives, self-reactive substances, and organic peroxides." },
  { id: "Flammable", label: "Flammable", color: "bg-red-600", icon: GHS_PICTOGRAMS["Flammable"], description: "Flammable gases, aerosols, liquids, and solids." },
  { id: "Oxidizer", label: "Oxidizing", color: "bg-yellow-500", icon: GHS_PICTOGRAMS["Oxidizer"], description: "Oxidizing gases, liquids, and solids." },
  { id: "Compressed Gas", label: "Compressed Gas", color: "bg-blue-500", icon: GHS_PICTOGRAMS["Compressed Gas"], description: "Gases under pressure." },
  { id: "Corrosive", label: "Corrosive", color: "bg-blue-800", icon: GHS_PICTOGRAMS["Corrosive"], description: "Skin corrosion/burns, eye damage, corrosive to metals." },
  { id: "Toxic", label: "Toxic", color: "bg-gray-900", icon: GHS_PICTOGRAMS["Toxic"], description: "Fatal or toxic if swallowed, in contact with skin or if inhaled." },
  { id: "Irritant", label: "Irritant", color: "bg-red-500", icon: GHS_PICTOGRAMS["Irritant"], description: "Acute toxicity, skin/eye irritation, skin sensitization." },
  { id: "Health Hazard", label: "Health Hazard", color: "bg-purple-900", icon: GHS_PICTOGRAMS["Health Hazard"], description: "Carcinogenicity, mutagenicity, reproductive toxicity." },
  { id: "Environmental", label: "Environmental", color: "bg-green-700", icon: GHS_PICTOGRAMS["Environmental"], description: "Hazardous to the aquatic environment." }
];

export const NFPA_RATINGS = [
  { label: "Health", color: "blue", levels: ["No Hazard", "Slightly Hazardous", "Hazardous", "Extreme Danger", "Deadly"] },
  { label: "Flammability", color: "red", levels: ["Will not burn", "Above 200°F", "Below 200°F", "Below 100°F", "Below 73°F"] },
  { label: "Instability", color: "yellow", levels: ["Stable", "Unstable if heated", "Violent Chemical Change", "Shock and Heat may detonate", "May Detonate"] },
  { label: "Special", color: "white", options: ["", "OX", "W", "SA", "ACID", "ALK", "COR", "☢️"] }
];

export const PPE_OPTIONS = [
  "Safety Goggles",
  "Face Shield",
  "Nitrile Gloves",
  "Latex Gloves",
  "Lab Coat",
  "Chemical Apron",
  "Respirator (N95)",
  "Respirator (Organic Vapor)",
  "Full Body Suit",
  "Booties"
];

export const EXPOSURE_RISKS = [
  "Inhalation",
  "Skin Contact",
  "Eye Contact",
  "Ingestion",
  "Injection"
];

