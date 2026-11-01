import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Input, List, Form, Space, Divider, Typography, Row, Col, Alert, Empty } from 'antd';
import { FiPlus, FiTrash2, FiEdit3, FiSave, FiCheckCircle } from 'react-icons/fi';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function CompetencyLibraryPage() {
  const [competencies, setCompetencies] = useState([]);
  const [ratingScales, setRatingScales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingScales, setSavingScales] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [compForm] = Form.useForm();
  
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const compRes = await axios.get('/api/client-admin/competency-assessment/competency-library', { headers });
      setCompetencies(compRes.data.data || []);
      
      const scalesRes = await axios.get('/api/client-admin/competency-assessment/competency-rating-scales', { headers });
      // Sort rating scales by level ascending
      const sortedScales = (scalesRes.data.data || []).sort((a, b) => a.rating_level - b.rating_level);
      setRatingScales(sortedScales);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleEditClick = (comp) => {
    setEditingComp(comp);
    // Populate form
    const indicatorsObj = {};
    [1, 2, 3, 4, 5].forEach(level => {
      const match = comp.indicators?.find(ind => ind.rating_level === level);
      indicatorsObj[`indicator_${level}`] = match ? match.behavioral_indicator : '';
    });

    compForm.setFieldsValue({
      name: comp.name,
      description: comp.description,
      ...indicatorsObj
    });
  };

  const handleCreateClick = () => {
    setEditingComp({ competency_id: null });
    compForm.resetFields();
  };

  const handleSaveCompetency = async (values) => {
    try {
      const indicatorsArray = [1, 2, 3, 4, 5].map(level => ({
        rating_level: level,
        behavioral_indicator: values[`indicator_${level}`] || ''
      }));

      const payload = {
        competency_id: editingComp.competency_id || undefined,
        name: values.name,
        description: values.description,
        indicators: indicatorsArray
      };

      await axios.post('/api/client-admin/competency-assessment/competency-library', payload, { headers });
      setEditingComp(null);
      fetchLibrary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save competency.');
    }
  };

  const handleDeleteCompetency = async (comp_id) => {
    if (!window.confirm('Are you sure you want to delete this competency from the global library? This will delete all associated behavioral indicators.')) return;
    try {
      await axios.delete(`/api/client-admin/competency-assessment/competency-library/${comp_id}`, { headers });
      fetchLibrary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete competency.');
    }
  };

  const handleSaveScales = async (e) => {
    e.preventDefault();
    setSavingScales(true);
    try {
      await axios.put('/api/client-admin/competency-assessment/competency-rating-scales', ratingScales, { headers });
      fetchLibrary();
    } catch (err) {
      alert('Failed to save rating scale configurations.');
    } finally {
      setSavingScales(false);
    }
  };

  const handleScaleLabelChange = (level, value) => {
    setRatingScales(prev => prev.map(s => s.rating_level === level ? { ...s, label: value } : s));
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #E3E7EE' }}>
      <Row gutter={[24, 24]}>
        
        {/* Left Side: Competencies Catalog */}
        <Col xs={24} md={14}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>📋 Global Competency Library</span>
                <Button 
                  type="primary" 
                  icon={<FiPlus />} 
                  onClick={handleCreateClick}
                  style={{ background: '#0466C8', borderColor: '#0466C8', borderRadius: 6 }}
                >
                  Create Competency
                </Button>
              </div>
            }
            bordered={false}
            style={{ boxShadow: 'none', borderRight: '1px solid #F1F4F8' }}
          >
            {competencies.length === 0 ? (
              <Empty description="No competencies configured in the library." />
            ) : (
              <List
                loading={loading}
                itemLayout="vertical"
                dataSource={competencies}
                renderItem={(item) => (
                  <List.Item
                    key={item.competency_id}
                    actions={[
                      <Button type="text" icon={<FiEdit3 />} onClick={() => handleEditClick(item)} style={{ color: '#0353A4' }}>Edit</Button>,
                      <Button type="text" danger icon={<FiTrash2 />} onClick={() => handleDeleteCompetency(item.competency_id)}>Delete</Button>
                    ]}
                    style={{ borderBottom: '1px solid #F1F4F8', padding: '16px 0' }}
                  >
                    <List.Item.Meta
                      title={<Text style={{ fontWeight: 700, fontSize: 14, color: '#001233' }}>{item.name}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{item.description || 'No description provided.'}</Text>}
                    />
                    {item.indicators && item.indicators.length > 0 && (
                      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#33415C', marginBottom: 6, textTransform: 'uppercase' }}>Behavioral Indicators:</div>
                        <Row gutter={[8, 8]}>
                          {item.indicators.map(ind => (
                            <Col span={24} key={ind.indicator_id} style={{ display: 'flex', gap: 6, fontSize: 12, lineHeight: 1.4 }}>
                              <span style={{ fontWeight: 700, color: '#0466C8' }}>L{ind.rating_level}:</span>
                              <span style={{ color: '#33415C' }}>{ind.behavioral_indicator}</span>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Right Side: Rating Scales & Setup Form */}
        <Col xs={24} md={10}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            
            {/* Rating Scales Editor */}
            <Card title={<span style={{ fontWeight: 800 }}>⭐ 5-Point Rating Scales Setup</span>} style={{ borderRadius: 10, border: '1px solid #E3E7EE' }}>
              <form onSubmit={handleSaveScales}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ratingScales.map(scale => (
                    <div key={scale.rating_level} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#33415C' }}>Level {scale.rating_level}</span>
                      <Input
                        value={scale.label}
                        onChange={(e) => handleScaleLabelChange(scale.rating_level, e.target.value)}
                        placeholder={`Label for level ${scale.rating_level}`}
                        style={{ borderRadius: 6 }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={savingScales}
                      icon={<FiSave />}
                      style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 6, fontWeight: 700 }}
                    >
                      Save Scales Configuration
                    </Button>
                  </div>
                </div>
              </form>
            </Card>

            {/* Create/Edit Form Panel */}
            {editingComp && (
              <Card 
                title={<span style={{ fontWeight: 800 }}>{editingComp.competency_id ? '✏️ Edit Competency' : '✨ Add Competency'}</span>}
                extra={<Button type="text" onClick={() => setEditingComp(null)}>Cancel</Button>}
                style={{ borderRadius: 10, border: '1px solid #E3E7EE', background: '#fcfcfd' }}
              >
                <Form form={compForm} layout="vertical" onFinish={handleSaveCompetency}>
                  <Form.Item name="name" label={<strong style={{ fontSize: 12 }}>Competency Name</strong>} rules={[{ required: true, message: 'Please enter name' }]}>
                    <Input placeholder="e.g. Adaptive Leadership" style={{ borderRadius: 6 }} />
                  </Form.Item>
                  
                  <Form.Item name="description" label={<strong style={{ fontSize: 12 }}>Description</strong>}>
                    <TextArea placeholder="Short definition of the competency..." rows={2} style={{ borderRadius: 6 }} />
                  </Form.Item>

                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#33415C', marginBottom: 10 }}>Config Behavioral Indicators:</div>
                  
                  {[1, 2, 3, 4, 5].map(level => {
                    const labelText = ratingScales.find(s => s.rating_level === level)?.label || `Level ${level}`;
                    return (
                      <Form.Item 
                        key={level} 
                        name={`indicator_${level}`} 
                        label={
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#7D8597' }}>
                            Rating {level} ★ ({labelText})
                          </span>
                        }
                      >
                        <TextArea placeholder={`Describe what behavior qualifies for a rating of ${level}...`} rows={2} style={{ borderRadius: 6 }} />
                      </Form.Item>
                    );
                  })}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <Button onClick={() => setEditingComp(null)}>Cancel</Button>
                    <Button type="primary" htmlType="submit" style={{ background: '#0466C8', borderColor: '#0466C8', borderRadius: 6 }}>
                      {editingComp.competency_id ? 'Update Competency' : 'Save Competency'}
                    </Button>
                  </div>
                </Form>
              </Card>
            )}
          </Space>
        </Col>

      </Row>
    </div>
  );
}
