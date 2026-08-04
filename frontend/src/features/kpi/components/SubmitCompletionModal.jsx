import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Radio, Upload, Button, List, Space, Alert, message } from 'antd';
import { UploadOutlined, LinkOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

export default function SubmitCompletionModal({ visible, kpi, onClose, onSubmit, confirmLoading }) {
  const [form] = Form.useForm();
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([{ name: '', url: '' }]);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    if (visible && kpi) {
      form.resetFields();
      if (kpi.measurement_type === 'CHECKLIST') {
        // Load tasks and their current completed states
        const initialTasks = (kpi.tasks || []).map(t => ({
          task_id: t.task_id,
          title: t.title,
          is_completed: t.is_completed
        }));
        setTasks(initialTasks);
      }
      setLinks([{ name: '', url: '' }]);
      setFileList([]);
    }
  }, [visible, kpi, form]);

  const handleTaskToggle = (taskId, checked) => {
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, is_completed: checked } : t));
  };

  const handleAddLink = () => {
    setLinks(prev => [...prev, { name: '', url: '' }]);
  };

  const handleRemoveLink = (index) => {
    setLinks(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLinkChange = (index, field, value) => {
    setLinks(prev => prev.map((l, idx) => idx === index ? { ...l, [field]: value } : l));
  };

  const handleCustomUpload = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('attachments', file);

    try {
      const token = sessionStorage.getItem('sa_token');
      const headers = {
        'Content-Type': 'multipart/form-data',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await axios.post('/api/kpi-submissions/upload', formData, { headers });
      if (res.data && res.data.fileUrl) {
        file.url = res.data.fileUrl; // set the real URL returned by backend
        setFileList(prev => prev.map(f => f.uid === file.uid ? { ...f, url: res.data.fileUrl, status: 'done' } : f));
        onSuccess("ok");
        message.success(`${file.name} uploaded successfully.`);
      } else {
        onError(new Error('Upload failed.'));
      }
    } catch (err) {
      console.error(err);
      onError(err);
      message.error(`${file.name} upload failed.`);
    }
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const payload = {
        comment: values.comment || '',
        attachments: fileList.map(f => ({
          file_name: f.name,
          file_url: f.url || `https://storage.insight.local/evidence/${f.name}`,
          file_type: f.type || 'document'
        })),
        links: links
          .filter(l => l.name.trim() && l.url.trim())
          .map(l => ({
            link_name: l.name.trim(),
            link_url: l.url.trim()
          }))
      };

      if (kpi.measurement_type === 'CHECKLIST') {
        payload.tasks = tasks;
      } else if (kpi.measurement_type === 'BOOLEAN') {
        payload.submitted_boolean = values.submitted_boolean;
      } else if (kpi.measurement_type === 'TEXT') {
        payload.submitted_text = values.submitted_text || '';
      } else {
        payload.submitted_value = values.submitted_value;
      }

      await onSubmit(payload);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  if (!kpi) return null;

  return (
    <Modal
      title={`Submit Completion — ${kpi.title}`}
      open={visible}
      onOk={handleFormSubmit}
      onCancel={onClose}
      confirmLoading={confirmLoading}
      okText="Submit for Review"
      width={600}
    >
      <Form form={form} layout="vertical" initialValues={{ submitted_boolean: false }}>
        {/* Dynamic Measurement Form Section */}
        {kpi.measurement_type === 'CHECKLIST' && (
          <Form.Item label="Update Checklist Items Tasks" required>
            <List
              bordered
              dataSource={tasks}
              renderItem={t => (
                <List.Item>
                  <Switch 
                    checked={t.is_completed} 
                    onChange={(checked) => handleTaskToggle(t.task_id, checked)} 
                    style={{ marginRight: 10 }}
                  />
                  <span>{t.title}</span>
                </List.Item>
              )}
            />
          </Form.Item>
        )}

        {kpi.measurement_type === 'BOOLEAN' && (
          <Form.Item name="submitted_boolean" label="Achieved Target?" valuePropName="checked">
            <Radio.Group>
              <Radio value={true}>YES</Radio>
              <Radio value={false}>NO</Radio>
            </Radio.Group>
          </Form.Item>
        )}

        {kpi.measurement_type === 'TEXT' && (
          <Form.Item 
            name="submitted_text" 
            label="Achievement Summary" 
            rules={[{ required: true, message: 'Please write your summary.' }]}
          >
            <Input.TextArea placeholder="Provide a details text description of completed work..." rows={3} />
          </Form.Item>
        )}

        {['NUMBER', 'PERCENTAGE', 'CURRENCY'].includes(kpi.measurement_type) && (
          <Form.Item 
            name="submitted_value" 
            label={`Submitted Achievement Value (Target: ${kpi.target_value} ${kpi.unit || ''})`}
            rules={[{ required: true, message: 'Please enter your current achievement value.' }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              max={parseFloat(kpi.target_value)} 
              placeholder="e.g. 72" 
            />
          </Form.Item>
        )}

        {/* Comment Field */}
        <Form.Item name="comment" label="Comment for Reviewer">
          <Input.TextArea placeholder="Describe the work done, challenges, or context..." rows={2} />
        </Form.Item>

        {/* Links Fields */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 8 }}>Proof Links</span>
          {links.map((link, idx) => (
            <Space key={idx} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Input 
                placeholder="Link Name (e.g. GitHub PR)" 
                value={link.name} 
                onChange={(e) => handleLinkChange(idx, 'name', e.target.value)} 
              />
              <Input 
                placeholder="URL (e.g. https://github.com/...)" 
                value={link.url} 
                onChange={(e) => handleLinkChange(idx, 'url', e.target.value)} 
              />
              {links.length > 1 && (
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveLink(idx)} />
              )}
            </Space>
          ))}
          <Button type="dashed" onClick={handleAddLink} icon={<PlusOutlined />} block>
            Add Another Proof Link
          </Button>
        </div>

        {/* File Proof Zone */}
        <Form.Item label="Upload Supporting Documents (Attachments)">
          <Upload.Dragger
            customRequest={handleCustomUpload}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            multiple
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">Click or drag files to this area to upload proof</p>
            <p className="ant-upload-hint">Support PDF, PNG, CSV files</p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
