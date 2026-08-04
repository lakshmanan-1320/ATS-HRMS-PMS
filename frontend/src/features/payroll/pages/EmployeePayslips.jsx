import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const MONTH_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6',
  '#14b8a6','#f43f5e','#a855f7','#22c55e','#0ea5e9','#f97316'
]

function getMonthColor(monthNumber) {
  return MONTH_COLORS[(monthNumber - 1) % MONTH_COLORS.length]
}

function getMonthName(monthNumber) {
  return new Date(2000, monthNumber - 1).toLocaleString('default', { month: 'long' })
}

function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return '—'
  const val = parseFloat(num)
  if (val === 0) return 'Rupees Zero Only'
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  const integerPart = Math.floor(val)
  const decimalPart = Math.round((val - integerPart) * 100)
  function convert(n) {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n/10)] + (n%10 !== 0 ? ' '+a[n%10] : '')
    if (n < 1000) return a[Math.floor(n/100)]+' Hundred'+(n%100!==0?' '+convert(n%100):'')
    if (n < 100000) return convert(Math.floor(n/1000))+' Thousand'+(n%1000!==0?' '+convert(n%1000):'')
    if (n < 10000000) return convert(Math.floor(n/100000))+' Lakh'+(n%100000!==0?' '+convert(n%100000):'')
    return convert(Math.floor(n/10000000))+' Crore'+(n%10000000!==0?' '+convert(n%10000000):'')
  }
  let str = 'Rupees ' + convert(integerPart)
  if (decimalPart > 0) str += ' and ' + convert(decimalPart) + ' Paise'
  return str + ' Only'
}

