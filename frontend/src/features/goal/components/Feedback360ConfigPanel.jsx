import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { Input, Select, Switch, Button, Tag, Alert, Popconfirm, DatePicker, message } from 'antd';
import {
  PlusOutlined, DeleteOutlined, UpOutlined, DownOutlined,
  InfoCircleOutlined, QuestionCircleOutlined, SaveOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;

const QUESTION_TYPES = [
  { value: 'RATING_1_5', label: '⭐ Rating (1-5)', max: 5, hasRating: true },
  { value: 'SCALE_1_10', label: '📊 Scale (1-10)', max: 10, hasRating: true },
  { value: 'PERCENTAGE', label: '٪ Percentage', max: 100, hasRating: true },
  { value: 'YES_NO', label: '☑️ Yes/No', max: 100, hasRating: true },
  { value: 'LONG_TEXT', label: '💬 Long Text', max: null, hasRating: false },
  { value: 'SHORT_TEXT', label: '✏️ Short Text', max: null, hasRating: false },
];

const RELATIONSHIP_TYPES = [
  { value: 'MANAGER', label: 'Manager', color: '#6366f1', defaultWeight: 40 },
  { value: 'PEER', label: 'Peer', color: '#0891b2', defaultWeight: 40 },
  { value: 'DIRECT_REPORT', label: 'Direct Report', color: '#059669', defaultWeight: 20 },
];

const LATE_SUBMISSION_POLICIES = [
  { value: 'BLOCK', label: 'Block Late Submissions' },
  { value: 'ALLOW', label: 'Allow Late Submissions' },
  { value: 'PENALIZE', label: 'Allow with Penalty' },
];

const headers = () => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

const selSt = {
  width: '100%', padding: '8px 12px', borderRadius: 6, fontSize: 12,
  background: '#ffffff', border: '1px solid #cbd5e1',
  color: '#1e293b', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'all 0.15s ease',
};

const labelSt = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
};

function SectionHeader({ num, title, subtitle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 14
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: '50%', background: '#e0e7ff',
        color: '#4338ca', fontSize: 11, fontWeight: 700
      }}>{num}</span>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
      {subtitle && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>— {subtitle}</span>}
    </div>
  );
}

