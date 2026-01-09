import { useState, useMemo, useEffect } from 'react';
import { Select, Button, Space, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, FundOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
      totals.set(forecast.departmentId, current + forecast.amount);
    });
    return totals;
  }, [filteredForecasts]);

  const totalsByProject = useMemo(() => {
    const totals = new Map<string, number>();
    filteredForecasts.forEach((forecast) => {
      const current = totals.get(forecast.projectId) || 0;
      totals.set(forecast.projectId, current + forecast.amount);
    });
    return totals;
  }, [filteredForecasts]);

  const grandTotal = useMemo(() => {
    return filteredForecasts.reduce((sum, forecast) => sum + forecast.amount, 0);
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

  const handleSubmitForApproval = async (forecastId: string) => {
    if (confirm('Submit this forecast for approval?')) {
      try {
        const snapshot = await snapshotsAPI.create(forecastId);
        setSnapshots([snapshot, ...snapshots]);
        alert('Forecast submitted for approval successfully!');
      } catch (error) {
        console.error('Failed to submit forecast for approval:', error);
        alert('Kunne ikke sende prognose til godkjenning');
      }
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
          <div className="header-title">
            <FundOutlined style={{ fontSize: 28, color: '#0969da' }} />
            <h1>Spending Forecast</h1>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => handleOpenModal()}
            className="add-button"
          >
            Ny Prognose
          </Button>
        </div>
      </div>

      <div className="dashboard-stats">
        <Row gutter={16}>
          <Col span={8}>
            <Card className="stat-card">
              <Statistic
                title="Totalt Prognostisert"
                value={grandTotal}
                precision={2}
                valueStyle={{ color: '#0969da', fontWeight: 600 }}
              />
              <div className="stat-subtitle">{filteredForecasts.length} prognoser</div>
            </Card>
          </Col>
          <Col span={8}>
            <Card className="stat-card">
              <Statistic
                title="Avdelinger"
                value={totalsByDepartment.size}
                valueStyle={{ color: '#8250df', fontWeight: 600 }}
              />
              <div className="stat-subtitle">
                {selectedDepartment
                  ? departments.find((d) => d.id === selectedDepartment)?.name
                  : 'Alle avdelinger'}
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card className="stat-card">
              <Statistic
                title="Prosjekter"
                value={totalsByProject.size}
                valueStyle={{ color: '#1a7f37', fontWeight: 600 }}
              />
              <div className="stat-subtitle">
                {selectedProject
                  ? projects.find((p) => p.id === selectedProject)?.name
                  : 'Alle prosjekter'}
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="dashboard-filters">
        <Space size="middle" wrap>
          <div className="filter-group">
            <label>Avdeling:</label>
            <Select
              style={{ width: 200 }}
              placeholder="Alle Avdelinger"
              allowClear
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              size="large"
            >
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </div>

          <div className="filter-group">
            <label>Prosjekt:</label>
            <Select
              style={{ width: 250 }}
              placeholder="Alle Prosjekter"
              allowClear
              value={selectedProject}
              onChange={setSelectedProject}
              size="large"
              disabled={!selectedDepartment}
            >
              {filteredProjects.map((proj) => (
                <Option key={proj.id} value={proj.id}>
                  {proj.name}
                </Option>
              ))}
            </Select>
          </div>

          {(selectedDepartment || selectedProject) && (
            <Button onClick={handleClearFilters} size="large">
              Nullstill Filtre
            </Button>
          )}
        </Space>
      </div>

      <div className="dashboard-section" style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 24px',
          backgroundColor: '#f0f9ff',
          borderLeft: '4px solid #0969da',
          marginBottom: '16px'
        }}>
          <CheckCircleOutlined style={{ fontSize: '24px', color: '#1a7f37' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>FORECAST SNAPSHOTS</h2>
        </div>
        <SnapshotsTable
          data={snapshots}
          onApprove={handleApproveSnapshot}
          onDelete={handleDeleteSnapshot}
        />
      </div>

      <div className="dashboard-section">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: '#f0f9ff',
          borderLeft: '4px solid #0969da',
          marginBottom: '16px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>LIVE FORECASTS</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            ADD ROW
          </Button>
        </div>
        <LiveForecastsTable
          data={filteredForecasts}
          onEdit={handleOpenModal}
          onDelete={handleDeleteForecast}
          onSubmitForApproval={handleSubmitForApproval}
          onUpdate={handleUpdateForecastField}
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
