import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FiSearch, FiSliders, FiList, FiChevronDown, FiChevronUp, FiPlus } from 'react-icons/fi'
import LeaveAdjustmentsForm from './LeaveAdjustmentsForm.jsx'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function LeaveBalancesGrid() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null)
  const [employeeBalances, setEmployeeBalances] = useState({})
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [selectedAdjustEmployee, setSelectedAdjustEmployee] = useState(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 10

  const fetchEmployees = () => {
    setLoading(true)
    api.get('/v1/employees')
      .then(res => {
        // Handle both direct array or paginated object structure
        const list = Array.isArray(res.data) ? res.data : (res.data?.employees || [])
        setEmployees(list.filter(e => e.status === 'active'))
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const loadBalances = (employeeId) => {
    setLoadingBalances(true)
    api.get(`/v1/leave/admin/employee/${employeeId}/balances`)
      .then(res => {
        setEmployeeBalances(prev => ({
          ...prev,
          [employeeId]: res.data || []
        }))
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingBalances(false))
  }

  const handleRowClick = (employeeId) => {
    if (expandedEmployeeId === employeeId) {
      setExpandedEmployeeId(null)
    } else {
      setExpandedEmployeeId(employeeId)
      if (!employeeBalances[employeeId]) {
        loadBalances(employeeId)
      }
    }
  }

  const filtered = employees.filter(emp => {
    const q = search.toLowerCase()
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase()
    const code = (emp.employee_code || '').toLowerCase()
    return fullName.includes(q) || code.includes(q)
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Employee Balances</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>View current allocations and adjust ledger entries</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', width: '280px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <FiSearch size={13} color="#94a3b8" />
          <input
            placeholder="Search employee name or code…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#0f172a', outline: 'none', width: '100%' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading employee directory…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>No employees found matching filter.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 18px', width: '30px' }}></th>
                <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left' }}>Employee</th>
                <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left' }}>Code</th>
                <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left' }}>Designation</th>
                <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: '700', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((emp) => {
                const isExpanded = expandedEmployeeId === emp.employee_id
                const balances = employeeBalances[emp.employee_id] || []
                return (
                  <React.Fragment key={emp.employee_id}>
                    <tr
                      onClick={() => handleRowClick(emp.employee_id)}
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        {isExpanded ? <FiChevronUp size={14} color="#64748b" /> : <FiChevronDown size={14} color="#64748b" />}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: '700', color: '#0f172a' }}>
                        {emp.first_name} {emp.last_name}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#475569' }}>
                        {emp.employee_code}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748b' }}>
                        {emp.designation || 'Staff'}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748b' }}>
                        {emp.email}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedAdjustEmployee(emp)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f5f7ff', border: '1px solid #c7d2fe', borderRadius: '8px', color: '#4f46e5', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                          <FiSliders size={12} /> Adjust Balance
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Balances Row */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <td colSpan="6" style={{ padding: '16px 24px' }}>
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FiList size={12} /> Live Balances Summary
                            </div>

                            {loadingBalances && balances.length === 0 ? (
                              <div style={{ fontSize: '12px', color: '#64748b' }}>Loading balances...</div>
                            ) : balances.length === 0 ? (
                              <div style={{ fontSize: '12px', color: '#64748b' }}>No active leave plan balances found. Make sure employee is assigned to a leave plan.</div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                                {balances.map(bal => (
                                  <div key={bal.leave_type_id} style={{ border: '1px solid #f1f5f9', background: '#fcfdfe', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: 6 }}>{bal.leave_type_name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: 2 }}>
                                      <span>Allocated:</span>
                                      <span style={{ fontWeight: '600' }}>{parseFloat(bal.allocated_days)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: 4 }}>
                                      <span>Used:</span>
                                      <span style={{ fontWeight: '600' }}>{parseFloat(bal.used_days)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', borderTop: '1px solid #f1f5f9', paddingTop: 4, marginTop: 4 }}>
                                      <span style={{ color: '#0f172a' }}>Available:</span>
                                      <span style={{ color: '#6366f1' }}>{parseFloat(bal.available_days)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing Page {page} of {totalPages} ({filtered.length} employees)
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600', color: page === 1 ? '#cbd5e1' : '#374151' }}
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600', color: page === totalPages ? '#cbd5e1' : '#374151' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedAdjustEmployee && (
        <LeaveAdjustmentsForm
          employee={selectedAdjustEmployee}
          onClose={() => setSelectedAdjustEmployee(null)}
          onSave={() => {
            if (expandedEmployeeId === selectedAdjustEmployee.employee_id) {
              loadBalances(selectedAdjustEmployee.employee_id)
            }
          }}
        />
      )}
    </div>
  )
}