function WeightBadge({ total, target = 100 }) {
  const isExact = Math.abs(total - target) < 0.01;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
      color: isExact ? '#16a34a' : '#dc2626',
      background: isExact ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${isExact ? '#bbf7d0' : '#fca5a5'}`,
    }}>
      {total.toFixed(2)}% / {target}% {isExact ? '✓' : '⚠️'}
    </span>
  );
}

/* ─── Main Component ─── */

const Feedback360ConfigPanel = forwardRef(function Feedback360ConfigPanel({
  goalId, isEdit, onConfigChange, saving
}, ref) {
  // ─── A. Questionnaire Builder ───
  const [questions, setQuestions] = useState([]);

  // ─── B. Reviewer Configuration ───
  const [reviewerConfig, setReviewerConfig] = useState({
    allow_manager: true, manager_count: 1,
    allow_peers: true, peer_count: 3,
    allow_direct_reports: true, direct_report_count: 2,
  });

  // ─── C. Reviewer Weight Configuration ───
  const [reviewerWeights, setReviewerWeights] = useState({
    manager_weight: 40, peer_weight: 40,
    direct_report_weight: 20,
  });

  // ─── D. Review Rules ───
  const [reviewRules, setReviewRules] = useState({
    anonymous_enabled: false,
    minimum_completion_percentage: 100,
    reminder_interval_days: 3,
    reviewer_deadline: null,
    late_submission_policy: 'BLOCK',
  });

  const [loadingConfig, setLoadingConfig] = useState(false);

  // ─── Default Questions ───
  const defaultQuestions = [
    { id: 'q1', question: 'Communication', question_type: 'RATING_1_5', weight: 20, required: true, options_json: {} },
    { id: 'q2', question: 'Leadership', question_type: 'RATING_1_5', weight: 20, required: true, options_json: {} },
    { id: 'q3', question: 'Teamwork', question_type: 'RATING_1_5', weight: 20, required: true, options_json: {} },
    { id: 'q4', question: 'What is this employee\'s biggest strength?', question_type: 'LONG_TEXT', weight: 20, required: true, options_json: {} },
    { id: 'q5', question: 'What should this employee improve?', question_type: 'LONG_TEXT', weight: 20, required: true, options_json: {} },
  ];

  // ─── Load existing config when editing ───
  useEffect(() => {
    if (isEdit && goalId) {
      loadExistingConfig();
    } else {
      // Pre-populate default questions for new goals
      setQuestions(defaultQuestions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, goalId]);

  const loadExistingConfig = async () => {
    setLoadingConfig(true);
    try {
      const [configRes, templatesRes] = await Promise.all([
        axios.get(`/api/goals/${goalId}/360-feedback/config`, { headers: headers() }),
        axios.get(`/api/goals/${goalId}/360-feedback/templates`, { headers: headers() }),
      ]);

      const config = configRes.data?.data || {};
      const templates = templatesRes.data?.data || [];

      // Map config to reviewer config + weights + rules
      setReviewerConfig({
        allow_manager: config.allow_manager ?? true,
        manager_count: config.manager_count ?? 1,
        allow_peers: config.allow_peers ?? true,
        peer_count: config.peer_count ?? 3,
        allow_direct_reports: config.allow_direct_reports ?? true,
        direct_report_count: config.direct_report_count ?? 2,
      });

      setReviewerWeights({
        manager_weight: config.manager_weight ?? 40,
        peer_weight: config.peer_weight ?? 40,
        direct_report_weight: config.direct_report_weight ?? 20,
      });

      setReviewRules({
        anonymous_enabled: config.anonymous_enabled ?? false,
        minimum_completion_percentage: config.minimum_completion_percentage ?? 100,
        reminder_interval_days: config.reminder_interval_days ?? 3,
        reviewer_deadline: config.reviewer_deadline ? dayjs(config.reviewer_deadline) : null,
        late_submission_policy: config.late_submission_policy ?? 'BLOCK',
      });

      // Map templates to questions
      if (templates.length > 0) {
        setQuestions(templates.map((t, idx) => ({
          id: t.feedback_template_id || `q${idx + 1}`,
          question: t.question,
          question_type: t.question_type,
          weight: t.weight,
          required: t.required,
          display_order: t.display_order,
          options_json: t.options_json || {},
        })));
      } else {
        setQuestions(defaultQuestions);
      }
    } catch (err) {
      console.error('Failed to load 360° Feedback config:', err);
      // Fall back to defaults
      setQuestions(defaultQuestions);
    } finally {
      setLoadingConfig(false);
    }
  };

  // ─── Expose config via ref ───
  useImperativeHandle(ref, () => ({
    getConfig: () => ({
      questions: questions.map(q => ({
        question: q.question,
        question_type: q.question_type,
        weight: parseFloat(q.weight) || 0,
        required: q.required,
        display_order: q.display_order || 0,
        options_json: q.options_json || {},
      })),
      config: {
        ...reviewerConfig,
        ...reviewerWeights,
        ...reviewRules,
        reviewer_deadline: reviewRules.reviewer_deadline ? reviewRules.reviewer_deadline.toISOString() : null,
      },
    }),
    validate: () => {
      const qTotal = questions.reduce((sum, q) => sum + (parseFloat(q.weight) || 0), 0);
      if (Math.abs(qTotal - 100) > 0.01) return false;

      let wTotal = 0;
      if (reviewerConfig.allow_manager) wTotal += parseFloat(reviewerWeights.manager_weight || 0);
      if (reviewerConfig.allow_peers) wTotal += parseFloat(reviewerWeights.peer_weight || 0);
      if (reviewerConfig.allow_direct_reports) wTotal += parseFloat(reviewerWeights.direct_report_weight || 0);
      if (Math.abs(wTotal - 100) > 0.01) return false;

      return true;
    },
  }));

  // ─── Notify parent of config changes ───
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange({
        questions,
        reviewerConfig,
        reviewerWeights,
        reviewRules,
      });
    }
  }, [questions, reviewerConfig, reviewerWeights, reviewRules, onConfigChange]);

  // ─── Computed values ───
  const questionWeightTotal = questions.reduce((sum, q) => sum + (parseFloat(q.weight) || 0), 0);
  const questionWeightValid = Math.abs(questionWeightTotal - 100) < 0.01;

  const enabledReviewerTypes = RELATIONSHIP_TYPES.filter(rt => {
    const key = `allow_${rt.value.toLowerCase()}`;
    return reviewerConfig[key];
  });

  const reviewerWeightTotal = enabledReviewerTypes.reduce((sum, rt) => {
    const key = `${rt.value.toLowerCase()}_weight`;
    return sum + (parseFloat(reviewerWeights[key]) || 0);
  }, 0);
  const reviewerWeightValid = Math.abs(reviewerWeightTotal - 100) < 0.01;

  // ─── Question handlers ───
  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        question: '',
        question_type: 'RATING_1_5',
        weight: 0,
        required: true,
        display_order: prev.length + 1,
        options_json: {},
      }
    ]);
  };

  const updateQuestion = (id, key, value) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [key]: value } : q));
  };

  const removeQuestion = (id) => {
    setQuestions(prev => {
      const filtered = prev.filter(q => q.id !== id);
      return filtered.map((q, idx) => ({ ...q, display_order: idx + 1 }));
    });
  };

  const moveQuestion = (index, direction) => {
    const newList = [...questions];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;
    setQuestions(newList.map((q, idx) => ({ ...q, display_order: idx + 1 })));
  };

  // ─── Reviewer config handlers ───
  const toggleReviewerType = (type) => {
    const key = `allow_${type.toLowerCase()}`;
    const countKey = `${type.toLowerCase()}_count`;
    const weightKey = `${type.toLowerCase()}_weight`;
    const rt = RELATIONSHIP_TYPES.find(r => r.value === type);

    setReviewerConfig(prev => ({
      ...prev,
      [key]: !prev[key],
      [countKey]: !prev[key] ? (type === 'MANAGER' ? 1 : type === 'PEER' ? 3 : type === 'DIRECT_REPORT' ? 2 : 0) : prev[countKey],
    }));

    // When enabling, set default weight; when disabling, set weight to 0
    setReviewerWeights(prev => ({
      ...prev,
      [weightKey]: !reviewerConfig[key] ? (rt.defaultWeight || 0) : 0,
    }));
  };

  const updateReviewerCount = (type, value) => {
    const key = `${type.toLowerCase()}_count`;
    setReviewerConfig(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const updateReviewerWeight = (type, value) => {
    const key = `${type.toLowerCase()}_weight`;
    setReviewerWeights(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  // ─── Review rules handlers ───
  const updateRule = (key, value) => {
    setReviewRules(prev => ({ ...prev, [key]: value }));
  };

  // ─── Render: Section A — Questionnaire Builder ───
  const renderQuestionnaireBuilder = () => (
    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>📋 Questionnaire Builder</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Design the feedback questions. Question weights must total 100%.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <WeightBadge total={questionWeightTotal} />
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={addQuestion}>
            Add Question
          </Button>
        </div>
      </div>

      {!questionWeightValid && (
        <Alert
          type="warning" showIcon
          message={`Question weights must sum to 100%. Current total: ${questionWeightTotal.toFixed(2)}%`}
          style={{ marginBottom: 12, borderRadius: 8 }}
        />
      )}

      {loadingConfig ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          Loading questionnaire...
        </div>
      ) : questions.length === 0 ? (
        <div style={{
          padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12,
          background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0'
        }}>
          No questions added yet. Click <strong>+ Add Question</strong> to configure the feedback questionnaire.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.map((q, idx) => {
            const qType = QUESTION_TYPES.find(t => t.value === q.question_type);
            return (
              <div key={q.id || idx} style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12
              }}>
                <div style={{ display: 'flex', flexDirection: 'column,', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', minWidth: 28 }}>
                      Q{idx + 1}.
                    </span>
                    <input
                      type="text"
                      placeholder="Enter question text (e.g. Communication)"
                      value={q.question}
                      onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                      style={{ ...selSt, flex: 1, height: 32, padding: '4px 10px', fontSize: 12 }}
                    />
                    <select
                      value={q.question_type}
                      onChange={e => updateQuestion(q.id, 'question_type', e.target.value)}
                      style={{ ...selSt, width: 170, height: 32, padding: '4px 10px', fontSize: 11 }}
                    >
                      {QUESTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="W"
                        value={q.weight || ''}
                        onChange={e => updateQuestion(q.id, 'weight', e.target.value)}
                        style={{ ...selSt, height: 32, padding: '4px 8px', fontSize: 11, textAlign: 'center', width: 60 }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>%</span>
                    </div>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                      fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={e => updateQuestion(q.id, 'required', e.target.checked)}
                      />
                      Required
                    </label>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, -1)}
                        disabled={idx === 0}
                        style={{ padding: '2px 6px', fontSize: 11, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                        title="Move up"
                      >↑</button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 1)}
                        disabled={idx === questions.length - 1}
                        style={{ padding: '2px 6px', fontSize: 11, cursor: idx === questions.length - 1 ? 'not-allowed' : 'pointer' }}
                        title="Move down"
                      >↓</button>
                      <Popconfirm
                        title="Remove this question?"
                        onConfirm={() => removeQuestion(q.id)}
                        okText="Remove"
                        cancelText="Cancel"
                      >
                        <button
                          type="button"
                          style={{
                            padding: '2px 8px', fontSize: 11, color: '#ef4444',
                            border: '1px solid #fca5a5', background: '#fef2f2',
                            borderRadius: 4, cursor: 'pointer'
                          }}
                          title="Delete question"
                        >✕</button>
                      </Popconfirm>
                    </div>
                  </div>

                  {qType?.hasRating === false && (
                    <div style={{
                      fontSize: 10, color: '#64748b', fontStyle: 'italic',
                      background: '#f1f5f9', padding: '6px 10px', borderRadius: 6
                    }}>
                      ℹ️ This is a text-based question. It does not contribute a numeric rating to the score but captures qualitative feedback.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Render: Section B — Reviewer Configuration ───
  const renderReviewerConfig = () => (
    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>👥 Reviewer Configuration</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          Choose which reviewer groups should provide feedback and how many reviewers per group.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {RELATIONSHIP_TYPES.map(rt => {
          const allowKey = `allow_${rt.value.toLowerCase()}`;
          const countKey = `${rt.value.toLowerCase()}_count`;
          const isEnabled = reviewerConfig[allowKey];
          const defaultCount = rt.value === 'MANAGER' ? 1 : rt.value === 'PEER' ? 3 : rt.value === 'DIRECT_REPORT' ? 2 : 0;

          return (
            <div key={rt.value} style={{
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: rt.color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11
                  }}>{rt.label.charAt(0)}</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{rt.label}</span>
                  <Tag style={{ fontSize: 9, fontWeight: 600 }} color={rt.color}>{rt.value}</Tag>
                </div>
                <Switch
                  checked={isEnabled}
                  onChange={() => toggleReviewerType(rt.value)}
                  disabled={saving}
                />
              </div>

              {isEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                    Number of reviewers:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={reviewerConfig[countKey] || defaultCount}
                    onChange={e => updateReviewerCount(rt.value, e.target.value)}
                    disabled={saving}
                    style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11, width: 80, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {rt.value === 'MANAGER' ? 'Auto-detected from org hierarchy' : 'Auto-populated from org hierarchy'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {enabledReviewerTypes.length === 0 && (
        <Alert
          type="error" showIcon
          message="At least one reviewer group must be enabled."
          style={{ marginTop: 12, borderRadius: 8 }}
        />
      )}
    </div>
  );

  // ─── Render: Section C — Reviewer Weight Configuration ───
  const renderReviewerWeights = () => (
    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>⚖️ Reviewer Weight Configuration</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Define how much each reviewer group's feedback contributes to the final score.
          </div>
        </div>
        <WeightBadge total={reviewerWeightTotal} />
      </div>

      {!reviewerWeightValid && (
        <Alert
          type="warning" showIcon
          message={`Reviewer weights must sum to 100% for enabled groups. Current total: ${reviewerWeightTotal.toFixed(2)}%`}
          style={{ marginBottom: 12, borderRadius: 8 }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {enabledReviewerTypes.map(rt => {
          const weightKey = `${rt.value.toLowerCase()}_weight`;
          return (
            <div key={rt.value} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: rt.color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11
              }}>{rt.label.charAt(0)}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', minWidth: 120 }}>{rt.label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={reviewerWeights[weightKey] || ''}
                onChange={e => updateReviewerWeight(rt.value, e.target.value)}
                disabled={saving}
                style={{ ...selSt, height: 30, padding: '4px 10px', fontSize: 12, textAlign: 'center', width: 80 }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>%</span>
              <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (reviewerWeights[weightKey] || 0))}%`,
                  height: '100%', background: rt.color, borderRadius: 3, transition: 'width 0.3s'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#64748b', display: 'flex', gap: 4, alignItems: 'center' }}>
        <InfoCircleOutlined style={{ color: '#6366f1', fontSize: 12 }} />
        <span>
          Weights are automatically normalized to 100% for enabled reviewer groups.
          The final score is a weighted average of each group's average rating.
        </span>
      </div>
    </div>
  );

  // ─── Render: Section D — Review Rules ───
  const renderReviewRules = () => (
    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>⚙️ Review Rules</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          Configure the review process rules and deadlines.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Anonymous Feedback */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <label style={labelSt}>Anonymous Feedback</label>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                Hide reviewer identities from the employee
              </div>
            </div>
            <Switch
              checked={reviewRules.anonymous_enabled}
              onChange={checked => updateRule('anonymous_enabled', checked)}
              disabled={saving}
              checkedChildren="Yes"
              unCheckedChildren="No"
            />
          </div>
        </div>

        {/* Minimum Completion */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12
        }}>
          <label style={labelSt}>Minimum Completion Required (%)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={reviewRules.minimum_completion_percentage || 100}
            onChange={e => updateRule('minimum_completion_percentage', parseInt(e.target.value) || 100)}
            disabled={saving}
            style={{ ...selSt, height: 30, padding: '4px 10px', fontSize: 12, textAlign: 'center' }}
          />
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
            Minimum % of reviewers that must submit before finalization
          </div>
        </div>

        {/* Reminder Frequency */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12
        }}>
          <label style={labelSt}>Reminder Frequency (days)</label>
          <input
            type="number"
            min={1}
            max={30}
            value={reviewRules.reminder_interval_days || 3}
            onChange={e => updateRule('reminder_interval_days', parseInt(e.target.value) || 3)}
            disabled={saving}
            style={{ ...selSt, height: 30, padding: '4px 10px', fontSize: 12, textAlign: 'center' }}
          />
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
            How often to remind pending reviewers
          </div>
        </div>

        {/* Review Deadline */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12
        }}>
          <label style={labelSt}>Review Deadline</label>
          <DatePicker
            value={reviewRules.reviewer_deadline}
            onChange={date => updateRule('reviewer_deadline', date)}
            disabled={saving}
            style={{ width: '100%' }}
            placeholder="Select deadline"
          />
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
            Deadline for reviewers to submit feedback
          </div>
        </div>

        {/* Late Submission Policy */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12,
          gridColumn: 'span 2'
        }}>
          <label style={labelSt}>Late Submission Policy</label>
          <select
            value={reviewRules.late_submission_policy || 'BLOCK'}
            onChange={e => updateRule('late_submission_policy', e.target.value)}
            disabled={saving}
            style={{ ...selSt, height: 32, padding: '4px 10px', fontSize: 12 }}
          >
            {LATE_SUBMISSION_POLICIES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
            What happens when reviewers submit after the deadline
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Main Render ───
  return (
    <div style={{
      background: '#ffffff', border: '2px solid #e0e7ff', borderRadius: 12,
      padding: 18, marginBottom: 20
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        paddingBottom: 10, borderBottom: '1px solid #e2e8f0'
      }}>
        <span style={{ fontSize: 20 }}>🔄</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
          360° Feedback Configuration
        </h3>
        <Tag color="purple" style={{ fontSize: 10, fontWeight: 700, marginLeft: 'auto' }}>
          {isEdit ? 'Edit Existing' : 'New Configuration'}
        </Tag>
      </div>

      <Alert
        type="info" showIcon
        message="360° Feedback collects ratings from multiple reviewer groups. Configure the questionnaire, reviewer groups, weights, and review rules below."
        style={{ marginBottom: 16, borderRadius: 8 }}
      />

      {/* Section A: Questionnaire Builder */}
      <SectionHeader num="A" title="Questionnaire Builder" subtitle="Feedback questions with weights" />
      {renderQuestionnaireBuilder()}

      {/* Section B: Reviewer Configuration */}
      <SectionHeader num="B" title="Reviewer Configuration" subtitle="Who provides feedback" />
      {renderReviewerConfig()}

      {/* Section C: Reviewer Weight Configuration */}
      <SectionHeader num="C" title="Reviewer Weight Configuration" subtitle="Weight distribution" />
      {renderReviewerWeights()}

      {/* Section D: Review Rules */}
      <SectionHeader num="D" title="Review Rules" subtitle="Process configuration" />
      {renderReviewRules()}

      {/* Validation Summary */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '12px 16px', marginTop: 16
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Configuration Validation
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>Questionnaire:</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: questionWeightValid ? '#16a34a' : '#dc2626'
            }}>
              {questionWeightValid ? '✓ Valid' : '⚠ Invalid'} ({questionWeightTotal.toFixed(0)}%)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>Reviewer Weights:</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: reviewerWeightValid ? '#16a34a' : '#dc2626'
            }}>
              {reviewerWeightValid ? '✓ Valid' : '⚠ Invalid'} ({reviewerWeightTotal.toFixed(0)}%)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>Reviewer Groups:</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: enabledReviewerTypes.length > 0 ? '#16a34a' : '#dc2626'
            }}>
              {enabledReviewerTypes.length > 0 ? '✓ ' + enabledReviewerTypes.length + ' enabled' : '⚠ None enabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Feedback360ConfigPanel;
