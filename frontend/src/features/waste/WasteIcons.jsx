import React from 'react';

const iconStyle = {
  width: '1em',
  height: '1em',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  verticalAlign: 'middle'
};

export const IconTrash = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <path d="M10 11v6m4-6v6" />
  </svg>
);

export const IconFileText = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const IconAlertTriangle = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconBarChart = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

export const IconClock = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const IconShieldCheck = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const IconSiren = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <path d="M7 18v-6a5 5 0 1 1 10 0v6" />
    <path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v1z" />
    <path d="M21 12h1" />
    <path d="M18.5 4.5L19 5" />
    <path d="M2 12h1" />
    <path d="M4.5 4.5L5 4" />
    <path d="M12 2v1" />
  </svg>
);

export const IconPlus = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconX = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconCheckCircle = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const IconZap = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const IconSearch = ({ size = 20, className = "" }) => (
  <svg style={{ ...iconStyle, width: size, height: size }} className={className} viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
