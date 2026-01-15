import { useState, useMemo, useEffect } from 'react';
import { Select, Button, Space, Card, Statistic, Row, Col } from 'antd';
import { FundOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { LiveForecastsTable } from '../components/forecasts/LiveForecastsTable';
import { SnapshotsTable } from '../components/forecasts/SnapshotsTable';
import { ForecastFormModal } from '../components/forecasts/ForecastFormModal';
import { type Forecast, type ForecastSnapshot, type Department, type Project } from '../utils/mockData';
import { forecastsAPI, departmentsAPI, projectsAPI, snapshotsAPI } from '../services/api';
import './Dashboard.css';

const { Option } = Select;

interface ForecastFormData {
  departmentId: string;
  projectId: string;
  projectName: string;
  profitCenter: string;
  wbs: string;
  account: string;
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
  amount: number;
  timePeriod: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  description: string;
}

export const Dashboard = () => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [snapshots, setSnapshots] = useState<ForecastSnapshot[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForecast, setEditingForecast] = useState<Forecast | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [forecastingDimension, setForecastingDimension] = useState<'account' | 'wbs' | 'project'>('account');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [forecastsData, departmentsData, projectsData, snapshotsData] = await Promise.all([
        forecastsAPI.getAll(),
        departmentsAPI.getAll(),
        projectsAPI.getAll(),
        snapshotsAPI.getAll(),
      ]);
      setForecasts(forecastsData);
      setDepartments(departmentsData);
      setProjects(projectsData);
      setSnapshots(snapshotsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Kunne ikke laste data. Sørg for at backend-serveren kjører.');
    } finally {
      setLoading(false);
    }
  };

  const filteredForecasts = useMemo(() => {
    let filtered = forecasts;

    if (selectedDepartment) {
      filtered = filtered.filter((f) => f.departmentId === selectedDepartment);
    }

    if (selectedProject) {
      filtered = filtered.filter((f) => f.projectId === selectedProject);
    }

    return filtered;
  }, [forecasts, selectedDepartment, selectedProject]);

  const totalsByDepartment = useMemo(() => {
    const totals = new Map<string, number>();
    filteredForecasts.forEach((forecast) => {
      const current = totals.get(forecast.departmentId) || 0;
      totals.set(forecast.departmentId, current + (forecast.total || forecast.amount || 0));
    });
    return totals;
  }, [filteredForecasts]);

  const totalsByProject = useMemo(() => {
    const totals = new Map<string, number>();
    filteredForecasts.forEach((forecast) => {
      const current = totals.get(forecast.projectId) || 0;
      totals.set(forecast.projectId, current + (forecast.total || forecast.amount || 0));
    });
    return totals;
  }, [filteredForecasts]);

  const grandTotal = useMemo(() => {
    return filteredForecasts.reduce((sum, forecast) => sum + (forecast.total || forecast.amount || 0), 0);
  }, [filteredForecasts]);

  const handleCreateForecast = async (data: ForecastFormData) => {
    try {
      const newForecast = await forecastsAPI.create(data);
      setForecasts([...forecasts, newForecast]);
      setIsModalOpen(false);
      setEditingForecast(null);
    } catch (error) {
      console.error('Failed to create forecast:', error);
      alert('Kunne ikke opprette prognose');
    }
  };

  const handleEditForecast = async (data: ForecastFormData) => {
    if (!editingForecast) return;

    try {
      const updated = await forecastsAPI.update(editingForecast.id, data);
      const updatedForecasts = forecasts.map((f) =>
        f.id === editingForecast.id ? updated : f
      );
      setForecasts(updatedForecasts);
      setIsModalOpen(false);
      setEditingForecast(null);
    } catch (error) {
      console.error('Failed to update forecast:', error);
      alert('Kunne ikke oppdatere prognose');
    }
  };

  const handleDeleteForecast = async (forecastId: string) => {
    if (confirm('Er du sikker på at du vil slette denne prognosen?')) {
      try {
        await forecastsAPI.delete(forecastId);
        setForecasts(forecasts.filter((f) => f.id !== forecastId));
      } catch (error) {
        console.error('Failed to delete forecast:', error);
        alert('Kunne ikke slette prognose');
      }
    }
  };

  const handleUpdateForecastField = async (forecastId: string, field: string, value: any) => {
    try {
      const forecast = forecasts.find(f => f.id === forecastId);
      if (!forecast) return;

      const updatedData = { ...forecast, [field]: value };
      const updated = await forecastsAPI.update(forecastId, updatedData as any);

      setForecasts(forecasts.map((f) => (f.id === forecastId ? updated : f)));
    } catch (error) {
      console.error('Failed to update forecast field:', error);
      alert('Kunne ikke oppdatere prognose');
    }
  };

  const handleBatchUpdateForecastField = async (forecastId: string, updates: Record<string, any>) => {
    try {
      const forecast = forecasts.find(f => f.id === forecastId);
      if (!forecast) return;

      const updatedData = { ...forecast, ...updates };
      const updated = await forecastsAPI.update(forecastId, updatedData as any);

      setForecasts(forecasts.map((f) => (f.id === forecastId ? updated : f)));
    } catch (error) {
      console.error('Failed to batch update forecast:', error);
      alert('Kunne ikke oppdatere prognose');
    }
  };

  const handleSubmitAllForecasts = async () => {
    if (!selectedDepartment) {
      alert('Please select a department first');
      return;
    }

    if (filteredForecasts.length === 0) {
      alert('No forecasts to submit for this department');
      return;
    }

    if (confirm(`Submit all ${filteredForecasts.length} forecast(s) for this department?`)) {
      try {
        const newSnapshots = await snapshotsAPI.createBulk(selectedDepartment);
        setSnapshots([...newSnapshots, ...snapshots]);
        alert(`Successfully submitted ${newSnapshots.length} forecast(s) for approval!`);
      } catch (error: any) {
        console.error('Failed to submit forecasts for approval:', error);
        const errorMessage = error?.message || 'Unknown error';
        alert(`Kunne ikke sende prognoser til godkjenning\n\nDetaljer: ${errorMessage}\n\nSjekk konsollen for mer info.`);
      }
    }
  };

  const handleAddRow = async (): Promise<string | null> => {
    try {
      // Use selected filters, or default to first available department/project
      let deptId = selectedDepartment;
      let projId = selectedProject;

      if (!deptId && departments.length > 0) {
        deptId = departments[0].id;
      }

      if (!projId) {
        const availableProjects = deptId
          ? projects.filter(p => p.departmentId === deptId)
          : projects;

        if (availableProjects.length > 0) {
          // Use the first available project (multiple rows per project are allowed)
          projId = availableProjects[0].id;
        }
      }

      // If still no department/project, can't create forecast
      if (!deptId || !projId) {
        alert('Ingen avdelinger eller prosjekter tilgjengelig. Vennligst opprett dem først.');
        return null;
      }

      const newForecastData: ForecastFormData = {
        departmentId: deptId,
        projectId: projId,
        projectName: '',
        profitCenter: '',
        wbs: '',
        account: '',
        jan: 0,
        feb: 0,
        mar: 0,
        apr: 0,
        may: 0,
        jun: 0,
        jul: 0,
        aug: 0,
        sep: 0,
        oct: 0,
        nov: 0,
        dec: 0,
        total: 0,
        yearlySum: 0,
        amount: 0,
        timePeriod: '',
        periodType: 'monthly',
        description: ''
      };

      const newForecast = await forecastsAPI.create(newForecastData);
      setForecasts([newForecast, ...forecasts]);
      return newForecast.id;
    } catch (error: any) {
      console.error('Failed to create forecast:', error);
      alert(`Kunne ikke opprette prognose: ${error?.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleApproveSnapshot = async (snapshotId: string) => {
    if (confirm('Approve this forecast snapshot?')) {
      try {
        const updatedSnapshot = await snapshotsAPI.approve(snapshotId, 'Current User');
        setSnapshots(snapshots.map(s => s.id === snapshotId ? updatedSnapshot : s));
        alert('Forecast snapshot approved successfully!');
      } catch (error) {
        console.error('Failed to approve snapshot:', error);
        alert('Kunne ikke godkjenne prognose');
      }
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (confirm('Delete this snapshot?')) {
      try {
        await snapshotsAPI.delete(snapshotId);
        setSnapshots(snapshots.filter(s => s.id !== snapshotId));
      } catch (error) {
        console.error('Failed to delete snapshot:', error);
        alert('Kunne ikke slette snapshot');
      }
    }
  };

  const handleOpenModal = (forecast?: Forecast) => {
    if (forecast) {
      setEditingForecast(forecast);
    } else {
      setEditingForecast(null);
    }
    setIsModalOpen(true);
  };

  const handleClearFilters = () => {
    setSelectedDepartment(null);
    setSelectedProject(null);
  };

  const filteredProjects = selectedDepartment
    ? projects.filter((p) => p.departmentId === selectedDepartment)
    : projects;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Financial Forecasting Input Tool</h1>
            <p className="header-subtitle">Department-Based Forecast Management</p>
            <div className="department-badge">
              <FundOutlined /> Finance
            </div>
          </div>
        </div>
      </div>

      <div className="step-section">
        <div className="step-label">
          <span className="step-number">1</span>
          <span className="step-text">SELECT DEPARTMENT</span>
        </div>
        <Select
          style={{ width: 450 }}
          placeholder="Select Department"
          value={selectedDepartment}
          onChange={setSelectedDepartment}
          size="large"
          className="step-select"
        >
          {departments.map((dept) => (
            <Option key={dept.id} value={dept.id}>
              {dept.name}
            </Option>
          ))}
        </Select>
      </div>

      <div className="dashboard-section" style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 24px',
          backgroundColor: '#f6ffed',
          borderLeft: '4px solid #52c41a',
          marginBottom: '16px'
        }}>
          <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>FORECAST SNAPSHOTS</h2>
        </div>
        <SnapshotsTable
          data={snapshots}
          onApprove={handleApproveSnapshot}
          onDelete={handleDeleteSnapshot}
        />
      </div>

      <div className="forecast-input-section">
        <div className="forecast-header">
          <h2>Monthly Forecast Input</h2>
          <Button
            icon={<CheckCircleOutlined />}
            size="large"
            onClick={handleSubmitAllForecasts}
            style={{
              backgroundColor: '#52c41a',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            SUBMIT ALL FORECASTS
          </Button>
        </div>
        <LiveForecastsTable
          data={filteredForecasts}
          onEdit={handleOpenModal}
          onDelete={handleDeleteForecast}
          onUpdate={handleUpdateForecastField}
          onBatchUpdate={handleBatchUpdateForecastField}
          onAddRow={handleAddRow}
        />
      </div>

      <ForecastFormModal
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingForecast(null);
        }}
        onSubmit={editingForecast ? handleEditForecast : handleCreateForecast}
        initialData={editingForecast}
      />
    </div>
  );
};
