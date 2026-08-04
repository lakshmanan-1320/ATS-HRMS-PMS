import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Alert, Typography, Spin, message } from 'antd';
import { FiEdit3, FiFileText } from 'react-icons/fi';
import * as api from '../../api/bellCurve.api';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function BellCurveOverrideModal({ visible, result, buckets, targetBucketId, onClose, onSave }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (result) {
      form.setFieldsValue({
        currentBucketId: targetBucketId || result.current_bucket_id || undefined,
        reason: result.override_reason || ''
      });
    }
  }, [result, targetBucketId, form]);

  const handleSubmit = async () => {
    if (!result) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      await api.updateResultOverride(result.result_id, values.currentBucketId, values.reason);
      message.success(`Performance rating calibrated for ${result.first_name} ${result.last_name}.`);
      onSave();
    } catch (err) {
      if (err.errorFields) return; // validation error
      message.error(err.response?.data?.message || 'Failed to calibrate rating override.');
    } finally {
      setLoading(false);
    }
  };

  if (!result) return null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}>
          <FiEdit3 size={18} style={{ color: '#6366f1' }} />
          <span>Calibrate Employee Rating</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Confirm Calibration"
      cancelText="Cancel"
      width={500}
      style={{ borderRadius: 16 }}
    >
      <Spin spinning={loading}>
        <div style={{ margin: '16px 0', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <Paragraph style={{ margin: 0 }}>
            <strong>Employee:</strong> {result.first_name} {result.last_name} ({result.employee_code || 'N/A'})
          </Paragraph>
          <Paragraph style={{ margin: '6px 0 0 0' }}>
            <strong>Designation:</strong> {result.designation || 'N/A'}
          </Paragraph>
          <Paragraph style={{ margin: '6px 0 0 0' }}>
            <strong>Appraisal Final Score:</strong> <span style={{ color: '#6366f1', fontWeight: 800 }}>{result.appraisal_score}</span>
          </Paragraph>
          <Paragraph style={{ margin: '6px 0 0 0' }}>
            <strong>Original Calculated Bucket:</strong> <span style={{ color: '#64748b', fontWeight: 700 }}>{result.original_bucket_name || 'N/A'}</span>
          </Paragraph>
        </div>

        <Form form={form} layout="vertical" requiredMark={true}>
          <Form.Item
            name="currentBucketId"
            label={<Text style={{ fontWeight: 700, color: '#334155' }}>Target Performance Bucket</Text>}
            rules={[{ required: true, message: 'Please select a performance calibration bucket.' }]}
          >
            <Select
              placeholder="Select target bucket..."
              options={buckets.map(b => ({
                value: b.bucket_id,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, background: b.color, borderRadius: '50%', display: 'inline-block' }} />
                    {b.bucket_name} ({b.percentage}%)
                  </div>
                )
              }))}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label={<Text style={{ fontWeight: 700, color: '#334155' }}>Calibration Override Reason</Text>}
            rules={[
              { required: true, message: 'Justification comments are mandatory for performance overrides.' },
              { min: 10, message: 'Justification reason must be at least 10 characters long.' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Provide a specific justification (e.g. Joined recently, role change, medical leave, performance anomaly...)"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
}
