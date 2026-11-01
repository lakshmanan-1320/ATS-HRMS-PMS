import React, { useState } from 'react'
import { FiArrowLeft, FiSliders, FiUsers, FiCalendar } from 'react-icons/fi'
import LeavePlanConfiguration from './LeavePlanConfiguration.jsx'
import LeavePlanEmployees from './LeavePlanEmployees.jsx'
import LeaveYearEndPanel from './LeaveYearEndPanel.jsx'

export default function LeavePlanDetails({ plan, onBack }) {
  const [activeSubTab, setActiveSubTab] = useState('config')

  return (
    <div>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#023E7D', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
      >
        <FiArrowLeft size={14} /> Back to Plans List
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#001233' }}>{plan.name} Workspace</h2>
        {plan.description && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7D8597' }}>{plan.description}</p>}
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E3E7EE', marginBottom: '20px', paddingBottom: '1px' }}>
        {[
          { key: 'config', label: 'Configuration', icon: <FiSliders size={13} /> },
          { key: 'employees', label: 'Employee Assignment', icon: <FiUsers size={13} /> },
          { key: 'yearend', label: 'Year End Processing', icon: <FiCalendar size={13} /> }
        ].map(t => {
          const isAct = activeSubTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveSubTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'none',
                border: 'none', borderBottom: `2px solid ${isAct ? '#0466C8' : 'transparent'}`,
                color: isAct ? '#0466C8' : '#7D8597', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {t.icon}
              {t.label}
            </button>
          )
        })}
      </div>

      <div>
        {activeSubTab === 'config' && <LeavePlanConfiguration planId={plan.leave_plan_id} />}
        {activeSubTab === 'employees' && <LeavePlanEmployees planId={plan.leave_plan_id} />}
        {activeSubTab === 'yearend' && <LeaveYearEndPanel planId={plan.leave_plan_id} />}
      </div>
    </div>
  )
}
