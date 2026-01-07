import { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { type Forecast, departments, projects } from '../../utils/mockData';
import './ForecastFormModal.css';

const { TextArea } = Input;
const { Option } = Select;

interface ForecastFormData {
  departmentId: string;
  projectId: string;
  amount: number;
  timePeriod: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  description: string;
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
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<ForecastFormData>({
    defaultValues: {
      departmentId: '',
      projectId: '',
      amount: 0,
      timePeriod: '',
      periodType: 'quarterly',
      description: '',
    },
  });

  const selectedDepartmentId = watch('departmentId');

  useEffect(() => {
    if (initialData) {
      reset({
        departmentId: initialData.departmentId,
        projectId: initialData.projectId,
        amount: initialData.amount,
        timePeriod: initialData.timePeriod,
        periodType: initialData.periodType,
        description: initialData.description,
      });
    } else {
      reset({
        departmentId: '',
        projectId: '',
        amount: 0,
        timePeriod: '',
        periodType: 'quarterly',
        description: '',
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
      width={600}
      okText={initialData ? 'Oppdater' : 'Opprett'}
      cancelText="Avbryt"
      className="forecast-modal"
    >
      <Form layout="vertical" className="forecast-form">
        <Form.Item
          label="Avdeling"
          required
          validateStatus={errors.departmentId ? 'error' : ''}
          help={errors.departmentId?.message}
        >
          <Controller
            name="departmentId"
            control={control}
            rules={{ required: 'Avdeling er påkrevd' }}
            render={({ field }) => (
              <Select {...field} placeholder="Velg avdeling" size="large">
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
          required
          validateStatus={errors.projectId ? 'error' : ''}
          help={errors.projectId?.message}
        >
          <Controller
            name="projectId"
            control={control}
            rules={{ required: 'Prosjekt er påkrevd' }}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Velg prosjekt"
                size="large"
                disabled={!selectedDepartmentId}
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

        <Form.Item
          label="Prognosebeløp"
          required
          validateStatus={errors.amount ? 'error' : ''}
          help={errors.amount?.message}
        >
          <Controller
            name="amount"
            control={control}
            rules={{
              required: 'Beløp er påkrevd',
              min: { value: 1, message: 'Beløp må være større enn 0' },
            }}
            render={({ field }) => (
              <InputNumber
                {...field}
                style={{ width: '100%' }}
                size="large"
                placeholder="0.00"
                formatter={(value) => `${value} kr`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(value) => value?.replace(/[\s,]|kr/g, '') as any}
                min={0}
                step={1000}
              />
            )}
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <Form.Item
            label="Tidsperiode"
            required
            validateStatus={errors.timePeriod ? 'error' : ''}
            help={errors.timePeriod?.message}
          >
            <Controller
              name="timePeriod"
              control={control}
              rules={{ required: 'Tidsperiode er påkrevd' }}
              render={({ field }) => (
                <Input {...field} placeholder="f.eks., 2025 K1" size="large" />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Periodetype"
            required
            validateStatus={errors.periodType ? 'error' : ''}
            help={errors.periodType?.message}
          >
            <Controller
              name="periodType"
              control={control}
              rules={{ required: 'Periodetype er påkrevd' }}
              render={({ field }) => (
                <Select {...field} size="large">
                  <Option value="monthly">Månedlig</Option>
                  <Option value="quarterly">Kvartalsvis</Option>
                  <Option value="yearly">Årlig</Option>
                </Select>
              )}
            />
          </Form.Item>
        </div>

        <Form.Item label="Beskrivelse">
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Skriv inn prognosebeskrivelse..."
                rows={4}
                size="large"
              />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
