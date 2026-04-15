import React from 'react';

export const HAZARD_CLASSES = [
  {
    id: "Explosive",
    label: "Explosive",
    color: "bg-orange-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2L1,12L12,22L23,12L12,2M12,4.8L20.2,12L12,19.2L3.8,12L12,4.8M12,7.5A4.5,4.5 0 0,0 7.5,12A4.5,4.5 0 0,0 12,16.5A4.5,4.5 0 0,0 16.5,12A4.5,4.5 0 0,0 12,7.5M12,9.5A2.5,2.5 0 0,1 14.5,12A2.5,2.5 0 0,1 12,14.5A2.5,2.5 0 0,1 9.5,12A2.5,2.5 0 0,1 12,9.5Z" />
      </svg>
    ),
    description: "Unstable explosives, self-reactive substances, and organic peroxides."
  },
  {
    id: "Flammable",
    label: "Flammable",
    color: "bg-red-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.55,11.2C17.42,10.6 17.22,10.06 16.94,9.57C16.36,8.56 15.5,7.74 14.5,7.11C15.2,8.87 14.3,10.45 13.5,11.3C13.2,11.62 12.86,11.9 12.5,12.11C11.5,12.7 10.32,12.94 9.2,12.83C7.54,12.67 6.13,11.85 5.31,10.63C5.11,11.23 5,11.87 5,12.54C5,16.4 8.13,19.54 12,19.54C15.87,19.54 19,16.4 19,12.54C19,12.08 18.96,11.64 18.87,11.21C18.84,11.2 18.8,11.21 18.77,11.21C18.36,11.21 17.95,11.21 17.55,11.21V11.2M12,2C12,2 12,5 10,7C10,7 13.5,5.5 14,9C14,9 16,8 16,11C16,11 19,10 17,5C17,5 20,9 17,14C17,14 18,11 15,10C15,10 16,13 13,15C13,15 15,14 14,11C14,11 12,12 11,10C11,10 12,14 8,15C8,15 11,14 10,11C10,11 9,13 7,13C7,13 8,11 7,9C7,9 5,11 5,14C5,14 6,10 10,8C10,8 9,7 10,5C10,5 11,6 12,2Z" />
      </svg>
    ),
    description: "Flammable gases, aerosols, liquids, and solids."
  },
  {
    id: "Oxidizer",
    label: "Oxidizing",
    color: "bg-yellow-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2L1,12L12,22L23,12L12,2M12,4.8L20.2,12L12,19.2L3.8,12L12,4.8M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,10.5L13,12L12,13.5L11,12L12,10.5Z" />
      </svg>
    ),
    description: "Oxidizing gases, liquids, and solids."
  },
  {
    id: "Compressed Gas",
    label: "Compressed Gas",
    color: "bg-blue-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2L1,12L12,22L23,12L12,2M12,4.8L20.2,12L12,19.2L3.8,12L12,4.8M19,12A7,7 0 0,1 12,19A7,7 0 0,1 5,12A7,7 0 0,1 12,5A7,7 0 0,1 19,12M17,12A5,5 0 0,0 12,7V17A5,5 0 0,0 17,12Z" />
      </svg>
    ),
    description: "Gases under pressure."
  },
  {
    id: "Corrosive",
    label: "Corrosive",
    color: "bg-blue-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2L1,12L12,22L23,12L12,2M12,4.8L20.2,12L12,19.2L3.8,12L12,4.8M8,10V14H10V10H8M14,10V14H16V10H14M6,15V17H18V15H6Z" />
      </svg>
    ),
    description: "Skin corrosion/burns, eye damage, corrosive to metals."
  },
  {
    id: "Toxic",
    label: "Toxic",
    color: "bg-gray-800",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2C11.1,2 10.3,2.7 10,3.5C10,3.6 10,3.6 10,3.6C9.6,3.1 9,2.8 8.4,2.8C7.4,2.8 6.5,3.6 6.5,4.7C6.5,5.1 6.6,5.5 6.8,5.8C5.2,6.4 4,8 4,9.8C4,11.3 4.8,12.7 6,13.4V15C6,16.1 6.9,17 8,17H10V18H8V20H10V21C10,21.6 10.4,22 11,22H13C13.6,22 14,21.6 14,21V20H16V18H14V17H16C17.1,17 18,16.1 18,15V13.4C19.2,12.7 20,11.3 20,9.8C20,8 18.8,6.4 17.2,5.8C17.4,5.5 17.5,5.1 17.5,4.7C17.5,3.6 16.6,2.8 15.6,2.8C15,2.8 14.4,3.1 14,3.6C14,3.6 14,3.6 14,3.5C13.7,2.7 12.9,2 12,2M12,5.5C12.8,5.5 13.5,6.2 13.5,7C13.5,7.8 12.8,8.5 12,8.5C11.2,8.5 10.5,7.8 10.5,7C10.5,6.2 11.2,5.5 12,5.5M8,9C8.8,9 9.5,9.7 9.5,10.5C9.5,11.3 8.8,12 8,12C7.2,12 6.5,11.3 6.5,10.5C6.5,9.7 7.2,9 8,9M16,9C16.8,9 17.5,9.7 17.5,10.5C17.5,11.3 16.8,12 16,12C15.2,12 14.5,11.3 14.5,10.5C14.5,9.7 15.2,9 16,9Z" />
      </svg>
    ),
    description: "Fatal or toxic if swallowed, in contact with skin or if inhaled."
  },
  {
    id: "Irritant",
    label: "Irritant",
    color: "bg-red-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2L1,12L12,22L23,12L12,2M12,4.8L20.2,12L12,19.2L3.8,12L12,4.8M11,7H13V14H11V7M11,15H13V17H11V15Z" />
      </svg>
    ),
    description: "Acute toxicity, skin/eye irritation, skin sensitization."
  },
  {
    id: "Health Hazard",
    label: "Health Hazard",
    color: "bg-blue-900",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2L1,12L12,22L23,12L12,2M12,4.8L20.2,12L12,19.2L3.8,12L12,4.8M12,7C10.62,7 9.5,8.12 9.5,9.5C9.5,10.88 10.62,12 12,12C13.38,12 14.5,10.88 14.5,9.5C14.5,8.12 13.38,7 12,7M7,17V15.5C7,14.22 9.24,13.2 12,13.2C14.76,13.2 17,14.22 17,15.5V17H7Z" />
      </svg>
    ),
    description: "Carcinogenicity, mutagenicity, reproductive toxicity."
  },
  {
    id: "Environmental",
    label: "Environmental",
    color: "bg-green-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2L1,12L12,22L23,12L12,2M12,4.8L20.2,12L12,19.2L3.8,12L12,4.8M17,11V13H15V11H17M13,11V13H11V11H13M9,11V13H7V11H9M7,14V16H9V14H7M11,14V16H13V14H11M15,14V16H17V14H15" />
      </svg>
    ),
    description: "Hazardous to the aquatic environment."
  },
  {
    id: "Biohazard",
    label: "Biohazard",
    color: "bg-yellow-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,10.27L13,11.27L12,12.27L11,11.27L12,10.27M12,2L1,12L12,22L23,12L12,2M12,4.8L20.2,12L12,19.2L3.8,12L12,4.8M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z" />
      </svg>
    ),
    description: "Biological substances that pose a threat to the health of living organisms."
  }
];
