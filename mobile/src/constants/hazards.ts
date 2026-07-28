export const FILTER_HAZARD_LEVELS = [
  'Flammable',
  'Toxic',
  'Corrosive',
  'Oxidizer',
  'Health Hazard',
  'Environmental Hazard',
  'Biohazard',
  'Explosive',
  'Radioactive',
] as const;

export const STATUS_FILTERS = [
  'In Stock',
  'In Use',
  'Low Stock',
  'Out of Stock',
  'Near Expiry',
  'Expired',
] as const;

export const HAZARD_CLASSES = [
  { id: 'Explosive', label: 'Explosive', tone: 'danger' as const },
  { id: 'Flammable', label: 'Flammable', tone: 'danger' as const },
  { id: 'Oxidizer', label: 'Oxidizing', tone: 'warn' as const },
  { id: 'Compressed Gas', label: 'Compressed Gas', tone: 'muted' as const },
  { id: 'Corrosive', label: 'Corrosive', tone: 'warn' as const },
  { id: 'Toxic', label: 'Toxic', tone: 'danger' as const },
  { id: 'Irritant', label: 'Irritant', tone: 'warn' as const },
  { id: 'Health Hazard', label: 'Health Hazard', tone: 'danger' as const },
  { id: 'Environmental', label: 'Environmental', tone: 'ok' as const },
];

export const NFPA_RATINGS = [
  { label: 'Health', key: 'health' as const, levels: ['No Hazard', 'Slightly Hazardous', 'Hazardous', 'Extreme Danger', 'Deadly'] },
  { label: 'Flammability', key: 'flammability' as const, levels: ['Will not burn', 'Above 200°F', 'Below 200°F', 'Below 100°F', 'Below 73°F'] },
  { label: 'Instability', key: 'reactivity' as const, levels: ['Stable', 'Unstable if heated', 'Violent Chemical Change', 'Shock and Heat may detonate', 'May Detonate'] },
  { label: 'Special', key: 'special' as const, options: ['', 'OX', 'W', 'SA', 'ACID', 'ALK', 'COR', '☢️'] },
];

export const PPE_OPTIONS = [
  'Safety Goggles',
  'Face Shield',
  'Nitrile Gloves',
  'Latex Gloves',
  'Lab Coat',
  'Chemical Apron',
  'Respirator (N95)',
  'Respirator (Organic Vapor)',
  'Full Body Suit',
  'Booties',
];

export const EXPOSURE_RISK_TAGS = ['Carcinogen', 'Mutagen', 'Teratogen', 'Sensitizer', 'Asphyxiant'];

export const CHEMICAL_FAMILIES = [
  'General',
  'Acid',
  'Base',
  'Oxidizer',
  'Flammable',
  'Reactive',
] as const;
