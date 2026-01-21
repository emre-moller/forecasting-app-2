export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

export interface Forecast {
  id: string;

  // Snowflake-compatible core fields
  profitcenter: number | null;
  wbs: string | null;
  accountNumber: number | null;
  year: string;
  source: string;

  // UI metadata fields (stored separately, for display only)
  departmentId: string | null;
  projectId: string | null;
  projectName: string | null;

  // Monthly values
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;

  // Totals
  total: number;
  yearlySum: number;

  // DBT metadata (may be null for locally created forecasts)
  dbtUpdatedAt: string | null;
  dbtValidFrom: string | null;
  dbtValidTo: string | null;
  period: string | null;

  // Audit metadata
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ForecastSnapshot {
  id: string;
  forecastId: string;

  // Snowflake-compatible core fields
  profitcenter: number | null;
  wbs: string | null;
  accountNumber: number | null;
  year: string;

  // UI metadata fields
  departmentId: string | null;
  projectId: string | null;
  projectName: string | null;

  // Monthly values
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;

  total: number;
  yearlySum: number;

  batchId: string;
  isApproved: boolean;
  snapshotDate: string;
  submittedBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

export const departments: Department[] = [
  { id: '1', name: 'Teknologi', code: 'TEK' },
  { id: '2', name: 'Markedsføring', code: 'MAR' },
  { id: '3', name: 'Salg', code: 'SAL' },
  { id: '4', name: 'Drift', code: 'DRI' },
  { id: '5', name: 'Økonomi', code: 'ØKO' },
];

export const projects: Project[] = [
  { id: '1', name: 'Skymigrering', code: 'P001', departmentId: '1' },
  { id: '2', name: 'Mobilapputvikling', code: 'P002', departmentId: '1' },
  { id: '3', name: 'Digital Kampanje K1', code: 'P003', departmentId: '2' },
  { id: '4', name: 'Merkevarefornyelse', code: 'P004', departmentId: '2' },
  { id: '5', name: 'Bedriftssalgsinitiativ', code: 'P005', departmentId: '3' },
  { id: '6', name: 'CRM-implementering', code: 'P006', departmentId: '3' },
  { id: '7', name: 'Prosessautomatisering', code: 'P007', departmentId: '4' },
  { id: '8', name: 'Optimalisering av Forsyningskjede', code: 'P008', departmentId: '4' },
  { id: '9', name: 'Oppgradering av Økonomisystem', code: 'P009', departmentId: '5' },
  { id: '10', name: 'Revisjonsetterlevelse', code: 'P010', departmentId: '5' },
];

// Note: forecasts array is no longer used as mock data - data comes from API
export const forecasts: Forecast[] = [];
