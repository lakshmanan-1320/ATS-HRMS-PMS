import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import {
  FiUsers, FiCheckCircle, FiClock, FiEdit3, FiTrendingUp,
  FiSearch, FiX, FiFilter, FiSend, FiSave, FiChevronLeft, FiChevronRight,
} from 'react-icons/fi'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

function PerformanceReferenceContext({ context, technique }) {
  if (!context) return null;

  return (
    <div style={{
      marginTop: '12px',
      padding: '14px 16px',
      background: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Technique Reference: {technique.replace('_', ' ')}
        </span>
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>
          Read-only summary
        </span>
      </div>

      {/* KPI Reference */}
      {technique === 'KPI' && (
        context.kpis && context.kpis.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {context.kpis.map(kpi => (
              <div key={kpi.kpi_id} style={{ fontSize: '12px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>🎯 {kpi.title}</span>
                  <span style={{ color: '#6366f1' }}>{Math.round(Number(kpi.completion_percentage))}%</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Target: {kpi.target_value} | Current Approved: {kpi.approved_value} {kpi.unit || ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No KPIs assigned to this goal.</div>
        )
      )}

      {/* Competency Reference */}
      {(technique === 'COMPETENCY_ASSESSMENT' || technique === 'COMPETENCY') && (
        context.competency && context.competency.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {context.competency.map(comp => (
              <div key={comp.assessment_id} style={{ fontSize: '12px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>📋 {comp.competency_name}</span>
                  <span style={{ color: '#10b981' }}>Rating: {comp.rating}/5</span>
                </div>
                {comp.comment && <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>"{comp.comment}"</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No competency assessments logged for this goal yet.</div>
        )
      )}

      {/* Self Assessment Reference */}
      {technique === 'SELF_ASSESSMENT' && (
        context.selfAssessment ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
              Submission Status: <span style={{ color: '#b45309' }}>{context.selfAssessment.status}</span>
            </div>
            {context.selfAssessment.answers && context.selfAssessment.answers.map(ans => (
              <div key={ans.answer_id} style={{ fontSize: '12px', color: '#334155', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                <div style={{ fontWeight: '600' }}>Q: {ans.question}</div>
                <div style={{ marginTop: '2px', color: '#475569' }}>A: {ans.answer || ans.employee_rating || '-'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No self assessment submitted for this goal yet.</div>
        )
      )}

      {/* 360 Feedback Reference */}
      {(technique === '360_FEEDBACK' || technique === 'FEEDBACK_360') && (
        context.feedback360 ? (
          <div style={{ fontSize: '12px', color: '#334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '8px' }}>
              <span>👥 360° Assessment Score</span>
              <span style={{ color: '#8b5cf6' }}>{Math.round(Number(context.feedback360.overall_score || 0))}%</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#64748b' }}>
              <div>Peer Avg: {context.feedback360.peer_average ? `${Math.round(context.feedback360.peer_average)}%` : '-'}</div>
              <div>Direct Report Avg: {context.feedback360.direct_report_average ? `${Math.round(context.feedback360.direct_report_average)}%` : '-'}</div>
              <div>Manager Avg: {context.feedback360.manager_average ? `${Math.round(context.feedback360.manager_average)}%` : '-'}</div>
              <div>Completion: {context.feedback360.completion_percentage ? `${Math.round(context.feedback360.completion_percentage)}%` : '-'}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No 360 feedback summary available for this goal yet.</div>
        )
      )}

      {/* Continuous Feedback Reference */}
      {technique === 'CONTINUOUS_FEEDBACK' && (
        context.continuousFeedback ? (
          <div style={{ fontSize: '12px', color: '#334155' }}>
            <div style={{ fontWeight: '600', marginBottom: '6px', color: '#0f766e' }}>
              🏆 Praises Received: {context.continuousFeedback.praisesCount}
            </div>
            {context.continuousFeedback.coachingNotes && context.continuousFeedback.coachingNotes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Coaching Notes:</div>
                {context.continuousFeedback.coachingNotes.map((note, idx) => (
                  <div key={idx} style={{ fontSize: '11px', color: '#475569', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    {note.feedback_text}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No coaching notes logged for this goal.</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No continuous feedback logged for this goal.</div>
        )
      )}
    </div>
  );
}

const getFinalTechniqueScore = (goal) => {
  const ctx = goal.performanceContext || {}
  const tech = goal.performance_technique
  if (tech === 'KPI') {
    return goal.progress ? `${Number(goal.progress).toFixed(1)}%` : '0.0%'
  }
  if (tech === 'COMPETENCY_ASSESSMENT' || tech === 'COMPETENCY') {
    if (ctx.competency && ctx.competency.length > 0) {
      const avg = ctx.competency.reduce((sum, c) => sum + (c.rating || 0), 0) / ctx.competency.length
      return `${avg.toFixed(1)} / 5.0`
    }
    return 'Not Rated'
  }
  if (tech === 'SELF_ASSESSMENT') {
    const score = ctx.selfAssessment?.final_score || ctx.selfAssessment?.overall_employee_score
    return score ? `${Number(score).toFixed(1)}` : 'Not Rated'
  }
  if (tech === '360_FEEDBACK') {
    const score = ctx.feedback360?.final_score || ctx.feedback360?.overall_score
    return score ? `${Number(score).toFixed(1)}` : 'Not Rated'
  }
  return 'N/A'
}

const getOverallGoalScore = (goal) => {
  const tech = goal.performance_technique
  const weight = Number(goal.weight) || 0
  const ctx = goal.performanceContext || {}
  
  let scoreVal = 0
  if (tech === 'KPI') {
    scoreVal = (Number(goal.progress) || 0) / 100
  } else if (tech === 'COMPETENCY_ASSESSMENT' || tech === 'COMPETENCY') {
    if (ctx.competency && ctx.competency.length > 0) {
      const avg = ctx.competency.reduce((sum, c) => sum + (c.rating || 0), 0) / ctx.competency.length
      scoreVal = avg / 5
    }
  } else if (tech === 'SELF_ASSESSMENT') {
    const score = ctx.selfAssessment?.final_score || ctx.selfAssessment?.overall_employee_score
    scoreVal = (Number(score) || 0) / 100
  } else if (tech === '360_FEEDBACK') {
    const score = ctx.feedback360?.final_score || ctx.feedback360?.overall_score
    scoreVal = (Number(score) || 0) / 5
  }
  
  const contribution = scoreVal * weight
  return `${contribution.toFixed(1)}%`
}

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const CYCLE_STATUS = {
  active: { bg: '#fff', border: '#10b981', color: '#059669', dot: '#10b981', label: 'Active',  grad: 'linear-gradient(135deg,#10b981,#059669)' },
  closed: { bg: '#fff', border: '#6366f1', color: '#6366f1', dot: '#6366f1', label: 'Closed',  grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  draft:  { bg: '#fff', border: '#94a3b8', color: '#64748b', dot: '#94a3b8', label: 'Draft',   grad: 'linear-gradient(135deg,#94a3b8,#64748b)' },
}
const SELF_STATUS = {
  submitted: { color: '#059669', bg: 'rgba(16,185,129,0.1)',  label: 'Submitted'   },
  draft:     { color: '#d97706', bg: 'rgba(245,158,11,0.1)',  label: 'In Progress' },
}
const MGR_STATUS = {
  submitted: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Submitted'   },
  draft:     { color: '#64748b', bg: 'rgba(100,116,139,0.1)',label: 'In Progress' },
}
const RATING_META = {
  exceeds_expectations: { label: 'Exceeds Expectations', color: '#059669', bg: 'rgba(16,185,129,0.1)'  },
  good:                 { label: 'Good',                 color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  meets_expectations:   { label: 'Meets Expectations',   color: '#d97706', bg: 'rgba(245,158,11,0.1)'  },
  below_expectations:   { label: 'Below Expectations',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
}

const PAGE_SIZES = [5, 10, 20]

const inputSt = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: '10px', color: '#1e293b', fontSize: '13px', fontFamily: 'inherit',
  colorScheme: 'light', outline: 'none',
}

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6','#14b8a6','#f97316']
function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}
function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function calcWeightedScore(goals) {
  let wSum = 0, wTotal = 0
  for (const g of goals) {
    const w = Number(g.weight) || 0
    const tech = g.performance_technique
    const ctx = g.performanceContext || {}
    let pct = 0
    
    if (tech === 'KPI') {
      pct = Number(g.progress) || 0
    } else if (tech === 'COMPETENCY_ASSESSMENT' || tech === 'COMPETENCY') {
      if (ctx.competency && ctx.competency.length > 0) {
        const avg = ctx.competency.reduce((sum, c) => sum + (c.rating || 0), 0) / ctx.competency.length
        pct = (avg / 5.0) * 100
      }
    } else if (tech === 'SELF_ASSESSMENT') {
      pct = Number(ctx.selfAssessment?.final_score || ctx.selfAssessment?.overall_employee_score || 0)
    } else if (tech === '360_FEEDBACK' || tech === 'FEEDBACK_360') {
      pct = (Number(ctx.feedback360?.final_score || ctx.feedback360?.overall_score || 0) / 5.0) * 100
    } else {
      pct = Number(g.progress) || 0
    }
    
    wSum += (pct / 100) * w
    wTotal += w
  }
  if (wTotal === 0) return 0
  return Math.round((wSum / wTotal) * 100)
}
function deriveFinalRating(score) {
  if (score >= 90) return 'exceeds_expectations'
  if (score >= 70) return 'good'
  if (score >= 40) return 'meets_expectations'
  return 'below_expectations'
}

function PageNumbers({ current, total, onChange }) {
  if (total <= 1) return null
  const pages = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('…')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('…')
    pages.push(total)
  }
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '13px' }}>…</span>
        ) : (
          <button key={p} onClick={() => onChange(p)}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', border: '1px solid',
              borderColor: p === current ? 'transparent' : '#e2e8f0',
              background: p === current ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#ffffff',
              color: p === current ? '#fff' : '#64748b',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: p === current ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
              transition: 'all 0.15s',
            }}>
            {p}
          </button>
        )
      )}
    </div>
  )
}

export default function ManagerAppraisal({ isSubComponent = false }) {
  const [cycles, setCycles]               = useState([])
  const [selectedCycle, setSelectedCycle] = useState(null)
  const [team, setTeam]                   = useState([])
  const [teamPage, setTeamPage]           = useState(1)
  const [pageSize, setPageSize]           = useState(10)
  const [search, setSearch]               = useState('')
  const [teamLoading, setTeamLoading]     = useState(false)
  const [selectedEmp, setSelectedEmp]     = useState(null)
  const [appraisalData, setAppraisalData] = useState(null)
  const [ratings, setRatings]             = useState({})
  const [overallComment, setOverallComment] = useState('')
  const [finalRating, setFinalRating]     = useState('')
  const [promotionRecommendation, setPromotionRecommendation] = useState('')
  const [trainingRecommendation, setTrainingRecommendation] = useState('')
  const [loading, setLoading]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [err, setErr]                     = useState('')
  const [success, setSuccess]             = useState('')
  const [cycleFilter, setCycleFilter]     = useState('all')
  const [teamFilter, setTeamFilter]       = useState('all')
  const [teamSort, setTeamSort]           = useState('name')
  const [desigFilter, setDesigFilter]     = useState('all')
  const [showFilters, setShowFilters]     = useState(true)

  useEffect(() => {
    api.get('/employee/appraisal/cycles')
      .then(r => setCycles(r.data || []))
      .catch(e => setErr(e.response?.data?.message || 'Failed to load appraisal cycles'))
  }, [])

  const cycleCounts = {
    all:    cycles.length,
    active: cycles.filter(c => c.status === 'active').length,
    closed: cycles.filter(c => c.status === 'closed').length,
    draft:  cycles.filter(c => c.status === 'draft').length,
  }
  const filteredCycles = cycleFilter === 'all' ? cycles : cycles.filter(c => c.status === cycleFilter)

  const designations = useMemo(() => {
    const s = new Set()
    team.forEach(e => { if (e.designation) s.add(e.designation) })
    return Array.from(s).sort()
  }, [team])

  const reviewedCount    = team.filter(e => e.manager_status === 'submitted').length
  const inProgressCount  = team.filter(e => e.manager_status === 'draft').length
  const pendingCount     = team.filter(e => !e.manager_status).length
  const completionRate   = team.length > 0 ? Math.round((reviewedCount / team.length) * 100) : 0

  const teamStatusCounts = {
    all:         team.length,
    reviewed:    reviewedCount,
    in_progress: inProgressCount,
    pending:     pendingCount,
  }

  const filteredTeam = useMemo(() => team
    .filter(e => {
      const matchSearch = !search ||
        e.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.employee_code?.toLowerCase().includes(search.toLowerCase())
      const matchStatus =
        teamFilter === 'all'         ? true :
        teamFilter === 'reviewed'    ? e.manager_status === 'submitted' :
        teamFilter === 'in_progress' ? e.manager_status === 'draft' :
        teamFilter === 'pending'     ? !e.manager_status : true
      const matchDesig = desigFilter === 'all' || e.designation === desigFilter
      return matchSearch && matchStatus && matchDesig
    })
    .sort((a, b) => {
      if (teamSort === 'name') return (a.employee_name || '').localeCompare(b.employee_name || '')
      const ord = { submitted: 0, draft: 1 }
      return (ord[a.manager_status] ?? 2) - (ord[b.manager_status] ?? 2)
    }),
  [team, search, teamFilter, desigFilter, teamSort])

  const totalPages = Math.max(1, Math.ceil(filteredTeam.length / pageSize))
  const pagedTeam  = filteredTeam.slice((teamPage - 1) * pageSize, teamPage * pageSize)

  const activeFiltersCount = (search ? 1 : 0) + (teamFilter !== 'all' ? 1 : 0) + (desigFilter !== 'all' ? 1 : 0)

  function clearAllFilters() {
    setSearch(''); setTeamFilter('all'); setDesigFilter('all'); setTeamPage(1)
  }

  const loadTeam = useCallback(async (cycle) => {
    setSelectedCycle(cycle); setSelectedEmp(null); setAppraisalData(null)
    setErr(''); setSuccess(''); setSearch(''); setTeamPage(1); setDesigFilter('all')
    setTeamLoading(true); setTeamFilter('all'); setTeamSort('name')
    try {
      const r = await api.get(`/employee/appraisal/cycles/${cycle.id}/team`)
      setTeam(r.data.team || [])
    } catch { setTeam([]) }
    finally { setTeamLoading(false) }
  }, [])

  const loadEmployeeAppraisal = useCallback(async (emp) => {
    setSelectedEmp(emp); setErr(''); setSuccess('')
    setLoading(true)
    try {
      const r = await api.get(`/employee/appraisal/cycles/${selectedCycle.id}/employees/${emp.employee_id}`)
      const { goals, selfAppraisal, managerAppraisal } = r.data
      setAppraisalData(r.data)
      const selfMap = {}
      for (const sr of selfAppraisal?.goal_ratings || []) selfMap[sr.goal_id] = sr
      const initRatings = {}
      for (const g of goals) {
        const saved = managerAppraisal?.goal_ratings?.find(gr => gr.goal_id === g.id)
        const selfR = selfMap[g.id]
        initRatings[g.id] = {
          achievement_pct: saved ? String(saved.achievement_pct)
            : selfR ? String(selfR.achievement_pct) : String(Math.round(Number(g.progress) || 0)),
          comment: saved?.comment || '',
        }
      }
      setRatings(initRatings)
      setOverallComment(managerAppraisal?.overall_comment || '')
      setFinalRating(managerAppraisal?.final_rating || '')
      setPromotionRecommendation(managerAppraisal?.promotion_recommendation || '')
      setTrainingRecommendation(managerAppraisal?.training_recommendation || '')
    } catch (e) { setErr(e.response?.data?.message || 'Failed to load appraisal.') }
    finally { setLoading(false) }
  }, [selectedCycle])

  const computedScore = appraisalData?.goals?.length > 0
    ? calcWeightedScore(appraisalData.goals)
    : null
  const computedRating = computedScore !== null ? deriveFinalRating(computedScore) : null

  async function handleSave() {
    setSaving(true); setErr(''); setSuccess('')
    try {
      const r = await api.put(`/employee/appraisal/cycles/${selectedCycle.id}/employees/${selectedEmp.employee_id}`, {
        overall_comment: overallComment,
        promotion_recommendation: promotionRecommendation,
        training_recommendation: trainingRecommendation,
      })
      setAppraisalData(prev => ({ ...prev, managerAppraisal: r.data.data }))
      setSuccess('Appraisal draft saved successfully.')
    } catch (e) { setErr(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  async function handleSubmit() {
    if (!window.confirm('Submit your team appraisal? This cannot be undone.')) return
    setSubmitting(true); setErr(''); setSuccess('')
    try {
      await api.post(`/employee/appraisal/cycles/${selectedCycle.id}/employees/${selectedEmp.employee_id}/submit`)
      setSuccess('Team appraisal submitted successfully.')
      loadEmployeeAppraisal(selectedEmp)
      loadTeam(selectedCycle)
    } catch (e) { setErr(e.response?.data?.message || 'Submit failed.') }
    finally { setSubmitting(false) }
  }

  const isSubmitted = appraisalData?.managerAppraisal?.status === 'submitted'
  const isClosed    = selectedCycle?.status === 'closed'
  const readOnly    = isSubmitted || isClosed

  const mainContent = (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px);  } to { opacity:1; transform:translateY(0);  } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .filter-panel { animation: slideIn 0.2s ease; }
      `}</style>
      <main style={{ flex: 1, padding: isSubComponent ? '0px' : '32px 40px', overflowY: 'auto', animation: 'fadeIn 0.3s ease' }}>

          {/* ── Page Header ── */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Team Appraisal</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginBottom: 0 }}>
              Review and rate your team members' goal achievement
            </p>

            {/* Breadcrumb */}
            {(selectedCycle || selectedEmp) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ color: '#6366f1', cursor: 'pointer', fontWeight: '500' }}
                  onClick={() => { setSelectedCycle(null); setSelectedEmp(null); setTeam([]); setAppraisalData(null) }}>
                  Appraisals
                </span>
                {selectedCycle && (
                  <>
                    <span style={{ color: '#cbd5e1', fontSize: '16px' }}>›</span>
                    <span
                      style={{ color: selectedEmp ? '#6366f1' : '#0f172a', cursor: selectedEmp ? 'pointer' : 'default', fontWeight: selectedEmp ? '500' : '700' }}
                      onClick={() => { if (selectedEmp) { setSelectedEmp(null); setAppraisalData(null) } }}>
                      {selectedCycle.name}
                    </span>
                  </>
                )}
                {selectedEmp && (
                  <>
                    <span style={{ color: '#cbd5e1', fontSize: '16px' }}>›</span>
                    <span style={{ color: '#0f172a', fontWeight: '700' }}>{selectedEmp.employee_name}</span>
                    {isSubmitted && (
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
                        ✓ Submitted
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Alerts */}
          {err && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>⚠</span> {err}
            </div>
          )}
          {success && (
            <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', color: '#059669', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiCheckCircle size={14} /> {success}
            </div>
          )}

          {/* ════════════════════════════════════════
              STEP 1 — Select Cycle
          ════════════════════════════════════════ */}
          {!selectedCycle && (
            cycles.length === 0 ? (
              <div style={{ padding: '80px 48px', textAlign: 'center', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '44px', marginBottom: '14px' }}>📋</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#64748b' }}>No appraisal cycles yet</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Contact your administrator to create an appraisal cycle.</div>
              </div>
            ) : (
              <div>
                {/* Cycle KPI bar */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Cycles', value: cycleCounts.all,    color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)'  },
                    { label: 'Active',        value: cycleCounts.active, color: '#059669', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)'  },
                    { label: 'Closed',        value: cycleCounts.closed, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)'  },
                    { label: 'Draft',         value: cycleCounts.draft,  color: '#64748b', bg: 'rgba(100,116,139,0.08)',border: 'rgba(100,116,139,0.2)' },
                  ].filter(s => s.value > 0 || s.label === 'Total Cycles').map(s => (
                    <div key={s.label} style={{ padding: '14px 22px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '14px', textAlign: 'center', minWidth: '90px' }}>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '5px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Select a Cycle</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'active', label: 'Active' },
                      { key: 'closed', label: 'Closed' },
                      { key: 'draft',  label: 'Draft'  },
                    ].filter(f => f.key === 'all' || cycleCounts[f.key] > 0).map(f => {
                      const sm = f.key !== 'all' ? CYCLE_STATUS[f.key] : null
                      const active = cycleFilter === f.key
                      return (
                        <button key={f.key} onClick={() => setCycleFilter(f.key)}
                          style={{
                            padding: '5px 14px', borderRadius: '20px', border: '1px solid',
                            borderColor: active ? (sm?.border || 'rgba(99,102,241,0.35)') : '#e2e8f0',
                            background:  active ? (sm ? `rgba(${sm.color === '#059669' ? '16,185,129' : sm.color === '#8b5cf6' ? '139,92,246' : '100,116,139'},0.08)` : 'rgba(99,102,241,0.08)') : '#fff',
                            color:       active ? (sm?.color || '#6366f1') : '#64748b',
                            fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                          }}>
                          {sm && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sm.dot }} />}
                          {f.label}
                          <span style={{ padding: '1px 7px', borderRadius: '10px', background: 'rgba(0,0,0,0.06)', fontSize: '11px', fontWeight: '800' }}>
                            {cycleCounts[f.key]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {filteredCycles.length === 0 ? (
                  <div style={{ padding: '60px 40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '13px' }}>
                    No {cycleFilter} cycles found.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '14px', maxWidth: '960px' }}>
                    {filteredCycles.map(cycle => {
                      const sm = CYCLE_STATUS[cycle.status] || CYCLE_STATUS.active
                      return (
                        <div key={cycle.id} onClick={() => loadTeam(cycle)}
                          style={{
                            background: '#fff', border: `1.5px solid ${sm.border}`,
                            borderRadius: '18px', cursor: 'pointer', overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'transform 0.18s, box-shadow 0.18s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                        >
                          {/* Top accent bar */}
                          <div style={{ height: '4px', background: sm.grad }} />
                          <div style={{ padding: '20px 22px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{cycle.name}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                  {new Date(cycle.period_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  {' – '}
                                  {new Date(cycle.period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '20px', background: `${sm.border}22`, flexShrink: 0 }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sm.dot }} />
                                <span style={{ fontSize: '11px', fontWeight: '700', color: sm.color }}>{sm.label}</span>
                              </div>
                            </div>
                            <div style={{ marginTop: '14px', fontSize: '12px', color: '#94a3b8', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiUsers size={12} /> Click to view team →
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* ════════════════════════════════════════
              STEP 2 — Team List
          ════════════════════════════════════════ */}
          {selectedCycle && !selectedEmp && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              {teamLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#64748b', fontSize: '14px', padding: '60px 20px' }}>
                  <div style={{ width: '22px', height: '22px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Loading team members…
                </div>
              ) : team.length === 0 ? (
                <div style={{ padding: '80px 48px', textAlign: 'center', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '44px', marginBottom: '14px' }}>👥</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#64748b' }}>No direct reports found</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>No team members assigned to you in this cycle.</div>
                </div>
              ) : (
                <>
                  {/* ── KPI Cards ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Total Members', value: team.length,      Icon: FiUsers,        color: '#6366f1', iconBg: 'rgba(99,102,241,0.15)',  cardBg: 'linear-gradient(135deg,rgba(99,102,241,0.09),rgba(139,92,246,0.05))', border: 'rgba(99,102,241,0.2)'  },
                      { label: 'Reviewed',       value: reviewedCount,    Icon: FiCheckCircle,  color: '#059669', iconBg: 'rgba(16,185,129,0.15)',  cardBg: 'linear-gradient(135deg,rgba(16,185,129,0.09),rgba(5,150,105,0.05))',  border: 'rgba(16,185,129,0.2)'  },
                      { label: 'In Progress',    value: inProgressCount,  Icon: FiEdit3,        color: '#d97706', iconBg: 'rgba(245,158,11,0.15)',  cardBg: 'linear-gradient(135deg,rgba(245,158,11,0.09),rgba(217,119,6,0.05))',  border: 'rgba(245,158,11,0.2)'  },
                      { label: 'Pending',        value: pendingCount,     Icon: FiClock,        color: '#ef4444', iconBg: 'rgba(239,68,68,0.15)',   cardBg: 'linear-gradient(135deg,rgba(239,68,68,0.09),rgba(220,38,38,0.05))',   border: 'rgba(239,68,68,0.2)'   },
                    ].map(card => (
                      <div key={card.label} style={{ padding: '18px 20px', background: card.cardBg, border: `1px solid ${card.border}`, borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                          <card.Icon size={18} color={card.color} />
                        </div>
                        <div style={{ fontSize: '30px', fontWeight: '800', color: card.color, lineHeight: 1 }}>{card.value}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '5px' }}>{card.label}</div>
                      </div>
                    ))}
                    {/* Completion rate — gradient card */}
                    <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', borderRadius: '16px', boxShadow: '0 4px 18px rgba(99,102,241,0.3)', color: '#fff' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                        <FiTrendingUp size={18} color="#fff" />
                      </div>
                      <div style={{ fontSize: '30px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{completionRate}%</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: '5px', marginBottom: '10px' }}>Completion Rate</div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.25)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${completionRate}%`, background: '#fff', borderRadius: '3px', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  </div>

                  {/* ── Advanced Filter Panel ── */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                    {/* Panel header toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: showFilters ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                      onClick={() => setShowFilters(v => !v)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiFilter size={14} color="#6366f1" />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Filters & Search</span>
                        {activeFiltersCount > 0 && (
                          <span style={{ padding: '1px 8px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '11px', fontWeight: '800' }}>
                            {activeFiltersCount} active
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {activeFiltersCount > 0 && (
                          <button onClick={e => { e.stopPropagation(); clearAllFilters() }}
                            style={{ padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiX size={11} /> Clear All
                          </button>
                        )}
                        <span style={{ color: '#94a3b8', fontSize: '18px', lineHeight: 1, userSelect: 'none' }}>{showFilters ? '−' : '+'}</span>
                      </div>
                    </div>

                    {showFilters && (
                      <div className="filter-panel" style={{ padding: '14px 18px' }}>
                        {/* Row 1: search + designation + sort */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Search */}
                          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                            <FiSearch size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                            <input type="text" placeholder="Search by name or code…"
                              value={search} onChange={e => { setSearch(e.target.value); setTeamPage(1) }}
                              style={{ ...inputSt, paddingLeft: '34px', padding: '9px 12px 9px 34px' }}
                            />
                          </div>
                          {/* Designation */}
                          {designations.length > 1 && (
                            <select value={desigFilter} onChange={e => { setDesigFilter(e.target.value); setTeamPage(1) }}
                              style={{ ...inputSt, width: 'auto', minWidth: '160px', padding: '9px 14px', cursor: 'pointer' }}>
                              <option value="all">All Designations</option>
                              {designations.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          )}
                          {/* Sort */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>Sort:</span>
                            {[{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }].map(s => (
                              <button key={s.key} onClick={() => setTeamSort(s.key)}
                                style={{
                                  padding: '6px 13px', borderRadius: '8px', border: '1px solid',
                                  borderColor: teamSort === s.key ? 'rgba(99,102,241,0.4)' : '#e2e8f0',
                                  background:  teamSort === s.key ? 'rgba(99,102,241,0.1)' : '#f8fafc',
                                  color:       teamSort === s.key ? '#6366f1' : '#64748b',
                                  fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                                }}>{s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 2: status pills + count */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {[
                            { key: 'all',         label: 'All',         color: '#6366f1', bg: 'rgba(99,102,241,0.1)',   border: 'rgba(99,102,241,0.3)'   },
                            { key: 'reviewed',    label: 'Reviewed',    color: '#059669', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.3)'   },
                            { key: 'in_progress', label: 'In Progress', color: '#d97706', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.3)'   },
                            { key: 'pending',     label: 'Pending',     color: '#64748b', bg: 'rgba(100,116,139,0.1)',  border: 'rgba(100,116,139,0.25)' },
                          ].map(f => {
                            const isActive = teamFilter === f.key
                            return (
                              <button key={f.key} onClick={() => { setTeamFilter(f.key); setTeamPage(1) }}
                                style={{
                                  padding: '5px 14px', borderRadius: '20px', border: '1px solid',
                                  borderColor: isActive ? f.border : '#e2e8f0',
                                  background:  isActive ? f.bg : 'transparent',
                                  color:       isActive ? f.color : '#94a3b8',
                                  fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                                }}>
                                {f.label}
                                <span style={{ padding: '1px 6px', borderRadius: '10px', background: isActive ? 'rgba(0,0,0,0.07)' : '#f1f5f9', fontSize: '11px', fontWeight: '800', color: isActive ? f.color : '#94a3b8' }}>
                                  {teamStatusCounts[f.key]}
                                </span>
                              </button>
                            )
                          })}
                          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                            {filteredTeam.length} member{filteredTeam.length !== 1 ? 's' : ''} · Page {teamPage}/{totalPages}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Team Member Rows ── */}
                  {pagedTeam.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <FiSearch size={28} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                      <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>No results found</div>
                      {activeFiltersCount > 0 && (
                        <button onClick={clearAllFilters} style={{ marginTop: '10px', padding: '6px 16px', borderRadius: '8px', border: 'none', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {pagedTeam.map(emp => {
                        const selfMeta   = emp.self_status    ? (SELF_STATUS[emp.self_status]   || SELF_STATUS.draft)   : null
                        const mgrMeta    = emp.manager_status ? (MGR_STATUS[emp.manager_status] || MGR_STATUS.draft)    : null
                        const ratingMeta = emp.final_rating   ? RATING_META[emp.final_rating]                           : null
                        const isReviewed = emp.manager_status === 'submitted'
                        const col        = avatarColor(emp.employee_name)
                        return (
                          <div key={emp.employee_id} onClick={() => loadEmployeeAppraisal(emp)}
                            style={{
                              padding: '14px 20px',
                              background: isReviewed ? 'linear-gradient(135deg,rgba(16,185,129,0.05),rgba(5,150,105,0.03))' : '#fff',
                              border: `1px solid ${isReviewed ? 'rgba(16,185,129,0.25)' : '#e2e8f0'}`,
                              borderLeft: `4px solid ${isReviewed ? '#10b981' : '#e2e8f0'}`,
                              borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', gap: '16px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = isReviewed ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.35)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = isReviewed ? 'rgba(16,185,129,0.25)' : '#e2e8f0' }}
                          >
                            <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', color: '#fff', flexShrink: 0, letterSpacing: '0.5px', boxShadow: `0 4px 12px ${col}44` }}>
                              {getInitials(emp.employee_name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.employee_name}</div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{emp.designation || '—'} · {emp.employee_code}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600', background: selfMeta ? selfMeta.bg : 'rgba(100,116,139,0.08)', color: selfMeta ? selfMeta.color : '#94a3b8', whiteSpace: 'nowrap' }}>
                                Self: {selfMeta ? selfMeta.label : 'Pending'}
                              </span>
                              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600', background: mgrMeta ? mgrMeta.bg : 'rgba(100,116,139,0.08)', color: mgrMeta ? mgrMeta.color : '#94a3b8', whiteSpace: 'nowrap' }}>
                                Review: {mgrMeta ? mgrMeta.label : 'Pending'}
                              </span>
                              {ratingMeta && (
                                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', background: ratingMeta.bg, color: ratingMeta.color, whiteSpace: 'nowrap' }}>
                                  {ratingMeta.label}
                                </span>
                              )}
                            </div>
                            <span style={{ color: '#cbd5e1', fontSize: '18px', flexShrink: 0 }}>›</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── Pagination ── */}
                  {(totalPages > 1 || filteredTeam.length > PAGE_SIZES[0]) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', flexWrap: 'wrap', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      {/* Left: count info + page size */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Showing <strong style={{ color: '#0f172a' }}>{Math.min((teamPage - 1) * pageSize + 1, filteredTeam.length)}–{Math.min(teamPage * pageSize, filteredTeam.length)}</strong> of <strong style={{ color: '#0f172a' }}>{filteredTeam.length}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>Per page:</span>
                          {PAGE_SIZES.map(s => (
                            <button key={s} onClick={() => { setPageSize(s); setTeamPage(1) }}
                              style={{
                                width: '34px', height: '28px', borderRadius: '7px', border: '1px solid',
                                borderColor: pageSize === s ? 'rgba(99,102,241,0.4)' : '#e2e8f0',
                                background: pageSize === s ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f8fafc',
                                color: pageSize === s ? '#fff' : '#94a3b8',
                                fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                                boxShadow: pageSize === s ? '0 2px 6px rgba(99,102,241,0.25)' : 'none',
                                transition: 'all 0.15s',
                              }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Right: page nav */}
                      {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => setTeamPage(p => Math.max(1, p - 1))} disabled={teamPage === 1}
                            style={{ height: '32px', padding: '0 12px', background: teamPage === 1 ? '#f8fafc' : 'rgba(99,102,241,0.08)', border: `1px solid ${teamPage === 1 ? '#e2e8f0' : 'rgba(99,102,241,0.25)'}`, borderRadius: '8px', color: teamPage === 1 ? '#cbd5e1' : '#6366f1', fontSize: '12px', fontWeight: '700', cursor: teamPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiChevronLeft size={14} /> Prev
                          </button>
                          <PageNumbers current={teamPage} total={totalPages} onChange={setTeamPage} />
                          <button onClick={() => setTeamPage(p => Math.min(totalPages, p + 1))} disabled={teamPage === totalPages}
                            style={{ height: '32px', padding: '0 12px', background: teamPage === totalPages ? '#f8fafc' : 'rgba(99,102,241,0.08)', border: `1px solid ${teamPage === totalPages ? '#e2e8f0' : 'rgba(99,102,241,0.25)'}`, borderRadius: '8px', color: teamPage === totalPages ? '#cbd5e1' : '#6366f1', fontSize: '12px', fontWeight: '700', cursor: teamPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Next <FiChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════
              STEP 3 — Appraisal Form
          ════════════════════════════════════════ */}
          {selectedCycle && selectedEmp && (
            <div style={{ maxWidth: '900px', animation: 'fadeIn 0.25s ease' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#64748b', fontSize: '14px', padding: '60px 20px' }}>
                  <div style={{ width: '22px', height: '22px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Loading appraisal…
                </div>
              ) : (
                <>
                  {/* Employee profile card */}
                  <div style={{ padding: '22px 26px', background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.04))', border: '1.5px solid rgba(99,102,241,0.2)', borderRadius: '18px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                    <div style={{ width: '58px', height: '58px', borderRadius: '16px', background: avatarColor(selectedEmp.employee_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#fff', flexShrink: 0, boxShadow: `0 6px 18px ${avatarColor(selectedEmp.employee_name)}44` }}>
                      {getInitials(selectedEmp.employee_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{selectedEmp.employee_name}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>{selectedEmp.designation || '—'} · {selectedEmp.employee_code} · {selectedCycle.name}</div>
                    </div>
                    {isSubmitted && (
                      <div style={{ padding: '10px 18px', background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.06))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', flexShrink: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Review Submitted</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                          {new Date(appraisalData.managerAppraisal.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                    {isClosed && !isSubmitted && (
                      <span style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#6366f1', flexShrink: 0 }}>Cycle Closed</span>
                    )}
                  </div>

                  {/* Goals */}
                  {appraisalData?.goals?.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                      <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎯</div>
                      <div style={{ color: '#64748b', fontSize: '14px' }}>No goals assigned in this cycle.</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                        Goals · {appraisalData?.goals?.length} item{appraisalData?.goals?.length !== 1 ? 's' : ''}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                        {appraisalData?.goals?.map((goal, gIdx) => {
                          const selfRating = appraisalData.selfAppraisal?.goal_ratings?.find(r => r.goal_id === goal.id)
                          const r   = ratings[goal.id] || { achievement_pct: '0', comment: '' }
                          const pct = Math.min(100, Math.max(0, Number(r.achievement_pct) || 0))
                          const barColor = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'
                          const ratingLabel = pct >= 90 ? 'Excellent' : pct >= 70 ? 'Good' : pct >= 40 ? 'Satisfactory' : 'Needs Work'
                          return (
                            <div key={goal.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: '#fff', flexShrink: 0, marginTop: '1px' }}>
                                  {gIdx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', lineHeight: '1.4' }}>{goal.title}</div>
                                  {goal.target_metric && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>🎯 {goal.target_metric}</div>}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: '700', background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Technique: {goal.performance_technique || 'KPI'}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                      Weight: <strong>{goal.weight || 0}%</strong>
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#0f766e', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                                      Final Technique Score: <strong>{getFinalTechniqueScore(goal)}</strong>
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#7c3aed', background: '#f3e8ff', padding: '2px 6px', borderRadius: '4px' }}>
                                      Overall Goal Score: <strong>{getOverallGoalScore(goal)}</strong>
                                    </span>
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                      background: goal.status?.toLowerCase() === 'completed' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                                      color: goal.status?.toLowerCase() === 'completed' ? '#10b981' : '#f59e0b'
                                    }}>
                                      Status: {goal.status || 'Active'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ padding: '18px 22px' }}>
                                <div style={{ padding: '12px 14px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '10px', marginBottom: '18px' }}>
                                  <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Actual Progress</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1, height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${Math.min(100, Number(goal.progress) || 0)}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#6366f1', minWidth: '38px', textAlign: 'right' }}>{Math.round(Number(goal.progress) || 0)}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Integrated Technique Reference Context */}
                              {goal.performanceContext && (
                                <div style={{ padding: '0 22px 18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <PerformanceReferenceContext 
                                    context={goal.performanceContext} 
                                    technique={goal.performance_technique || 'KPI'} 
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {/* ── System Performance Score Card ── */}
                  {appraisalData?.systemScores && (
                    <div style={{
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      marginBottom: '22px',
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>System Performance Score Card</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Dynamic weight-based performance appraisal metrics</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'right' }}>
                          <div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#10b981', lineHeight: 1 }}>
                              {appraisalData.systemScores.finalScore}%
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                              Calculated Score
                            </div>
                          </div>
                          <div style={{ height: '36px', width: '1px', background: 'rgba(255,255,255,0.15)' }} />
                          <div>
                            <div style={{
                              display: 'inline-block',
                              fontSize: '12px', fontWeight: '800', padding: '6px 14px', borderRadius: '20px',
                              background: RATING_META[deriveFinalRating(appraisalData.systemScores.finalScore)]?.bg || 'rgba(16,185,129,0.1)',
                              color: RATING_META[deriveFinalRating(appraisalData.systemScores.finalScore)]?.color || '#10b981',
                              border: `1.5px solid ${(RATING_META[deriveFinalRating(appraisalData.systemScores.finalScore)]?.color || '#10b981')}33`,
                            }}>
                              {RATING_META[deriveFinalRating(appraisalData.systemScores.finalScore)]?.label || '—'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', textAlign: 'center' }}>
                              Derived Rating
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                        {(appraisalData.systemScores.cycles || []).map(item => {
                          const scoreVal = Number(item.score) || 0;
                          return (
                            <div key={item.name} style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '12px',
                              padding: '12px 16px',
                              transition: 'all 0.15s ease',
                            }}>
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{item.name}</div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                                  {Math.round(scoreVal)}%
                                </span>
                              </div>
                              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${scoreVal}%`, background: '#6366f1', borderRadius: '2px' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Overall comment */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 22px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Manager Comments</label>
                    {readOnly ? (
                      <div style={{ fontSize: '13px', color: '#64748b', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '72px', lineHeight: '1.7' }}>
                        {overallComment || <span style={{ color: '#94a3b8' }}>No overall comment provided.</span>}
                      </div>
                    ) : (
                      <textarea value={overallComment} onChange={e => setOverallComment(e.target.value)} rows={4}
                        placeholder="Overall performance summary, strengths, areas for improvement…"
                        style={{ ...inputSt, resize: 'vertical', lineHeight: '1.7' }}
                      />
                    )}
                  </div>

                  {/* Recommendations */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 22px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Development & Growth Recommendations
                    </h3>
                    
                    {/* Promotion Recommendation */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Promotion Recommendation / Notes
                      </label>
                      {readOnly ? (
                        <div style={{ fontSize: '13px', color: '#64748b', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '44px', lineHeight: '1.7' }}>
                          {promotionRecommendation || <span style={{ color: '#94a3b8' }}>No promotion recommendations recorded.</span>}
                        </div>
                      ) : (
                        <textarea value={promotionRecommendation} onChange={e => setPromotionRecommendation(e.target.value)} rows={2}
                          placeholder="Provide recommendation for promotion, readiness details, or career progression notes…"
                          style={{ ...inputSt, resize: 'vertical', lineHeight: '1.7' }}
                        />
                      )}
                    </div>

                    {/* Training Recommendation */}
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Training & Upskilling Recommendation
                      </label>
                      {readOnly ? (
                        <div style={{ fontSize: '13px', color: '#64748b', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '44px', lineHeight: '1.7' }}>
                          {trainingRecommendation || <span style={{ color: '#94a3b8' }}>No training recommendations recorded.</span>}
                        </div>
                      ) : (
                        <textarea value={trainingRecommendation} onChange={e => setTrainingRecommendation(e.target.value)} rows={2}
                          placeholder="Suggest specific courses, skill developments, or training plans to address areas of improvement…"
                          style={{ ...inputSt, resize: 'vertical', lineHeight: '1.7' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Employee's Self Reflection & Rating */}
                  {appraisalData?.selfAppraisal && (
                    <div style={{
                      background: '#fff',
                      border: '1.5px solid #e8eaf0',
                      borderRadius: '16px',
                      padding: '24px 26px',
                      marginBottom: '24px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                      <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        Employee Self Reflection & Rating
                      </h3>



                      {/* Other fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                          { label: 'Achievements', val: appraisalData.selfAppraisal.achievements },
                          { label: 'Challenges Faced', val: appraisalData.selfAppraisal.challenges },
                          { label: 'Key Learnings', val: appraisalData.selfAppraisal.learnings },
                          { label: 'Career Goals', val: appraisalData.selfAppraisal.career_goals },
                          { label: 'Overall Comments', val: appraisalData.selfAppraisal.overall_comment },
                        ].map((ref, idx) => (
                          <div key={idx} style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                              {ref.label}
                            </div>
                            <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                              {ref.val || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No response provided.</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
                      <button onClick={handleSave} disabled={saving}
                        style={{
                          padding: '12px 26px', background: '#fff', border: '1.5px solid rgba(99,102,241,0.3)', borderRadius: '11px', color: '#6366f1',
                          fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                        onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' } }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)' }}>
                        <FiSave size={15} /> {saving ? 'Saving…' : 'Save Draft'}
                      </button>
                      <button onClick={handleSubmit} disabled={submitting}
                        style={{
                          padding: '12px 26px', background: submitting ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#059669,#10b981)', border: 'none',
                          borderRadius: '11px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px',
                          boxShadow: submitting ? 'none' : '0 4px 14px rgba(16,185,129,0.3)', transition: 'all 0.15s',
                        }}>
                        <FiSend size={15} /> {submitting ? 'Submitting…' : 'Submit Appraisal'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </main>
    </>
  );

  if (isSubComponent) {
    return (
      <div style={{ padding: '0px' }}>
        {mainContent}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <EmployeeSidebar active="manager-appraisal" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Team Appraisal" />
        {mainContent}
      </div>
    </div>
  );
}
