import type { Forecast, Department, Project } from '../utils/mockData';
import { forecasts, departments, projects } from '../utils/mockData';

const API_BASE_URL = 'http://localhost:8000/api';

interface ForecastCreate {
  departmentId: string;
  projectId: string;
  amount: number;
  timePeriod: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  description: string;
}

interface ForecastResponse {
  id: number;
  department_id: number;
  project_id: number;
  amount: number;
  time_period: string;
  period_type: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
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
    id: data.id.toString(),
    departmentId: data.department_id.toString(),
    projectId: data.project_id.toString(),
    amount: data.amount,
    timePeriod: data.time_period,
    periodType: data.period_type as 'monthly' | 'quarterly' | 'yearly',
    description: data.description,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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
    department_id: parseInt(data.departmentId),
    project_id: parseInt(data.projectId),
    amount: data.amount,
    time_period: data.timePeriod,
    period_type: data.periodType,
    description: data.description,
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
    if (!response.ok) throw new Error('Failed to create forecast');
    const data: ForecastResponse = await response.json();
    return mapForecastFromAPI(data);
  },

  async update(id: string, forecast: ForecastCreate): Promise<Forecast> {
    const response = await fetch(`${API_BASE_URL}/forecasts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapForecastToAPI(forecast)),
    });
    if (!response.ok) throw new Error('Failed to update forecast');
    const data: ForecastResponse = await response.json();
    return mapForecastFromAPI(data);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/forecasts/${id}`, {
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