function StatusBadge({ status }) {
  const map = {
    APPROVED: { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.25)', dot: '#10b981' },
    LOCKED:   { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', border: 'rgba(99,102,241,0.25)', dot: '#6366f1' },
    DRAFT:    { bg: 'rgba(234,179,8,0.1)',   color: '#d97706', border: 'rgba(234,179,8,0.25)',  dot: '#f59e0b' },
    GENERATED:{ bg: 'rgba(234,179,8,0.1)',   color: '#d97706', border: 'rgba(234,179,8,0.25)',  dot: '#f59e0b' },
  }
  const c = map[status] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b', border: 'rgba(100,116,139,0.2)', dot: '#94a3b8' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '11px', fontWeight: '700', padding: '3px 10px',
      borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.04em',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

export default function EmployeePayslips() {
  const { employee_payroll_id } = useParams()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslipId, setSelectedPayslipId] = useState(null)
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)

  useEffect(() => { loadPayslips() }, [])
  useEffect(() => { if (employee_payroll_id) loadDetails(employee_payroll_id) }, [employee_payroll_id])

  function loadPayslips() {
    setLoading(true)
    api.get('/v1/payroll/my-payslips')
      .then(res => setPayslips(res.data?.data || []))
      .catch(err => console.error('Failed to load payslips', err))
      .finally(() => setLoading(false))
  }

  function loadDetails(id) {
    setLoadingDetails(true)
    setSelectedPayslipId(id)
    api.get(`/v1/payroll/my-payslips/${id}`)
      .then(res => setDetails(res.data?.data))
      .catch(err => console.error('Failed to load payslip details', err))
      .finally(() => setLoadingDetails(false))
  }

  async function handleDownloadPayslip(id) {
    try {
      const response = await api.get(`/v1/payroll/my-payslips/${id}/download`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payslip_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Failed to download payslip', err)
      alert('Failed to download payslip PDF.')
    }
  }

  const latestNet = payslips.length > 0 ? parseFloat(payslips[0]?.net_salary || 0) : 0
  const ytdTotal = payslips.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f8', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        .ps-card { animation: fadeIn 0.35s ease both; }
        .ps-card:hover { transform: translateY(-2px) !important; box-shadow: 0 16px 40px rgba(0,0,0,0.1) !important; }
        .ps-card { transition: transform 0.2s ease, box-shadow 0.2s ease !important; }
        .ps-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .ps-btn { transition: all 0.18s ease; }
        .ps-row:hover { background: #f8fafc !important; }
      `}</style>

      <EmployeeSidebar active="payroll" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Payslips" />

        <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>

          {/* Page Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>💰</div>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>My Payslips</h1>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '2px' }}>View and access your historical salary details and payslip breakdowns</p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          {!loading && payslips.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
              {[
                {
                  label: 'Total Payslips', value: payslips.length,
                  icon: '📄', color: '#6366f1',
                  sub: 'All time records'
                },
                {
                  label: 'Latest Net Salary', value: `₹${latestNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  icon: '💵', color: '#10b981',
                  sub: `${getMonthName(payslips[0]?.payroll_month)} ${payslips[0]?.payroll_year}`
                },
                {
                  label: 'YTD Earnings', value: `₹${ytdTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  icon: '📈', color: '#f59e0b',
                  sub: 'Year to date total'
                }
              ].map((stat, i) => (
                <div key={i} style={{
                  background: '#ffffff', border: '1px solid #e8eaf0',
                  borderRadius: '18px', padding: '20px 24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: `linear-gradient(90deg, ${stat.color}88, ${stat.color}22)`
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>{stat.label}</div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{stat.value}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{stat.sub}</div>
                    </div>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', fontSize: '18px',
                      background: `${stat.color}14`, border: `1px solid ${stat.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payslips Section */}
          <div style={{
            background: '#ffffff', border: '1px solid #e8eaf0',
            borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}>
            {/* Section Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #e8eaf0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.4)' }} />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Payslip History</span>
              </div>
              {payslips.length > 0 && (
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{payslips.length} record{payslips.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{
                      width: '100%', maxWidth: '500px', height: '52px', borderRadius: '10px',
                      background: 'rgba(0,0,0,0.05)',
                      animation: `shimmer ${0.8 + i * 0.2}s ease-in-out infinite`
                    }} />
                  ))}
                </div>
              </div>
            ) : payslips.length === 0 ? (
              <div style={{ padding: '72px 40px', textAlign: 'center' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 16px',
                  background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px'
                }}>📋</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>No payslips yet</div>
                <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '300px', margin: '0 auto' }}>
                  Your payslips will appear here once salary is processed by HR.
                </div>
              </div>
            ) : (
              <div>
                {/* Table Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr 1.5fr',
                  padding: '12px 24px', gap: '12px',
                  borderBottom: '1px solid #e8eaf0', background: '#f8fafc'
                }}>
                  {['Pay Period','Gross Earnings','Deductions','Net Salary','Status','Action'].map(h => (
                    <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                  ))}
                </div>

                {payslips.map((ps, idx) => {
                  const accentColor = getMonthColor(ps.payroll_month)
                  return (
                    <div
                      key={ps.employee_payroll_id}
                      className="ps-row"
                      style={{
                        display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr 1.5fr',
                        padding: '16px 24px', gap: '12px', alignItems: 'center',
                        borderBottom: idx < payslips.length - 1 ? '1px solid #f0f2f8' : 'none',
                        animation: `fadeIn 0.3s ease ${idx * 0.05}s both`
                      }}
                    >
                      {/* Pay Period */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                          background: `${accentColor}14`, border: `1px solid ${accentColor}25`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <div style={{ fontSize: '8px', fontWeight: '800', color: accentColor, textTransform: 'uppercase', lineHeight: 1 }}>
                            {getMonthName(ps.payroll_month).slice(0,3)}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: accentColor, lineHeight: 1.2 }}>{ps.payroll_year}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{getMonthName(ps.payroll_month)}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ps.payroll_year}</div>
                        </div>
                      </div>

                      {/* Gross */}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>₹{parseFloat(ps.total_earnings).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </div>

                      {/* Deductions */}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>₹{parseFloat(ps.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </div>

                      {/* Net */}
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>₹{parseFloat(ps.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </div>

                      {/* Status */}
                      <div><StatusBadge status={ps.current_status} /></div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="ps-btn"
                          style={{
                            padding: '7px 14px', background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px',
                            fontSize: '12px', fontWeight: '600', color: '#6366f1', cursor: 'pointer'
                          }}
                          onClick={() => loadDetails(ps.employee_payroll_id)}
                        >View</button>
                        {ps.current_status === 'LOCKED' && (
                          <button
                            className="ps-btn"
                            style={{
                              padding: '7px 14px', background: 'rgba(16,185,129,0.08)',
                              border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px',
                              fontSize: '12px', fontWeight: '600', color: '#059669', cursor: 'pointer'
                            }}
                            onClick={() => handleDownloadPayslip(ps.employee_payroll_id)}
                          >↓ PDF</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Payslip Details Modal */}
      {selectedPayslipId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }} onClick={() => { setSelectedPayslipId(null); setDetails(null) }}>
          <div
            style={{
              background: '#ffffff', border: '1px solid #e2e8f0',
              borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh',
              overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.15)',
              animation: 'fadeIn 0.25s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            {loadingDetails ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading details...</div>
            ) : details ? (
              <>
                {/* Modal Hero */}
                <div style={{
                  padding: '28px 32px 24px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.04) 100%)',
                  borderBottom: '1px solid #e8eaf0',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute', top: '-30px', right: '-30px',
                    width: '120px', height: '120px', borderRadius: '50%',
                    background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.08)'
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{
                        width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
                        background: `${getMonthColor(details.payslip?.payroll_month)}14`,
                        border: `1px solid ${getMonthColor(details.payslip?.payroll_month)}25`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{ fontSize: '9px', fontWeight: '800', color: getMonthColor(details.payslip?.payroll_month), textTransform: 'uppercase' }}>
                          {getMonthName(details.payslip?.payroll_month)?.slice(0,3)}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: getMonthColor(details.payslip?.payroll_month) }}>
                          {details.payslip?.payroll_year}
                        </div>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: '800' }}>
                          {getMonthName(details.payslip?.payroll_month)} {details.payslip?.payroll_year}
                        </h3>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
                          <StatusBadge status={details.payslip?.current_status} />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {details.payslip?.working_days} working days
                          </span>
                          {details.payslip?.payslip_number && (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{details.payslip?.payslip_number}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {details.payslip?.current_status === 'LOCKED' && (
                        <button
                          className="ps-btn"
                          style={{
                            padding: '8px 16px', background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px',
                            fontSize: '13px', fontWeight: '600', color: '#6366f1', cursor: 'pointer'
                          }}
                          onClick={() => handleDownloadPayslip(details.payslip.employee_payroll_id)}
                        >↓ Download PDF</button>
                      )}
                      <button
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
                        onClick={() => { setSelectedPayslipId(null); setDetails(null) }}
                      >×</button>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Employee Info Grid */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Employee Information</div>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                      background: '#f8fafc', padding: '16px 18px',
                      borderRadius: '14px', border: '1px solid #e8eaf0'
                    }}>
                      {[
                        ['Designation', details.payslip?.designation],
                        ['Department', details.payslip?.department_name],
                        ['Date of Joining', details.payslip?.date_of_joining?.split('T')[0]],
                        ["Father's Name", details.payslip?.father_name],
                        ['Bank Name', details.payslip?.bank_name],
                        ['Account Number', details.payslip?.bank_account_number],
                        ['IFSC Code', details.payslip?.bank_ifsc],
                        ['UAN Number', details.payslip?.uan_number],
                        ['ESI Number', details.payslip?.esi_number],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                          <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{val || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Snapshot */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Attendance Snapshot</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Present', val: parseFloat(details.payslip?.present_days), color: '#10b981', icon: '✅' },
                        { label: 'Paid Leaves', val: parseFloat(details.payslip?.paid_leave_days), color: '#3b82f6', icon: '🌿' },
                        { label: 'Holidays', val: parseFloat(details.payslip?.holiday_days), color: '#8b5cf6', icon: '🎉' },
                        { label: 'Week Offs', val: parseFloat(details.payslip?.week_off_days), color: '#64748b', icon: '😴' },
                        { label: 'LOP Days', val: parseFloat(details.payslip?.lop_days), color: parseFloat(details.payslip?.lop_days) > 0 ? '#ef4444' : '#64748b', icon: '⚠️' },
                      ].map(({ label, val, color, icon }) => (
                        <div key={label} style={{
                          background: '#f8fafc', border: '1px solid #e8eaf0',
                          borderRadius: '12px', padding: '12px 10px', textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '14px', marginBottom: '4px' }}>{icon}</div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color, lineHeight: 1 }}>{val}</div>
                          <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LOP Breakdown (Absence vs Late Arrival) */}
                  {(parseFloat(details.payslip?.lop_days_absence) > 0 || parseFloat(details.payslip?.lop_days_late) > 0) && (
                    <div style={{ marginTop: '12px', background: '#fffef0', border: '1px dashed #fef08a', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#854d0e', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.04em', color: '#ca8a04', marginBottom: '2px' }}>LOP Days Breakdown</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>LOP Due to Absence:</span>
                        <span style={{ fontWeight: '700' }}>{parseFloat(details.payslip?.lop_days_absence).toFixed(1)} Day(s)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>LOP Due to Late Arrival:</span>
                        <span style={{ fontWeight: '700' }}>{parseFloat(details.payslip?.lop_days_late).toFixed(1)} Day(s)</span>
                      </div>
                    </div>
                  )}

                  {/* Earnings & Deductions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Earnings */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e8eaf0', borderRadius: '14px', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8eaf0', background: 'rgba(99,102,241,0.06)' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings</span>
                      </div>
                      <div style={{ padding: '4px 16px 8px' }}>
                        {details.components?.filter(c => c.component_type === 'EARNING').map(c => (
                          <div key={c.component_name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f2f8', fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>{c.component_name}</span>
                            <span style={{ fontWeight: '600', color: '#334155' }}>₹{parseFloat(c.actual_amount || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        {details.adjustments?.filter(a => a.adjustment_type === 'ADDITION').map((a, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f2f8', fontSize: '13px' }}>
                            <span style={{ color: '#10b981' }}>+ {a.adjustment_name}</span>
                            <span style={{ fontWeight: '600', color: '#10b981' }}>₹{parseFloat(a.amount).toFixed(2)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 6px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Total Earnings</span>
                          <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>₹{parseFloat(details.payslip?.total_earnings).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e8eaf0', borderRadius: '14px', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8eaf0', background: 'rgba(239,68,68,0.05)' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deductions</span>
                      </div>
                      <div style={{ padding: '4px 16px 8px' }}>
                        {details.components?.filter(c => c.component_type === 'DEDUCTION').map(c => (
                          <div key={c.component_name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f2f8', fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>{c.component_name}</span>
                            <span style={{ fontWeight: '600', color: '#334155' }}>₹{parseFloat(c.actual_amount || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f2f8', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Loss of Pay (LOP)</span>
                          <span style={{ fontWeight: '600', color: '#ef4444' }}>
                            ₹{((parseFloat(details.payslip?.gross_salary) / parseFloat(details.payslip?.working_days)) * parseFloat(details.payslip?.lop_days) || 0).toFixed(2)}
                          </span>
                        </div>
                        {details.adjustments?.filter(a => a.adjustment_type === 'DEDUCTION').map((a, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f2f8', fontSize: '13px' }}>
                            <span style={{ color: '#ef4444' }}>- {a.adjustment_name}</span>
                            <span style={{ fontWeight: '600', color: '#ef4444' }}>₹{parseFloat(a.amount).toFixed(2)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 6px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Total Deductions</span>
                          <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>₹{parseFloat(details.payslip?.total_deductions).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 100%)',
                    border: '1px solid rgba(16,185,129,0.18)', borderRadius: '16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                        Take-Home Net Salary
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', maxWidth: '380px', lineHeight: 1.5 }}>
                        {numberToWords(parseFloat(details.payslip?.net_salary))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#10b981', lineHeight: 1 }}>
                        ₹{parseFloat(details.payslip?.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
