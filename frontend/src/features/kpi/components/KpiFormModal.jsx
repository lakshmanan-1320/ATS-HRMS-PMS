import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, Button, Radio, Space, List, Badge, Card, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;

export default function KpiFormModal({ visible, kpi, goalKpis = [], parentGoal, onClose, onSave, confirmLoading }) {
  const [form] = Form.useForm();
  const [measurementType, setMeasurementType] = useState('NUMBER');
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Calculate current and remaining weights
  const editingKpiId = kpi?.kpi_id;
  const currentKpiWeight = goalKpis
    .filter(k => k.kpi_id !== editingKpiId && k.status !== 'REJECTED')
    .reduce((sum, k) => sum + parseFloat(k.weight_percentage || 0), 0);
  const remainingWeight = 100 - currentKpiWeight;

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (kpi) {
        setMeasurementType(kpi.measurement_type);
        setTasks(kpi.tasks || []);
        form.setFieldsValue({
          title: kpi.title,
          description: kpi.description,
          measurement_type: kpi.measurement_type,
          priority: kpi.priority,
          weight_percentage: parseFloat(kpi.weight_percentage),
          target_value: kpi.target_value ? parseFloat(kpi.target_value) : undefined,
          target_text: kpi.target_text || undefined,
          target_boolean: kpi.target_boolean,
          unit: kpi.unit,
          start_date: kpi.start_date ? dayjs(kpi.start_date) : undefined,
          due_date: kpi.due_date ? dayjs(kpi.due_date) : undefined
        });
      } else {
        setMeasurementType('NUMBER');
        setTasks([]);
        form.setFieldsValue({
          measurement_type: 'NUMBER',
          priority: 'MEDIUM',
          weight_percentage: Math.min(10, remainingWeight),
          target_boolean: true
        });
      }
    }
  }, [visible, kpi, form, remainingWeight]);

  const handleTypeChange = (value) => {
    setMeasurementType(value);
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      setTasks(prev => [...prev, { title: newTaskTitle.trim(), is_completed: false }]);
      setNewTaskTitle('');
    }
  };

  const handleRemoveTask = (index) => {
    setTasks(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const weight = parseFloat(values.weight_percentage);

      if (weight > remainingWeight) {
        form.setFields([{
          name: 'weight_percentage',
          errors: [`Entered weight (${weight}%) exceeds remaining goal KPI weight limit (${remainingWeight}%).`]
        }]);
        return;
      }

      const payload = {
        title: values.title,
        description: values.description,
        measurement_type: values.measurement_type,
        priority: values.priority,
        weight_percentage: weight,
        unit: values.unit || null,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null
      };

      if (measurementType === 'CHECKLIST') {
        payload.tasks = tasks;
      } else if (measurementType === 'BOOLEAN') {
        payload.target_boolean = values.target_boolean;
      } else if (measurementType === 'TEXT') {
        payload.target_text = values.target_text;
      } else {
        payload.target_value = values.target_value;
      }

      await onSave(payload);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  return (
    <Modal
      title={kpi ? 'Edit KPI' : 'Add New KPI'}
      open={visible}
      onOk={handleFormSubmit}
      onCancel={onClose}
      confirmLoading={confirmLoading}
      okText={kpi ? 'Save Changes' : 'Create KPI'}
      width={600}
    >
      {/* Weight allocation bar */}
      <Card size="small" style={{ marginBottom: 16, background: '#f8fafc' }}>
        <Space size="large" style={{ width: '100%', justifyContent: 'space-around' }}>
          <div>
            <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Current KPI Weight</span>
            <strong style={{ fontSize: 16, color: '#0f766e' }}>{currentKpiWeight}%</strong>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Remaining Limit</span>
            <strong style={{ fontSize: 16, color: remainingWeight <= 0 ? '#b91c1c' : '#4f46e5' }}>{remainingWeight}%</strong>
          </div>
        </Space>
      </Card>

      <Form form={form} layout="vertical">
        <Form.Item 
          name="title" 
          label="KPI Title" 
          rules={[{ required: true, message: 'Please enter a title.' }]}
        >
          <Input placeholder="e.g. Complete Dashboard Frontend" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="Provide a brief definition of the KPI..." rows={2} />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item 
            name="measurement_type" 
            label="Measurement Type"
            rules={[{ required: true }]}
          >
            <Select onChange={handleTypeChange}>
              <Option value="NUMBER">Number</Option>
              <Option value="PERCENTAGE">Percentage</Option>
              <Option value="CURRENCY">Currency</Option>
              <Option value="BOOLEAN">Boolean (Yes/No)</Option>
              <Option value="TEXT">Text Summary</Option>
              <Option value="CHECKLIST">Checklist Tasks</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="weight_percentage" 
            label="Weight Percentage (%)"
            rules={[
              { required: true, message: 'Please enter weight.' },
              { type: 'number', min: 0.01, max: 100, message: 'Must be between 0.01 and 100.' }
            ]}
          >
            <InputNumber style={{ width: '100%' }} precision={2} placeholder="e.g. 25" />
          </Form.Item>
        </div>

        {/* Dynamic target section */}
        {measurementType === 'BOOLEAN' && (
          <Form.Item name="target_boolean" label="Target Answer">
            <Radio.Group>
              <Radio value={true}>YES</Radio>
              <Radio value={false}>NO</Radio>
            </Radio.Group>
          </Form.Item>
        )}

        {measurementType === 'TEXT' && (
          <Form.Item 
            name="target_text" 
            label="Target Output" 
            rules={[{ required: true, message: 'Please enter target output.' }]}
          >
            <Input placeholder="e.g. Publish user guide PDF" />
          </Form.Item>
        )}

        {['NUMBER', 'PERCENTAGE', 'CURRENCY'].includes(measurementType) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item 
              name="target_value" 
              label="Target Value" 
              rules={[{ required: true, message: 'Please enter target value.' }]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="e.g. 100" />
            </Form.Item>
            <Form.Item name="unit" label="Unit Symbol (Optional)">
              <Input placeholder={measurementType === 'CURRENCY' ? '₹' : (measurementType === 'PERCENTAGE' ? '%' : 'e.g. bugs')} />
            </Form.Item>
          </div>
        )}

        {measurementType === 'CHECKLIST' && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>Checklist Tasks</Typography.Text>
            <Space style={{ display: 'flex', marginBottom: 8 }}>
              <Input 
                placeholder="Enter task title (e.g. Setup database schema)" 
                value={newTaskTitle} 
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onPressEnter={(e) => { e.preventDefault(); handleAddTask(); }}
              />
              <Button type="primary" onClick={handleAddTask} icon={<PlusOutlined />}>Add Task</Button>
            </Space>
            <List
              size="small"
              bordered
              dataSource={tasks}
              renderItem={(t, idx) => (
                <List.Item actions={[<Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveTask(idx)} />]}>
                  {t.title}
                </List.Item>
              )}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="priority" label="Priority">
            <Select>
              <Option value="LOW">Low</Option>
              <Option value="MEDIUM">Medium</Option>
              <Option value="HIGH">High</Option>
              <Option value="CRITICAL">Critical</Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item 
            name="start_date" 
            label="Start Date"
            rules={[{ required: true, message: 'Please select start date.' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item 
            name="due_date" 
            label="Due Date"
            rules={[{ required: true, message: 'Please select due date.' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
