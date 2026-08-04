import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'
import { FiCalendar, FiClock, FiTrendingUp, FiCheckCircle, FiChevronRight, FiAlertCircle, FiEdit3, FiSend } from 'react-icons/fi'

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
  active: { bg: 'rgba(16,185,129,0.1)',  border: '#10b981', color: '#059669', label: 'Active' },
  closed: { bg: 'rgba(99,102,241,0.08)', border: '#6366f1', color: '#6366f1', label: 'Closed' },
  draft:  { bg: 'rgba(100,116,139,0.08)',border: '#94a3b8', color: '#64748b', label: 'Draft'  },
}

const RATING_META = {
  exceeds_expectations: { label: 'Exceeds Expectations', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  good:                 { label: 'Good',                 color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  meets_expectations:   { label: 'Meets Expectations',   color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
  below_expectations:   { label: 'Below Expectations',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
}

function getRatingMeta(score) {
  if (score >= 90) return RATING_META.exceeds_expectations
  if (score >= 70) return RATING_META.good
  if (score >= 40) return RATING_META.meets_expectations
  return RATING_META.below_expectations
}

function getBarColor(pct) {
  if (pct >= 70) return '#10b981'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

function WeightedScore({ goals }) {
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
  
  const score = wTotal > 0 ? Math.round((wSum / wTotal) * 100) : 0
  const meta = getRatingMeta(score)

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '16px', padding: '22px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      boxShadow: '0 4px 20px rgba(15,23,42,0.15)',
    }}>
      <div>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
          Weighted Score
        </div>
        <div style={{ fontSize: '40px', fontWeight: '900', color: meta.color, lineHeight: 1, letterSpacing: '-1px' }}>
          {score}%
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          display: 'inline-block',
          fontSize: '13px', fontWeight: '700', padding: '8px 16px', borderRadius: '20px',
          background: meta.bg, color: meta.color,
          border: `1.5px solid ${meta.color}33`,
        }}>
          {meta.label}
        </div>
        <div style={{ marginTop: '10px' }}>
          <div style={{ width: '140px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
            <div style={{ height: '100%', width: `${score}%`, background: meta.color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyAppraisal({ isSubComponent = false }) {
  const [cycles, setCycles]               = useState([])
  const [selectedCycle, setSelectedCycle] = useState(null)
  const [data, setData]                   = useState(null)
  const [ratings, setRatings]             = useState({})
  const [overallComment, setOverallComment] = useState('')
  const [achievements, setAchievements]   = useState('')
  const [challenges, setChallenges]       = useState('')
  const [learnings, setLearnings]         = useState('')
  const [careerGoals, setCareerGoals]     = useState('')
  const [selfRating, setSelfRating]       = useState(0)
  const [expandedGoals, setExpandedGoals] = useState({})
  const [loading, setLoading]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [err, setErr]                     = useState('')
  const [success, setSuccess]             = useState('')

  useEffect(() => {
    api.get('/employee/appraisal/cycles')
      .then(r => setCycles(r.data || []))
      .catch(e => setErr(e.response?.data?.message || 'Failed to load appraisal cycles'))
  }, [])

  const loadCycle = useCallback(async (cycle) => {
    setSelectedCycle(cycle); setErr(''); setSuccess('')
    setLoading(true)
    try {
      const r = await api.get(`/employee/appraisal/cycles/${cycle.id}/self`)
      const { goals, appraisal } = r.data
      setData(r.data)
      setOverallComment(appraisal?.overall_comment || '')
      setAchievements(appraisal?.achievements || '')
      setChallenges(appraisal?.challenges || '')
      setLearnings(appraisal?.learnings || '')
      setCareerGoals(appraisal?.career_goals || '')
      setSelfRating(appraisal?.self_rating || 0)
      
      const initRatings = {}
      for (const g of goals) {
        const saved = appraisal?.goal_ratings?.find(gr => gr.goal_id === g.id)
        initRatings[g.id] = {
          achievement_pct: saved ? String(saved.achievement_pct) : String(Math.round(Number(g.progress) || 0)),
          comment: saved?.comment || '',
        }
      }
      setRatings(initRatings)
    } catch (e) { setErr(e.response?.data?.message || 'Failed to load appraisal.') }
    finally { setLoading(false) }
  }, [])

  async function handleSave() {
    setSaving(true); setErr(''); setSuccess('')
    try {
      const r = await api.put(`/employee/appraisal/cycles/${selectedCycle.id}/self`, {
        overall_comment: overallComment,
        achievements,
        challenges,
        learnings,
        career_goals: careerGoals,
      })
      setData(prev => ({ ...prev, appraisal: r.data.data }))
      setSuccess('Appraisal saved successfully.')
    } catch (e) { setErr(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  async function handleSubmit() {
    if (!window.confirm('Submit your self-appraisal? You cannot edit it after submission.')) return
    setSubmitting(true); setErr(''); setSuccess('')
    try {
      await api.post(`/employee/appraisal/cycles/${selectedCycle.id}/self/submit`)
      setSuccess('Self-appraisal submitted successfully.')
      loadCycle(selectedCycle)
    } catch (e) { setErr(e.response?.data?.message || 'Submit failed.') }
    finally { setSubmitting(false) }
  }

  const isSubmitted = data?.appraisal?.status === 'submitted'
  const isClosed    = selectedCycle?.status === 'closed'
  const readOnly    = isSubmitted || isClosed

  function fmtDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function daysUntil(d) {
    if (!d) return null
    const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
    return diff
  }

  const mainContent = (
    <>
      <main style={{ flex: 1, padding: isSubComponent ? '0px' : '28px 32px', overflowY: 'auto' }}>

          {/* ── Page header ── */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
              My Self-Appraisal
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Rate your achievement on each goal and submit for your manager to review
            </p>
          </div>

          {/* ── Alerts ── */}
          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#ef4444', fontSize: '13px', marginBottom: '20px' }}>
              <FiAlertCircle size={15} /> {err}
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: '#059669', fontSize: '13px', marginBottom: '20px' }}>
              <FiCheckCircle size={15} /> {success}
            </div>
          )}

          {/* ════════════════════════════════════════
              CYCLE LIST VIEW
          ════════════════════════════════════════ */}
          {!selectedCycle && (
            <>
              {cycles.length === 0 ? (
                <div style={{
                  padding: '56px 32px', textAlign: 'center',
                  background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ width: '56px', height: '56px', background: 'rgba(99,102,241,0.08)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <FiCalendar size={26} color="#6366f1" />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>No Active Appraisal Cycles</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '320px', margin: '0 auto' }}>
                    Your admin needs to activate an appraisal cycle before you can submit.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '680px' }}>
                  {cycles.map(cycle => {
                    const sm   = CYCLE_STATUS[cycle.status] || CYCLE_STATUS.active
                    const days = daysUntil(cycle.self_appraisal_deadline)
                    const urgency = days !== null && days >= 0 && days <= 3

                    return (
                      <div
                        key={cycle.id}
                        onClick={() => loadCycle(cycle)}
                        style={{
                          background: '#fff',
                          borderRadius: '16px',
                          border: '1.5px solid #e8eaf0',
                          borderLeft: `4px solid ${sm.border}`,
                          padding: '20px 22px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'box-shadow 0.2s, transform 0.15s, border-color 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.12)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.borderColor = `${sm.border}66`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = '#e8eaf0'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{cycle.name}</div>
                            <span style={{
                              fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px',
                              background: sm.bg, color: sm.color,
                            }}>
                              {sm.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748b' }}>
                              <FiCalendar size={12} />
                              {fmtDate(cycle.period_start)} – {fmtDate(cycle.period_end)}
                            </div>
                            {cycle.self_appraisal_deadline && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: urgency ? '#ef4444' : '#94a3b8', fontWeight: urgency ? '700' : '400' }}>
                                <FiClock size={12} color={urgency ? '#ef4444' : '#94a3b8'} />
                                Deadline: {fmtDate(cycle.self_appraisal_deadline)}
                                {days !== null && days >= 0 && days <= 7 && (
                                  <span style={{
                                    marginLeft: '4px', fontSize: '10px', fontWeight: '700',
                                    padding: '1px 7px', borderRadius: '10px',
                                    background: urgency ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                    color: urgency ? '#ef4444' : '#d97706',
                                  }}>
                                    {days === 0 ? 'Today!' : `${days}d left`}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <FiChevronRight size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════
              APPRAISAL FORM VIEW
          ════════════════════════════════════════ */}
          {selectedCycle && (
            <div style={{ maxWidth: '780px' }}>

              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setSelectedCycle(null); setData(null); setErr(''); setSuccess('') }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'none', border: 'none', color: '#64748b', fontSize: '13px',
                    cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px 4px 0',
                    fontWeight: '600',
                  }}
                >
                  ← Back
                </button>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{selectedCycle.name}</span>
                {isSubmitted && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                    <FiCheckCircle size={11} /> Submitted
                  </span>
                )}
                {isClosed && !isSubmitted && (
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>Cycle Closed</span>
                )}
              </div>

              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '48px 0', color: '#94a3b8', fontSize: '14px' }}>
                  <div style={{ width: '18px', height: '18px', border: '2.5px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Loading appraisal…
                </div>
              ) : (
                <>
                  {/* Goal cards */}
                  {data?.goals?.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', color: '#94a3b8', fontSize: '13px' }}>
                      No goals found for this appraisal period.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                      {data?.goals?.map((goal, idx) => {
                        const r      = ratings[goal.id] || { achievement_pct: '0', comment: '' }
                        const pct    = Math.min(100, Math.max(0, Number(r.achievement_pct) || 0))
                        const actual = Math.min(100, Math.round(Number(goal.progress) || 0))
                        const bColor = getBarColor(pct)
                        const isExpanded = !!expandedGoals[goal.id]

                        return (
                          <div
                            key={goal.id}
                            style={{
                              background: '#fff', borderRadius: '16px',
                              border: '1.5px solid #e8eaf0',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                              overflow: 'hidden',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {/* Card header */}
                            <div style={{ padding: '18px 22px 14px', borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                  <div style={{
                                    minWidth: '28px', height: '28px', borderRadius: '8px',
                                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                    color: '#fff', fontSize: '12px', fontWeight: '800',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', lineHeight: '1.3' }}>{goal.title}</div>
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
                                <button
                                  type="button"
                                  onClick={() => setExpandedGoals(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#475569',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    flexShrink: 0,
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
                                >
                                  {isExpanded ? 'Hide Details' : 'View Details'}
                                </button>
                              </div>
                            </div>

                            {/* Card Body - expanded section */}
                            {isExpanded && (
                              <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* Actual progress */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                      Actual Progress (from goal tracker)
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#6366f1' }}>{actual}%</span>
                                  </div>
                                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                      height: '100%', width: `${actual}%`,
                                      background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                                      borderRadius: '4px', transition: 'width 0.6s ease',
                                    }} />
                                  </div>
                                </div>

                                {/* Integrated Technique Reference Context */}
                                {goal.performanceContext && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <PerformanceReferenceContext 
                                      context={goal.performanceContext} 
                                      technique={goal.performance_technique || 'KPI'} 
                                    />
                                  </div>
                                )}

                                {/* Divider */}
                                <div style={{ height: '1px', background: '#f1f5f9' }} />


                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── System Performance Score Card ── */}
                  {data?.systemScores && (
                    <div style={{
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      marginBottom: '24px',
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>Performance Score Breakdown</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Dynamic weighted calculation based on active technique modules</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '32px', fontWeight: '900', color: '#10b981', lineHeight: 1 }}>
                            {data.systemScores.finalScore}%
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                            Calculated Score
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                        {(data.systemScores.cycles || []).map(item => {
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

                  {/* ── Employee Self Reflection & Rating ── */}
                  <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #e8eaf0', padding: '24px 26px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                      Employee Self Reflection & Rating
                    </h3>



                    {/* Reflection Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {[
                        { key: 'achievements', label: 'Overall Achievements', state: achievements, setter: setAchievements, placeholder: 'What were your overall achievements in this period?' },
                        { key: 'challenges', label: 'Challenges Faced', state: challenges, setter: setChallenges, placeholder: 'What challenges did you face, and how did you overcome them?' },
                        { key: 'learnings', label: 'Key Learnings', state: learnings, setter: setLearnings, placeholder: 'What key lessons did you learn during this cycle?' },
                        { key: 'career_goals', label: 'Career Goals', state: careerGoals, setter: setCareerGoals, placeholder: 'What are your career expectations or goals for the next period?' },
                        { key: 'overall_comment', label: 'Overall Comments', state: overallComment, setter: setOverallComment, placeholder: 'Summarise your overall performance this cycle...' }
                      ].map(field => (
                        <div key={field.key}>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '8px' }}>
                            {field.label}
                          </label>
                          {readOnly ? (
                            <div style={{ fontSize: '13px', color: '#475569', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '48px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                              {field.state || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No response provided.</span>}
                            </div>
                          ) : (
                            <textarea
                              value={field.state}
                              onChange={e => field.setter(e.target.value)}
                              rows={3}
                              placeholder={field.placeholder}
                              style={{
                                width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                                borderRadius: '10px', color: '#1e293b', fontSize: '13px',
                                fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                                transition: 'border-color 0.15s', lineHeight: '1.6',
                              }}
                              onFocus={e => e.target.style.borderColor = '#6366f1'}
                              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Actions ── */}
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '7px',
                          padding: '11px 24px',
                          background: '#fff', border: '1.5px solid #e2e8f0',
                          borderRadius: '12px', color: '#475569', fontWeight: '700',
                          fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!saving) { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
                      >
                        <FiEdit3 size={14} />
                        {saving ? 'Saving…' : 'Save Draft'}
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '7px',
                          padding: '11px 28px',
                          background: submitting ? '#94a3b8' : 'linear-gradient(135deg,#059669,#10b981)',
                          border: 'none', borderRadius: '12px',
                          color: '#fff', fontWeight: '700', fontSize: '13px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          boxShadow: submitting ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <FiSend size={14} />
                        {submitting ? 'Submitting…' : 'Submit Appraisal'}
                      </button>
                    </div>
                  )}

                  {/* ── Submitted banner ── */}
                  {isSubmitted && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '18px 22px',
                      background: 'linear-gradient(135deg,rgba(5,150,105,0.06),rgba(16,185,129,0.04))',
                      border: '1.5px solid rgba(16,185,129,0.2)',
                      borderRadius: '14px',
                    }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FiCheckCircle size={20} color="#059669" />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#059669', marginBottom: '2px' }}>Self-appraisal submitted</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Submitted on {new Date(data.appraisal.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Your manager will review it shortly.
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <EmployeeSidebar active="appraisal" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="My Appraisal" />
        {mainContent}
      </div>
    </div>
  );
}
