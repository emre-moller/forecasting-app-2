import { useState, useMemo, useEffect } from 'react';
import { Select, Button, Space, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, FundOutlined } from '@ant-design/icons';
import { ForecastsTable } from '../components/forecasts/ForecastsTable';
import { ForecastFormModal } from '../components/forecasts/ForecastFormModal';
import { type Forecast, type Department, type Project } from '../utils/mockData';
import { forecastsAPI, departmentsAPI, projectsAPI } from '../services/api';
import './Dashboard.css';

const { Option } = Select;

interface ForecastFormData {
  departmentId: string;
  projectId: string;
  amount: number;
  timePeriod: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  description: string;
}

export const Dashboard = () => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
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
      const [forecastsData, departmentsData, projectsData] = await Promise.all([
        forecastsAPI.getAll(),
        departmentsAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setForecasts(forecastsData);
      setDepartments(departmentsData);
      setProjects(projectsData);
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

      <div className="dashboard-table">
        <ForecastsTable
          data={filteredForecasts}
          onEdit={handleOpenModal}
          onDelete={handleDeleteForecast}
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
