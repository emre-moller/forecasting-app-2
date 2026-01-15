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
  departmentId: string;
  projectId: string;

  // New detailed fields
  projectName: string;
  profitCenter: string;
  wbs: string;
  account: string;

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

  // Legacy fields
  amount: number;
  timePeriod: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  description: string;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastSnapshot {
  id: string;
  forecastId: string;
  departmentId: string;
  projectId: string;
  projectName: string;
  profitCenter: string;
  wbs: string;
  account: string;

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

export const forecasts: Forecast[] = [
  {
    id: '1',
    departmentId: '1',
    projectId: '1',
    amount: 4500000,
    timePeriod: '2025 K1',
    periodType: 'quarterly',
    description: 'Infrastrukturkostnader for skymigrering',
    createdBy: 'Ola Nordmann',
    createdAt: '2025-01-15',
    updatedAt: '2025-01-15',
  },
  {
    id: '2',
    departmentId: '1',
    projectId: '2',
    amount: 2800000,
    timePeriod: '2025 K1',
    periodType: 'quarterly',
    description: 'Utviklingsteam og ressurser',
    createdBy: 'Ola Nordmann',
    createdAt: '2025-01-16',
    updatedAt: '2025-01-16',
  },
  {
    id: '3',
    departmentId: '2',
    projectId: '3',
    amount: 1250000,
    timePeriod: '2025 K1',
    periodType: 'quarterly',
    description: 'Digital annonsering og innholdsproduksjon',
    createdBy: 'Kari Hansen',
    createdAt: '2025-01-18',
    updatedAt: '2025-01-18',
  },
  {
    id: '4',
    departmentId: '2',
    projectId: '4',
    amount: 850000,
    timePeriod: '2025 K2',
    periodType: 'quarterly',
    description: 'Merkevarebyra og materialer',
    createdBy: 'Kari Hansen',
    createdAt: '2025-01-20',
    updatedAt: '2025-01-20',
  },
  {
    id: '5',
    departmentId: '3',
    projectId: '5',
    amount: 3200000,
    timePeriod: '2025 K1',
    periodType: 'quarterly',
    description: 'Utvidelse og opplæring av salgsteam',
    createdBy: 'Per Olsen',
    createdAt: '2025-01-22',
    updatedAt: '2025-01-22',
  },
  {
    id: '6',
    departmentId: '3',
    projectId: '6',
    amount: 1800000,
    timePeriod: '2025 K2',
    periodType: 'quarterly',
    description: 'CRM-programvarelisenser og implementering',
    createdBy: 'Per Olsen',
    createdAt: '2025-01-25',
    updatedAt: '2025-01-25',
  },
  {
    id: '7',
    departmentId: '4',
    projectId: '7',
    amount: 950000,
    timePeriod: '2025 K1',
    periodType: 'quarterly',
    description: 'Automatiseringsverktøy og konsulentbistand',
    createdBy: 'Ingrid Berg',
    createdAt: '2025-02-01',
    updatedAt: '2025-02-01',
  },
  {
    id: '8',
    departmentId: '4',
    projectId: '8',
    amount: 2100000,
    timePeriod: '2025 K2',
    periodType: 'quarterly',
    description: 'Forsyningskjedeprogramvare og optimalisering',
    createdBy: 'Ingrid Berg',
    createdAt: '2025-02-03',
    updatedAt: '2025-02-03',
  },
  {
    id: '9',
    departmentId: '5',
    projectId: '9',
    amount: 3800000,
    timePeriod: '2025 K1',
    periodType: 'quarterly',
    description: 'ERP-systemoppgradering og migrering',
    createdBy: 'Lars Johansen',
    createdAt: '2025-02-05',
    updatedAt: '2025-02-05',
  },
  {
    id: '10',
    departmentId: '5',
    projectId: '10',
    amount: 750000,
    timePeriod: '2025 K2',
    periodType: 'quarterly',
    description: 'Ekstern revisjon og etterlevelseskonsultering',
    createdBy: 'Lars Johansen',
    createdAt: '2025-02-08',
    updatedAt: '2025-02-08',
  },
  {
    id: '11',
    departmentId: '1',
    projectId: '1',
    amount: 4200000,
    timePeriod: '2025 K2',
    periodType: 'quarterly',
    description: 'Fortsatt skymigrering fase 2',
    createdBy: 'Ola Nordmann',
    createdAt: '2025-02-10',
    updatedAt: '2025-02-10',
  },
  {
    id: '12',
    departmentId: '2',
    projectId: '3',
    amount: 1400000,
    timePeriod: '2025 K2',
    periodType: 'quarterly',
    description: 'K2 digital kampanje fortsettelse',
    createdBy: 'Kari Hansen',
    createdAt: '2025-02-12',
    updatedAt: '2025-02-12',
  },
];
