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
  amount: number;
  timePeriod: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const departments: Department[] = [
  { id: '1', name: 'Engineering', code: 'ENG' },
  { id: '2', name: 'Marketing', code: 'MKT' },
  { id: '3', name: 'Sales', code: 'SLS' },
  { id: '4', name: 'Operations', code: 'OPS' },
  { id: '5', name: 'Finance', code: 'FIN' },
];

export const projects: Project[] = [
  { id: '1', name: 'Cloud Migration', code: 'P001', departmentId: '1' },
  { id: '2', name: 'Mobile App Development', code: 'P002', departmentId: '1' },
  { id: '3', name: 'Digital Campaign Q1', code: 'P003', departmentId: '2' },
  { id: '4', name: 'Brand Refresh', code: 'P004', departmentId: '2' },
  { id: '5', name: 'Enterprise Sales Initiative', code: 'P005', departmentId: '3' },
  { id: '6', name: 'CRM Implementation', code: 'P006', departmentId: '3' },
  { id: '7', name: 'Process Automation', code: 'P007', departmentId: '4' },
  { id: '8', name: 'Supply Chain Optimization', code: 'P008', departmentId: '4' },
  { id: '9', name: 'Financial System Upgrade', code: 'P009', departmentId: '5' },
  { id: '10', name: 'Audit Compliance', code: 'P010', departmentId: '5' },
];

export const forecasts: Forecast[] = [
  {
    id: '1',
    departmentId: '1',
    projectId: '1',
    amount: 450000,
    timePeriod: '2025 Q1',
    periodType: 'quarterly',
    description: 'Infrastructure costs for cloud migration',
    createdBy: 'John Smith',
    createdAt: '2025-01-15',
    updatedAt: '2025-01-15',
  },
  {
    id: '2',
    departmentId: '1',
    projectId: '2',
    amount: 280000,
    timePeriod: '2025 Q1',
    periodType: 'quarterly',
    description: 'Development team and resources',
    createdBy: 'John Smith',
    createdAt: '2025-01-16',
    updatedAt: '2025-01-16',
  },
  {
    id: '3',
    departmentId: '2',
    projectId: '3',
    amount: 125000,
    timePeriod: '2025 Q1',
    periodType: 'quarterly',
    description: 'Digital advertising and content creation',
    createdBy: 'Sarah Johnson',
    createdAt: '2025-01-18',
    updatedAt: '2025-01-18',
  },
  {
    id: '4',
    departmentId: '2',
    projectId: '4',
    amount: 85000,
    timePeriod: '2025 Q2',
    periodType: 'quarterly',
    description: 'Branding agency and materials',
    createdBy: 'Sarah Johnson',
    createdAt: '2025-01-20',
    updatedAt: '2025-01-20',
  },
  {
    id: '5',
    departmentId: '3',
    projectId: '5',
    amount: 320000,
    timePeriod: '2025 Q1',
    periodType: 'quarterly',
    description: 'Sales team expansion and training',
    createdBy: 'Mike Chen',
    createdAt: '2025-01-22',
    updatedAt: '2025-01-22',
  },
  {
    id: '6',
    departmentId: '3',
    projectId: '6',
    amount: 180000,
    timePeriod: '2025 Q2',
    periodType: 'quarterly',
    description: 'CRM software licenses and implementation',
    createdBy: 'Mike Chen',
    createdAt: '2025-01-25',
    updatedAt: '2025-01-25',
  },
  {
    id: '7',
    departmentId: '4',
    projectId: '7',
    amount: 95000,
    timePeriod: '2025 Q1',
    periodType: 'quarterly',
    description: 'Automation tools and consulting',
    createdBy: 'Lisa Wang',
    createdAt: '2025-02-01',
    updatedAt: '2025-02-01',
  },
  {
    id: '8',
    departmentId: '4',
    projectId: '8',
    amount: 210000,
    timePeriod: '2025 Q2',
    periodType: 'quarterly',
    description: 'Supply chain software and optimization',
    createdBy: 'Lisa Wang',
    createdAt: '2025-02-03',
    updatedAt: '2025-02-03',
  },
  {
    id: '9',
    departmentId: '5',
    projectId: '9',
    amount: 380000,
    timePeriod: '2025 Q1',
    periodType: 'quarterly',
    description: 'ERP system upgrade and migration',
    createdBy: 'David Lee',
    createdAt: '2025-02-05',
    updatedAt: '2025-02-05',
  },
  {
    id: '10',
    departmentId: '5',
    projectId: '10',
    amount: 75000,
    timePeriod: '2025 Q2',
    periodType: 'quarterly',
    description: 'External audit and compliance consulting',
    createdBy: 'David Lee',
    createdAt: '2025-02-08',
    updatedAt: '2025-02-08',
  },
  {
    id: '11',
    departmentId: '1',
    projectId: '1',
    amount: 420000,
    timePeriod: '2025 Q2',
    periodType: 'quarterly',
    description: 'Continued cloud migration phase 2',
    createdBy: 'John Smith',
    createdAt: '2025-02-10',
    updatedAt: '2025-02-10',
  },
  {
    id: '12',
    departmentId: '2',
    projectId: '3',
    amount: 140000,
    timePeriod: '2025 Q2',
    periodType: 'quarterly',
    description: 'Q2 digital campaign continuation',
    createdBy: 'Sarah Johnson',
    createdAt: '2025-02-12',
    updatedAt: '2025-02-12',
  },
];
