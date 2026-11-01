import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Select, Button, Space, Tag, Divider, Empty, Spin, message, Alert } from 'antd';
import {
  FiPlay, FiLock, FiUnlock, FiCheckCircle, FiUsers, FiSliders, FiCheck,
  FiGrid, FiLayers, FiArrowRight, FiInfo, FiActivity, FiStar, FiAlertCircle, FiGlobe
} from 'react-icons/fi';
import * as api from '../../api/bellCurve.api';
import BellCurveResults from './BellCurveResults';
import BellCurveOverrideModal from './BellCurveOverrideModal';

const { Title, Text, Paragraph } = Typography;

export default function BellCurveDashboard() {
  const [fys, setFys] = useState([]);
  const [selectedFyId, setSelectedFyId] = useState(null);
  
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(null);

  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);

  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [results, setResults] = useState([]);
  const [buckets, setBuckets] = useState([]);

  // Calibration Scope selectors state
  const [scopeType, setScopeType] = useState('ORGANIZATION');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [departments, setDepartments] = useState([]);

  // Active Workspace Sub-Tab ('board' or 'grid')
  const [workspaceTab, setWorkspaceTab] = useState('board');

  // Override modal state
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [overrideTargetBucketId, setOverrideTargetBucketId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [fyRes, configRes, cycleRes, deptRes] = await Promise.all([
        api.getFinancialYears(),
        api.listConfigurations(),
        api.getAppraisalCycles(),
        api.getDepartments()
      ]);

      setFys(fyRes.data || []);
      setConfigs(configRes.data || []);
      setDepartments(deptRes || []);

      if (configRes.data && configRes.data.length > 0) {
        const def = configRes.data.find(c => c.is_default) || configRes.data[0];
        setSelectedConfigId(def.configuration_id);
      }

      if (fyRes.data && fyRes.data.length > 0) {
        const activeFy = fyRes.data.find(f => f.is_active) || fyRes.data[0];
        setSelectedFyId(activeFy.financial_year_id);
        
        const cycleList = Array.isArray(cycleRes) ? cycleRes : (cycleRes.data || []);
        setCycles(cycleList);
        
        const closedCycle = cycleList.find(c => c.financial_year_id === activeFy.financial_year_id && c.status === 'closed');
        const defaultCycle = closedCycle || cycleList.find(c => c.financial_year_id === activeFy.financial_year_id) || cycleList[0];
        
        if (defaultCycle) {
          setSelectedCycleId(defaultCycle.appraisal_cycle_id);
          setSelectedCycle(defaultCycle);
          loadRunsForCycle(defaultCycle.appraisal_cycle_id);
        }
      }
    } catch (err) {
      message.error('Failed to load metadata filters.');
    } finally {
      setLoading(false);
    }
  };

  const handleFyChange = (fyId) => {
    setSelectedFyId(fyId);
    const matching = cycles.find(c => c.financial_year_id === fyId);
    if (matching) {
      setSelectedCycleId(matching.appraisal_cycle_id);
      setSelectedCycle(matching);
      loadRunsForCycle(matching.appraisal_cycle_id);
    } else {
      setSelectedCycleId(null);
      setSelectedCycle(null);
      setRuns([]);
      setSelectedRun(null);
      setResults([]);
    }
  };

  const handleCycleChange = (cycleId) => {
    setSelectedCycleId(cycleId);
    const cycle = cycles.find(c => c.appraisal_cycle_id === cycleId);
    setSelectedCycle(cycle);
    loadRunsForCycle(cycleId);
  };

  const loadRunsForCycle = async (cycleId) => {
    try {
      setLoadingResults(true);
      const runRes = await api.getRuns(cycleId);
      setRuns(runRes.data || []);
      if (runRes.data && runRes.data.length > 0) {
        handleSelectRun(runRes.data[0]);
      } else {
        setSelectedRun(null);
        setResults([]);
        setBuckets([]);
      }
    } catch (err) {
      message.error('Failed to load calibration run history.');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleSelectRun = async (run) => {
    setSelectedRun(run);
    try {
      setLoadingResults(true);
      const [resRes, bucketRes] = await Promise.all([
        api.getResults(run.run_id),
        api.getBuckets(run.configuration_id)
      ]);
      setResults(resRes.data || []);
      setBuckets(bucketRes.data || []);
    } catch (err) {
      message.error('Failed to load run details.');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleGenerateRun = async () => {
    if (!selectedCycleId) return;
    if (selectedCycle?.status !== 'closed') {
      message.error('Regeneration blocked: Appraisal cycle status must be Completed (Closed).');
      return;
    }
    if (!selectedConfigId) {
      message.warning('Please select a configuration template first.');
      return;
    }
    if (scopeType === 'DEPARTMENT' && !selectedDepartmentId) {
      message.warning('Please select a department for department-scoped calibration.');
      return;
    }

    try {
      setLoadingResults(true);
      const res = await api.generateBellCurve({
        cycleId: selectedCycleId,
        configId: selectedConfigId,
        scopeType,
        scopeReferenceId: scopeType === 'DEPARTMENT' ? selectedDepartmentId : null
      });
      message.success(`Bell Curve Run #${res.data.run_number} generated successfully.`);
      await loadRunsForCycle(selectedCycleId);
    } catch (err) {
      message.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedRun) return;
    try {
      setLoadingResults(true);
      await api.updateRunStatus(selectedRun.run_id, status);
      message.success(`Calibration Run status updated to ${status}.`);
      await loadRunsForCycle(selectedCycleId);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setLoadingResults(false);
    }
  };

  const refreshData = () => {
    if (selectedRun) {
      handleSelectRun(selectedRun);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e, resultId) => {
    if (selectedRun?.status === 'FROZEN' || selectedRun?.status === 'PUBLISHED') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', resultId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetBucketId) => {
    e.preventDefault();
    const resultId = e.dataTransfer.getData('text/plain');
    const employee = results.find(r => r.result_id === resultId);
    if (employee) {
      if (employee.current_bucket_id === targetBucketId) return; // same bucket
      setSelectedResult(employee);
      setOverrideTargetBucketId(targetBucketId);
      setOverrideModalVisible(true);
    }
  };

  // Calculations for KPI details & graphs
  const N = results.length;
  const overridesCount = results.filter(r => r.is_override).length;
  const pendingCalibrationCount = results.filter(r => r.current_bucket_id === null).length;

  const sortedScores = [...results].map(r => parseFloat(r.appraisal_score)).sort((a, b) => a - b);
  const highestScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1].toFixed(2) : '0.00';
  const lowestScore = sortedScores.length > 0 ? sortedScores[0].toFixed(2) : '0.00';
  
  const averageScore = sortedScores.length > 0
    ? (sortedScores.reduce((s, v) => s + v, 0) / sortedScores.length).toFixed(2)
    : '0.00';

  const mid = Math.floor(sortedScores.length / 2);
  const medianScore = sortedScores.length > 0
    ? (sortedScores.length % 2 !== 0 ? sortedScores[mid] : (sortedScores[mid - 1] + sortedScores[mid]) / 2).toFixed(2)
    : '0.00';

  const getDistributionStats = () => {
    if (!buckets.length) return [];
    return buckets.map(b => {
      const actualCount = results.filter(r => r.current_bucket_id === b.bucket_id).length;
      const actualPct = N > 0 ? (actualCount / N) * 100 : 0;
      return {
        bucket_id: b.bucket_id,
        name: b.bucket_name,
        color: b.color,
        targetPct: parseFloat(b.percentage),
        actualPct,
        actualCount,
        suggested_action: b.suggested_action
      };
    });
  };

  const distStats = getDistributionStats();

  const renderTargetVsActualChart = () => {
    if (!distStats.length) return null;

    const chartHeight = 240;
    const barWidth = 70;
    const gap = 50;
    const totalWidth = distStats.length * (barWidth * 2 + gap) + gap;

    return (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <svg viewBox={`0 0 ${totalWidth} ${chartHeight + 50}`} style={{ width: '90%', height: '280px' }}>
          {/* Axis Line */}
          <line x1="0" y1={chartHeight} x2={totalWidth} y2={chartHeight} stroke="#cbd5e1" strokeWidth="2" />
          
          {distStats.map((d, i) => {
            const x = i * (barWidth * 2 + gap) + gap;
            
            const targetH = (d.targetPct / 100) * (chartHeight - 40);
            const actualH = (d.actualPct / 100) * (chartHeight - 40);

            const targetY = chartHeight - targetH;
            const actualY = chartHeight - actualH;

            return (
              <g key={d.bucket_id}>
                {/* Target Ratio (dashed border box) */}
                <rect
                  x={x}
                  y={targetY}
                  width={barWidth}
                  height={targetH}
                  rx="6"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
                <rect
                  x={x}
                  y={targetY}
                  width={barWidth}
                  height={targetH}
                  rx="6"
                  fill="#94a3b8"
                  opacity="0.08"
                />
                <text
                  x={x + barWidth / 2}
                  y={targetY - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#94a3b8"
                >
                  T: {d.targetPct}%
                </text>

                {/* Actual Ratio (filled bar matching bucket theme color) */}
                <rect
                  x={x + barWidth}
                  y={actualY}
                  width={barWidth}
                  height={actualH}
                  rx="6"
                  fill={d.color}
                  opacity="0.9"
                  style={{ transition: 'all 0.4s ease' }}
                />
                <text
                  x={x + barWidth + barWidth / 2}
                  y={actualY - 8}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill={d.color}
                >
                  A: {d.actualPct.toFixed(1)}%
                </text>

                {/* Legend/Name tag */}
                <text
                  x={x + barWidth}
                  y={chartHeight + 24}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="800"
                  fill="#001233"
                >
                  {d.name}
                </text>
                <text
                  x={x + barWidth}
                  y={chartHeight + 40}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#7D8597"
                >
                  Count: {d.actualCount}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        
        {/* Step-based Top Toolbar */}
        <Card style={{ borderRadius: 16, border: '1px solid #E3E7EE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', background: '#fff' }}>
          {/* Calibration Scope selector row */}
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px dashed #E3E7EE', paddingBottom: 16 }}>
            <div>
              <Text style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Calibration Scope</Text>
              <Select
                value={scopeType}
                onChange={(val) => {
                  setScopeType(val);
                  if (val === 'ORGANIZATION') setSelectedDepartmentId(null);
                }}
                style={{ width: 180 }}
                options={[
                  { value: 'ORGANIZATION', label: <Space><FiGlobe style={{ verticalAlign: 'middle', color: '#0466C8' }} /> Organization</Space> },
                  { value: 'DEPARTMENT', label: <Space><FiLayers style={{ verticalAlign: 'middle', color: '#0f766e' }} /> Department</Space> }
                ]}
              />
            </div>
            {scopeType === 'DEPARTMENT' && (
              <div>
                <Text style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Department</Text>
                <Select
                  placeholder="Select department..."
                  value={selectedDepartmentId}
                  onChange={(val) => setSelectedDepartmentId(val)}
                  style={{ width: 240 }}
                  options={departments.map(d => ({ value: d.department_id, label: d.name }))}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0466C8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                1
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Financial Year</Text>
                <Select
                  value={selectedFyId}
                  onChange={handleFyChange}
                  style={{ width: '100%', marginTop: 2 }}
                  options={fys.map(f => ({ value: f.financial_year_id, label: f.name }))}
                />
              </div>
            </div>

            <FiArrowRight style={{ color: '#cbd5e1' }} size={16} />

            {/* Step 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0466C8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                2
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Appraisal Cycle</Text>
                <Select
                  value={selectedCycleId}
                  onChange={handleCycleChange}
                  style={{ width: '100%', marginTop: 2 }}
                  options={cycles
                    .filter(c => c.financial_year_id === selectedFyId)
                    .map(c => ({
                      value: c.appraisal_cycle_id,
                      label: `${c.name} (${c.status === 'closed' ? 'Completed' : c.status})`
                    }))}
                />
              </div>
            </div>

            <FiArrowRight style={{ color: '#cbd5e1' }} size={16} />

            {/* Step 3 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0466C8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                3
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Config Template</Text>
                <Select
                  value={selectedConfigId}
                  onChange={(val) => setSelectedConfigId(val)}
                  style={{ width: '100%', marginTop: 2 }}
                  options={configs.map(c => ({ value: c.configuration_id, label: c.name }))}
                />
              </div>
            </div>

            <FiArrowRight style={{ color: '#cbd5e1' }} size={16} />

            {/* Step 4 */}
            <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'flex-end', height: '100%' }}>
              <Button
                type="primary"
                icon={<FiPlay />}
                onClick={handleGenerateRun}
                disabled={selectedCycle?.status !== 'closed'}
                style={{ width: '100%', height: 38, borderRadius: 8, background: '#0466C8', borderColor: '#0466C8', fontWeight: 700 }}
              >
                Generate Bell Curve
              </Button>
            </div>
          </div>

          {selectedCycle && selectedCycle.status !== 'closed' && (
            <Alert
              message="Appraisal Cycle is Not Completed"
              description="Forced ranking calibration can only be triggered after the active appraisal cycle is completed and finalized."
              type="warning"
              showIcon
              style={{ marginTop: 16, borderRadius: 8 }}
            />
          )}
        </Card>

        {/* Selected Run Calibration Workspace */}
        <Spin spinning={loadingResults}>
          {selectedRun ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              
              {/* Distribution Cards */}
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {distStats.map((d) => (
                  <div
                    key={d.bucket_id}
                    style={{
                      flex: '1 1 180px', minWidth: 160, background: '#fff',
                      borderRadius: 14, padding: '16px 20px', borderLeft: `6px solid ${d.color}`,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', borderTop: '1px solid #F1F4F8',
                      borderRight: '1px solid #F1F4F8', borderBottom: '1px solid #F1F4F8'
                    }}
                  >
                    <Text style={{ display: 'block', fontSize: 12, color: '#7D8597', fontWeight: 700 }}>{d.name}</Text>
                    <div style={{ margin: '8px 0', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <Text style={{ fontSize: 24, fontWeight: 800, color: '#001233' }}>{d.actualCount}</Text>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>Employees</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      <span>Target: {d.targetPct}%</span>
                      <span style={{ color: d.color, fontWeight: 800 }}>Actual: {d.actualPct.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bell Curve Hero Section */}
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiActivity size={18} style={{ color: '#0466C8' }} />
                    <span style={{ fontWeight: 800 }}>Strategic Distribution & Calibration Metrics</span>
                  </div>
                }
                style={{ borderRadius: 16, border: '1px solid #E3E7EE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
              >
                <Row gutter={24} align="middle">
                  {/* Visual Bell Curve SVG (Left) */}
                  <Col xs={24} lg={15}>
                    {renderTargetVsActualChart()}
                  </Col>

                  {/* Detailed Run Stats Grid (Right) */}
                  <Col xs={24} lg={9} style={{ borderLeft: '1px solid #E3E7EE', paddingLeft: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Text style={{ fontWeight: 800, fontSize: 14, color: '#33415C' }}>Calibration Run Parameters</Text>
                      <Select
                        value={selectedRun.run_id}
                        onChange={(runId) => handleSelectRun(runs.find(r => r.run_id === runId))}
                        style={{ width: 130 }}
                        options={runs.map(r => ({ value: r.run_id, label: `Run #${r.run_number}` }))}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 12px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>CALIBRATION SCOPE</Text>
                        <Text style={{ fontSize: 13, fontWeight: 800, color: '#0353A4' }}>
                          {selectedRun.scope_type === 'DEPARTMENT' ? (
                            <Space><FiLayers style={{ verticalAlign: 'middle', color: '#0f766e' }} /> Department: {selectedRun.department_name || '—'}</Space>
                          ) : (
                            <Space><FiGlobe style={{ verticalAlign: 'middle', color: '#0466C8' }} /> Organization</Space>
                          )}
                        </Text>
                      </div>

                      <div>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>RUN STATUS</Text>
                        <Tag color={selectedRun.status === 'FROZEN' ? 'blue' : selectedRun.status === 'PUBLISHED' ? 'green' : 'orange'} style={{ margin: '4px 0 0 0', fontWeight: 700, borderRadius: 6 }}>
                          {selectedRun.status}
                        </Tag>
                      </div>

                      <div>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>TIE STRATEGY</Text>
                        <Text style={{ fontSize: 12, fontWeight: 700, color: '#001233' }}>
                          {selectedRun.tie_strategy || 'Include All'}
                        </Text>
                      </div>

                      <div>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>GENERATED BY</Text>
                        <Text style={{ fontSize: 12, fontWeight: 700, color: '#001233' }}>{selectedRun.generated_by_email || 'HR Admin'}</Text>
                      </div>

                      <div>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>GENERATED ON</Text>
                        <Text style={{ fontSize: 12, fontWeight: 700, color: '#001233' }}>
                          {new Date(selectedRun.generated_at).toLocaleDateString()}
                        </Text>
                      </div>

                      <div>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>HIGHEST SCORE</Text>
                        <Text style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>{highestScore}%</Text>
                      </div>

                      <div>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>LOWEST SCORE</Text>
                        <Text style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{lowestScore}%</Text>
                      </div>

                      <div>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>AVERAGE SCORE</Text>
                        <Text style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>{averageScore}%</Text>
                      </div>

                      <div>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', fontWeight: 700 }}>MEDIAN SCORE</Text>
                        <Text style={{ fontSize: 14, fontWeight: 800, color: '#8b5cf6' }}>{medianScore}%</Text>
                      </div>
                    </div>

                    <Divider style={{ margin: '14px 0' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <Text style={{ color: '#7D8597' }}>Pending Calibration:</Text>
                        <Text style={{ fontWeight: 800, color: pendingCalibrationCount > 0 ? '#f59e0b' : '#10b981' }}>
                          {pendingCalibrationCount} employees
                        </Text>
                      </div>

                      {/* State management actions */}
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        {selectedRun.status === 'DRAFT' && (
                          <Button
                            type="primary" icon={<FiLock />} onClick={() => handleUpdateStatus('FROZEN')}
                            style={{ background: '#3b82f6', borderColor: '#3b82f6', borderRadius: 8, height: 36, flex: 1 }}
                          >
                            Freeze Run
                          </Button>
                        )}
                        {selectedRun.status === 'FROZEN' && (
                          <>
                            <Button
                              type="primary" icon={<FiCheckCircle />} onClick={() => handleUpdateStatus('PUBLISHED')}
                              style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 8, height: 36, flex: 1 }}
                            >
                              Publish Run
                            </Button>
                            <Button
                              icon={<FiUnlock />} onClick={() => handleUpdateStatus('DRAFT')}
                              style={{ borderRadius: 8, height: 36 }}
                            />
                          </>
                        )}
                        {selectedRun.status === 'PUBLISHED' && (
                          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700, padding: 8, background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', fontSize: 12 }}>
                            <FiCheck size={16} /> Results Published successfully.
                          </div>
                        )}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Bucket Legend */}
              <Card style={{ borderRadius: 16, border: '1px solid #E3E7EE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', background: '#f8fafc', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><FiInfo style={{ color: '#0466C8' }} /> <Text style={{ fontWeight: 800, fontSize: 13, color: '#33415C' }}>Bucket Calibration Actions Legend</Text></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
                  {buckets.map(b => (
                    <div key={b.bucket_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, background: b.color, borderRadius: '50%' }} />
                      <Text style={{ fontWeight: 700, fontSize: 12, color: '#001233' }}>{b.bucket_name}:</Text>
                      <Text style={{ fontSize: 11, color: '#7D8597' }}>{b.suggested_action || 'No action specified'}</Text>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Segmented Workspace Selector */}
              <div style={{ display: 'flex', background: '#E3E7EE', padding: 4, borderRadius: 10, alignSelf: 'flex-start' }}>
                <button
                  onClick={() => setWorkspaceTab('board')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: workspaceTab === 'board' ? '#fff' : 'transparent',
                    color: workspaceTab === 'board' ? '#0466C8' : '#7D8597',
                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                  }}
                >
                  <FiLayers size={15} /> Drag & Drop Board
                </button>
                <button
                  onClick={() => setWorkspaceTab('grid')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: workspaceTab === 'grid' ? '#fff' : 'transparent',
                    color: workspaceTab === 'grid' ? '#0466C8' : '#7D8597',
                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                  }}
                >
                  <FiGrid size={15} /> Calibration worksheet
                </button>
              </div>

              {/* Workspace Content */}
              {workspaceTab === 'board' ? (
                /* Dynamic Drag & Drop Calibration Board */
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', minHeight: 450, paddingBottom: 16 }}>
                  {buckets.map(b => {
                    const colResults = results.filter(r => r.current_bucket_id === b.bucket_id);
                    return (
                      <div
                        key={b.bucket_id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, b.bucket_id)}
                        style={{
                          flex: '1 0 260px', background: '#F1F4F8', borderRadius: 16,
                          padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                          border: '2px dashed transparent', transition: 'all 0.2s'
                        }}
                      >
                        {/* Column Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, background: b.color, borderRadius: '50%' }} />
                            <Text style={{ fontWeight: 800, color: '#001233', fontSize: 13 }}>{b.bucket_name}</Text>
                          </div>
                          <Tag color="default" style={{ borderRadius: 6, margin: 0, fontWeight: 700 }}>
                            {colResults.length}
                          </Tag>
                        </div>
                        
                        <Divider style={{ margin: '4px 0' }} />

                        {/* Draggable Cards list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
                          {colResults.map(r => (
                            <div
                              key={r.result_id}
                              draggable={selectedRun.status === 'DRAFT'}
                              onDragStart={(e) => handleDragStart(e, r.result_id)}
                              onClick={() => handleOpenOverrideModal(r)}
                              style={{
                                background: '#fff', borderRadius: 12, padding: '14px 16px',
                                border: r.is_override ? `1.5px solid ${b.color}` : '1px solid #E3E7EE',
                                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', cursor: selectedRun.status === 'DRAFT' ? 'grab' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Text style={{ fontWeight: 700, color: '#33415C', fontSize: 13 }}>
                                  {r.first_name} {r.last_name}
                                </Text>
                                <Tag color="indigo" style={{ fontSize: 11, fontWeight: 800, margin: 0, borderRadius: 6, background: 'rgba(4, 102, 200,0.08)', color: '#0466C8' }}>
                                  {r.appraisal_score}
                                </Tag>
                              </div>
                              <Text style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                {r.employee_code} · {r.designation}
                              </Text>

                              {r.is_override && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                                  <FiStar size={11} style={{ color: b.color }} />
                                  <Text style={{ fontSize: 10, color: b.color, fontWeight: 800 }}>Calibrated Override</Text>
                                </div>
                              )}
                            </div>
                          ))}
                          {colResults.length === 0 && (
                            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, padding: '32px 0' }}>
                              Drop employees here
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Manual Review Pending ties column (if using MANUAL_REVIEW tie strategy) */}
                  {selectedRun.tie_strategy === 'MANUAL_REVIEW' && (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, null)}
                      style={{
                        flex: '1 0 260px', background: 'rgba(245,158,11,0.05)', borderRadius: 16,
                        padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                        border: '2px dashed #f59e0b', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FiAlertCircle style={{ color: '#f59e0b' }} />
                          <Text style={{ fontWeight: 800, color: '#b45309', fontSize: 13 }}>Tied - Action Required</Text>
                        </div>
                        <Tag color="warning" style={{ borderRadius: 6, margin: 0, fontWeight: 700 }}>
                          {results.filter(r => r.current_bucket_id === null).length}
                        </Tag>
                      </div>

                      <Divider style={{ margin: '4px 0', borderColor: '#f59e0b' }} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
                        {results.filter(r => r.current_bucket_id === null).map(r => (
                          <div
                            key={r.result_id}
                            draggable={selectedRun.status === 'DRAFT'}
                            onDragStart={(e) => handleDragStart(e, r.result_id)}
                            onClick={() => handleOpenOverrideModal(r)}
                            style={{
                              background: '#fff', borderRadius: 12, padding: '14px 16px',
                              border: '1px solid #f59e0b', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                              cursor: selectedRun.status === 'DRAFT' ? 'grab' : 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Text style={{ fontWeight: 700, color: '#33415C', fontSize: 13 }}>
                                {r.first_name} {r.last_name}
                              </Text>
                              <Tag color="warning" style={{ fontSize: 11, fontWeight: 800, margin: 0, borderRadius: 6 }}>
                                {r.appraisal_score}
                              </Tag>
                            </div>
                            <Text style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                              {r.employee_code} · {r.designation}
                            </Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Calibration Spreadsheet Table View */
                <BellCurveResults
                  run={selectedRun}
                  results={results}
                  buckets={buckets}
                  onOverride={refreshData}
                />
              )}

            </div>
          ) : (
            <Card style={{ borderRadius: 16, padding: '72px 0', textAlign: 'center', border: '1px solid #E3E7EE' }}>
              <FiSliders size={48} style={{ color: '#94a3b8', marginBottom: 16 }} />
              <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#33415C' }}>No Calibration Run History</Title>
              <Paragraph style={{ color: '#94a3b8', marginTop: 8, maxWidth: 360, marginInline: 'auto' }}>
                There are no calibration records computed for this appraisal cycle. Select a template and click "Generate Bell Curve" to start.
              </Paragraph>
              <Button
                type="primary"
                icon={<FiPlay />}
                onClick={handleGenerateRun}
                disabled={selectedCycle?.status !== 'closed'}
                style={{ marginTop: 16, height: 40, borderRadius: 8, background: '#0466C8', borderColor: '#0466C8' }}
              >
                Generate First Calibration Run
              </Button>
            </Card>
          )}
        </Spin>

        {/* Drag-and-Drop Drop Trigger Override Modal */}
        {overrideModalVisible && (
          <BellCurveOverrideModal
            visible={overrideModalVisible}
            result={selectedResult}
            buckets={buckets}
            targetBucketId={overrideTargetBucketId}
            onClose={() => {
              setOverrideModalVisible(false);
              setSelectedResult(null);
              setOverrideTargetBucketId(null);
            }}
            onSave={() => {
              setOverrideModalVisible(false);
              setSelectedResult(null);
              setOverrideTargetBucketId(null);
              refreshData();
            }}
          />
        )}

      </div>
    </Spin>
  );
}
