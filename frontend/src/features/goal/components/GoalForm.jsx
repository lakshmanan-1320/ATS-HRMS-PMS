import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuthStore } from '../../auth/store'

const selSt = {
  width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13,
  background: '#ffffff', border: '1px solid #cbd5e1',
  color: '#1e293b', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'all 0.15s ease',
}

const labelSt = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
}


function SectionHeader({ num, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 14 }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%', background: '#e0e7ff',
        color: '#4338ca', fontSize: 11, fontWeight: 700
      }}>{num}</span>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelSt}>{label}</label>
      {children}
    </div>
  )
}

export default function GoalForm({
  goal, goals = [], employees = [], departments = [],
  activeConfig, weightsByType = {}, goalCount, maxGoals,
  saving, onSave, onClose, categories = []
}) {
  const isEdit = !!goal
  const [step, setStep] = useState(isEdit ? 'form' : 'type')
  const [selectedType, setSelectedType] = useState('')

  const [goalTypes, setGoalTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [visibilityOptions, setVisibilityOptions] = useState([]);
  const [performanceTechniques, setPerformanceTechniques] = useState([]);

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    axios.get('/api/master-data', { headers })
      .then(res => {
        if (res.data && res.data.success) {
          const { goalTypes: gt, priorities: pr, visibilityOptions: vo, performanceTechniques: pt } = res.data.data;
          setGoalTypes(gt || []);
          setPriorities(pr || []);
          setVisibilityOptions(vo || []);
          setPerformanceTechniques(pt || []);
        }
      })
      .catch(err => console.error('Failed to fetch master data:', err));
  }, []);

  const availableTechniques = [...performanceTechniques];
  if (isEdit && goal?.performance_technique) {
    const hasGoalTechnique = availableTechniques.some(t => t.code === goal.performance_technique);
    if (!hasGoalTechnique) {
      availableTechniques.push({
        code: goal.performance_technique,
        name: goal.performance_technique.replace(/_/g, ' '),
        icon: '🔒',
        description: 'Current technique'
      });
    }
  }

  const { role } = useAuthStore()
  const isManager = sessionStorage.getItem('is_manager') === 'true'
  const isManagerOrAdmin = role === 'client_admin' || role === 'hr' || role === 'manager' || isManager

  // Find the logged-in employee record
  const currentUserEmail = sessionStorage.getItem('sa_email')
  const currentEmployee = employees.find(e => e.email === currentUserEmail)
  const currentEmployeeId = currentEmployee?.employee_id || ''
  const currentDepartmentId = currentEmployee?.department_id || ''

  const allowedTypes = goalTypes.filter(t => {
    if (t.code === 'PERSONAL') return true
    return isManagerOrAdmin
  })

  const [form, setForm] = useState(() => {
    if (goal) {
      return {
        title: goal.title || '',
        description: goal.description || '',
        goal_category_id: goal.goal_category_id || '',
        priority: goal.priority || 'MEDIUM',
        weight: goal.weight !== undefined && goal.weight !== null ? goal.weight : '',
        start_date: goal.start_date ? goal.start_date.slice(0, 10) : '',
        due_date: goal.due_date ? goal.due_date.slice(0, 10) : '',
        parent_goal_id: goal.parent_goal_id || '',
        visibility: goal.visibility || 'PRIVATE',
        goal_type: goal.goal_type || 'individual',
        assigned_to_employee_id: goal.assigned_to_employee_id || '',
        assigned_to_department_id: goal.assigned_to_department_id || '',
        performance_technique: goal.performance_technique || 'KPI',
      }
    }
    return {
      title: '', description: '', goal_category_id: '', priority: 'MEDIUM',
      weight: '', start_date: '', due_date: '', parent_goal_id: '',
      visibility: 'PRIVATE', goal_type: 'individual',
      assigned_to_employee_id: '',
      assigned_to_department_id: '',
      performance_technique: 'KPI',
    }
  })

  // Set default assignments for new goals once currentEmployee is resolved
  useEffect(() => {
    if (!isEdit && currentEmployeeId) {
      if (form.goal_type === 'individual') {
        const canAssignOthers = isManagerOrAdmin && activeConfig?.goal_setting_direction !== 'BOTTOM_UP';
        if (!canAssignOthers) {
          setField('assigned_to_employee_id', currentEmployeeId);
        }
      }
    }
  }, [currentEmployeeId, form.goal_type, activeConfig])

  // Auto-select first active performance technique if not set or disabled
  useEffect(() => {
    if (!isEdit && availableTechniques.length > 0) {
      const hasSelected = availableTechniques.some(t => t.code === form.performance_technique);
      if (!hasSelected) {
        setField('performance_technique', availableTechniques[0].code);
      }
    }
  }, [availableTechniques, isEdit, form.performance_technique]);

  // Auto-select first active category if not set
  useEffect(() => {
    if (!form.goal_category_id && categories.length > 0) {
      setField('goal_category_id', categories[0].category_id)
    }
  }, [categories])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTypeSelect = (type) => {
    setSelectedType(type)
    const mapping = {
      'PERSONAL': { goal_type: 'individual', visibility: 'PRIVATE' },
      'DEPARTMENT': { goal_type: 'department', visibility: 'DEPARTMENT' },
      'COMPANY': { goal_type: 'company', visibility: 'ORGANIZATION' },
    }
    const m = mapping[type] || mapping.PERSONAL
    setForm(f => {
      const updated = { ...f, ...m };
      if (m.goal_type === 'individual') {
        const canAssignOthers = isManagerOrAdmin && activeConfig?.goal_setting_direction !== 'BOTTOM_UP';
        updated.assigned_to_employee_id = canAssignOthers ? '' : currentEmployeeId;
        updated.assigned_to_department_id = '';
      } else if (m.goal_type === 'department') {
        updated.assigned_to_employee_id = '';
        updated.assigned_to_department_id = currentDepartmentId || '';
      } else if (m.goal_type === 'company') {
        updated.assigned_to_employee_id = '';
        updated.assigned_to_department_id = '';
      }
      return updated;
    })
  }

  const handleContinue = () => {
    if (!selectedType) return
    setStep('form')
  }

  const parentGoals = goals.filter(g => g.goal_id !== goal?.goal_id)

  // Performance cycle boundary dates (from activeConfig)
  const cycleMin = activeConfig?.start_date ? activeConfig.start_date.slice(0, 10) : ''
  const cycleMax = activeConfig?.end_date ? activeConfig.end_date.slice(0, 10) : ''
  const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  // Inline date-field errors
  const startDateErr = form.start_date && cycleMin && form.start_date < cycleMin
    ? `Start date cannot be before cycle start (${fmtDate(cycleMin)})`
    : form.start_date && cycleMax && form.start_date > cycleMax
      ? `Start date cannot be after cycle end (${fmtDate(cycleMax)})`
      : ''

  const dueDateErr = form.due_date && cycleMin && form.due_date < cycleMin
    ? `Due date cannot be before cycle start (${fmtDate(cycleMin)})`
    : form.due_date && cycleMax && form.due_date > cycleMax
      ? `Due date cannot be after cycle end (${fmtDate(cycleMax)})`
      : form.due_date && form.start_date && form.due_date < form.start_date
        ? 'Due date cannot be before start date'
        : ''

  // Each goal type (individual/department/company) has its own separate 100% weight bucket
  const typeWeight = weightsByType[form.goal_type] ?? 0
  const currentWeight = isEdit
    ? typeWeight - (Number(goal.weight) || 0) + (Number(form.weight) || 0)
    : typeWeight + (Number(form.weight) || 0)

  const typeLabel = { individual: 'Individual', department: 'Department', company: 'Company', team: 'Team' }[form.goal_type] || 'Goal'

  const [reflectionQuestions, setReflectionQuestions] = useState([]);

  const [libraryCompetencies, setLibraryCompetencies] = useState([]);
  const [goalCompetencies, setGoalCompetencies] = useState([]);
  const [fetchingCompetencies, setFetchingCompetencies] = useState(false);

  const [selfAssessmentQuestions, setSelfAssessmentQuestions] = useState([]);
  const [fetchingSelfAssessment, setFetchingSelfAssessment] = useState(false);
  const selfAssessmentQuestionSequence = useRef(0);

  const [feedback360Questions, setFeedback360Questions] = useState([]);
  const [fetchingFeedback360, setFetchingFeedback360] = useState(false);
  const feedback360QuestionSequence = useRef(0);

  const [goalKpis, setGoalKpis] = useState([]);
  const [fetchingKpis, setFetchingKpis] = useState(false);
  const kpiSequence = useRef(0);
  
  // KPI settings option lists dynamically configured by admin
  const [kpiMeasurementTypes, setKpiMeasurementTypes] = useState(['NUMBER', 'PERCENTAGE', 'CURRENCY', 'BOOLEAN', 'TEXT']);
  const [kpiUnits, setKpiUnits] = useState(['%', '₹', '$', 'Units', 'Hours', 'Days', 'Customers', 'Leads']);
  const [kpiTypes, setKpiTypes] = useState(['OUTCOME', 'OUTPUT', 'EFFICIENCY', 'QUALITY', 'LEADING', 'LAGGING']);
  const [kpiFrequencies, setKpiFrequencies] = useState(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
  const [kpiPriorities, setKpiPriorities] = useState(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

  const [feedback360Config, setFeedback360Config] = useState({
    allow_manager: true, manager_count: 1, manager_weight: 40,
    allow_peers: true, peer_count: 3, peer_weight: 40,
    allow_direct_reports: true, direct_report_count: 2, direct_report_weight: 20,
    anonymous_enabled: false,
    minimum_completion_percentage: 100,
    reminder_interval_days: 3,
    reviewer_deadline: '',
    late_submission_policy: 'BLOCK'
  });

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch global library
    axios.get('/api/client-admin/competency-assessment/competency-library', { headers })
      .then(res => setLibraryCompetencies(res.data.data || []))
      .catch(err => console.error('Failed to fetch competency library:', err));

    // Fetch 360 feedback config and templates if editing
    if (isEdit && goal.performance_technique === '360_FEEDBACK') {
      setFetchingFeedback360(true);
      axios.get(`/api/goals/${goal.goal_id}/360-feedback/config`, { headers })
        .then(res => {
          if (res.data?.success && res.data.data) {
            setFeedback360Config({
              ...res.data.data,
              reviewer_deadline: res.data.data.reviewer_deadline ? res.data.data.reviewer_deadline.slice(0, 10) : ''
            });
          }
        })
        .catch(err => console.error('Failed to fetch 360 config:', err));

      axios.get(`/api/goals/${goal.goal_id}/360-feedback/templates`, { headers })
        .then(res => {
          if (res.data?.success && res.data.data) {
            const questions = res.data.data.map(q => ({
              id: q.feedback_template_id,
              question: q.question,
              question_type: q.question_type,
              weight: q.weight,
              required: q.required,
              display_order: q.display_order,
              options_json: q.options_json || {}
            }));
            setFeedback360Questions(questions);
          }
        })
        .catch(err => console.error('Failed to fetch 360 templates:', err))
        .finally(() => setFetchingFeedback360(false));
    }

    // If edit, fetch goal's configured competencies
    if (isEdit && goal.performance_technique === 'COMPETENCY_ASSESSMENT') {
      setFetchingCompetencies(true);
      axios.get(`/api/client-admin/competency-assessment/goals/${goal.goal_id}/competencies`, { headers })
        .then(res => setGoalCompetencies(res.data.data || []))
        .catch(err => console.error('Failed to fetch goal competencies:', err))
        .finally(() => setFetchingCompetencies(false));
    }

    // If edit, fetch goal's configured self-assessment template questions
    if (isEdit && goal.performance_technique === 'SELF_ASSESSMENT') {
      setFetchingSelfAssessment(true);
      axios.get(`/api/goals/${goal.goal_id}/self-assessment-template`, { headers })
        .then(res => {
          const questions = (res.data.data || []).map(q => ({
            id: q.template_id,
            question: q.question,
            question_type: q.question_type,
            display_order: q.display_order,
            required: q.required,
            weight: q.weight,
            options_json: q.options_json || {}
          }));
          setSelfAssessmentQuestions(questions);
        })
        .catch(err => console.error('Failed to fetch self assessment template:', err))
        .finally(() => setFetchingSelfAssessment(false));
    }

    // If edit, fetch goal's configured KPIs
    if (isEdit && goal.performance_technique === 'KPI') {
      setFetchingKpis(true);
      axios.get(`/api/goals/${goal.goal_id}/kpis`, { headers })
        .then(res => {
          const kpis = (res.data.data || res.data || []).map(k => ({
            id: k.kpi_id,
            title: k.title,
            description: k.description,
            measurement_type: k.measurement_type,
            target_value: k.target_value,
            target_boolean: k.target_boolean,
            target_text: k.target_text,
            unit: k.unit,
            weight_percentage: k.weight_percentage,
            frequency: k.frequency || 'MONTHLY',
            kpi_type: k.kpi_type || 'OUTCOME',
            priority: k.priority || 'MEDIUM',
            status: k.status || 'DRAFT'
          }));
          setGoalKpis(kpis);
        })
        .catch(err => console.error('Failed to fetch goal KPIs:', err))
        .finally(() => setFetchingKpis(false));
    }

    // Fetch global KPI technique configuration options
    axios.get('/api/performance-technique-configurations/KPI', { headers })
      .then(res => {
        if (res.data?.success && res.data.data) {
          const cfg = res.data.data;
          if (cfg.measurement_types) setKpiMeasurementTypes(cfg.measurement_types);
          if (cfg.units) setKpiUnits(cfg.units);
          if (cfg.kpi_types) setKpiTypes(cfg.kpi_types);
          if (cfg.frequencies) setKpiFrequencies(cfg.frequencies);
          if (cfg.priorities) setKpiPriorities(cfg.priorities);
        }
      })
      .catch(err => console.error('Failed to fetch KPI technique configs:', err));
  }, [isEdit, goal?.goal_id, goal?.performance_technique]);

  const addQuestion = () => {
    setReflectionQuestions(prev => [
      ...prev,
      { id: Date.now(), question: '', input_type: 'TEXTAREA', is_required: true }
    ]);
  };

  const addSelfAssessmentQuestion = () => {
    setSelfAssessmentQuestions(prev => [
      ...prev,
      {
        id: `new-${Date.now()}-${++selfAssessmentQuestionSequence.current}`,
        question: '',
        question_type: 'LONG_TEXT',
        required: true,
        weight: 0,
        options_json: { choices: [], max_rating: 5, instructions: '', evidence_required: false, attachments_required: false }
      }
    ]);
  };

  const updateSelfAssessmentQuestion = (id, key, value) => {
    setSelfAssessmentQuestions(prev => prev.map(q => q.id === id ? { ...q, [key]: value } : q));
  };

  const updateSelfAssessmentQuestionOption = (id, optionKey, value) => {
    setSelfAssessmentQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return {
          ...q,
          options_json: {
            ...q.options_json,
            [optionKey]: value
          }
        };
      }
      return q;
    }));
  };

  const removeSelfAssessmentQuestion = (id) => {
    setSelfAssessmentQuestions(prev => prev.filter(q => q.id !== id));
  };

  const moveSelfAssessmentQuestion = (index, direction) => {
    const newList = [...selfAssessmentQuestions];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;
    setSelfAssessmentQuestions(newList);
  };

  const addFeedback360Question = () => {
    setFeedback360Questions(prev => [
      ...prev,
      {
        id: `new-${Date.now()}-${++feedback360QuestionSequence.current}`,
        question: '',
        question_type: 'RATING_1_5',
        required: true,
        weight: 0,
        options_json: { choices: [], max_rating: 5, instructions: '' }
      }
    ]);
  };

  const updateFeedback360Question = (id, key, value) => {
    setFeedback360Questions(prev => prev.map(q => q.id === id ? { ...q, [key]: value } : q));
  };

  const updateFeedback360QuestionOption = (id, optionKey, value) => {
    setFeedback360Questions(prev => prev.map(q => {
      if (q.id === id) {
        return {
          ...q,
          options_json: {
            ...q.options_json,
            [optionKey]: value
          }
        };
      }
      return q;
    }));
  };

  const removeFeedback360Question = (id) => {
    setFeedback360Questions(prev => prev.filter(q => q.id !== id));
  };

  const moveFeedback360Question = (index, direction) => {
    const newList = [...feedback360Questions];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;
    setFeedback360Questions(newList);
  };

  const updateQuestion = (id, key, value) => {
    setReflectionQuestions(prev => prev.map(q => q.id === id ? { ...q, [key]: value } : q));
  };

  const removeQuestion = (id) => {
    setReflectionQuestions(prev => prev.filter(q => q.id !== id));
  };

  const moveQuestion = (index, direction) => {
    const newQs = [...reflectionQuestions];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newQs.length) return;
    const temp = newQs[index];
    newQs[index] = newQs[targetIdx];
    newQs[targetIdx] = temp;
    setReflectionQuestions(newQs);
  };

  const addCompetency = (libraryCompId) => {
    if (!libraryCompId) return;
    if (libraryCompId === 'custom') {
      setGoalCompetencies(prev => [
        ...prev,
        { competency_library_id: null, name: '', description: '', weight: 0 }
      ]);
      return;
    }
    const comp = libraryCompetencies.find(c => c.competency_id === libraryCompId);
    if (!comp) return;
    setGoalCompetencies(prev => [
      ...prev,
      { competency_library_id: comp.competency_id, name: comp.name, description: comp.description, weight: 0 }
    ]);
  };

  const updateCompetency = (idx, key, value) => {
    setGoalCompetencies(prev => prev.map((c, i) => i === idx ? { ...c, [key]: value } : c));
  };

  const removeCompetency = (idx) => {
    setGoalCompetencies(prev => prev.filter((_, i) => i !== idx));
  };

  const moveCompetency = (idx, direction) => {
    const newList = [...goalCompetencies];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    const temp = newList[idx];
    newList[idx] = newList[targetIdx];
    newList[targetIdx] = temp;
    setGoalCompetencies(newList);
  };

  const addKpi = () => {
    setGoalKpis(prev => [
      ...prev,
      {
        id: `new-${Date.now()}-${++kpiSequence.current}`,
        title: '',
        description: '',
        measurement_type: kpiMeasurementTypes[0] || 'NUMBER',
        target_value: 100,
        target_boolean: true,
        target_text: '',
        unit: kpiUnits[0] || 'units',
        weight_percentage: 0,
        frequency: kpiFrequencies[0] || 'MONTHLY',
        kpi_type: kpiTypes[0] || 'OUTCOME',
        priority: kpiPriorities[0] || 'MEDIUM',
        status: 'DRAFT'
      }
    ]);
  };

  const updateKpiField = (id, key, value) => {
    setGoalKpis(prev => prev.map(k => k.id === id ? { ...k, [key]: value } : k));
  };

  const updateKpiMeasurementType = (id, type) => {
    setGoalKpis(prev => prev.map(k => {
      if (k.id === id) {
        const updated = { ...k, measurement_type: type };
        if (type === 'PERCENTAGE') {
          updated.unit = kpiUnits.find(u => u === '%' || u.toLowerCase() === 'percentage') || kpiUnits[0] || '';
          updated.target_value = 100;
        } else if (type === 'CURRENCY') {
          updated.unit = kpiUnits.find(u => u === 'INR' || u === '₹' || u === '$' || u.toLowerCase() === 'currency') || kpiUnits[0] || '';
          updated.target_value = 1000;
        } else if (type === 'BOOLEAN') {
          updated.unit = '';
          updated.target_boolean = true;
        } else if (type === 'NUMBER') {
          updated.unit = kpiUnits.find(u => u.toLowerCase() === 'units' || u.toLowerCase() === 'number') || kpiUnits[0] || '';
          updated.target_value = 100;
        } else if (type === 'TEXT') {
          updated.unit = '';
          updated.target_text = '';
        }
        return updated;
      }
      return k;
    }));
  };

  const removeKpi = (id) => {
    setGoalKpis(prev => prev.filter(k => k.id !== id));
  };

  const moveKpi = (index, direction) => {
    const newKpis = [...goalKpis];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newKpis.length) return;
    const temp = newKpis[index];
    newKpis[index] = newKpis[targetIdx];
    newKpis[targetIdx] = temp;
    setGoalKpis(newKpis);
  };

  const isFormValid = () => {
    if (!form.title.trim()) return false;
    if (currentWeight > 100) return false;
    if (startDateErr || dueDateErr) return false;
    if (form.goal_type === 'individual') {
      const canAssignOthers = isManagerOrAdmin && activeConfig?.goal_setting_direction !== 'BOTTOM_UP';
      if (canAssignOthers && !form.assigned_to_employee_id) return false;
    }
    if (form.goal_type === 'department') {
      if (!form.assigned_to_department_id) return false;
    }
    if (form.performance_technique === 'COMPETENCY_ASSESSMENT') {
      const compSum = goalCompetencies.reduce((sum, c) => sum + parseFloat(c.weight || 0), 0);
      if (Math.abs(compSum - 100) > 0.01) return false;
    }
    if (form.performance_technique === 'SELF_ASSESSMENT') {
      const saSum = selfAssessmentQuestions.reduce((sum, q) => sum + parseFloat(q.weight || 0), 0);
      if (Math.abs(saSum - 100) > 0.01) return false;
    }
    if (form.performance_technique === '360_FEEDBACK') {
      const sum = feedback360Questions.reduce((acc, q) => acc + parseFloat(q.weight || 0), 0);
      if (Math.abs(sum - 100) > 0.01) return false;
    }
    if (form.performance_technique === 'KPI') {
      if (goalKpis.length === 0) return false;
      const kpisSum = goalKpis.reduce((sum, k) => sum + parseFloat(k.weight_percentage || 0), 0);
      if (Math.abs(kpisSum - 100) > 0.01) return false;
      if (goalKpis.some(k => !k.title?.trim())) return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!isFormValid()) return;
    const payload = {
      ...form,
      weight: parseFloat(form.weight) || 0.00,
      reflection_template: form.performance_technique === 'CONTINUOUS_FEEDBACK' ? reflectionQuestions : [],
      competencies: form.performance_technique === 'COMPETENCY_ASSESSMENT' ? goalCompetencies : [],
      self_assessment_template: form.performance_technique === 'SELF_ASSESSMENT' ? selfAssessmentQuestions.map((q, idx) => ({
        question: q.question,
        question_type: q.question_type,
        display_order: idx + 1,
        required: q.required,
        weight: q.weight,
        options_json: q.options_json
      })) : [],
      feedback360_config: null,
      feedback360_template: form.performance_technique === '360_FEEDBACK' ? feedback360Questions.map((q, idx) => ({
        question: q.question,
        question_type: q.question_type,
        display_order: idx + 1,
        required: q.required,
        weight: q.weight,
        options_json: q.options_json
      })) : [],
      kpis: form.performance_technique === 'KPI' ? goalKpis.map((k, idx) => ({
        title: k.title,
        description: k.description,
        measurement_type: k.measurement_type,
        target_value: k.measurement_type !== 'BOOLEAN' && k.measurement_type !== 'TEXT' ? parseFloat(k.target_value) : null,
        target_boolean: k.measurement_type === 'BOOLEAN' ? !!k.target_boolean : null,
        target_text: k.measurement_type === 'TEXT' ? k.target_text : null,
        unit: k.unit,
        weight_percentage: parseFloat(k.weight_percentage) || 0.00,
        frequency: k.frequency,
        kpi_type: k.kpi_type,
        priority: k.priority,
        status: k.status || 'DRAFT'
      })) : []
    };
    onSave(payload);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: step === 'type' ? 520 : 680, maxHeight: '90vh', overflowY: 'auto',
        background: '#ffffff', borderRadius: 16, padding: '28px 32px',
        border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>

        {/* ─── Step 1: Type Selection ─── */}
        {step === 'type' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Select Goal Type</h2>
              <button onClick={onClose} style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(15,23,42,0.05)', border: 'none', borderRadius: 8,
                cursor: 'pointer', color: '#64748b', fontSize: 16,
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allowedTypes.map(t => (
                <div
                  key={t.code}
                  onClick={() => handleTypeSelect(t.code)}
                  style={{
                    padding: '18px 20px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${selectedType === t.code ? '#6366f1' : '#e2e8f0'}`,
                    background: selectedType === t.code ? 'rgba(99,102,241,0.03)' : '#fff',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                  onMouseEnter={e => { if (selectedType !== t.code) e.currentTarget.style.borderColor = '#c7d2fe' }}
                  onMouseLeave={e => { if (selectedType !== t.code) e.currentTarget.style.borderColor = '#e2e8f0' }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: selectedType === t.code ? 'rgba(99,102,241,0.08)' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>{t.icon}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{t.description}</div>
                  </div>
                  {selectedType === t.code && (
                    <div style={{ marginLeft: 'auto', color: '#6366f1', fontSize: 20, fontWeight: 700 }}>✓</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0',
                background: '#f8fafc', color: '#64748b', fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600,
              }}>Cancel</button>
              <button onClick={handleContinue} disabled={!selectedType} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: selectedType ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#e2e8f0',
                color: selectedType ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 700,
                cursor: selectedType ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                boxShadow: selectedType ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
              }}>Continue →</button>
            </div>
          </>
        )}

        {/* ─── Step 2: Goal Form ─── */}
        {step === 'form' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                  {isEdit ? 'Edit Goal' : 'Create Goal'}
                </h2>
                {!isEdit && selectedType && (
                  <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginTop: 4 }}>
                    {goalTypes.find(t => t.code === selectedType)?.icon} {goalTypes.find(t => t.code === selectedType)?.name}
                  </div>
                )}
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(15,23,42,0.05)', border: 'none', borderRadius: 8,
                cursor: 'pointer', color: '#64748b', fontSize: 16,
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Section 1: Basic Details */}
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <SectionHeader num="1" title="Basic Details" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Field label="Title *">
                    <input
                      type="text"
                      placeholder="e.g. Increase Q3 revenue by 25%"
                      value={form.title}
                      onChange={e => setField('title', e.target.value)}
                      style={selSt}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      placeholder="Describe what this goal aims to achieve…"
                      value={form.description}
                      onChange={e => setField('description', e.target.value)}
                      rows={2}
                      style={{ ...selSt, resize: 'vertical' }}
                    />
                  </Field>
                </div>
              </div>

              {/* Section 2: Planning & Allocation */}
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <SectionHeader num="2" title="Planning & Allocation" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Category *">
                    <select
                      value={form.goal_category_id}
                      onChange={e => setField('goal_category_id', e.target.value)}
                      style={selSt}
                    >
                      {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Goal Type *">
                    <select
                      value={form.goal_type}
                      onChange={e => setField('goal_type', e.target.value)}
                      disabled={isEdit}
                      style={{ ...selSt, background: isEdit ? '#f1f5f9' : '#ffffff', cursor: isEdit ? 'not-allowed' : 'pointer' }}
                    >
                      <option value="individual">👤 Individual Goal</option>
                      {isManagerOrAdmin && <option value="department">🏢 Department Goal</option>}
                      {isManagerOrAdmin && <option value="company">🌐 Company Goal</option>}
                    </select>
                  </Field>
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field label="Performance Technique *">
                      <select
                        value={form.performance_technique}
                        onChange={e => setField('performance_technique', e.target.value)}
                        disabled={isEdit}
                        style={{ ...selSt, background: isEdit ? '#f1f5f9' : '#ffffff', cursor: isEdit ? 'not-allowed' : 'pointer' }}
                      >
                        {availableTechniques.map(t => (
                          <option key={t.technique_id || t.code} value={t.code}>{t.icon} {t.name} — {t.description}</option>
                        ))}
                      </select>
                      {isEdit && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          🔒 Performance Technique is locked after goal creation and cannot be changed.
                        </div>
                      )}
                    </Field>
                  </div>

                  {form.performance_technique === 'CONTINUOUS_FEEDBACK' && !isEdit && (
                    <div style={{ gridColumn: 'span 2', marginTop: 10, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                            📋 Reflection Template Configuration
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Define custom reflection questions for employees assigned to this goal.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={addQuestion}
                          style={{
                            padding: '6px 12px', background: '#0f766e', color: '#ffffff',
                            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          + Add Question
                        </button>
                      </div>

                      {reflectionQuestions.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          No reflection questions added yet. Click <strong>+ Add Question</strong> above to configure questions.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {reflectionQuestions.map((q, idx) => (
                            <div key={q.id || idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', width: 24 }}>Q{idx + 1}.</span>
                                <input
                                  type="text"
                                  placeholder="Enter reflection question (e.g. What did you learn this week?)"
                                  value={q.question}
                                  onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                                  style={{ ...selSt, flex: 1 }}
                                />
                                <select
                                  value={q.input_type}
                                  onChange={e => updateQuestion(q.id, 'input_type', e.target.value)}
                                  style={{ ...selSt, width: 150 }}
                                >
                                  <option value="TEXTAREA">💬 Textarea (Long)</option>
                                  <option value="TEXT">✏️ Short Text</option>
                                  <option value="RATING">⭐ Rating Scale (1-5)</option>
                                  <option value="BOOLEAN">☑️ Yes/No Toggle</option>
                                  <option value="CHOICE">🔘 Multiple Choice</option>
                                  <option value="CHECKLIST">🗹 Checklist / Box</option>
                                </select>
                                {(q.input_type === 'CHOICE' || q.input_type === 'CHECKLIST') && (
                                  <input
                                    type="text"
                                    placeholder="Options (comma-separated, e.g. High, Medium, Low)"
                                    value={q.choices || ''}
                                    onChange={e => updateQuestion(q.id, 'choices', e.target.value)}
                                    style={{ ...selSt, width: 200 }}
                                  />
                                )}
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  <input
                                    type="checkbox"
                                    checked={q.is_required}
                                    onChange={e => updateQuestion(q.id, 'is_required', e.target.checked)}
                                  />
                                  Required
                                </label>
                                <button type="button" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} style={{ padding: '2px 6px', fontSize: 11 }}>↑</button>
                                <button type="button" onClick={() => moveQuestion(idx, 1)} disabled={idx === reflectionQuestions.length - 1} style={{ padding: '2px 6px', fontSize: 11 }}>↓</button>
                                <button type="button" onClick={() => removeQuestion(q.id)} style={{ padding: '2px 8px', fontSize: 11, color: '#ef4444', border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {form.performance_technique === 'SELF_ASSESSMENT' && (
                    <div style={{ gridColumn: 'span 2', marginTop: 10, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>
                            🙋 Employee Self Evaluation Form Builder
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Design custom questionnaire questions, weights, and rules for this goal.
                          </div>
                        </div>
                        {(!isEdit || selfAssessmentQuestions.length === 0) && (
                          <button
                            type="button"
                            onClick={addSelfAssessmentQuestion}
                            style={{
                              padding: '6px 12px', background: '#4338ca', color: '#ffffff',
                              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            + Add Question
                          </button>
                        )}
                      </div>

                      {fetchingSelfAssessment ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                          Loading template...
                        </div>
                      ) : selfAssessmentQuestions.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          No questions configured yet. Click <strong>+ Add Question</strong> to proceed.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {selfAssessmentQuestions.map((q, idx) => (
                            <div key={q.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', minWidth: 24 }}>Q{idx + 1}.</span>
                                  <input
                                    type="text"
                                    placeholder="Enter question text (e.g. Describe your achievements this cycle)"
                                    value={q.question}
                                    onChange={e => updateSelfAssessmentQuestion(q.id, 'question', e.target.value)}
                                    disabled={isEdit}
                                    style={{ ...selSt, flex: 1, padding: '6px 10px', height: 34, fontSize: 12 }}
                                  />
                                  <select
                                    value={q.question_type}
                                    onChange={e => updateSelfAssessmentQuestion(q.id, 'question_type', e.target.value)}
                                    disabled={isEdit}
                                    style={{ ...selSt, width: 160, padding: '4px 10px', height: 34, fontSize: 12 }}
                                  >
                                    <option value="LONG_TEXT">💬 Long Text</option>
                                    <option value="SHORT_TEXT">✏️ Short Text</option>
                                    <option value="NUMBER">🔢 Number</option>
                                    <option value="CURRENCY">💵 Currency</option>
                                    <option value="URL">🔗 URL</option>
                                    <option value="DATE">📅 Date</option>
                                    <option value="PERCENTAGE">٪ Percentage</option>
                                    <option value="RATING_1_5">⭐ Rating (1-5)</option>
                                    <option value="SCALE_1_10">📊 Scale (1-10)</option>
                                    <option value="YES_NO">☑️ Yes/No</option>
                                    <option value="MULTIPLE_CHOICE">🔘 Multiple Choice</option>
                                    <option value="CHECKBOX">🗹 Checkbox</option>
                                    <option value="FILE_UPLOAD">📎 File Upload</option>
                                    <option value="SIGNATURE">✍️ Signature</option>
                                  </select>
                                  {!isEdit && (
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button type="button" onClick={() => moveSelfAssessmentQuestion(idx, -1)} disabled={idx === 0} style={{ padding: '4px 8px', fontSize: 11 }}>↑</button>
                                      <button type="button" onClick={() => moveSelfAssessmentQuestion(idx, 1)} disabled={idx === selfAssessmentQuestions.length - 1} style={{ padding: '4px 8px', fontSize: 11 }}>↓</button>
                                      <button type="button" onClick={() => removeSelfAssessmentQuestion(q.id)} style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444', border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Weight:</span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      placeholder="Weight"
                                      value={q.weight || ''}
                                      onChange={e => updateSelfAssessmentQuestion(q.id, 'weight', e.target.value)}
                                      disabled={isEdit}
                                      style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11, textAlign: 'center' }}
                                    />
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>%</span>
                                  </div>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569', cursor: isEdit ? 'not-allowed' : 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={q.required}
                                      onChange={e => updateSelfAssessmentQuestion(q.id, 'required', e.target.checked)}
                                      disabled={isEdit}
                                    />
                                    Required
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569', cursor: isEdit ? 'not-allowed' : 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={q.options_json?.evidence_required || false}
                                      onChange={e => updateSelfAssessmentQuestionOption(q.id, 'evidence_required', e.target.checked)}
                                      disabled={isEdit}
                                    />
                                    Evidence Required
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569', cursor: isEdit ? 'not-allowed' : 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={q.options_json?.attachments_required || false}
                                      onChange={e => updateSelfAssessmentQuestionOption(q.id, 'attachments_required', e.target.checked)}
                                      disabled={isEdit}
                                    />
                                    Attachments Required
                                  </label>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Guidelines / Instructions for the employee..."
                                      value={q.options_json?.instructions || ''}
                                      onChange={e => updateSelfAssessmentQuestionOption(q.id, 'instructions', e.target.value)}
                                      disabled={isEdit}
                                      style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11 }}
                                    />
                                  </div>
                                  {(q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'CHECKBOX') && (
                                    <div>
                                      <input
                                        type="text"
                                        placeholder="Choices (comma-separated, e.g. High, Med, Low)"
                                        value={(q.options_json?.choices || []).join(', ')}
                                        onChange={e => updateSelfAssessmentQuestionOption(q.id, 'choices', e.target.value.split(',').map(s => s.trim()))}
                                        disabled={isEdit}
                                        style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11 }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, fontSize: 13, fontWeight: 700 }}>
                            <span style={{ color: '#475569', marginRight: 8 }}>Total Questionnaire Weight:</span>
                            {(() => {
                              const sum = selfAssessmentQuestions.reduce((acc, sq) => acc + parseFloat(sq.weight || 0), 0);
                              const isExactly100 = Math.abs(sum - 100) < 0.01;
                              return (
                                <span style={{ color: isExactly100 ? '#16a34a' : '#dc2626', background: isExactly100 ? '#f0fdf4' : '#fef2f2', padding: '4px 12px', borderRadius: 6, border: `1px solid ${isExactly100 ? '#bbf7d0' : '#fca5a5'}` }}>
                                  {sum.toFixed(2)}{"% / 100% "}{isExactly100 ? '✓' : '⚠️ Must sum to 100%'}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {form.performance_technique === 'KPI' && (
                    <div style={{ gridColumn: 'span 2', marginTop: 10, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                            📈 KPI (Key Performance Indicator) Builder
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Configure individual KPIs, targets, weights, and measurement metrics.
                          </div>
                        </div>
                        {(!isEdit || goalKpis.length === 0) && (
                          <button
                            type="button"
                            onClick={addKpi}
                            style={{
                              padding: '6px 12px', background: '#0f766e', color: '#ffffff',
                              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            + Add KPI
                          </button>
                        )}
                      </div>

                      {fetchingKpis ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                          Loading KPIs...
                        </div>
                      ) : goalKpis.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          No KPIs configured yet. Click <strong>+ Add KPI</strong> to build metrics.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {goalKpis.map((k, idx) => (
                            <div key={k.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', minWidth: 24 }}>KPI {idx + 1}.</span>
                                  <input
                                    type="text"
                                    placeholder="Enter KPI Title (e.g. Sales Revenue, Units Produced)"
                                    value={k.title}
                                    onChange={e => updateKpiField(k.id, 'title', e.target.value)}
                                    disabled={isEdit}
                                    style={{ ...selSt, flex: 1, padding: '6px 10px', height: 34, fontSize: 12 }}
                                  />
                                  <select
                                    value={k.measurement_type}
                                    onChange={e => updateKpiMeasurementType(k.id, e.target.value)}
                                    disabled={isEdit}
                                    style={{ ...selSt, width: 140, padding: '4px 10px', height: 34, fontSize: 12 }}
                                  >
                                    {kpiMeasurementTypes.map(t => (
                                      <option key={t} value={t}>
                                        {t === 'NUMBER' ? '🔢 Number' : t === 'PERCENTAGE' ? '٪ Percentage' : t === 'CURRENCY' ? '💵 Currency' : t === 'BOOLEAN' ? '☑️ Yes/No' : '✏️ Text'}
                                      </option>
                                    ))}
                                  </select>
                                  {!isEdit && (
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button type="button" onClick={() => moveKpi(idx, -1)} disabled={idx === 0} style={{ padding: '4px 8px', fontSize: 11 }}>↑</button>
                                      <button type="button" onClick={() => moveKpi(idx, 1)} disabled={idx === goalKpis.length - 1} style={{ padding: '4px 8px', fontSize: 11 }}>↓</button>
                                      <button type="button" onClick={() => removeKpi(k.id)} style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444', border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Weight:</span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      placeholder="Weight"
                                      value={k.weight_percentage || ''}
                                      onChange={e => updateKpiField(k.id, 'weight_percentage', e.target.value)}
                                      disabled={isEdit}
                                      style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11, textAlign: 'center', width: 60 }}
                                    />
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>%</span>
                                  </div>

                                  {k.measurement_type !== 'BOOLEAN' && k.measurement_type !== 'TEXT' && (
                                    <>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Target:</span>
                                        <input
                                          type="number"
                                          placeholder="Target"
                                          value={k.target_value !== undefined ? k.target_value : ''}
                                          onChange={e => updateKpiField(k.id, 'target_value', e.target.value)}
                                          disabled={isEdit}
                                          style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11, width: 80 }}
                                        />
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Unit:</span>
                                        <select
                                          value={k.unit || ''}
                                          onChange={e => updateKpiField(k.id, 'unit', e.target.value)}
                                          disabled={isEdit}
                                          style={{ ...selSt, height: 28, padding: '2px 6px', fontSize: 11, width: 100 }}
                                        >
                                          {kpiUnits.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </>
                                  )}

                                  {k.measurement_type === 'BOOLEAN' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Target:</span>
                                      <select
                                        value={k.target_boolean !== undefined ? String(k.target_boolean) : 'true'}
                                        onChange={e => updateKpiField(k.id, 'target_boolean', e.target.value === 'true')}
                                        disabled={isEdit}
                                        style={{ ...selSt, height: 28, padding: '2px 6px', fontSize: 11, width: 100 }}
                                      >
                                        <option value="true">Yes / True</option>
                                        <option value="false">No / False</option>
                                      </select>
                                    </div>
                                  )}

                                  {k.measurement_type === 'TEXT' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, gridColumn: 'span 2' }}>
                                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Target:</span>
                                      <input
                                        type="text"
                                        placeholder="Describe desired qualitative target outcome..."
                                        value={k.target_text || ''}
                                        onChange={e => updateKpiField(k.id, 'target_text', e.target.value)}
                                        disabled={isEdit}
                                        style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11, flex: 1 }}
                                      />
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Type:</span>
                                    <select
                                      value={k.kpi_type || 'OUTCOME'}
                                      onChange={e => updateKpiField(k.id, 'kpi_type', e.target.value)}
                                      disabled={isEdit}
                                      style={{ ...selSt, height: 28, padding: '2px 6px', fontSize: 11, width: 110 }}
                                    >
                                      {kpiTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <input
                                    type="text"
                                    placeholder="Enter detailed description / target measurement rules..."
                                    value={k.description || ''}
                                    onChange={e => updateKpiField(k.id, 'description', e.target.value)}
                                    disabled={isEdit}
                                    style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11 }}
                                  />
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Frequency:</span>
                                      <select
                                        value={k.frequency || 'MONTHLY'}
                                        onChange={e => updateKpiField(k.id, 'frequency', e.target.value)}
                                        disabled={isEdit}
                                        style={{ ...selSt, height: 28, padding: '2px 6px', fontSize: 11, width: 110 }}
                                      >
                                        {kpiFrequencies.map(f => (
                                          <option key={f} value={f}>{f}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Priority:</span>
                                      <select
                                        value={k.priority || 'MEDIUM'}
                                        onChange={e => updateKpiField(k.id, 'priority', e.target.value)}
                                        disabled={isEdit}
                                        style={{ ...selSt, height: 28, padding: '2px 6px', fontSize: 11, width: 100 }}
                                      >
                                        {kpiPriorities.map(p => (
                                          <option key={p} value={p}>{p}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, fontSize: 13, fontWeight: 700 }}>
                            <span style={{ color: '#475569', marginRight: 8 }}>Total KPI Weight:</span>
                            {(() => {
                              const sum = goalKpis.reduce((acc, k) => acc + parseFloat(k.weight_percentage || 0), 0);
                              const isExactly100 = Math.abs(sum - 100) < 0.01;
                              return (
                                <span style={{ color: isExactly100 ? '#16a34a' : '#dc2626', background: isExactly100 ? '#f0fdf4' : '#fef2f2', padding: '4px 12px', borderRadius: 6, border: `1px solid ${isExactly100 ? '#bbf7d0' : '#fca5a5'}` }}>
                                  {sum.toFixed(2)}{"% / 100% "}{isExactly100 ? '✓' : '⚠️ Must sum to 100%'}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {form.performance_technique === '360_FEEDBACK' && (
                    <div style={{ gridColumn: 'span 2', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      
                      {/* A. Questionnaire Builder */}
                      <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>
                              🔄 Feedback Questionnaire Builder
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              Define questions and weights for this multi-rater 360 Feedback cycle.
                            </div>
                          </div>
                          {!isEdit && (
                            <button
                              type="button"
                              onClick={addFeedback360Question}
                              style={{
                                padding: '6px 12px', background: '#4f46e5', color: '#ffffff',
                                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              + Add Question
                            </button>
                          )}
                        </div>

                        {fetchingFeedback360 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                            Loading template...
                          </div>
                        ) : feedback360Questions.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            No questions configured yet. Click <strong>+ Add Question</strong> to proceed.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {feedback360Questions.map((q, idx) => (
                              <div key={q.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', minWidth: 24 }}>Q{idx + 1}.</span>
                                    <input
                                      type="text"
                                      placeholder="Enter question text (e.g. Rate this employee's collaboration skills)"
                                      value={q.question}
                                      onChange={e => updateFeedback360Question(q.id, 'question', e.target.value)}
                                      disabled={isEdit}
                                      style={{ ...selSt, flex: 1, padding: '6px 10px', height: 34, fontSize: 12 }}
                                    />
                                    <select
                                      value={q.question_type}
                                      onChange={e => updateFeedback360Question(q.id, 'question_type', e.target.value)}
                                      disabled={isEdit}
                                      style={{ ...selSt, width: 160, padding: '4px 10px', height: 34, fontSize: 12 }}
                                    >
                                      <option value="RATING_1_5">Rating (1-5)</option>
                                      <option value="SCALE_1_10">Scale (1-10)</option>
                                      <option value="PERCENTAGE">% Percentage</option>
                                      <option value="YES_NO">Yes/No</option>
                                      <option value="LONG_TEXT">Long Text</option>
                                      <option value="SHORT_TEXT">Short Text</option>
                                    </select>
                                    {!isEdit && (
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        <button type="button" onClick={() => moveFeedback360Question(idx, -1)} disabled={idx === 0} style={{ padding: '4px 8px', fontSize: 11 }}>↑</button>
                                        <button type="button" onClick={() => moveFeedback360Question(idx, 1)} disabled={idx === feedback360Questions.length - 1} style={{ padding: '4px 8px', fontSize: 11 }}>↓</button>
                                        <button type="button" onClick={() => removeFeedback360Question(q.id)} style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444', border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Weight:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        placeholder="Weight"
                                        value={q.weight || ''}
                                        onChange={e => updateFeedback360Question(q.id, 'weight', parseFloat(e.target.value) || 0)}
                                        disabled={isEdit}
                                        style={{ ...selSt, height: 28, padding: '4px 8px', fontSize: 11, textAlign: 'center', width: 80 }}
                                      />
                                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>%</span>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569', cursor: isEdit ? 'not-allowed' : 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={q.required}
                                        onChange={e => updateFeedback360Question(q.id, 'required', e.target.checked)}
                                        disabled={isEdit}
                                      />
                                      Required question
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, fontSize: 13, fontWeight: 700 }}>
                              <span style={{ color: '#475569', marginRight: 8 }}>Total Questionnaire Weight:</span>
                              {(() => {
                                const sum = feedback360Questions.reduce((acc, sq) => acc + parseFloat(sq.weight || 0), 0);
                                const isExactly100 = Math.abs(sum - 100) < 0.01;
                                return (
                                  <span style={{ color: isExactly100 ? '#16a34a' : '#dc2626', background: isExactly100 ? '#f0fdf4' : '#fef2f2', padding: '4px 12px', borderRadius: 6, border: `1px solid ${isExactly100 ? '#bbf7d0' : '#fca5a5'}` }}>
                                    {sum.toFixed(2)}{"% / 100% "}{isExactly100 ? '✓' : '⚠️ Must sum to 100%'}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {form.performance_technique === 'COMPETENCY_ASSESSMENT' && (
                    <div style={{ gridColumn: 'span 2', marginTop: 10, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>
                            📋 Goal Competencies Configuration
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Select competencies from the library or create custom goal-specific competencies.
                          </div>
                        </div>
                        <div>
                          <select
                            onChange={e => {
                              addCompetency(e.target.value);
                              e.target.value = '';
                            }}
                            defaultValue=""
                            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 600, outline: 'none' }}
                          >
                            <option value="" disabled>+ Add Competency...</option>
                            <option value="custom">✍️ Create Custom Competency</option>
                            {libraryCompetencies.map(c => {
                              const alreadyAdded = goalCompetencies.some(gc => gc.competency_library_id === c.competency_id);
                              return (
                                <option key={c.competency_id} value={c.competency_id} disabled={alreadyAdded}>
                                  {c.name} {alreadyAdded ? '(Added)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {goalCompetencies.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          No competencies configured for this goal yet. Add at least one competency from the library to proceed.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {goalCompetencies.map((gc, idx) => (
                            <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: 12, alignItems: 'center', marginBottom: gc.competency_library_id ? 0 : 8 }}>
                                <div>
                                  {gc.competency_library_id ? (
                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                                      {gc.name} <span style={{ fontSize: 10, color: '#6366f1', background: '#e0e7ff', padding: '2px 6px', borderRadius: 10, marginLeft: 6 }}>Library</span>
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="Enter Custom Competency Name"
                                      value={gc.name}
                                      onChange={e => updateCompetency(idx, 'name', e.target.value)}
                                      style={{ ...selSt, height: 32, padding: '4px 10px', fontSize: 12 }}
                                    />
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder="Weight"
                                    value={gc.weight || ''}
                                    onChange={e => updateCompetency(idx, 'weight', e.target.value)}
                                    style={{ ...selSt, height: 32, padding: '4px 8px', fontSize: 12, textAlign: 'center' }}
                                  />
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>%</span>
                                </div>

                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                  <button type="button" onClick={() => moveCompetency(idx, -1)} disabled={idx === 0} style={{ padding: '2px 6px', fontSize: 11 }}>↑</button>
                                  <button type="button" onClick={() => moveCompetency(idx, 1)} disabled={idx === goalCompetencies.length - 1} style={{ padding: '2px 6px', fontSize: 11 }}>↓</button>
                                  <button type="button" onClick={() => removeCompetency(idx)} style={{ padding: '2px 8px', fontSize: 11, color: '#ef4444', border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                                </div>
                              </div>

                              {!gc.competency_library_id && (
                                <textarea
                                  placeholder="Enter custom competency description..."
                                  value={gc.description || ''}
                                  onChange={e => updateCompetency(idx, 'description', e.target.value)}
                                  rows={1}
                                  style={{ ...selSt, fontSize: 11, padding: '4px 10px', resize: 'vertical' }}
                                />
                              )}
                            </div>
                          ))}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, fontSize: 13, fontWeight: 700 }}>
                            <span style={{ color: '#475569', marginRight: 8 }}>Total Competency Weight:</span>
                            {(() => {
                              const sum = goalCompetencies.reduce((acc, gc) => acc + parseFloat(gc.weight || 0), 0);
                              const isExactly100 = Math.abs(sum - 100) < 0.01;
                              return (
                                <span style={{ color: isExactly100 ? '#16a34a' : '#dc2626', background: isExactly100 ? '#f0fdf4' : '#fef2f2', padding: '4px 12px', borderRadius: 6, border: `1px solid ${isExactly100 ? '#bbf7d0' : '#fca5a5'}` }}>
                                  {sum}% / 100% {isExactly100 ? '✓' : '⚠️ Must sum to 100%'}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <Field label="Goal Weight (%) *">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.weight}
                      onChange={e => setField('weight', e.target.value)}
                      style={selSt}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
                      All top-level goals in this Performance Cycle must total 100%.
                    </div>
                  </Field>
                  <Field label="Priority *">
                    <select
                      value={form.priority}
                      onChange={e => setField('priority', e.target.value)}
                      style={selSt}
                    >
                      {priorities.map(p => <option key={p.priority_id || p.code} value={p.code}>{p.name}</option>)}
                    </select>
                  </Field>
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field label="Visibility">
                      <select
                        value={form.visibility}
                        onChange={e => setField('visibility', e.target.value)}
                        style={selSt}
                      >
                        {visibilityOptions.map(v => <option key={v.visibility_id || v.code} value={v.code}>{v.name}</option>)}
                      </select>
                    </Field>
                  </div>

                  {form.goal_type === 'individual' && (isManagerOrAdmin && activeConfig?.goal_setting_direction !== 'BOTTOM_UP') && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <Field label="Assign to Employee *">
                        <select
                          value={form.assigned_to_employee_id}
                          onChange={e => setField('assigned_to_employee_id', e.target.value)}
                          style={selSt}
                        >
                          <option value="">— Select Employee —</option>
                          {employees.map(e => (
                            <option key={e.employee_id} value={e.employee_id}>
                              {e.first_name} {e.last_name} {e.employee_code ? `[${e.employee_code}]` : ''}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  )}

                  {form.goal_type === 'department' && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <Field label="Assign to Department *">
                        <select
                          value={form.assigned_to_department_id}
                          onChange={e => setField('assigned_to_department_id', e.target.value)}
                          style={selSt}
                        >
                          <option value="">— Select Department —</option>
                          {departments.map(d => (
                            <option key={d.department_id} value={d.department_id}>{d.name}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Timeline */}
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <SectionHeader num="3" title="Timeline" />
                {cycleMin && cycleMax && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 8, padding: '7px 12px', marginBottom: 12, fontSize: 12, color: '#1d4ed8', fontWeight: 600
                  }}>
                    📅 Cycle: {fmtDate(cycleMin)} — {fmtDate(cycleMax)}
                    <span style={{ fontWeight: 400, color: '#3b82f6', marginLeft: 4 }}>· Dates must stay within this range</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <Field label="Start Date">
                      <input
                        type="date"
                        value={form.start_date}
                        min={cycleMin || undefined}
                        max={cycleMax || undefined}
                        onChange={e => setField('start_date', e.target.value)}
                        style={{ ...selSt, borderColor: startDateErr ? '#ef4444' : '#cbd5e1' }}
                      />
                    </Field>
                    {startDateErr && (
                      <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>⚠ {startDateErr}</div>
                    )}
                  </div>
                  <div>
                    <Field label="Due Date">
                      <input
                        type="date"
                        value={form.due_date}
                        min={form.start_date || cycleMin || undefined}
                        max={cycleMax || undefined}
                        onChange={e => setField('due_date', e.target.value)}
                        style={{ ...selSt, borderColor: dueDateErr ? '#ef4444' : '#cbd5e1' }}
                      />
                    </Field>
                    {dueDateErr && (
                      <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>⚠ {dueDateErr}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Hierarchy */}
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <SectionHeader num="4" title="Hierarchy Mapping" />
                <Field label="Parent Goal (optional)">
                  <select value={form.parent_goal_id} onChange={e => setField('parent_goal_id', e.target.value)} style={selSt}>
                    <option value="">— None (top-level goal) —</option>
                    {parentGoals.map(g => (
                      <option key={g.goal_id} value={g.goal_id}>
                        {g.title} {g.goal_code ? `[${g.goal_code}]` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Section 5: Performance Cycle Summary */}
              {true && (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <SectionHeader num="5" title="Performance Cycle Plan Validation" />
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
                    padding: '12px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{typeLabel} Weight</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: currentWeight > 100 ? '#dc2626' : currentWeight === 100 ? '#16a34a' : '#2563eb' }}>
                        {currentWeight}% / 100%
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>for {typeLabel} goals only</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Goals Count</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: goalCount >= maxGoals ? '#dc2626' : '#0891b2' }}>
                        {isEdit ? goalCount : goalCount + 1} / {maxGoals}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Remaining</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: (100 - currentWeight) <= 0 ? '#16a34a' : '#ea580c' }}>
                        {Math.max(0, 100 - currentWeight)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
              {!isEdit && (
                <button onClick={() => setStep('type')} style={{
                  padding: '10px 20px', borderRadius: 10, border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 600,
                }}>← Back</button>
              )}
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: 10, border: '1px solid #cbd5e1',
                background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600,
              }}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !isFormValid()}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: saving || !isFormValid() ? '#cbd5e1' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: saving || !isFormValid() ? '#94a3b8' : '#fff', fontSize: 13, fontWeight: 700,
                  cursor: saving || !isFormValid() ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  boxShadow: saving || !isFormValid() ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                }}
              >
                {saving ? 'Saving…' : isEdit ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
