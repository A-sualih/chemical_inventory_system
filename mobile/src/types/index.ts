export type UserRole =
  | 'Admin'
  | 'Lab Manager'
  | 'Lab Technician'
  | 'Safety Officer'
  | 'Viewer / Auditor';

export interface LabRef {
  _id: string;
  name?: string;
  lab_code?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  active_lab?: string | LabRef | null;
  labs?: Array<string | LabRef>;
}

export interface Chemical {
  _id?: string;
  id: string;
  name: string;
  cas_number?: string;
  quantity?: number;
  unit?: string;
  status?: string;
  location?: string;
  expiry_date?: string;
  ghs_hazards?: string[];
  ppe_requirements?: string[];
  formula?: string;
  batch_number?: string;
}

export interface ScanResult {
  found: boolean;
  type?: string;
  message?: string;
  scannedCode?: string;
  data?: {
    chemical: {
      id: string;
      name: string;
      cas?: string;
      hazards?: string[];
      ppe?: string[];
      expiry?: string;
      sds_url?: string;
    };
    container: {
      _id?: string;
      id: string;
      quantity: number;
      unit: string;
      status: string;
      location: string;
    } | null;
  };
}

export interface AppNotification {
  _id: string;
  title?: string;
  message?: string;
  type?: string;
  is_read?: boolean;
  createdAt?: string;
}

export interface UsageRequest {
  _id: string;
  chemical_name?: string;
  chemical_id?: string;
  quantity?: number;
  unit?: string;
  status?: string;
  reason?: string;
  requester_name?: string;
  createdAt?: string;
}
