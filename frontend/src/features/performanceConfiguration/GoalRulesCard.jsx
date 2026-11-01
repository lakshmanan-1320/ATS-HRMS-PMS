import React from 'react';
import { FiArrowUpRight, FiArrowDownRight, FiGitBranch } from 'react-icons/fi';

const DIRECTIONS = [
  {
    value: 'TOP_DOWN',
    label: 'Top Down',
    desc: 'Managers create goals; employees execute them.',
    icon: FiArrowDownRight
  },
  {
    value: 'BOTTOM_UP',
    label: 'Bottom Up',
    desc: 'Employees propose goals; managers review them.',
    icon: FiArrowUpRight
  },
  {
    value: 'HYBRID',
    label: 'Hybrid',
    desc: 'Both managers and employees can create goals.',
    icon: FiGitBranch
  }
];

const FREQUENCIES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' }
];

const s = {
  card: {
    background: '#ffffff',
    border: '1px solid #E3E7EE',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    marginBottom: '24px'
  },
  title: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#001233',
    margin: '0 0 4px 0'
  },
  desc: {
    fontSize: '12px',
    color: '#7D8597',
    margin: '0 0 20px 0'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#33415C',
    display: 'block',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#f8fafc',
    border: '1.5px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#001233',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'all 0.15s'
  },
  dirCard: {
    width: '100%',
    textAlign: 'left',
    padding: '16px',
    borderRadius: '14px',
    border: '1.5px solid #cbd5e1',
    background: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    transition: 'all 0.2s',
    fontFamily: 'inherit'
  },
  dirCardActive: {
    borderColor: '#0353A4',
    background: '#f5f3ff',
    boxShadow: '0 0 0 4px rgba(4, 102, 200, 0.12)'
  },
  iconWrapper: {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#7D8597',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  iconWrapperActive: {
    background: '#0353A4',
    borderColor: '#0353A4',
    color: '#ffffff'
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #F1F4F8'
  },
  toggleSwitch: {
    position: 'relative',
    display: 'inline-flex',
    height: '24px',
    width: '44px',
    flexShrink: 0,
    cursor: 'pointer',
    borderRadius: '9999px',
    border: '2px solid transparent',
    transition: 'background-color 0.2s ease-in-out',
    outline: 'none'
  },
  toggleCircle: {
    pointerEvents: 'none',
    inlineBlock: 'block',
    height: '20px',
    width: '20px',
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease-in-out'
  }
};

export default function GoalRulesCard({ formData, onChange, errors, readOnly }) {
  const toggleRow = (name, currentValue) => {
    if (readOnly) return;
    onChange(name, !currentValue);
  };

  return (
    <div style={s.card}>
      <div>
        <h3 style={s.title}>Goal Rules</h3>
        <p style={s.desc}>Configure goal creation access and limits</p>
      </div>

      {/* Goal Setting Direction */}
      <div style={{ marginBottom: '20px' }}>
        <label style={s.label}>Goal Setting Direction</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DIRECTIONS.map((dir) => {
            const DirIcon = dir.icon;
            const isSelected = formData.goal_setting_direction === dir.value;
            return (
              <button
                key={dir.value}
                type="button"
                disabled={readOnly}
                onClick={() => onChange('goal_setting_direction', dir.value)}
                style={{
                  ...s.dirCard,
                  ...(isSelected ? s.dirCardActive : {}),
                  cursor: readOnly ? 'not-allowed' : 'pointer'
                }}
              >
                <div style={{
                  ...s.iconWrapper,
                  ...(isSelected ? s.iconWrapperActive : {})
                }}>
                  <DirIcon size={18} />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#001233', display: 'block' }}>{dir.label}</span>
                  <span style={{ fontSize: '11px', color: '#7D8597', marginTop: '2px', display: 'block', lineHeight: 1.4 }}>{dir.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* Maximum Goals Limit */}
      <div style={{ marginBottom: '24px' }}>
        <label style={s.label}>Maximum Goals Per Employee</label>
        <input
          type="number"
          name="max_goals_per_employee"
          min="1"
          max="50"
          value={formData.max_goals_per_employee || ''}
          onChange={(e) => onChange('max_goals_per_employee', parseInt(e.target.value, 10))}
          disabled={readOnly}
          placeholder="e.g. 5"
          style={{
            ...s.input,
            borderColor: errors.max_goals_per_employee ? '#f43f5e' : '#cbd5e1',
            background: readOnly ? '#F1F4F8' : '#f8fafc',
            cursor: readOnly ? 'not-allowed' : 'text'
          }}
        />
        {errors.max_goals_per_employee ? (
          <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block', fontWeight: '600' }}>
            {errors.max_goals_per_employee}
          </span>
        ) : (
          <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', display: 'block', fontWeight: '600' }}>
            Allowed range: 1 to 50 goals per employee
          </span>
        )}
      </div>

      {/* Toggle Switches */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          {
            name: 'goal_approval_required',
            label: 'Goal Approval Required',
            desc: 'Manager approval is required before goals become ACTIVE.'
          },
          {
            name: 'allow_goal_edit_after_approval',
            label: 'Allow Goal Edit After Approval',
            desc: 'Allows users to modify goals even after they are approved.'
          },
          {
            name: 'allow_employee_goal_creation',
            label: 'Allow Employee Goal Creation',
            desc: 'Employees are permitted to create their own cycle goals.'
          },
          {
            name: 'allow_manager_goal_creation',
            label: 'Allow Manager Goal Creation',
            desc: 'Managers are permitted to create goals for employees.'
          },
          {
            name: 'require_goal_weight_validation',
            label: 'Require Goal Weight Validation',
            desc: 'Employee goal weights must total exactly 100% before activation.'
          }
        ].map((toggle) => {
          const val = !!formData[toggle.name];
          return (
            <div key={toggle.name} style={s.toggleRow}>
              <div style={{ flexGrow: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151', display: 'block' }}>{toggle.label}</span>
                <span style={{ fontSize: '11px', color: '#7D8597', display: 'block', marginTop: '2px', lineHeight: 1.4 }}>{toggle.desc}</span>
              </div>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => toggleRow(toggle.name, val)}
                style={{
                  ...s.toggleSwitch,
                  backgroundColor: val ? '#0353A4' : '#cbd5e1',
                  opacity: readOnly ? 0.6 : 1,
                  cursor: readOnly ? 'not-allowed' : 'pointer'
                }}
              >
                <span
                  style={{
                    ...s.toggleCircle,
                    transform: val ? 'translateX(20px)' : 'translateX(0px)'
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
