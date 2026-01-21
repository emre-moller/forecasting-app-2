import { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { type Forecast, departments, projects } from '../../utils/mockData';
import './ForecastFormModal.css';

const { Option } = Select;

interface ForecastFormData {
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

interface ForecastFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: ForecastFormData) => void;
  initialData?: Forecast | null;
}

export const ForecastFormModal = ({
  open,
  onCancel,
  onSubmit,
  initialData,
}: ForecastFormModalProps) => {
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ForecastFormData>({
    defaultValues: {
      profitcenter: null,
      wbs: '',
      accountNumber: null,
      year: '2026',
      source: 'MANUAL',
      departmentId: '',
      projectId: '',
      projectName: '',
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
    },
  });

  const selectedDepartmentId = watch('departmentId');
  const monthlyValues = watch(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']);

  // Auto-calculate totals when monthly values change
  useEffect(() => {
    const total = monthlyValues.reduce((sum, val) => sum + (Number(val) || 0), 0);
    setValue('total', total);
    setValue('yearlySum', total);
  }, [monthlyValues, setValue]);

  useEffect(() => {
    if (initialData) {
      reset({
        profitcenter: initialData.profitcenter,
        wbs: initialData.wbs || '',
        accountNumber: initialData.accountNumber,
        year: initialData.year || '2026',
        source: initialData.source || 'MANUAL',
        departmentId: initialData.departmentId || '',
        projectId: initialData.projectId || '',
        projectName: initialData.projectName || '',
        jan: initialData.jan,
        feb: initialData.feb,
        mar: initialData.mar,
        apr: initialData.apr,
        may: initialData.may,
        jun: initialData.jun,
        jul: initialData.jul,
        aug: initialData.aug,
        sep: initialData.sep,
        oct: initialData.oct,
        nov: initialData.nov,
        dec: initialData.dec,
        total: initialData.total,
        yearlySum: initialData.yearlySum,
      });
    } else {
      reset({
        profitcenter: null,
        wbs: '',
        accountNumber: null,
        year: '2026',
        source: 'MANUAL',
        departmentId: '',
        projectId: '',
        projectName: '',
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
      });
    }
  }, [initialData, reset, open]);

  const filteredProjects = selectedDepartmentId
    ? projects.filter((p) => p.departmentId === selectedDepartmentId)
    : projects;

  const handleFormSubmit = (data: ForecastFormData) => {
    onSubmit(data);
    reset();
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Modal
      title={
        <div className="modal-title">
          {initialData ? 'Rediger Utgiftsprognose' : 'Ny Utgiftsprognose'}
        </div>
      }
      open={open}
      onOk={handleSubmit(handleFormSubmit)}
      onCancel={handleCancel}
      width={900}
      okText={initialData ? 'Oppdater' : 'Opprett'}
      cancelText="Avbryt"
      className="forecast-modal"
      style={{ maxHeight: '90vh' }}
      bodyStyle={{ maxHeight: 'calc(90vh - 110px)', overflowY: 'auto' }}
    >
      <Form layout="vertical" className="forecast-form">
        <Form.Item
          label="Avdeling"
          validateStatus={errors.departmentId ? 'error' : ''}
          help={errors.departmentId?.message}
        >
          <Controller
            name="departmentId"
            control={control}
            render={({ field }) => (
              <Select {...field} placeholder="Velg avdeling (valgfritt)" size="large" allowClear data-testid="department-select">
                {departments.map((dept) => (
                  <Option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        <Form.Item
          label="Prosjekt"
          validateStatus={errors.projectId ? 'error' : ''}
          help={errors.projectId?.message}
        >
          <Controller
            name="projectId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Velg prosjekt (valgfritt)"
                size="large"
                disabled={!selectedDepartmentId}
                allowClear
                data-testid="project-select"
              >
                {filteredProjects.map((proj) => (
                  <Option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.code})
                  </Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        <Form.Item label="Project Name">
          <Controller
            name="projectName"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                {...field}
                value={value || ''}
                onChange={onChange}
                placeholder="Enter project name"
                size="large"
              />
            )}
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
          <Form.Item label="Profit Center">
            <Controller
              name="profitcenter"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="e.g. 1001"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item label="WBS">
            <Controller
              name="wbs"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Input
                  {...field}
                  value={value || ''}
                  onChange={onChange}
                  placeholder="e.g. WBS-001"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item label="Account Number">
            <Controller
              name="accountNumber"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="e.g. 6100"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item label="Year">
            <Controller
              name="year"
              control={control}
              render={({ field }) => (
                <Select {...field} size="large">
                  <Option value="2025">2025</Option>
                  <Option value="2026">2026</Option>
                  <Option value="2027">2027</Option>
                </Select>
              )}
            />
          </Form.Item>
        </div>

        <div style={{ marginBottom: '16px', fontWeight: 600, fontSize: '14px' }}>
          Monthly Forecast Values
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <Form.Item label="January">
            <Controller
              name="jan"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                  data-testid="month-jan"
                />
              )}
            />
          </Form.Item>

          <Form.Item label="February">
            <Controller
              name="feb"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="March">
            <Controller
              name="mar"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="April">
            <Controller
              name="apr"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="May">
            <Controller
              name="may"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="June">
            <Controller
              name="jun"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="July">
            <Controller
              name="jul"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="August">
            <Controller
              name="aug"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="September">
            <Controller
              name="sep"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="October">
            <Controller
              name="oct"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="November">
            <Controller
              name="nov"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="December">
            <Controller
              name="dec"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : ''}
                  parser={(value) => value?.replace(/\s/g, '') as any}
                />
              )}
            />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item label="Total (Auto-calculated)">
            <Controller
              name="total"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
                  placeholder="0"
                  min={0}
                  disabled
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : '0'}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="Yearly Sum (Auto-calculated)">
            <Controller
              name="yearlySum"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  style={{ width: '100%', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
                  placeholder="0"
                  min={0}
                  disabled
                  formatter={(value) => value ? value.toLocaleString('nb-NO') : '0'}
                />
              )}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
