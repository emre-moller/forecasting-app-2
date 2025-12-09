import { useState, useMemo } from 'react';
import { Select, Button, Space, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, DollarOutlined, FundOutlined } from '@ant-design/icons';
import { ForecastsTable } from '../components/forecasts/ForecastsTable';
import { ForecastFormModal } from '../components/forecasts/ForecastFormModal';
import { Forecast, forecasts as initialForecasts, departments, projects } from '../utils/mockData';
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
  const [forecasts, setForecasts] = useState<Forecast[]>(initialForecasts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForecast, setEditingForecast] = useState<Forecast | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

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

  const handleCreateForecast = (data: ForecastFormData) => {
    const newForecast: Forecast = {
      id: (forecasts.length + 1).toString(),
      ...data,
      createdBy: 'Current User',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setForecasts([...forecasts, newForecast]);
    setIsModalOpen(false);
    setEditingForecast(null);
  };

  const handleEditForecast = (data: ForecastFormData) => {
    if (!editingForecast) return;

    const updatedForecasts = forecasts.map((f) =>
      f.id === editingForecast.id
        ? {
            ...f,
            ...data,
            updatedAt: new Date().toISOString().split('T')[0],
          }
        : f
    );
    setForecasts(updatedForecasts);
    setIsModalOpen(false);
    setEditingForecast(null);
  };

  const handleDeleteForecast = (forecastId: string) => {
    if (confirm('Are you sure you want to delete this forecast?')) {
      setForecasts(forecasts.filter((f) => f.id !== forecastId));
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
            <h1>Spending Forecast Tracker</h1>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => handleOpenModal()}
            className="add-button"
          >
            New Forecast
          </Button>
        </div>
      </div>

      <div className="dashboard-stats">
        <Row gutter={16}>
          <Col span={8}>
            <Card className="stat-card">
              <Statistic
                title="Total Forecasted"
                value={grandTotal}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#0969da', fontWeight: 600 }}
              />
              <div className="stat-subtitle">{filteredForecasts.length} forecasts</div>
            </Card>
          </Col>
          <Col span={8}>
            <Card className="stat-card">
              <Statistic
                title="Departments"
                value={totalsByDepartment.size}
                valueStyle={{ color: '#8250df', fontWeight: 600 }}
              />
              <div className="stat-subtitle">
                {selectedDepartment
                  ? departments.find((d) => d.id === selectedDepartment)?.name
                  : 'All departments'}
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card className="stat-card">
              <Statistic
                title="Projects"
                value={totalsByProject.size}
                valueStyle={{ color: '#1a7f37', fontWeight: 600 }}
              />
              <div className="stat-subtitle">
                {selectedProject
                  ? projects.find((p) => p.id === selectedProject)?.name
                  : 'All projects'}
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="dashboard-filters">
        <Space size="middle" wrap>
          <div className="filter-group">
            <label>Department:</label>
            <Select
              style={{ width: 200 }}
              placeholder="All Departments"
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
            <label>Project:</label>
            <Select
              style={{ width: 250 }}
              placeholder="All Projects"
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
              Clear Filters
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
