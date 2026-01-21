import type { Forecast, ForecastSnapshot, Department, Project } from '../utils/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface ForecastCreate {
  // Snowflake-compatible core fields
  profitcenter: number | null;
  wbs: string | null;
  accountNumber: number | null;
  year: string;
  source: string;

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
}

interface ForecastResponse {
  id: string;

  // Snowflake-compatible core fields
  profitcenter: number | null;
  wbs: string | null;
  account_number: number | null;
  year: string;
  source: string;

  // UI metadata fields
  department_id: number | null;
  project_id: number | null;
  project_name: string | null;

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
  yearly_sum: number;

  // DBT metadata
  dbt_updated_at: string | null;
  dbt_valid_from: string | null;
  dbt_valid_to: string | null;
  period: string | null;

  // Audit metadata
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ForecastSnapshotResponse {
  id: number;
  forecast_id: string;

  // Snowflake-compatible core fields
  profitcenter: number | null;
  wbs: string | null;
  account_number: number | null;
  year: string;

  // UI metadata fields
  department_id: number | null;
  project_id: number | null;
  project_name: string | null;

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
  yearly_sum: number;

  batch_id: string;
  is_approved: boolean;
  snapshot_date: string;
  submitted_by: string;
  approved_by?: string;
  approved_at?: string;
}

interface DepartmentResponse {
  id: number;
  name: string;
  code: string;
}

interface ProjectResponse {
  id: number;
  name: string;
  code: string;
  department_id: number;
}

function mapForecastFromAPI(data: ForecastResponse): Forecast {
  return {
    id: data.id,

    // Snowflake-compatible core fields
    profitcenter: data.profitcenter,
    wbs: data.wbs,
    accountNumber: data.account_number,
    year: data.year,
    source: data.source || 'MANUAL',

    // UI metadata fields
    departmentId: data.department_id?.toString() ?? null,
    projectId: data.project_id?.toString() ?? null,
    projectName: data.project_name,

    // Monthly values
    jan: data.jan,
    feb: data.feb,
    mar: data.mar,
    apr: data.apr,
    may: data.may,
    jun: data.jun,
    jul: data.jul,
    aug: data.aug,
    sep: data.sep,
    oct: data.oct,
    nov: data.nov,
    dec: data.dec,

    total: data.total,
    yearlySum: data.yearly_sum,

    // DBT metadata
    dbtUpdatedAt: data.dbt_updated_at,
    dbtValidFrom: data.dbt_valid_from,
    dbtValidTo: data.dbt_valid_to,
    period: data.period,

    // Audit metadata
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapForecastSnapshotFromAPI(data: ForecastSnapshotResponse): ForecastSnapshot {
  return {
    id: data.id.toString(),
    forecastId: data.forecast_id,

    // Snowflake-compatible core fields
    profitcenter: data.profitcenter,
    wbs: data.wbs,
    accountNumber: data.account_number,
    year: data.year,

    // UI metadata fields
    departmentId: data.department_id?.toString() ?? null,
    projectId: data.project_id?.toString() ?? null,
    projectName: data.project_name,

    // Monthly values
    jan: data.jan,
    feb: data.feb,
    mar: data.mar,
    apr: data.apr,
    may: data.may,
    jun: data.jun,
    jul: data.jul,
    aug: data.aug,
    sep: data.sep,
    oct: data.oct,
    nov: data.nov,
    dec: data.dec,

    total: data.total,
    yearlySum: data.yearly_sum,

    batchId: data.batch_id,
    isApproved: data.is_approved,
    snapshotDate: data.snapshot_date,
    submittedBy: data.submitted_by,
    approvedBy: data.approved_by,
    approvedAt: data.approved_at,
  };
}

function mapDepartmentFromAPI(data: DepartmentResponse): Department {
  return {
    id: data.id.toString(),
    name: data.name,
    code: data.code,
  };
}

function mapProjectFromAPI(data: ProjectResponse): Project {
  return {
    id: data.id.toString(),
    name: data.name,
    code: data.code,
    departmentId: data.department_id.toString(),
  };
}

function mapForecastToAPI(data: ForecastCreate) {
  return {
    // Snowflake-compatible core fields
    profitcenter: data.profitcenter,
    wbs: data.wbs,
    account_number: data.accountNumber,
    year: data.year,
    source: data.source || 'MANUAL',

    // UI metadata fields
    department_id: data.departmentId ? parseInt(data.departmentId) : null,
    project_id: data.projectId ? parseInt(data.projectId) : null,
    project_name: data.projectName,

    // Monthly values
    jan: data.jan,
    feb: data.feb,
    mar: data.mar,
    apr: data.apr,
    may: data.may,
    jun: data.jun,
    jul: data.jul,
    aug: data.aug,
    sep: data.sep,
    oct: data.oct,
    nov: data.nov,
    dec: data.dec,

    total: data.total,
    yearly_sum: data.yearlySum,
  };
}

export const forecastsAPI = {
  async getAll(): Promise<Forecast[]> {
    const response = await fetch(`${API_BASE_URL}/forecasts`);
    if (!response.ok) throw new Error('Failed to fetch forecasts');
    const data: ForecastResponse[] = await response.json();
    return data.map(mapForecastFromAPI);
  },

  async create(forecast: ForecastCreate): Promise<Forecast> {
    const response = await fetch(`${API_BASE_URL}/forecasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapForecastToAPI(forecast)),
    });
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch (e) {
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(`Failed to create forecast: ${errorDetail}`);
    }
    const data: ForecastResponse = await response.json();
    return mapForecastFromAPI(data);
  },

  async update(id: string, forecast: ForecastCreate): Promise<Forecast> {
    const response = await fetch(`${API_BASE_URL}/forecasts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapForecastToAPI(forecast)),
    });
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch (e) {
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(`Failed to update forecast: ${errorDetail}`);
    }
    const data: ForecastResponse = await response.json();
    return mapForecastFromAPI(data);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/forecasts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete forecast');
  },
};

export const departmentsAPI = {
  async getAll(): Promise<Department[]> {
    const response = await fetch(`${API_BASE_URL}/departments`);
    if (!response.ok) throw new Error('Failed to fetch departments');
    const data: DepartmentResponse[] = await response.json();
    return data.map(mapDepartmentFromAPI);
  },
};

export const projectsAPI = {
  async getAll(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    const data: ProjectResponse[] = await response.json();
    return data.map(mapProjectFromAPI);
  },
};

export const snapshotsAPI = {
  async getAll(): Promise<ForecastSnapshot[]> {
    const response = await fetch(`${API_BASE_URL}/snapshots`);
    if (!response.ok) throw new Error('Failed to fetch snapshots');
    const data: ForecastSnapshotResponse[] = await response.json();
    return data.map(mapForecastSnapshotFromAPI);
  },

  async create(forecastId: string): Promise<ForecastSnapshot> {
    const response = await fetch(`${API_BASE_URL}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forecast_id: forecastId, submitted_by: 'test-user' }),
    });
    if (!response.ok) throw new Error('Failed to create snapshot');
    const data: ForecastSnapshotResponse = await response.json();
    return mapForecastSnapshotFromAPI(data);
  },

  async createBulk(departmentId: string): Promise<ForecastSnapshot[]> {
    const response = await fetch(`${API_BASE_URL}/snapshots/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department_id: parseInt(departmentId), submitted_by: 'test-user' }),
    });
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch (e) {
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(errorDetail);
    }
    const data: ForecastSnapshotResponse[] = await response.json();
    return data.map(mapForecastSnapshotFromAPI);
  },

  async approve(snapshotId: string, approvedBy: string): Promise<ForecastSnapshot> {
    const response = await fetch(`${API_BASE_URL}/snapshots/${snapshotId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved_by: approvedBy }),
    });
    if (!response.ok) throw new Error('Failed to approve snapshot');
    const data: ForecastSnapshotResponse = await response.json();
    return mapForecastSnapshotFromAPI(data);
  },

  async delete(snapshotId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/snapshots/${snapshotId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete snapshot');
  },
};
