import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Input, Select, Switch, Button, Divider, Space, Tag, Modal, message } from 'antd';
import { FiPlus, FiTrash2, FiSave, FiSettings, FiSliders, FiFileText, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import * as api from '../../api/bellCurve.api';

const { Title, Text, Paragraph } = Typography;

const PRESET_COLORS = [
  { value: '#6366f1', label: 'Indigo (Primary)' },
  { value: '#10b981', label: 'Emerald (Green)' },
  { value: '#f59e0b', label: 'Amber (Yellow)' },
  { value: '#ef4444', label: 'Rose (Red)' },
  { value: '#3b82f6', label: 'Blue (Accent)' },
  { value: '#f97316', label: 'Orange (Warning)' },
  { value: '#14b8a6', label: 'Teal (Cyan)' },
  { value: '#8b5cf6', label: 'Violet (Purple)' },
  { value: '#64748b', label: 'Slate (Grey)' },
];

export default function BellCurveConfig() {
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [buckets, setBuckets] = useState([]);
  
  // Config form details
  const [configName, setConfigName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [tieStrategy, setTieStrategy] = useState('INCLUDE_ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const res = await api.listConfigurations();
      setConfigs(res.data || []);
      if (res.data && res.data.length > 0) {
        // Select default or first config
        const def = res.data.find(c => c.is_default) || res.data[0];
        handleSelectConfig(def);
      } else {
        setSelectedConfig(null);
        setBuckets([]);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConfig = async (config) => {
    setSelectedConfig(config);
    setConfigName(config.name);
    setIsDefault(config.is_default);
    setTieStrategy(config.tie_strategy);
    try {
      const res = await api.getBuckets(config.configuration_id);
      setBuckets(res.data || []);
    } catch (err) {
      message.error('Failed to load buckets for configuration.');
    }
  };

  const handleCreateNewConfig = async () => {
    try {
      const res = await api.createConfiguration({
        name: 'New Calibration Configuration',
        is_default: false,
        tie_strategy: 'INCLUDE_ALL'
      });
      message.success('Configuration template created.');
      
      // Save initial 3 standard buckets
      const initialBuckets = [
        { bucket_name: 'Top Performers', bucket_order: 1, percentage: 20, color: '#10b981', suggested_action: 'Promotion / High Increment' },
        { bucket_name: 'Average Performers', bucket_order: 2, percentage: 70, color: '#6366f1', suggested_action: 'Standard Increment' },
        { bucket_name: 'Low Performers', bucket_order: 3, percentage: 10, color: '#ef4444', suggested_action: 'Performance Improvement Plan (PIP)' }
      ];
      await api.saveBuckets(res.data.configuration_id, initialBuckets);
      await loadConfigurations();
    } catch (err) {
      message.error('Failed to create configuration.');
    }
  };

  const handleSaveConfigDetails = async () => {
    if (!selectedConfig) return;
    try {
      setLoading(true);
      await api.updateConfiguration(selectedConfig.configuration_id, {
        name: configName,
        is_default: isDefault,
        tie_strategy: tieStrategy
      });
      message.success('Configuration properties saved successfully.');
      await loadConfigurations();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save configuration details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!selectedConfig) return;
    Modal.confirm({
      title: 'Are you sure you want to delete this template?',
      content: 'This will remove the configuration template and all associated performance buckets.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.deleteConfiguration(selectedConfig.configuration_id);
          message.success('Template deleted.');
          await loadConfigurations();
        } catch (err) {
          message.error('Failed to delete configuration template.');
        }
      }
    });
  };

  const handleAddBucket = () => {
    if (buckets.length >= 10) {
      message.warning('A maximum of 10 performance buckets is supported.');
      return;
    }
    const newOrder = buckets.length + 1;
    setBuckets([
      ...buckets,
      {
        bucket_name: `Bucket Level ${newOrder}`,
        bucket_order: newOrder,
        percentage: 0,
        color: PRESET_COLORS[newOrder % PRESET_COLORS.length].value,
        suggested_action: 'No recommended action set'
      }
    ]);
  };

  const handleRemoveBucket = (index) => {
    if (buckets.length <= 2) {
      message.warning('A minimum of 2 performance buckets is required.');
      return;
    }
    const filtered = buckets.filter((_, idx) => idx !== index).map((b, idx) => ({
      ...b,
      bucket_order: idx + 1
    }));
    setBuckets(filtered);
  };

  const handleUpdateBucketField = (index, field, value) => {
    const updated = [...buckets];
    updated[index][field] = value;
    setBuckets(updated);
  };

  const handleSaveBucketsList = async () => {
    if (!selectedConfig) return;
    
    // Check validation rules
    if (buckets.length < 2 || buckets.length > 10) {
      message.error('Template must have between 2 and 10 buckets.');
      return;
    }

    const totalPct = buckets.reduce((s, b) => s + parseFloat(b.percentage || 0), 0);
    if (Math.abs(totalPct - 100.0) > 0.01) {
      message.error(`Total percentage must sum to exactly 100% (currently ${totalPct}%).`);
      return;
    }

    try {
      setLoading(true);
      await api.saveBuckets(selectedConfig.configuration_id, buckets);
      message.success('Performance buckets updated successfully.');
      // Refresh
      handleSelectConfig(selectedConfig);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save buckets details.');
    } finally {
      setLoading(false);
    }
  };

  const totalPct = buckets.reduce((s, b) => s + parseFloat(b.percentage || 0), 0);

  return (
    <div>
      <Row gutter={24}>
        {/* Left Side: List of Templates */}
        <Col span={7}>
          <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: 800, fontSize: 15, color: '#334155' }}>Calibration Templates</Text>
              <Button type="text" icon={<FiPlus />} onClick={handleCreateNewConfig} style={{ color: '#6366f1', padding: 0 }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {configs.map((c) => (
                <div
                  key={c.configuration_id}
                  onClick={() => handleSelectConfig(c)}
                  style={{
                    padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                    background: selectedConfig?.configuration_id === c.configuration_id ? 'rgba(99,102,241,0.06)' : '#fff',
                    border: selectedConfig?.configuration_id === c.configuration_id ? '1px solid #6366f1' : '1px solid #e2e8f0',
                    transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Text style={{ fontWeight: 700, color: selectedConfig?.configuration_id === c.configuration_id ? '#4f46e5' : '#1e293b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                      Strategy: {c.tie_strategy === 'INCLUDE_ALL' ? 'Include All' : 'HR Review'}
                    </Text>
                  </div>
                  {c.is_default && <Tag color="indigo" style={{ fontSize: 10, borderRadius: 6, margin: 0 }}>Default</Tag>}
                </div>
              ))}
              {configs.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8' }}>
                  No calibration templates defined. Click + to add.
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Right Side: Setup Properties & Buckets list */}
        <Col span={17}>
          {selectedConfig ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Properties Section */}
              <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiSettings size={18} style={{ color: '#6366f1' }} />
                    <Text style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Template Rules & Settings</Text>
                  </div>
                  <Space>
                    <Button danger icon={<FiTrash2 />} onClick={handleDeleteConfig}>Delete</Button>
                    <Button type="primary" icon={<FiSave />} onClick={handleSaveConfigDetails}>Save Rules</Button>
                  </Space>
                </div>

                <Row gutter={[20, 20]}>
                  <Col span={12}>
                    <div style={{ marginBottom: 6 }}><Text style={{ fontWeight: 700, color: '#475569', fontSize: 13 }}>Template Name</Text></div>
                    <Input value={configName} onChange={(e) => setConfigName(e.target.value)} style={{ borderRadius: 8, height: 40 }} />
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 6 }}><Text style={{ fontWeight: 700, color: '#475569', fontSize: 13 }}>Tie-Breaker Cutoff Strategy</Text></div>
                    <Select
                      value={tieStrategy}
                      onChange={(val) => setTieStrategy(val)}
                      style={{ width: '100%', height: 40 }}
                      options={[
                        { value: 'INCLUDE_ALL', label: 'Option 1: Include All Tied (Widen higher bucket)' },
                        { value: 'MANUAL_REVIEW', label: 'Option 2: Manual HR Review Required (Flag boundary ties)' }
                      ]}
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                      <Switch checked={isDefault} onChange={(checked) => setIsDefault(checked)} />
                      <div>
                        <Text style={{ fontWeight: 700, color: '#1e293b', display: 'block', fontSize: 13 }}>Default Template</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>Make this configuration the default template for new calibration runs.</Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Buckets Section */}
              <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiSliders size={18} style={{ color: '#10b981' }} />
                    <Text style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Performance Buckets & Allocations</Text>
                  </div>
                  <Space>
                    <Button icon={<FiPlus />} onClick={handleAddBucket}>Add Bucket</Button>
                    <Button type="primary" icon={<FiSave />} onClick={handleSaveBucketsList} style={{ background: '#10b981', borderColor: '#10b981' }}>
                      Save Buckets
                    </Button>
                  </Space>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {buckets.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16, background: '#f8fafc',
                        padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0'
                      }}
                    >
                      {/* Order Badge */}
                      <div style={{ background: b.color, color: '#fff', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                        {b.bucket_order}
                      </div>

                      {/* Bucket Name */}
                      <div style={{ flex: 2 }}>
                        <div style={{ marginBottom: 4 }}><Text style={{ fontWeight: 600, fontSize: 12, color: '#64748b' }}>Bucket Level Name</Text></div>
                        <Input value={b.bucket_name} onChange={(e) => handleUpdateBucketField(idx, 'bucket_name', e.target.value)} style={{ borderRadius: 8 }} />
                      </div>

                      {/* Percentage Allocation */}
                      <div style={{ width: 120 }}>
                        <div style={{ marginBottom: 4 }}><Text style={{ fontWeight: 600, fontSize: 12, color: '#64748b' }}>Target Ratio %</Text></div>
                        <Input
                          type="number" prefix="%" value={b.percentage}
                          onChange={(e) => handleUpdateBucketField(idx, 'percentage', parseFloat(e.target.value) || 0)}
                          style={{ borderRadius: 8 }}
                        />
                      </div>

                      {/* Color Dropdown */}
                      <div style={{ width: 160 }}>
                        <div style={{ marginBottom: 4 }}><Text style={{ fontWeight: 600, fontSize: 12, color: '#64748b' }}>Theme Color</Text></div>
                        <Select
                          value={b.color} onChange={(val) => handleUpdateBucketField(idx, 'color', val)}
                          style={{ width: '100%' }}
                          options={PRESET_COLORS.map(c => ({
                            value: c.value,
                            label: (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, background: c.value, borderRadius: '50%', display: 'inline-block' }} />
                                {c.label}
                              </div>
                            )
                          }))}
                        />
                      </div>

                      {/* Suggested Action */}
                      <div style={{ flex: 3 }}>
                        <div style={{ marginBottom: 4 }}><Text style={{ fontWeight: 600, fontSize: 12, color: '#64748b' }}>Suggested Action Recommendation</Text></div>
                        <Input value={b.suggested_action} onChange={(e) => handleUpdateBucketField(idx, 'suggested_action', e.target.value)} style={{ borderRadius: 8 }} placeholder="PIP, Training, Standard Raise..." />
                      </div>

                      {/* Delete action */}
                      <Button
                        type="text" danger icon={<FiTrash2 size={16} />}
                        onClick={() => handleRemoveBucket(idx)}
                        style={{ marginTop: 20 }}
                      />
                    </div>
                  ))}
                </div>

                <Divider style={{ margin: '20px 0' }} />

                {/* Percentage validation bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space direction="vertical" size={2}>
                    <Text style={{ fontWeight: 700, fontSize: 14 }}>
                      Total Configured Percentage: <span style={{ color: Math.abs(totalPct - 100) < 0.01 ? '#10b981' : '#ef4444' }}>{totalPct}%</span>
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Must sum to exactly 100% to save.</Text>
                  </Space>
                  <Tag color={Math.abs(totalPct - 100) < 0.01 ? 'success' : 'error'} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                    {Math.abs(totalPct - 100) < 0.01 ? 'Ready to Save' : 'Allocation Validation Failed'}
                  </Tag>
                </div>
              </Card>

            </div>
          ) : (
            <Card style={{ borderRadius: 16, padding: '48px 0', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <FiFileText size={48} style={{ color: '#94a3b8', marginBottom: 16 }} />
              <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#475569' }}>No Template Selected</Title>
              <Paragraph style={{ color: '#94a3b8', marginTop: 8, maxWidth: 360, marginInline: 'auto' }}>
                Select a template config on the left panel, or click "Create New Template" to get started.
              </Paragraph>
              <Button type="primary" icon={<FiPlus />} onClick={handleCreateNewConfig} style={{ marginTop: 16 }}>
                Create New Template
              </Button>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
