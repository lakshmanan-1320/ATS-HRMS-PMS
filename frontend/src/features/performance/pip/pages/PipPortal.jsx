import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Progress, Button, Space, Typography, Spin, Modal, Form, Input, Select, Switch, Row, Col, Statistic, Alert, InputNumber, Divider, List, message, Tabs, Collapse } from 'antd';
import { 
  FiActivity, FiUsers, FiClipboard, FiSettings, FiCheckCircle, FiXCircle, 
  FiAlertTriangle, FiPlus, FiTrash2, FiFileText, FiRefreshCw, FiBook, FiUpload, FiDownload, FiUser
} from 'react-icons/fi';
import ClientAdminSidebar from '../../../../components/layout/ClientAdminSidebar';
import ClientAdminTopBar from '../../../../components/layout/ClientAdminTopBar';
import { usePipStore } from '../pip.store';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function PipPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const store = usePipStore();
  const {
    settings, templates, candidates, pips, selectedPip, stats, reports, loading, saving, error,
    fetchSettings, saveSettings, fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
    fetchCandidates, reviewCandidate, fetchPips, fetchPip, refreshMetrics, processHrDecision,
    completeCheckin, fetchStatistics, fetchDetailedReport, createCandidate, setSelectedPip
  } = store;

  // Modals & local state
  const [metricSnapshots, setMetricSnapshots] = useState([]);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertForm] = Form.useForm();

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm] = Form.useForm();
  
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [reviewForm] = Form.useForm();

  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [launchCandidate, setLaunchCandidate] = useState(null);
  const [launchForm] = Form.useForm();
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [totalWeight, setTotalWeight] = useState(0);

  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [checkinForm] = Form.useForm();

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionForm] = Form.useForm();

  const [isCandidateCreateModalOpen, setIsCandidateCreateModalOpen] = useState(false);
  const [candidateCreateForm] = Form.useForm();
  const [settingsForm] = Form.useForm();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [bellCurveBuckets, setBellCurveBuckets] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedEmpAppraisal, setSelectedEmpAppraisal] = useState(null);
  const [loadingAppraisal, setLoadingAppraisal] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
    fetchCandidates();
    fetchPips();
    fetchStatistics();
    fetchDetailedReport();
    
    // Fetch master data
    api.get('/employees/search').then(res => setEmployees(res.data.data || [])).catch(() => {});
    api.get('/client-admin/departments').then(res => setDepartments(res.data || [])).catch(() => {});
    
    // Fetch active bell curve run buckets
    api.get('/client-admin/bell-curve/configurations').then(res => {
      const defaultConf = res.data?.find(c => c.is_default);
      if (defaultConf) {
        api.get(`/client-admin/bell-curve/configurations/${defaultConf.configuration_id}/buckets`)
          .then(bucketsRes => setBellCurveBuckets(bucketsRes.data || []))
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedPip) {
      api.get(`/pip/active/${selectedPip.pip_id}/metric-snapshots`).then(res => {
        if (res.data?.success) {
          setMetricSnapshots(res.data.data || []);
        }
      }).catch(() => {});
    } else {
      setMetricSnapshots([]);
    }
  }, [selectedPip]);

  useEffect(() => {
    if (settings) {
      settingsForm.setFieldsValue(settings);
    }
  }, [settings]);

  // --- Sub-Tab Headers ---
  const subTabs = [
    { key: 'dashboard', label: 'PIP Dashboard', icon: FiActivity },
    { key: 'candidates', label: 'Potential Candidates', icon: FiUsers },
    { key: 'monitoring', label: 'Monitoring Plans', icon: FiActivity },
    { key: 'active-pips', label: 'Active PIPs', icon: FiClipboard },
    { key: 'templates', label: 'Templates', icon: FiFileText },
    { key: 'reports', label: 'Reports', icon: FiClipboard },
    { key: 'settings', label: 'Settings', icon: FiSettings }
  ];

  // --- Action Handlers ---
  const handleOpenTemplateModal = (template = null) => {
    setEditingTemplate(template);
    if (template) {
      templateForm.setFieldsValue({
        name: template.name,
        duration_days: template.duration_days,
        checkin_frequency: template.checkin_frequency,
        completion_threshold_pct: template.completion_threshold_pct,
        metrics: template.metrics || []
      });
    } else {
      templateForm.resetFields();
      templateForm.setFieldsValue({
        duration_days: 60,
        checkin_frequency: 'WEEKLY',
        completion_threshold_pct: 80,
        metrics: [{ metric_name: '', metric_source: 'MANUAL', target_type: 'PERCENTAGE', default_target: 100, weight: 100, display_order: 1, required: true }]
      });
    }
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (values) => {
    const maxDuration = settings?.default_duration_days || 60;
    if (values.duration_days > maxDuration) {
      message.error(`Template duration (${values.duration_days} days) cannot exceed the default PIP duration limit of ${maxDuration} days configured in Settings.`);
      return;
    }

    const sum = (values.metrics || []).reduce((acc, m) => acc + (parseFloat(m.weight) || 0), 0);
    if (values.metrics && values.metrics.length > 0 && Math.round(sum) !== 100) {
      message.error(`Total metric weights must sum to exactly 100%. Current sum is ${sum}%.`);
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.template_id, values);
        message.success('Template updated successfully.');
      } else {
        await createTemplate(values);
        message.success('Template created successfully.');
      }
      setIsTemplateModalOpen(false);
    } catch (e) {
      message.error(error || 'Failed to save template.');
    }
  };

  const handleOpenReviewModal = (cand) => {
    setSelectedCandidate(cand);
    reviewForm.resetFields();
    reviewForm.setFieldsValue({ status: 'APPROVED_PIP' });
    setIsReviewModalOpen(true);
  };

  const handleOpenConvertModal = () => {
    if (!selectedPip) return;
    convertForm.resetFields();
    // Pre-populate fields based on selected monitoring plan
    convertForm.setFieldsValue({
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
      checkin_frequency: 'WEEKLY',
      reason: `Converted from Monitoring Plan for ${selectedPip.first_name} ${selectedPip.last_name}.`,
      metrics: selectedPip.metrics?.map(m => ({
        metric_name: m.metric_name,
        metric_source: m.metric_source,
        metric_key: m.metric_key,
        target_value: m.target_value,
        weight: m.weight,
        direction: m.direction || 'HIGHER_IS_BETTER',
        calculation_type: m.calculation_type || 'HIGHER_IS_BETTER',
        measurement_frequency: m.measurement_frequency || 'WEEKLY'
      })) || []
    });
    setIsConvertModalOpen(true);
  };

  const handleConvertTemplateChange = (templateId) => {
    const tmpl = templates.find(t => t.template_id === templateId);
    if (tmpl) {
      const duration = tmpl.duration_days || 60;
      convertForm.setFieldsValue({
        end_date: new Date(Date.now() + duration*24*60*60*1000).toISOString().split('T')[0],
        checkin_frequency: tmpl.checkin_frequency || 'WEEKLY',
        metrics: tmpl.metrics?.map(m => ({
          metric_name: m.metric_name,
          metric_source: m.metric_source,
          metric_key: m.metric_key,
          target_value: m.default_target,
          weight: m.weight,
          direction: m.direction || 'HIGHER_IS_BETTER',
          calculation_type: m.calculation_type || 'HIGHER_IS_BETTER',
          measurement_frequency: m.measurement_frequency || 'WEEKLY'
        })) || []
      });
    }
  };

  const handleConvertSubmit = async (values) => {
    try {
      await store.convertToPip(selectedPip.pip_id, values);
      message.success('Monitoring plan successfully converted to Active PIP.');
      setIsConvertModalOpen(false);
      setSelectedPip(null);
      fetchPips();
      fetchStatistics();
    } catch (e) {
      message.error(error || 'Failed to convert monitoring plan.');
    }
  };

  const handleSaveReview = async (values) => {
    try {
      if (values.status === 'REJECTED') {
        await reviewCandidate(selectedCandidate.candidate_id, {
          status: 'REJECTED',
          remarks: values.remarks
        });
        message.success('Candidate recommendation rejected.');
        setIsReviewModalOpen(false);
      } else {
        // Switch to the launch modal to input metrics details
        setLaunchCandidate(selectedCandidate);
        launchForm.resetFields();
        launchForm.setFieldsValue({
          status: values.status, // APPROVED_PIP or MONITORING
          checkin_frequency: undefined,
          start_date: new Date().toISOString().split('T')[0],
          end_date: undefined,
          reason: selectedCandidate.recommendation_reason || 'Performance improvement required.'
        });
        setSelectedMetrics([]);
        setTotalWeight(0);
        setIsReviewModalOpen(false);
        setIsLaunchModalOpen(true);
      }
    } catch (e) {
      message.error(error || 'Action failed.');
    }
  };

  const handleTemplateChange = (templateId) => {
    const temp = templates.find(t => t.template_id === templateId);
    if (temp) {
      const today = new Date();
      const start = today.toISOString().split('T')[0];
      const end = new Date(today.getTime() + temp.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      launchForm.setFieldsValue({
        checkin_frequency: temp.checkin_frequency || 'WEEKLY',
        start_date: start,
        end_date: end
      });

      // Map template metrics (exclude CUSTOM sources)
      const mappedMetrics = (temp.metrics || [])
        .filter(m => m.metric_source !== 'CUSTOM')
        .map((m, idx) => ({
          id: m.metric_id || `temp-${idx}-${Date.now()}`,
          metric_name: m.metric_name,
          metric_source: m.metric_source,
          metric_key: m.metric_key,
          target_type: m.target_type || 'PERCENTAGE',
          target_value: m.default_target,
          weight: m.weight,
          display_order: m.display_order,
          required: m.required
        }));

      setSelectedMetrics(mappedMetrics);
      
      const sum = mappedMetrics.reduce((acc, m) => acc + (parseFloat(m.weight) || 0), 0);
      setTotalWeight(sum);
    } else {
      setSelectedMetrics([]);
      setTotalWeight(0);
    }
  };

  const handleMetricRowChange = (index, field, value) => {
    const updated = [...selectedMetrics];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMetrics(updated);

    const sum = updated.reduce((acc, m) => acc + (parseFloat(m.weight) || 0), 0);
    setTotalWeight(sum);
  };

  const handleMetricRowDelete = (index) => {
    const updated = selectedMetrics.filter((_, idx) => idx !== index);
    setSelectedMetrics(updated);
    const sum = updated.reduce((acc, m) => acc + (parseFloat(m.weight) || 0), 0);
    setTotalWeight(sum);
  };

  const handleAddCustomObjective = () => {
    const newMetric = {
      id: `custom-row-${Date.now()}`,
      metric_name: '',
      metric_source: 'MANUAL',
      target_type: 'PERCENTAGE',
      target_value: 100,
      weight: 0,
      required: false
    };
    const updated = [...selectedMetrics, newMetric];
    setSelectedMetrics(updated);
    const sum = updated.reduce((acc, m) => acc + (parseFloat(m.weight) || 0), 0);
    setTotalWeight(sum);
  };

  const handleLaunchPip = async (values) => {
    if (selectedMetrics.length === 0) {
      message.error('Please select a template or add at least one metric.');
      return;
    }

    const sum = selectedMetrics.reduce((acc, m) => acc + (parseFloat(m.weight) || 0), 0);
    if (Math.round(sum) !== 100) {
      message.error(`Total metric weight must be exactly 100%. Current total is ${sum}%.`);
      return;
    }

    for (const m of selectedMetrics) {
      if (!m.metric_name || !m.metric_name.trim()) {
        message.error('Metric name cannot be empty.');
        return;
      }
    }

    try {
      const metricsPayload = selectedMetrics.map((m, idx) => ({
        metric_name: m.metric_name,
        metric_source: m.metric_source,
        metric_key: m.metric_key || null,
        target_type: m.target_type || 'PERCENTAGE',
        target_value: parseFloat(m.target_value) || 0,
        weight: parseFloat(m.weight) || 0,
        direction: m.direction || 'HIGHER_IS_BETTER',
        calculation_type: m.calculation_type || 'HIGHER_IS_BETTER',
        measurement_frequency: m.measurement_frequency || 'WEEKLY',
        required: m.required || false,
        display_order: idx + 1,
        is_active: true
      }));

      await reviewCandidate(launchCandidate.candidate_id, {
        status: values.status,
        remarks: 'Approved and launched.',
        template_id: values.template_id,
        reason: values.reason,
        start_date: values.start_date,
        end_date: values.end_date,
        checkin_frequency: values.checkin_frequency,
        metrics: metricsPayload
      });

      message.success('Performance Improvement Plan initiated successfully.');
      setIsLaunchModalOpen(false);
      fetchPips();
      fetchStatistics();
    } catch (e) {
      message.error(error || 'Failed to launch plan.');
    }
  };

  const handleOpenCheckinModal = (checkin, pip) => {
    setSelectedCheckin(checkin);
    checkinForm.resetFields();

    const initialValues = {
      manager_progress_rating: 3,
      manager_notes: '',
      action_items: '',
      risks: '',
      next_meeting_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
    };

    if (pip && Array.isArray(pip.metrics)) {
      pip.metrics.forEach(m => {
        initialValues[`metric_${m.pip_metric_id}`] = m.current_value !== null && m.current_value !== undefined ? parseFloat(m.current_value) : 0;
      });
    }

    checkinForm.setFieldsValue(initialValues);
    setIsCheckinModalOpen(true);
  };

  const handleSaveCheckin = async (values) => {
    try {
      // Map checkin values
      const metricValues = selectedPip.metrics.map(m => {
        const val = values[`metric_${m.pip_metric_id}`];
        return {
          pip_metric_id: m.pip_metric_id,
          current_value: val !== undefined && val !== null ? val : parseFloat(m.current_value) || 0
        };
      });

      await completeCheckin(selectedCheckin.checkin_id, {
        ...values,
        metric_values: metricValues
      });

      message.success('Check-in submitted successfully.');
      setIsCheckinModalOpen(false);
      // Reload selected PIP details
      fetchPip(selectedPip.pip_id);
    } catch (e) {
      message.error(error || 'Failed to submit check-in.');
    }
  };

  const handleProcessDecision = async (values) => {
    try {
      await processHrDecision(selectedPip.pip_id, values);
      message.success('HR decision logged successfully.');
      setIsDecisionModalOpen(false);
      fetchPips();
      fetchStatistics();
    } catch (e) {
      message.error(error || 'Action failed.');
    }
  };

  const handleCreateManualCandidate = async (values) => {
    try {
      await createCandidate(values);
      message.success('Candidate added to queue successfully.');
      setIsCandidateCreateModalOpen(false);
      fetchCandidates();
    } catch (e) {
      message.error(error || 'Failed to add candidate.');
    }
  };

  const handleSaveSettings = async (values) => {
    try {
      const payload = {
        ...values,
        enable_pip: settings?.enable_pip !== false
      };
      await saveSettings(payload);
      message.success('Settings saved successfully.');
    } catch (e) {
      message.error(error || 'Failed to save settings.');
    }
  };

  const handleExportCSV = () => {
    if (!reports || reports.length === 0) {
      message.warning('No historical reports available to export.');
      return;
    }

    message.success('Exporting PIP history to CSV...');

    const headers = ['Employee Name', 'Template', 'Status', 'Start Date', 'End Date', 'Final Progress %', 'HR Remarks'];

    const rows = reports.map(r => [
      r.employee_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '-',
      r.template_name || '-',
      r.status || '-',
      r.start_date || '-',
      r.end_date || '-',
      r.overall_progress !== undefined ? `${r.overall_progress}%` : '-',
      (r.hr_decision_remarks || '-').replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PIP_History_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render Sections ---

  const renderDashboard = () => {
    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card style={{ borderRadius: 12 }}>
              <Statistic title="Potential Candidates" value={stats?.potentialCandidates || 0} prefix={<FiUsers style={{ color: '#ef4444' }} />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 12 }}>
              <Statistic title="Under Monitoring" value={stats?.monitoring || 0} prefix={<FiActivity style={{ color: '#ea580c' }} />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 12 }}>
              <Statistic title="Active PIPs" value={stats?.activePips || 0} prefix={<FiClipboard style={{ color: '#6366f1' }} />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 12 }}>
              <Statistic 
                title="Success Rate" 
                value={
                  stats?.successRate !== undefined 
                    ? `${stats.completed || 0} / ${(stats.completed || 0) + (stats.escalated || 0)} Successful (${stats.successRate}%)`
                    : '0 / 0 Successful (0%)'
                } 
                valueStyle={{ color: '#16a34a', fontWeight: 800, fontSize: 18 }} 
                prefix={<FiCheckCircle />} 
              />
            </Card>
          </Col>
        </Row>
        <Card title="Average Performance Improvement Progress" style={{ borderRadius: 12, marginBottom: 24 }}>
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Progress type="dashboard" percent={stats?.averageImprovement || 0} strokeColor="#6366f1" width={160} strokeWidth={10} />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">Average weighted progress metric completion rate across all current active and monitoring plans.</Text>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderCandidates = () => {
    const columns = [
      { title: 'Employee', dataIndex: 'employee_name', key: 'emp', render: (_, r) => <div><strong style={{ color: '#0f172a' }}>{r.first_name} {r.last_name}</strong><div style={{ fontSize: 11, color: '#64748b' }}>{r.employee_code}</div></div> },
      { title: 'Department', dataIndex: 'department_name', key: 'dept' },
      { title: 'Manager', dataIndex: 'manager_name', key: 'manager' },
      { title: 'Source', dataIndex: 'source', key: 'source', render: (val) => <Tag color="blue">{val}</Tag> },
      { title: 'Score/Rating', dataIndex: 'appraisal_score', key: 'score', render: (val, r) => r.bell_curve_bucket_name ? <Tag color={r.bell_curve_bucket_color}>{r.bell_curve_bucket_name} ({val}%)</Tag> : (val ? `${val}%` : '—') },
      { title: 'Status', dataIndex: 'status', key: 'status', render: (val) => <Tag color="orange">{val}</Tag> },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, r) => (
          <Space>
            <Button size="small" type="primary" onClick={() => handleOpenReviewModal(r)}>Review Action</Button>
          </Space>
        )
      }
    ];

    return (
      <Card 
        title="Potential PIP Candidates" 
        style={{ borderRadius: 12 }}
        extra={<Button type="primary" icon={<FiPlus />} onClick={() => { setSelectedDeptId(null); setSelectedEmpAppraisal(null); candidateCreateForm.resetFields(); setIsCandidateCreateModalOpen(true); }}>Add Candidate Manual</Button>}
      >
        <Table columns={columns} dataSource={candidates} loading={loading} rowKey="candidate_id" pagination={{ pageSize: 10 }} />
      </Card>
    );
  };

  const renderPipDetails = () => {
    if (!selectedPip) return null;
    
    const allCheckinsDone = selectedPip.checkins?.every(c => c.status === 'COMPLETED');
    const isMon = selectedPip.is_monitoring;

    // Recommendation logic display
    let recAlert = null;
    if (isMon) {
      const progress = parseFloat(selectedPip.overall_progress) || 0;
      const closeThreshold = parseFloat(settings?.monitoring_close_threshold_pct) || 80.00;
      const extendThreshold = parseFloat(settings?.monitoring_extend_threshold_pct) || 50.00;

      if (progress >= closeThreshold) {
        recAlert = (
          <Alert 
            message="Recommendation: Close Monitoring Successfully" 
            description={`Overall progress of ${progress}% meets or exceeds the Success Threshold of ${closeThreshold}%.`} 
            type="success" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        );
      } else if (progress < extendThreshold) {
        recAlert = (
          <Alert 
            message="Recommendation: Convert to Active PIP" 
            description={`Overall progress of ${progress}% is below the PIP Conversion Threshold of ${extendThreshold}%.`} 
            type="warning" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        );
      } else {
        recAlert = (
          <Alert 
            message="Recommendation: Extend Monitoring" 
            description={`Overall progress of ${progress}% is between the Conversion (${extendThreshold}%) and Success (${closeThreshold}%) thresholds.`} 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        );
      }
    } else {
      const progress = parseFloat(selectedPip.overall_progress) || 0;
      const closeThreshold = parseFloat(settings?.close_threshold_pct) || 80.00;
      const escalateThreshold = parseFloat(settings?.escalate_threshold_pct) || 50.00;

      if (progress >= closeThreshold) {
        recAlert = (
          <Alert 
            message="Recommendation: Close PIP Successfully" 
            description={`Overall progress of ${progress}% meets or exceeds the Success Threshold of ${closeThreshold}%.`} 
            type="success" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        );
      } else if (progress < escalateThreshold) {
        recAlert = (
          <Alert 
            message="Recommendation: Escalate Action" 
            description={`Overall progress of ${progress}% is below the Escalate Threshold of ${escalateThreshold}%.`} 
            type="error" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        );
      } else {
        recAlert = (
          <Alert 
            message="Recommendation: Extend PIP Duration" 
            description={`Overall progress of ${progress}% is between the Escalate (${escalateThreshold}%) and Success (${closeThreshold}%) thresholds.`} 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        );
      }
    }

    return (
      <Card 
        title={
          <div>
            <Button onClick={() => setSelectedPip(null)} style={{ marginRight: 16 }}>← Back</Button>
            {isMon ? 'Manage Performance Monitoring: ' : 'Manage PIP: '} 
            {selectedPip.first_name} {selectedPip.last_name}
          </div>
        } 
        style={{ borderRadius: 12 }}
      >
        {selectedPip.parent_pip_id && (
          <Alert 
            type="info" 
            showIcon 
            message={
              <span>
                This Active PIP originated from a <strong>Monitoring Plan</strong>.
              </span>
            }
            style={{ marginBottom: 16 }}
          />
        )}
        <Row gutter={[24, 24]}>
          <Col span={16}>
            <Card title={isMon ? "Monitoring Objectives & Target Metrics" : "PIP Objectives & Target Metrics"} style={{ borderRadius: 10, marginBottom: 20 }}>
              <List
                dataSource={selectedPip.metrics}
                renderItem={m => {
                  const metricHistory = metricSnapshots.filter(s => s.pip_metric_id === m.pip_metric_id);
                  return (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <strong>{m.metric_name} ({m.metric_source})</strong>
                          <Text type="secondary">
                            Target: {m.target_value}% | Weight: {m.weight}% | Mode: {m.calculation_type || m.direction || 'HIGHER_IS_BETTER'}
                          </Text>
                        </div>
                        <Progress percent={Math.round(m.completion_pct)} size="small" strokeColor={isMon ? "#ea580c" : "#6366f1"} />
                        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <Text type="secondary">Current live value: {m.current_value}%</Text>
                          {m.required && <Tag color="red">Required</Tag>}
                        </div>
                        {metricHistory.length > 0 ? (
                          <div style={{ marginTop: 8, background: '#f8fafc', padding: 8, borderRadius: 6 }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Check-in Trend History:</Text>
                            <Space split={<Text type="secondary" style={{ color: '#cbd5e1' }}>➔</Text>} wrap>
                              {metricHistory.map((h, idx) => (
                                <Tag key={idx} color="blue" style={{ fontSize: 11 }}>
                                  {h.checkin_date}: <strong>{h.current_value}%</strong>
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>No check-in history logged yet.</Text>
                        )}
                      </div>
                    </List.Item>
                  );
                }}
              />
            </Card>

            <Card title="Progress Check-ins Timeline" style={{ borderRadius: 10 }}>
              <List
                dataSource={selectedPip.checkins}
                renderItem={(c, index) => (
                  <List.Item extra={
                    c.status === 'PENDING' ? (
                      <Button size="small" type="primary" onClick={() => handleOpenCheckinModal(c, selectedPip)}>Log Progress</Button>
                    ) : <Tag color="green">Completed ({c.overall_progress_at_checkin}%)</Tag>
                  }>
                    <List.Item.Meta
                      title={`Check-in Review #${index + 1} (${c.checkin_date})`}
                      description={c.status === 'COMPLETED' ? (
                        <div>
                          <div><strong>Manager Notes:</strong> {c.manager_notes}</div>
                          {c.action_items && <div><strong>Actions:</strong> {c.action_items}</div>}
                          {c.employee_comments && <div><strong>Employee Feedback:</strong> {c.employee_comments}</div>}
                        </div>
                      ) : 'Check-in slot is scheduled.'}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          
          <Col span={8}>
            <Card title="HR Decision Control" style={{ borderRadius: 10, background: '#f8fafc' }}>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">Overall Program Progress</Text>
                <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{selectedPip.overall_progress}%</Title>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              
              {recAlert}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                <Button type="primary" block onClick={() => { decisionForm.resetFields(); setIsDecisionModalOpen(true); }}>
                  Record Final Decision
                </Button>
                {isMon && (
                  <Button type="warning" style={{ background: '#ea580c', color: '#fff', border: 'none' }} block onClick={() => handleOpenConvertModal()}>
                    Convert to Active PIP
                  </Button>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderActivePips = () => {
    const columns = [
      { title: 'Employee', dataIndex: 'employee_name', key: 'emp', render: (_, r) => <div><strong style={{ color: '#0f172a' }}>{r.first_name} {r.last_name}</strong><div style={{ fontSize: 11, color: '#64748b' }}>{r.employee_code}</div></div> },
      { title: 'Template', dataIndex: 'template_name', key: 'template' },
      { title: 'Status', dataIndex: 'status', key: 'status', render: (val) => <Tag color={val === 'ACTIVE' ? 'geekblue' : val === 'MONITORING' ? 'orange' : 'green'}>{val}</Tag> },
      { title: 'Dates', key: 'dates', render: (_, r) => <div style={{ fontSize: 12 }}>{r.start_date} to {r.end_date}</div> },
      { title: 'Read Conf.', dataIndex: 'employee_acknowledged', key: 'ack', render: (val) => val ? <Tag color="green">Read</Tag> : <Tag color="default">Pending</Tag> },
      { title: 'Progress', dataIndex: 'overall_progress', key: 'progress', render: (val) => <div style={{ width: 140 }}><Progress percent={Math.round(val)} size="small" strokeColor="#6366f1" /></div> },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, r) => (
          <Space>
            <Button size="small" onClick={() => fetchPip(r.pip_id)}>Manage & Logs</Button>
            <Button size="small" type="primary" ghost onClick={async () => { await refreshMetrics(r.pip_id); fetchPips(); }}>Sync & Refresh</Button>
          </Space>
        )
      }
    ];

    if (selectedPip) {
      return renderPipDetails();
    }

    const activeList = pips.filter(p => !p.is_monitoring);

    return (
      <Card title="Active Performance Improvement Plans" style={{ borderRadius: 12 }}>
        <Table columns={columns} dataSource={activeList} loading={loading} rowKey="pip_id" />
      </Card>
    );
  };

  const renderMonitoring = () => {
    const columns = [
      { title: 'Employee', dataIndex: 'employee_name', key: 'emp', render: (_, r) => <div><strong style={{ color: '#0f172a' }}>{r.first_name} {r.last_name}</strong><div style={{ fontSize: 11, color: '#64748b' }}>{r.employee_code}</div></div> },
      { title: 'Template', dataIndex: 'template_name', key: 'template' },
      { title: 'Status', dataIndex: 'status', key: 'status', render: (val) => <Tag color={val === 'MONITORING' ? 'orange' : val === 'EXTENDED' ? 'purple' : 'green'}>{val}</Tag> },
      { title: 'Dates', key: 'dates', render: (_, r) => <div style={{ fontSize: 12 }}>{r.start_date} to {r.end_date}</div> },
      { title: 'Read Conf.', dataIndex: 'employee_acknowledged', key: 'ack', render: (val) => val ? <Tag color="green">Read</Tag> : <Tag color="default">Pending</Tag> },
      { title: 'Progress', dataIndex: 'overall_progress', key: 'progress', render: (val) => <div style={{ width: 140 }}><Progress percent={Math.round(val)} size="small" strokeColor="#ea580c" /></div> },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, r) => (
          <Space>
            <Button size="small" onClick={() => fetchPip(r.pip_id)}>Manage & Logs</Button>
            <Button size="small" type="primary" ghost onClick={async () => { await refreshMetrics(r.pip_id); fetchPips(); }}>Sync & Refresh</Button>
          </Space>
        )
      }
    ];

    if (selectedPip) {
      return renderPipDetails();
    }

    const monitoringList = pips.filter(p => p.is_monitoring);

    return (
      <Card title="Performance Monitoring Plans" style={{ borderRadius: 12 }}>
        <Table columns={columns} dataSource={monitoringList} loading={loading} rowKey="pip_id" />
      </Card>
    );
  };

  const renderTemplates = () => {
    const columns = [
      { title: 'Template Name', dataIndex: 'name', key: 'name', render: (val) => <strong>{val}</strong> },
      { title: 'Duration', dataIndex: 'duration_days', key: 'dur', render: (val) => `${val} Days` },
      { title: 'Review Frequency', dataIndex: 'checkin_frequency', key: 'freq' },
      { title: 'Success Target', dataIndex: 'completion_threshold_pct', key: 'threshold', render: (val) => `${val}% Progress` },
      { title: 'Metrics Count', key: 'metricsCount', render: (_, r) => r.metrics?.length || 0 },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, r) => (
          <Space>
            <Button size="small" onClick={() => handleOpenTemplateModal(r)}>Edit</Button>
            <Button size="small" danger onClick={() => deleteTemplate(r.template_id)}>Delete</Button>
          </Space>
        )
      }
    ];

    return (
      <Card 
        title="PIP Templates Library" 
        style={{ borderRadius: 12 }}
        extra={<Button type="primary" icon={<FiPlus />} onClick={() => handleOpenTemplateModal(null)}>Add New Template</Button>}
      >
        <Table columns={columns} dataSource={templates} loading={loading} rowKey="template_id" />
      </Card>
    );
  };

  const renderReports = () => {
    const columns = [
      { title: 'Employee', dataIndex: 'employee_name', key: 'emp' },
      { title: 'Template', dataIndex: 'template_name', key: 'template' },
      { title: 'Status', dataIndex: 'status', key: 'status', render: (val) => <Tag color={val === 'COMPLETED' ? 'green' : val === 'ESCALATED' ? 'red' : 'default'}>{val}</Tag> },
      { title: 'Duration Dates', key: 'dates', render: (_, r) => `${r.start_date} to ${r.end_date}` },
      { title: 'Final Progress', dataIndex: 'overall_progress', key: 'progress', render: (val) => `${val}%` },
      { title: 'HR Remarks', dataIndex: 'hr_decision_remarks', key: 'remarks', render: (val) => val || '—' }
    ];

    return (
      <Card 
        title="Historical & Closed Reports" 
        style={{ borderRadius: 12 }}
        extra={<Button icon={<FiDownload />} onClick={handleExportCSV}>Export CSV</Button>}
      >
        <Table columns={columns} dataSource={reports} loading={loading} rowKey="pip_id" />
      </Card>
    );
  };

  const renderSettings = () => {
    return (
      <Card title="PIP Module Settings" style={{ borderRadius: 12 }}>
        <Form
          form={settingsForm}
          layout="vertical"
          initialValues={settings || {}}
          onFinish={handleSaveSettings}
          style={{ maxWidth: 800 }}
        >
          <Tabs defaultActiveKey="general" type="card" style={{ marginBottom: 24 }}>
            <Tabs.TabPane tab="General" key="general">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Allow Manager Recommendation" name="allow_manager_initiation" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Require HR Review & Approval" name="require_hr_approval" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Allow Manual HR Candidate Creation" name="allow_manual_creation" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Allow PIP Extension" name="allow_extension" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Max Extension Count" name="max_extension_count">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Default PIP Duration (Days)" name="default_duration_days">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Default Check-in Frequency" name="default_checkin_frequency">
                    <Select style={{ width: '100%' }}>
                      <Select.Option value="WEEKLY">Weekly</Select.Option>
                      <Select.Option value="BIWEEKLY">Bi-weekly</Select.Option>
                      <Select.Option value="MONTHLY">Monthly</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Reminder Frequency (Days)" name="reminder_frequency_days">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Recommendation Rules" key="recommendation">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Enable Automatic Recommendation" name="enable_recommendation_engine" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item 
                    label="Auto-Flag Appraisal Score Threshold (%)" 
                    name="appraisal_trigger_threshold_pct"
                    extra="Automatically flag employee as a PIP Candidate if their final manager appraisal score falls below this percentage."
                  >
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.enable_recommendation_engine !== currentValues.enable_recommendation_engine}>
                {({ getFieldValue }) => {
                  const isEnabled = getFieldValue('enable_recommendation_engine');
                  if (!isEnabled) return null;
                  return (
                    <Collapse ghost style={{ marginTop: 16 }}>
                      <Collapse.Panel header="Advanced Threshold Settings (Click to expand)" key="advanced_thresholds">
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item label="Close Threshold (%)" name="close_threshold_pct">
                              <InputNumber min={0} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="Extend Threshold (%)" name="extend_threshold_pct">
                              <InputNumber min={0} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="Escalate Threshold (%)" name="escalate_threshold_pct">
                              <InputNumber min={0} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Collapse.Panel>
                    </Collapse>
                  );
                }}
              </Form.Item>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Monitoring Configuration" key="monitoring">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Enable Monitoring State Option" name="enable_monitoring" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.enable_monitoring !== currentValues.enable_monitoring}>
                {({ getFieldValue }) => {
                  const isEnabled = getFieldValue('enable_monitoring');
                  if (!isEnabled) return null;
                  return (
                    <>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item label="Monitoring Duration (Days)" name="monitoring_duration_days">
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="Monitoring Check-in Frequency" name="monitoring_checkin_frequency">
                            <Select style={{ width: '100%' }}>
                              <Select.Option value="WEEKLY">Weekly</Select.Option>
                              <Select.Option value="BIWEEKLY">Bi-weekly</Select.Option>
                              <Select.Option value="MONTHLY">Monthly</Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="Monitoring Max Extensions" name="monitoring_max_extension_count">
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Collapse ghost style={{ marginTop: 16 }}>
                        <Collapse.Panel header="Advanced Monitoring Thresholds (Click to expand)" key="advanced_monitoring">
                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item label="Closure Success Threshold (%)" name="monitoring_close_threshold_pct">
                                <InputNumber min={0} max={100} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item label="Extension Threshold (%)" name="monitoring_extend_threshold_pct">
                                <InputNumber min={0} max={100} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item label="PIP Conversion Threshold (%)" name="monitoring_convert_threshold_pct">
                                <InputNumber min={0} max={100} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Collapse.Panel>
                      </Collapse>
                    </>
                  );
                }}
              </Form.Item>
            </Tabs.TabPane>
          </Tabs>

          <Button type="primary" htmlType="submit" loading={saving}>Save Settings</Button>
        </Form>
      </Card>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="pip" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
          <div style={{ padding: '24px 24px 8px 24px' }}>
            <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Performance Improvement Plan (PIP)</Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
              Manage, review, track, and configure employee development and performance correction cycles.
            </Paragraph>
          </div>

          {/* Sub-Tabs Nav */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 24, gap: 16, background: '#fff', padding: '0 24px' }}>
            {subTabs.map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSelectedPip(null); }}
                  style={{
                    padding: '16px 20px', background: 'none', border: 'none',
                    borderBottom: activeTab === tab.key ? '3px solid #6366f1' : '3px solid transparent',
                    color: activeTab === tab.key ? '#6366f1' : '#64748b', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                  }}
                >
                  <IconComp /> {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '0 24px' }}>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'candidates' && renderCandidates()}
            {activeTab === 'monitoring' && renderMonitoring()}
            {activeTab === 'active-pips' && renderActivePips()}
            {activeTab === 'templates' && renderTemplates()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>

      {/* --- Templates Modal --- */}
      <Modal
        title={editingTemplate ? "Edit Template" : "Add New Template"}
        open={isTemplateModalOpen}
        onCancel={() => setIsTemplateModalOpen(false)}
        onOk={() => templateForm.submit()}
        width={720}
      >
        <Form form={templateForm} layout="vertical" onFinish={handleSaveTemplate}>
          <Form.Item label="Template Name" name="name" rules={[{ required: true, message: 'Please specify name' }]}>
            <Input placeholder="e.g. Developer Performance Improvement" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Duration (Days)" name="duration_days" rules={[{ required: true }]}>
                <InputNumber min={7} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Review Frequency" name="checkin_frequency" rules={[{ required: true }]}>
                <Select>
                  <Option value="WEEKLY">Weekly</Option>
                  <Option value="BIWEEKLY">Bi-weekly</Option>
                  <Option value="MONTHLY">Monthly</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Completion Target (%)" name="completion_threshold_pct" rules={[{ required: true }]}>
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Define Metrics Target</Divider>
          <Form.List name="metrics">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'metric_name']}
                      rules={[{ required: true, message: 'Metric name required' }]}
                    >
                      <Input placeholder="Metric Name" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'metric_source']}
                      rules={[{ required: true }]}
                    >
                      <Select style={{ width: 150 }}>
                        <Option value="MANUAL">Manual Input</Option>
                        <Option value="ATTENDANCE">Attendance %</Option>
                        <Option value="GOAL">Goals Progress</Option>
                        <Option value="KPI">KPI Target Completion</Option>
                        <Option value="COMPETENCY">Competency Rating</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'default_target']}
                      rules={[{ required: true }]}
                    >
                      <InputNumber placeholder="Target" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'weight']}
                      rules={[{ required: true }]}
                    >
                      <InputNumber placeholder="Weight" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'calculation_type']}
                      initialValue="HIGHER_IS_BETTER"
                    >
                      <Select style={{ width: 150 }}>
                        <Option value="HIGHER_IS_BETTER">Higher is Better</Option>
                        <Option value="LOWER_IS_BETTER">Lower is Better</Option>
                        <Option value="BOOLEAN">Boolean (Pass/Fail)</Option>
                        <Option value="PERCENTAGE">Percentage</Option>
                        <Option value="RATING">Rating (1-5)</Option>
                      </Select>
                    </Form.Item>
                    <Button type="text" onClick={() => remove(name)} icon={<FiTrash2 />} danger />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<FiPlus />}>Add Metric Row</Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* --- Review Modal --- */}
      <Modal
        title="Review PIP Candidate"
        open={isReviewModalOpen}
        onCancel={() => setIsReviewModalOpen(false)}
        onOk={() => reviewForm.submit()}
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleSaveReview}>
          <Form.Item label="Decision Status" name="status" rules={[{ required: true }]}>
            <Select>
              <Option value="APPROVED_PIP">Start Active PIP</Option>
              <Option value="MONITORING">Place Under Monitoring</Option>
              <Option value="REJECTED">Reject / Dismiss Recommendation</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Remarks / Reasoning" name="remarks">
            <Input.TextArea placeholder="Provide remarks or reasoning..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* --- Launch Modal --- */}
      <Modal
        title="Initiate Development Plan Details"
        open={isLaunchModalOpen}
        onCancel={() => setIsLaunchModalOpen(false)}
        onOk={() => launchForm.submit()}
        width={700}
        okButtonProps={{ disabled: selectedMetrics.length > 0 && Math.round(totalWeight) !== 100 }}
      >
        <Form form={launchForm} layout="vertical" onFinish={handleLaunchPip}>
          <Form.Item name="status" hidden><Input /></Form.Item>
          <Form.Item label="Select Plan Template" name="template_id" rules={[{ required: true, message: 'Please select template' }]}>
            <Select placeholder="Choose a metric template..." onChange={handleTemplateChange}>
              {templates.map(t => <Option key={t.template_id} value={t.template_id}>{t.name}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Start Date" name="start_date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="End Date" name="end_date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Check-in Frequency" name="checkin_frequency" rules={[{ required: true }]}>
            <Select>
              <Option value="WEEKLY">Weekly Check-in</Option>
              <Option value="BIWEEKLY">Bi-weekly Check-in</Option>
              <Option value="MONTHLY">Monthly Check-in</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Goal/Objective Description" name="reason" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Describe the specific objectives or development areas..." />
          </Form.Item>

          {selectedMetrics.length > 0 && (
            <>
              <Divider orientation="left" style={{ margin: '16px 0 8px 0' }}>Configure Metric Targets & Weights</Divider>
              
              <div style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 16 }}>
                {selectedMetrics.map((metric, index) => (
                  <Row key={metric.id} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={8}>
                      <Input 
                        value={metric.metric_name}
                        placeholder="Metric Name"
                        onChange={(e) => handleMetricRowChange(index, 'metric_name', e.target.value)}
                      />
                    </Col>
                    <Col span={6}>
                      <Select
                        value={metric.metric_source}
                        style={{ width: '100%' }}
                        onChange={(val) => handleMetricRowChange(index, 'metric_source', val)}
                      >
                        <Option value="MANUAL">Manual Input</Option>
                        <Option value="ATTENDANCE">Attendance %</Option>
                        <Option value="GOAL">Goals Progress</Option>
                        <Option value="KPI">KPI Target Completion</Option>
                        <Option value="COMPETENCY">Competency Rating</Option>
                      </Select>
                    </Col>
                    <Col span={4}>
                      <InputNumber
                        value={metric.target_value}
                        placeholder="Target"
                        style={{ width: '100%' }}
                        min={0}
                        onChange={(val) => handleMetricRowChange(index, 'target_value', val)}
                      />
                    </Col>
                    <Col span={4}>
                      <InputNumber
                        value={metric.weight}
                        placeholder="Weight"
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        onChange={(val) => handleMetricRowChange(index, 'weight', val)}
                      />
                    </Col>
                    <Col span={2} style={{ textAlign: 'center' }}>
                      <Button 
                        type="text" 
                        danger 
                        icon={<FiTrash2 />} 
                        onClick={() => handleMetricRowDelete(index)}
                      />
                    </Col>
                  </Row>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Button type="dashed" icon={<FiPlus />} onClick={handleAddCustomObjective}>
                  Add Custom Objective
                </Button>
                <Typography.Text strong style={{ color: Math.round(totalWeight) === 100 ? '#52c41a' : '#ff4d4f' }}>
                  Total Weight: {totalWeight}% (Must be 100%)
                </Typography.Text>
              </div>

              {Math.round(totalWeight) !== 100 && (
                <Alert 
                  type="warning" 
                  message="Sum of all metric weights must equal exactly 100% to submit." 
                  showIcon 
                  style={{ marginBottom: 16 }}
                />
              )}
            </>
          )}
        </Form>
      </Modal>

      {/* --- Checkin Modal --- */}
      <Modal
        title="Log Progress Check-in"
        open={isCheckinModalOpen}
        onCancel={() => setIsCheckinModalOpen(false)}
        onOk={() => checkinForm.submit()}
        width={600}
      >
        <Form form={checkinForm} layout="vertical" onFinish={handleSaveCheckin}>
          <Divider orientation="left">Enter Live Metric Scores</Divider>
          {selectedPip?.metrics.map(m => {
            const isManual = m.metric_source === 'MANUAL' || m.metric_source === 'CUSTOM';
            if (isManual) {
              return (
                <Form.Item 
                  key={m.pip_metric_id}
                  label={<span>{m.metric_name} <Text type="secondary">(Target: {m.target_value}%)</Text></span>}
                  name={`metric_${m.pip_metric_id}`}
                  rules={[{ required: m.required, message: 'Value is required' }]}
                  extra={<span style={{ fontSize: 12, color: '#f59e0b' }}>Manager input</span>}
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="Enter current score/pct" />
                </Form.Item>
              );
            } else {
              return (
                <Form.Item 
                  key={m.pip_metric_id}
                  label={<span>{m.metric_name} <Text type="secondary">(Target: {m.target_value}%)</Text></span>}
                  name={`metric_${m.pip_metric_id}`}
                  extra={<span style={{ fontSize: 12, color: '#059669' }}>✓ Synced from {m.metric_source}</span>}
                >
                  <InputNumber disabled style={{ width: '100%', color: '#1e293b', backgroundColor: '#f1f5f9' }} />
                </Form.Item>
              );
            }
          })}

          <Divider orientation="left">Review Summary</Divider>
          <Form.Item label="Overall Rating (1 to 5)" name="manager_progress_rating" rules={[{ required: true }]}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Manager Review Notes" name="manager_notes" rules={[{ required: true, message: 'Please log progress review notes' }]}>
            <Input.TextArea placeholder="Enter review notes, progress towards goals..." />
          </Form.Item>
          <Form.Item label="Action Items" name="action_items">
            <Input.TextArea placeholder="Log agreed actions for next review..." />
          </Form.Item>
          <Form.Item label="Risks Identified" name="risks">
            <Input.TextArea placeholder="List any performance blocks or support required..." />
          </Form.Item>
          <Form.Item label="Next Scheduled Meeting" name="next_meeting_date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>

      {/* --- HR Decision Modal --- */}
      <Modal
        title="Process Final PIP Decision"
        open={isDecisionModalOpen}
        onCancel={() => setIsDecisionModalOpen(false)}
        onOk={() => decisionForm.submit()}
      >
        <Form form={decisionForm} layout="vertical" onFinish={handleProcessDecision}>
          <Form.Item label="HR Decision Outcome" name="status" rules={[{ required: true }]}>
            <Select>
              {selectedPip?.is_monitoring ? (
                <>
                  <Option value="COMPLETED">Successfully Concluded (Close Monitoring)</Option>
                  <Option value="EXTENDED">Extend Monitoring Stage</Option>
                  <Option value="ESCALATED">Convert to Active PIP</Option>
                  <Option value="CANCELLED">Cancel Monitoring</Option>
                </>
              ) : (
                <>
                  <Option value="COMPLETED">Successfully Concluded (Close PIP)</Option>
                  <Option value="EXTENDED">Extend Duration (Extension)</Option>
                  <Option value="ESCALATED">Escalate Action (Disciplinary/Exit)</Option>
                  <Option value="CANCELLED">Cancel Program</Option>
                </>
              )}
            </Select>
          </Form.Item>
          
          {/* Conditional extension field */}
          <Form.Item 
            noStyle 
            shouldUpdate={(prev, curr) => prev.status !== curr.status}
          >
            {({ getFieldValue }) => getFieldValue('status') === 'EXTENDED' && (
              <Form.Item label="New Extension End Date" name="extension_end_date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            )}
          </Form.Item>
 
          <Form.Item label="HR Review Decision Remarks" name="remarks" rules={[{ required: true, message: 'Remarks are mandatory' }]}>
            <Input.TextArea placeholder="Record final remarks, outcomes, or next steps..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* --- Convert Monitoring to Active PIP Modal --- */}
      <Modal
        title="Convert Performance Monitoring to Active PIP"
        open={isConvertModalOpen}
        onCancel={() => setIsConvertModalOpen(false)}
        onOk={() => convertForm.submit()}
        width={720}
      >
        <Form 
          form={convertForm} 
          layout="vertical" 
          onFinish={handleConvertSubmit}
        >
          <Form.Item label="Select Plan Template" name="template_id">
            <Select 
              placeholder="Choose a metric template..." 
              onChange={handleConvertTemplateChange}
              allowClear
            >
              {templates.map(t => <Option key={t.template_id} value={t.template_id}>{t.name}</Option>)}
            </Select>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Start Date" name="start_date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="End Date" name="end_date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Check-in Frequency" name="checkin_frequency" rules={[{ required: true }]}>
            <Select>
              <Option value="WEEKLY">Weekly Check-in</Option>
              <Option value="BIWEEKLY">Bi-weekly Check-in</Option>
              <Option value="MONTHLY">Monthly Check-in</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Reason / Justification for Active PIP" name="reason" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Provide reasoning for conversion..." />
          </Form.Item>

          <Divider orientation="left">Define Metrics Target & Weights</Divider>
          <Form.List name="metrics">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'metric_name']}
                      rules={[{ required: true, message: 'Metric name required' }]}
                    >
                      <Input placeholder="Metric Name" style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'metric_source']}
                      rules={[{ required: true }]}
                    >
                      <Select style={{ width: 130 }}>
                        <Option value="MANUAL">Manual Input</Option>
                        <Option value="ATTENDANCE">Attendance %</Option>
                        <Option value="GOAL">Goals Progress</Option>
                        <Option value="KPI">KPI Target Completion</Option>
                        <Option value="COMPETENCY">Competency Rating</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'target_value']}
                      rules={[{ required: true }]}
                    >
                      <InputNumber placeholder="Target" style={{ width: 70 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'weight']}
                      rules={[{ required: true }]}
                    >
                      <InputNumber placeholder="Weight" style={{ width: 70 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'calculation_type']}
                      initialValue="HIGHER_IS_BETTER"
                    >
                      <Select style={{ width: 130 }}>
                        <Option value="HIGHER_IS_BETTER">Higher is Better</Option>
                        <Option value="LOWER_IS_BETTER">Lower is Better</Option>
                        <Option value="BOOLEAN">Boolean (Pass/Fail)</Option>
                        <Option value="PERCENTAGE">Percentage</Option>
                        <Option value="RATING">Rating (1-5)</Option>
                      </Select>
                    </Form.Item>
                    <Button type="text" onClick={() => remove(name)} icon={<FiTrash2 />} danger />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<FiPlus />}>Add Metric Row</Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* --- Manual Candidate Create Modal --- */}
      <Modal
        title="Add Candidate Queue (Manual)"
        open={isCandidateCreateModalOpen}
        onCancel={() => setIsCandidateCreateModalOpen(false)}
        onOk={() => candidateCreateForm.submit()}
      >
        <Form 
          form={candidateCreateForm} 
          layout="vertical" 
          onFinish={handleCreateManualCandidate}
          onValuesChange={async (changedValues) => {
            if (changedValues.employee_id) {
              const empId = changedValues.employee_id;
              setLoadingAppraisal(true);
              setSelectedEmpAppraisal(null);
              try {
                const res = await api.get(`/pip/employees/${empId}/latest-appraisal`);
                if (res.data?.success && res.data?.data) {
                  setSelectedEmpAppraisal(res.data.data);
                } else {
                  setSelectedEmpAppraisal(null);
                }
              } catch (err) {
                console.error("Failed to fetch appraisal", err);
              } finally {
                setLoadingAppraisal(false);
              }
            }
            if (changedValues.department_id !== undefined) {
              setSelectedDeptId(changedValues.department_id);
              candidateCreateForm.setFieldsValue({ employee_id: undefined });
              setSelectedEmpAppraisal(null);
            }
          }}
        >
          <Form.Item label="Select Department" name="department_id">
            <Select placeholder="Filter by Department..." allowClear showSearch optionFilterProp="children">
              {departments.map(d => <Option key={d.department_id} value={d.department_id}>{d.name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item label="Select Employee" name="employee_id" rules={[{ required: true }]}>
            <Select showSearch placeholder="Search employee..." optionFilterProp="children">
              {employees
                .filter(e => !selectedDeptId || e.department_id === selectedDeptId)
                .map(e => <Option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name} ({e.employee_code})</Option>)
              }
            </Select>
          </Form.Item>

          {loadingAppraisal && (
            <div style={{ marginBottom: 16 }}>
              <Spin size="small" /> <Text type="secondary">Fetching latest appraisal rating...</Text>
            </div>
          )}
          {!loadingAppraisal && selectedEmpAppraisal !== null && (
            <div style={{ marginBottom: 16 }}>
              <Alert 
                type="info" 
                showIcon 
                message={
                  <span>
                    <strong>Latest Appraisal Score:</strong> {parseFloat(selectedEmpAppraisal.final_score).toFixed(2)}%
                  </span>
                } 
              />
            </div>
          )}
          {!loadingAppraisal && selectedEmpAppraisal === null && candidateCreateForm.getFieldValue('employee_id') && (
            <div style={{ marginBottom: 16 }}>
              <Alert 
                type="warning" 
                showIcon 
                message={<span>No completed appraisal score found for this employee.</span>} 
              />
            </div>
          )}

          <Form.Item name="source" initialValue="MANUAL" hidden><Input /></Form.Item>
          <Form.Item label="Reason for PIP Candidate recommendation" name="recommendation_reason" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Provide reasoning for putting the employee on the Candidate Queue..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
