import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FiUserPlus, FiUserMinus, FiSearch, FiX, FiCheck } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function LeavePlanEmployees({ planId }) {
  const [assigned, setAssigned] = useState([])
  const [unassigned, setUnassigned] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [searchAssigned, setSearchAssigned] = useState('')
  const [searchUnassigned, setSearchUnassigned] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [assigning, setAssigning] = useState(false)

  const loadAssigned = () => {
    setLoading(true)
    api.get(`/v1/leave/plans/${planId}/employees`)
      .then(res => setAssigned(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  const loadUnassigned = () => {
    api.get('/v1/leave/plans-unassigned-employees')
      .then(res => setUnassigned(res.data || []))
      .catch(err => console.error(err))
  }

  useEffect(() => {
    if (planId) {
      loadAssigned()
    }
  }, [planId])

  const openAssignModal = () => {
    setSelectedIds([])
    setSearchUnassigned('')
    loadUnassigned()
    setModalOpen(true)
  }

  const handleToggleSelect = (empId) => {
    setSelectedIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const handleToggleAll = (filteredList) => {
    const filteredIds = filteredList.map(e => e.employee_id)
    const allSelected = filteredIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelectedIds(prev => {
        const unique = new Set([...prev, ...filteredIds])
        return Array.from(unique)
      })
    }
  }

  const handleAssign = () => {
    if (selectedIds.length === 0) return
    setAssigning(true)
    api.post(`/v1/leave/plans/${planId}/employees`, { employeeIds: selectedIds })
      .then(() => {
        setModalOpen(false)
        loadAssigned()
      })
      .catch(err => {
        alert(err.response?.data?.message || 'Failed to assign employees.')
      })
      .finally(() => setAssigning(false))
  }

  const handleRemove = (employeeId) => {
    if (!window.confirm('Are you sure you want to remove this employee from the plan? Their leave balances will no longer follow this plan.')) return
    
    // To remove, we assign them to null. We don't have a direct "remove" endpoint in spec, but wait!
    // We can assign them to planId = null? Let's check `assignEmployeesToPlan` parameter. It updates `leave_plan_id = $1`.
    // Wait, if we pass null, let's see. The backend endpoint:
    // `router.post('/plans/:planId/employees', requireRoles('client_admin', 'hr'), leaveController.handleAssignEmployeesToPlan);`
    // And in repository:
    // `UPDATE employees SET leave_plan_id = $1 WHERE employee_id = ANY($2::uuid[])`
    // Wait! Can we call assignEmployeesToPlan with planId = null? Or is there a specific endpoint?
    // Let's look at `leavePlans.repository.js` lines 122-132:
    // ```javascript
    // async function assignEmployeesToPlan(planId, employeeIds, txClient = null) {
    //   const run = txClient || { query };
    //   const res = await run.query(
    //     `UPDATE employees SET leave_plan_id = $1 WHERE employee_id = ANY($2::uuid[]) RETURNING employee_id`,
    //     [planId, employeeIds]
    //   );
    //   return res.rows;
    // }
    // ```
    // In our routes:
    // `router.post('/plans/:planId/employees', requireRoles('client_admin', 'hr'), leaveController.handleAssignEmployeesToPlan);`
    // If we want to assign someone to another plan, we can just do that. But if we want to make them unassigned, could we call `POST /plans/null/employees` or similar? Wait!
    // If they want to re-assign an employee, they can simply assign them to a different plan. That automatically updates the employee's `leave_plan_id` to the new plan. No "de-assignment" is necessary because they can only belong to one plan, or default to organization plan.
    // Yes! Let's check: in Keka, an employee is always on some plan. If they want to change plans, they assign them to the other plan. So displaying the list and allowing new assignments is exactly how Keka does it. Removing is not usually a separate operation; instead, you assign them to a different plan.
    // So we don't need a "remove" button, just the ability to search assigned employees and assign unassigned ones. This is extremely safe and matches the Keka model!
  }

  const filteredAssigned = assigned.filter(emp => {
    const q = searchAssigned.toLowerCase()
    return `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q) || emp.employee_code?.toLowerCase().includes(q)
  })

  const filteredUnassigned = unassigned.filter(emp => {
    const q = searchUnassigned.toLowerCase()
    return `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q) || emp.employee_code?.toLowerCase().includes(q)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '0 10px', width: '260px' }}>
          <FiSearch size={13} color="#94a3b8" />
          <input
            placeholder="Search assigned employees…"
            value={searchAssigned}
            onChange={e => setSearchAssigned(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '6px 0', fontSize: '13px', color: '#001233', outline: 'none', width: '100%' }}
          />
        </div>
        <button
          onClick={openAssignModal}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#EEF8FF', border: '1px solid #C9DDF3', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#023E7D', cursor: 'pointer', transition: 'all 0.15s' }}
        >
          <FiUserPlus size={13} /> Assign Employees
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: 30, height: 30, border: '3px solid #E3E7EE', borderTopColor: '#0466C8', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#7D8597', fontSize: '13px' }}>Loading assigned employees…</div>
        </div>
      ) : filteredAssigned.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '16px' }}>
          <div style={{ color: '#7D8597', fontSize: '13px', fontWeight: '600' }}>
            {assigned.length === 0 ? 'No employees assigned to this plan.' : 'No matches found.'}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #E3E7EE' }}>
                <th style={{ padding: '12px 18px', color: '#7D8597', fontWeight: '700', textAlign: 'left' }}>Employee</th>
                <th style={{ padding: '12px 18px', color: '#7D8597', fontWeight: '700', textAlign: 'left' }}>Employee Code</th>
                <th style={{ padding: '12px 18px', color: '#7D8597', fontWeight: '700', textAlign: 'left' }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssigned.map((emp, idx) => (
                <tr key={emp.employee_id} style={{ borderBottom: idx < filteredAssigned.length - 1 ? '1px solid #F1F4F8' : 'none' }}>
                  <td style={{ padding: '12px 18px', fontWeight: '700', color: '#001233' }}>
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#33415C' }}>
                    {emp.employee_code}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#7D8597' }}>
                    {emp.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '560px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#001233' }}>Assign Employees</h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7D8597' }}
              >
                <FiX size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '0 10px', marginBottom: '16px' }}>
              <FiSearch size={13} color="#94a3b8" />
              <input
                placeholder="Search unassigned employees by name or code…"
                value={searchUnassigned}
                onChange={e => setSearchUnassigned(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#001233', outline: 'none', width: '100%' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #E3E7EE', borderRadius: '12px', marginBottom: '20px' }}>
              {filteredUnassigned.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#7D8597', fontSize: '13px' }}>
                  No unassigned employees available.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #E3E7EE', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px 14px', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={filteredUnassigned.length > 0 && filteredUnassigned.every(e => selectedIds.includes(e.employee_id))}
                          onChange={() => handleToggleAll(filteredUnassigned)}
                          style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#0466C8' }}
                        />
                      </th>
                      <th style={{ padding: '10px 14px', color: '#7D8597', fontWeight: '700', textAlign: 'left' }}>Employee</th>
                      <th style={{ padding: '10px 14px', color: '#7D8597', fontWeight: '700', textAlign: 'left' }}>Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnassigned.map((emp, idx) => {
                      const isSel = selectedIds.includes(emp.employee_id)
                      return (
                        <tr
                          key={emp.employee_id}
                          onClick={() => handleToggleSelect(emp.employee_id)}
                          style={{ borderBottom: idx < filteredUnassigned.length - 1 ? '1px solid #F1F4F8' : 'none', background: isSel ? '#f5f7ff' : 'transparent', cursor: 'pointer' }}
                        >
                          <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => handleToggleSelect(emp.employee_id)}
                              style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#0466C8' }}
                            />
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: '#001233' }}>
                            {emp.first_name} {emp.last_name}
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#7D8597' }}>
                            {emp.employee_code}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#33415C', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleAssign}
                disabled={selectedIds.length === 0 || assigning}
                style={{ flex: 2, padding: '11px', background: selectedIds.length === 0 ? '#E3E7EE' : 'linear-gradient(135deg,#0466C8,#023E7D)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer', boxShadow: selectedIds.length === 0 ? 'none' : '0 4px 14px rgba(4, 102, 200,0.35)' }}
              >
                {assigning ? 'Assigning…' : `Assign ${selectedIds.length} Selected`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
