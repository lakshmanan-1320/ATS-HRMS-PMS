import React, { useState, useEffect } from 'react';
import { Card, Typography, InputNumber, Switch, Button, Alert, message, Select, Row, Col } from 'antd';
import { useContinuousFeedbackStore } from '../continuous-feedback/store/continuousFeedback.store';

const { Title, Paragraph } = Typography;

export default function TechniqueConfigurationPage() {
  const [selectedTechnique, setSelectedTechnique] = useState('CONTINUOUS_FEEDBACK');
  
  // Continuous Feedback Weights state
  const [reflectionWeight, setReflectionWeight] = useState(20);
  const [reflectionEnabled, setReflectionEnabled] = useState(true);

  const [feedbackWeight, setFeedbackWeight] = useState(20);
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);

  const [actionsWeight, setActionsWeight] = useState(40);
  const [actionsEnabled, setActionsEnabled] = useState(true);

  const [closureWeight, setClosureWeight] = useState(20);
  const [closureEnabled, setClosureEnabled] = useState(true);

  // 360 Feedback settings state
  const [allowManager, setAllowManager] = useState(true);
  const [managerMinRequired, setManagerMinRequired] = useState(1);
  const [managerWeight, setManagerWeight] = useState(40);

  const [allowPeers, setAllowPeers] = useState(true);
  const [peerMinRequired, setPeerMinRequired] = useState(2);
  const [peerWeight, setPeerWeight] = useState(40);

  const [allowDirectReports, setAllowDirectReports] = useState(true);
  const [directReportMinRequired, setDirectReportMinRequired] = useState(1);
  const [directReportWeight, setDirectReportWeight] = useState(20);

  const [anonymousEnabled, setAnonymousEnabled] = useState(false);
  const [minimumCompletionPercentage, setMinimumCompletionPercentage] = useState(100);
  const [reminderIntervalDays, setReminderIntervalDays] = useState(3);
  const [lateSubmissionPolicy, setLateSubmissionPolicy] = useState('BLOCK');

  const [saving, setSaving] = useState(false);

  // KPI settings state
  const [measurementTypes, setMeasurementTypes] = useState(['NUMBER', 'PERCENTAGE', 'CURRENCY', 'BOOLEAN', 'TEXT']);
  const [units, setUnits] = useState(['%', '₹', '$', 'Units', 'Hours', 'Days', 'Customers', 'Leads']);
  const [kpiTypes, setKpiTypes] = useState(['OUTCOME', 'OUTPUT', 'EFFICIENCY', 'QUALITY', 'LEADING', 'LAGGING']);
  const [frequencies, setFrequencies] = useState(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
  const [priorities, setPriorities] = useState(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

  const [newUnit, setNewUnit] = useState('');
  const [newKpiType, setNewKpiType] = useState('');
  const [newFrequency, setNewFrequency] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newMeasurementType, setNewMeasurementType] = useState('');

  const { techniqueConfigs, fetchTechniqueConfiguration, saveTechniqueConfiguration } = useContinuousFeedbackStore();

  useEffect(() => {
    fetchTechniqueConfiguration(selectedTechnique);
  }, [fetchTechniqueConfiguration, selectedTechnique]);

  // Sync state from store when loaded
  useEffect(() => {
    const config = techniqueConfigs[selectedTechnique];
    if (selectedTechnique === 'CONTINUOUS_FEEDBACK' && config) {
      setReflectionWeight(config.reflection?.weight ?? 20);
      setReflectionEnabled(config.reflection?.enabled ?? true);

      setFeedbackWeight(config.manager_feedback?.weight ?? 20);
      setFeedbackEnabled(config.manager_feedback?.enabled ?? true);

      setActionsWeight(config.verified_action_items?.weight ?? 40);
      setActionsEnabled(config.verified_action_items?.enabled ?? true);

      setClosureWeight(config.goal_closure?.weight ?? 20);
      setClosureEnabled(config.goal_closure?.enabled ?? true);
    } else if (selectedTechnique === '360_FEEDBACK' && config) {
      setAllowManager(config.allow_manager ?? true);
      setManagerMinRequired(config.manager_count ?? 1);
      setManagerWeight(config.manager_weight ?? 40);

      setAllowPeers(config.allow_peers ?? true);
      setPeerMinRequired(config.peer_count ?? 2);
      setPeerWeight(config.peer_weight ?? 40);

      setAllowDirectReports(config.allow_direct_reports ?? true);
      setDirectReportMinRequired(config.direct_report_count ?? 1);
      setDirectReportWeight(config.direct_report_weight ?? 20);

      setAnonymousEnabled(config.anonymous_enabled ?? false);
      setMinimumCompletionPercentage(config.minimum_completion_percentage ?? 100);
      setReminderIntervalDays(config.reminder_interval_days ?? 3);
      setLateSubmissionPolicy(config.late_submission_policy ?? 'BLOCK');
    } else if (selectedTechnique === 'KPI' && config) {
      setMeasurementTypes(config.measurement_types ?? ['NUMBER', 'PERCENTAGE', 'CURRENCY', 'BOOLEAN', 'TEXT']);
      setUnits(config.units ?? ['%', '₹', '$', 'Units', 'Hours', 'Days', 'Customers', 'Leads']);
      setKpiTypes(config.kpi_types ?? ['OUTCOME', 'OUTPUT', 'EFFICIENCY', 'QUALITY', 'LEADING', 'LAGGING']);
      setFrequencies(config.frequencies ?? ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
      setPriorities(config.priorities ?? ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    }
  }, [techniqueConfigs, selectedTechnique]);

  // Continuous Feedback totals
  const totalWeight = 
    (reflectionEnabled ? reflectionWeight : 0) +
    (feedbackEnabled ? feedbackWeight : 0) +
    (actionsEnabled ? actionsWeight : 0) +
    (closureEnabled ? closureWeight : 0);

  const isTotalValid = totalWeight === 100;

  // 360 Feedback totals
  const total360Weight = 
    (allowManager ? managerWeight : 0) +
    (allowPeers ? peerWeight : 0) +
    (allowDirectReports ? directReportWeight : 0);

  const is360WeightValid = total360Weight === 100;

  const handleSave = async () => {
    if (selectedTechnique === 'CONTINUOUS_FEEDBACK') {
      if (!isTotalValid) {
        message.error(`Total weight must sum to exactly 100%. Current total is ${totalWeight}%`);
        return;
      }
      setSaving(true);
      try {
        const configJson = {
          reflection: { enabled: reflectionEnabled, weight: reflectionEnabled ? reflectionWeight : 0 },
          manager_feedback: { enabled: feedbackEnabled, weight: feedbackEnabled ? feedbackWeight : 0 },
          verified_action_items: { enabled: actionsEnabled, weight: actionsEnabled ? actionsWeight : 0 },
          goal_closure: { enabled: closureEnabled, weight: closureEnabled ? closureWeight : 0 }
        };
        await saveTechniqueConfiguration('CONTINUOUS_FEEDBACK', configJson);
        message.success('Measurement Technique configuration saved successfully.');
      } catch (e) {
        message.error(e.message || 'Failed to save configuration');
      } finally {
        setSaving(false);
      }
    } else if (selectedTechnique === '360_FEEDBACK') {
      if (!is360WeightValid) {
        message.error(`Total reviewer weight must sum to exactly 100%. Current total is ${total360Weight}%`);
        return;
      }
      setSaving(true);
      try {
        const configJson = {
          allow_manager: allowManager,
          manager_count: allowManager ? managerMinRequired : 1,
          manager_weight: allowManager ? managerWeight : 0,
          allow_peers: allowPeers,
          peer_count: allowPeers ? peerMinRequired : 2,
          peer_weight: allowPeers ? peerWeight : 0,
          allow_direct_reports: allowDirectReports,
          direct_report_count: allowDirectReports ? directReportMinRequired : 1,
          direct_report_weight: allowDirectReports ? directReportWeight : 0,
          anonymous_enabled: anonymousEnabled,
          minimum_completion_percentage: minimumCompletionPercentage,
          reminder_interval_days: reminderIntervalDays,
          late_submission_policy: lateSubmissionPolicy
        };
        await saveTechniqueConfiguration('360_FEEDBACK', configJson);
        message.success('360° Feedback configuration saved successfully.');
      } catch (e) {
        message.error(e.message || 'Failed to save configuration');
      } finally {
        setSaving(false);
      }
    } else if (selectedTechnique === 'KPI') {
      setSaving(true);
      try {
        const configJson = {
          measurement_types: measurementTypes,
          units: units,
          kpi_types: kpiTypes,
          frequencies: frequencies,
          priorities: priorities
        };
        await saveTechniqueConfiguration('KPI', configJson);
        message.success('KPI option lists saved successfully.');
      } catch (e) {
        message.error(e.message || 'Failed to save configuration');
      } finally {
        setSaving(false);
      }
    }
  };
  return (
    <Card style={{ borderRadius: 16, border: '1px solid #E3E7EE', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Measurement Technique Configuration</Title>
        <Paragraph type="secondary" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
          Configure dynamic measurement rules and progress weights per performance technique.
        </Paragraph>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#33415C' }}>Select Performance Technique:</span>
        <Select
          value={selectedTechnique}
          onChange={setSelectedTechnique}
          style={{ width: 220 }}
          options={[
            { value: 'CONTINUOUS_FEEDBACK', label: 'Continuous Feedback' },
            { value: '360_FEEDBACK', label: '360° Feedback' },
            { value: 'KPI', label: 'KPI Settings' }
          ]}
        />
      </div>

      {selectedTechnique === 'CONTINUOUS_FEEDBACK' && (
        <div>
          <Title level={5} style={{ fontSize: 14, fontWeight: 700, color: '#33415C', marginBottom: 16 }}>
            Continuous Feedback Progress Weights
          </Title>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {/* Reflection Submission Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#001233', display: 'block' }}>Reflection Submission</strong>
                <span style={{ fontSize: 11, color: '#7D8597' }}>Employee submits self-reflection answers</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Required:</span>
                <Switch checked={reflectionEnabled} onChange={setReflectionEnabled} size="small" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Weight:</span>
                <InputNumber
                  min={0}
                  max={100}
                  value={reflectionWeight}
                  onChange={setReflectionWeight}
                  disabled={!reflectionEnabled}
                  formatter={value => `${value}%`}
                  parser={value => value.replace('%', '')}
                  style={{ width: 80 }}
                />
              </div>
            </div>

            {/* Manager Coaching Feedback Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#001233', display: 'block' }}>Manager Coaching Feedback</strong>
                <span style={{ fontSize: 11, color: '#7D8597' }}>Manager posts at least one coaching note</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Required:</span>
                <Switch checked={feedbackEnabled} onChange={setFeedbackEnabled} size="small" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Weight:</span>
                <InputNumber
                  min={0}
                  max={100}
                  value={feedbackWeight}
                  onChange={setFeedbackWeight}
                  disabled={!feedbackEnabled}
                  formatter={value => `${value}%`}
                  parser={value => value.replace('%', '')}
                  style={{ width: 80 }}
                />
              </div>
            </div>

            {/* Verified Action Items Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#001233', display: 'block' }}>Verified Action Items</strong>
                <span style={{ fontSize: 11, color: '#7D8597' }}>Assigned action items are verified by the manager</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Required:</span>
                <Switch checked={actionsEnabled} onChange={setActionsEnabled} size="small" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Weight:</span>
                <InputNumber
                  min={0}
                  max={100}
                  value={actionsWeight}
                  onChange={setActionsWeight}
                  disabled={!actionsEnabled}
                  formatter={value => `${value}%`}
                  parser={value => value.replace('%', '')}
                  style={{ width: 80 }}
                />
              </div>
            </div>

            {/* Goal Closure Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#001233', display: 'block' }}>Manager Final Goal Closure</strong>
                <span style={{ fontSize: 11, color: '#7D8597' }}>Manager finalizes cycle by marking assignment completed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Required:</span>
                <Switch checked={closureEnabled} onChange={setClosureEnabled} size="small" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Weight:</span>
                <InputNumber
                  min={0}
                  max={100}
                  value={closureWeight}
                  onChange={setClosureWeight}
                  disabled={!closureEnabled}
                  formatter={value => `${value}%`}
                  parser={value => value.replace('%', '')}
                  style={{ width: 80 }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    Total Configuration Weight: <strong>{totalWeight}%</strong>
                  </span>
                  {!isTotalValid && (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                      Total weight must equal exactly 100%!
                    </span>
                  )}
                </div>
              }
              type={isTotalValid ? 'success' : 'error'}
              showIcon
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              disabled={!isTotalValid || saving}
              onClick={handleSave}
              style={{ background: isTotalValid ? '#0466C8' : '#cbd5e1', border: 'none', height: 40, padding: '0 24px', borderRadius: 8, fontWeight: 700 }}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      )}

      {selectedTechnique === '360_FEEDBACK' && (
        <div>
          <Title level={5} style={{ fontSize: 14, fontWeight: 700, color: '#33415C', marginBottom: 16 }}>
            Reviewer Configuration & Weights
          </Title>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {/* Manager Review */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 0.8fr 1fr', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#001233', display: 'block' }}>Manager Review</strong>
                <span style={{ fontSize: 11, color: '#7D8597' }}>Allow direct manager to submit feedback</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Enabled:</span>
                <Switch checked={allowManager} onChange={setAllowManager} size="small" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#33415C' }}>Min Req:</span>
                  <InputNumber
                    min={0}
                    value={managerMinRequired}
                    onChange={setManagerMinRequired}
                    disabled={!allowManager}
                    style={{ width: 60 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#33415C' }}>Weight:</span>
                  <InputNumber
                    min={0}
                    max={100}
                    value={managerWeight}
                    onChange={setManagerWeight}
                    disabled={!allowManager}
                    formatter={value => `${value}%`}
                    parser={value => value.replace('%', '')}
                    style={{ width: 80 }}
                  />
                </div>
              </div>
            </div>

            {/* Peer Reviews */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 0.8fr 1fr', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#001233', display: 'block' }}>Peer Reviews</strong>
                <span style={{ fontSize: 11, color: '#7D8597' }}>Allow colleagues/peers to submit feedback</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Enabled:</span>
                <Switch checked={allowPeers} onChange={setAllowPeers} size="small" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#33415C' }}>Min Req:</span>
                  <InputNumber
                    min={0}
                    value={peerMinRequired}
                    onChange={setPeerMinRequired}
                    disabled={!allowPeers}
                    style={{ width: 60 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#33415C' }}>Weight:</span>
                  <InputNumber
                    min={0}
                    max={100}
                    value={peerWeight}
                    onChange={setPeerWeight}
                    disabled={!allowPeers}
                    formatter={value => `${value}%`}
                    parser={value => value.replace('%', '')}
                    style={{ width: 80 }}
                  />
                </div>
              </div>
            </div>

            {/* Direct Report Reviews */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 0.8fr 1fr', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#001233', display: 'block' }}>Direct Report Reviews</strong>
                <span style={{ fontSize: 11, color: '#7D8597' }}>Allow subordinates/direct reports to submit feedback</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#33415C' }}>Enabled:</span>
                <Switch checked={allowDirectReports} onChange={setAllowDirectReports} size="small" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#33415C' }}>Min Req:</span>
                  <InputNumber
                    min={0}
                    value={directReportMinRequired}
                    onChange={setDirectReportMinRequired}
                    disabled={!allowDirectReports}
                    style={{ width: 60 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#33415C' }}>Weight:</span>
                  <InputNumber
                    min={0}
                    max={100}
                    value={directReportWeight}
                    onChange={setDirectReportWeight}
                    disabled={!allowDirectReports}
                    formatter={value => `${value}%`}
                    parser={value => value.replace('%', '')}
                    style={{ width: 80 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <Title level={5} style={{ fontSize: 14, fontWeight: 700, color: '#33415C', marginBottom: 16 }}>
            360° Review Rules & Policies
          </Title>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#33415C', display: 'block', marginBottom: 6 }}>ANONYMOUS FEEDBACK</span>
              <Select
                value={anonymousEnabled ? 'true' : 'false'}
                onChange={val => setAnonymousEnabled(val === 'true')}
                style={{ width: '100%' }}
                options={[
                  { value: 'false', label: 'No (Reviewer identities are visible)' },
                  { value: 'true', label: 'Yes (Reviewer identities are hidden)' }
                ]}
              />
            </div>

            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#33415C', display: 'block', marginBottom: 6 }}>MINIMUM COMPLETION RATE FOR FINALIZATION</span>
              <Select
                value={minimumCompletionPercentage}
                onChange={val => setMinimumCompletionPercentage(val)}
                style={{ width: '100%' }}
                options={[
                  { value: 100, label: '100% of reviewers must submit' },
                  { value: 75, label: 'At least 75% must submit' },
                  { value: 50, label: 'At least 50% must submit' },
                  { value: 0, label: 'Finalize allowed with any reviews' }
                ]}
              />
            </div>

            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#33415C', display: 'block', marginBottom: 6 }}>REMINDER FREQUENCY (DAYS)</span>
              <InputNumber
                min={1}
                value={reminderIntervalDays}
                onChange={val => setReminderIntervalDays(val || 3)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#33415C', display: 'block', marginBottom: 6 }}>LATE SUBMISSION POLICY</span>
              <Select
                value={lateSubmissionPolicy}
                onChange={val => setLateSubmissionPolicy(val)}
                style={{ width: '100%' }}
                options={[
                  { value: 'BLOCK', label: 'Block submission after deadline' },
                  { value: 'ALLOW', label: 'Allow late submissions with warnings' }
                ]}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    Total Reviewer Weight: <strong>{total360Weight}%</strong>
                  </span>
                  {!is360WeightValid && (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                      Total weight must equal exactly 100%!
                    </span>
                  )}
                </div>
              }
              type={is360WeightValid ? 'success' : 'error'}
              showIcon
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              disabled={!is360WeightValid || saving}
              onClick={handleSave}
              style={{ background: is360WeightValid ? '#0466C8' : '#cbd5e1', border: 'none', height: 40, padding: '0 24px', borderRadius: 8, fontWeight: 700 }}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      )}

      {selectedTechnique === 'KPI' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <Title level={5} style={{ fontSize: 14, fontWeight: 700, color: '#33415C', marginBottom: 6 }}>
              📈 KPI Options Configurations
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 11, color: '#7D8597', margin: 0 }}>
              Define options available for Goal KPIs. Reused dynamically during goal setup dropdowns.
            </Paragraph>
          </div>

          <Row gutter={[16, 16]}>
            {/* Measurement Types */}
            <Col xs={24} md={12}>
              <Card title={<span style={{ fontSize: 13, fontWeight: 700 }}>Allowed Measurement Types</span>} size="small" style={{ borderRadius: 10, border: '1px solid #E3E7EE' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 40 }}>
                  {measurementTypes.map(t => (
                    <span
                      key={t}
                      style={{
                        padding: '4px 10px', borderRadius: 8, background: '#F1F4F8',
                        color: '#33415C', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #E3E7EE'
                      }}
                    >
                      {t === 'NUMBER' ? '🔢 NUMBER' : t === 'PERCENTAGE' ? '٪ PERCENTAGE' : t === 'CURRENCY' ? '💵 CURRENCY' : t === 'BOOLEAN' ? '☑️ BOOLEAN' : t === 'TEXT' ? '✏️ TEXT' : t}
                      <button
                        type="button"
                        onClick={() => {
                          if (measurementTypes.length > 1) {
                            setMeasurementTypes(prev => prev.filter(x => x !== t));
                          } else {
                            message.error('At least one measurement type must remain enabled.');
                          }
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0, fontWeight: 800 }}
                      >✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Add type (e.g. RATING)"
                    value={newMeasurementType}
                    onChange={e => setNewMeasurementType(e.target.value)}
                    style={{ flex: 1, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, height: 32 }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      if (newMeasurementType.trim() && !measurementTypes.includes(newMeasurementType.trim().toUpperCase())) {
                        setMeasurementTypes(prev => [...prev, newMeasurementType.trim().toUpperCase()]);
                        setNewMeasurementType('');
                      }
                    }}
                    style={{ background: '#0f766e', borderColor: '#0f766e', height: 32, fontSize: 12 }}
                  >Add</Button>
                </div>
              </Card>
            </Col>

            {/* Units */}
            <Col xs={24} md={12}>
              <Card title={<span style={{ fontSize: 13, fontWeight: 700 }}>Measurement Units</span>} size="small" style={{ borderRadius: 10, border: '1px solid #E3E7EE' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 40 }}>
                  {units.map(u => (
                    <span
                      key={u}
                      style={{
                        padding: '4px 10px', borderRadius: 8, background: '#F1F4F8',
                        color: '#33415C', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #E3E7EE'
                      }}
                    >
                      {u}
                      <button
                        type="button"
                        onClick={() => setUnits(prev => prev.filter(x => x !== u))}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0, fontWeight: 800 }}
                      >✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Add new unit (e.g. leads)"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    style={{ flex: 1, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, height: 32 }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      if (newUnit.trim() && !units.includes(newUnit.trim())) {
                        setUnits(prev => [...prev, newUnit.trim()]);
                        setNewUnit('');
                      }
                    }}
                    style={{ background: '#0f766e', borderColor: '#0f766e', height: 32, fontSize: 12 }}
                  >Add</Button>
                </div>
              </Card>
            </Col>

            {/* KPI Types */}
            <Col xs={24} md={12}>
              <Card title={<span style={{ fontSize: 13, fontWeight: 700 }}>KPI Types</span>} size="small" style={{ borderRadius: 10, border: '1px solid #E3E7EE' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 40 }}>
                  {kpiTypes.map(t => (
                    <span
                      key={t}
                      style={{
                        padding: '4px 10px', borderRadius: 8, background: '#F1F4F8',
                        color: '#33415C', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #E3E7EE'
                      }}
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => setKpiTypes(prev => prev.filter(x => x !== t))}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0, fontWeight: 800 }}
                      >✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Add type (e.g. QUALITY)"
                    value={newKpiType}
                    onChange={e => setNewKpiType(e.target.value)}
                    style={{ flex: 1, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, height: 32 }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      if (newKpiType.trim() && !kpiTypes.includes(newKpiType.trim().toUpperCase())) {
                        setKpiTypes(prev => [...prev, newKpiType.trim().toUpperCase()]);
                        setNewKpiType('');
                      }
                    }}
                    style={{ background: '#0f766e', borderColor: '#0f766e', height: 32, fontSize: 12 }}
                  >Add</Button>
                </div>
              </Card>
            </Col>

            {/* Frequencies */}
            <Col xs={24} md={12}>
              <Card title={<span style={{ fontSize: 13, fontWeight: 700 }}>Tracking Frequencies</span>} size="small" style={{ borderRadius: 10, border: '1px solid #E3E7EE' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 40 }}>
                  {frequencies.map(f => (
                    <span
                      key={f}
                      style={{
                        padding: '4px 10px', borderRadius: 8, background: '#F1F4F8',
                        color: '#33415C', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #E3E7EE'
                      }}
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => setFrequencies(prev => prev.filter(x => x !== f))}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0, fontWeight: 800 }}
                      >✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Add frequency (e.g. BI-WEEKLY)"
                    value={newFrequency}
                    onChange={e => setNewFrequency(e.target.value)}
                    style={{ flex: 1, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, height: 32 }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      if (newFrequency.trim() && !frequencies.includes(newFrequency.trim().toUpperCase())) {
                        setFrequencies(prev => [...prev, newFrequency.trim().toUpperCase()]);
                        setNewFrequency('');
                      }
                    }}
                    style={{ background: '#0f766e', borderColor: '#0f766e', height: 32, fontSize: 12 }}
                  >Add</Button>
                </div>
              </Card>
            </Col>

            {/* Priorities */}
            <Col xs={24} md={12}>
              <Card title={<span style={{ fontSize: 13, fontWeight: 700 }}>Priority Levels</span>} size="small" style={{ borderRadius: 10, border: '1px solid #E3E7EE' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 40 }}>
                  {priorities.map(p => (
                    <span
                      key={p}
                      style={{
                        padding: '4px 10px', borderRadius: 8, background: '#F1F4F8',
                        color: '#33415C', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #E3E7EE'
                      }}
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => setPriorities(prev => prev.filter(x => x !== p))}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0, fontWeight: 800 }}
                      >✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Add priority (e.g. CRITICAL)"
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    style={{ flex: 1, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, height: 32 }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      if (newPriority.trim() && !priorities.includes(newPriority.trim().toUpperCase())) {
                        setPriorities(prev => [...prev, newPriority.trim().toUpperCase()]);
                        setNewPriority('');
                      }
                    }}
                    style={{ background: '#0f766e', borderColor: '#0f766e', height: 32, fontSize: 12 }}
                  >Add</Button>
                </div>
              </Card>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <Button
              type="primary"
              disabled={saving}
              onClick={handleSave}
              style={{ background: '#0f766e', borderColor: '#0f766e', height: 40, padding: '0 24px', borderRadius: 8, fontWeight: 700 }}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
