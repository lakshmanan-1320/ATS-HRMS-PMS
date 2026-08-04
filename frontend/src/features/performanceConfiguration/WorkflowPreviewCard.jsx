import React from 'react';
import { FiArrowDown, FiUser, FiCheckCircle, FiGitPullRequest, FiRotateCcw } from 'react-icons/fi';

const s = {
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 4px 0'
  },
  desc: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 20px 0'
  },
  flowWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 0',
    gap: '16px'
  },
  stepBox: {
    width: '100%',
    maxWidth: '320px',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  iconBox: {
    padding: '8px',
    borderRadius: '10px',
    background: '#ffffff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  badgeLabel: {
    fontSize: '9px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'block',
    opacity: 0.8
  },
  stepTitle: {
    fontSize: '13px',
    fontWeight: '700',
    display: 'block',
    marginTop: '2px'
  },
  stepDesc: {
    fontSize: '11px',
    lineHeight: 1.4,
    marginTop: '4px'
  }
};

export default function WorkflowPreviewCard({ direction, approvalRequired }) {
  const steps = [];

  if (direction === 'TOP_DOWN') {
    steps.push({
      role: 'Manager',
      action: 'Create Goal',
      desc: 'Manager defines cycle goals for employees.',
      icon: FiUser,
      bg: '#f0f3ff',
      border: '#c7d2fe',
      color: '#312e81'
    });
    steps.push({
      role: 'System',
      action: 'Goal Active',
      desc: 'Goal is activated immediately and execution begins.',
      icon: FiCheckCircle,
      bg: '#ecfdf5',
      border: '#a7f3d0',
      color: '#065f46'
    });
  } else if (direction === 'BOTTOM_UP') {
    steps.push({
      role: 'Employee',
      action: 'Propose Goal',
      desc: 'Employee creates draft goals.',
      icon: FiUser,
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#92400e'
    });
    steps.push({
      role: 'Employee',
      action: 'Submit for Approval',
      desc: 'Employee submits proposed goals.',
      icon: FiGitPullRequest,
      bg: '#f0f3ff',
      border: '#c7d2fe',
      color: '#312e81'
    });

    if (approvalRequired) {
      steps.push({
        role: 'Manager',
        action: 'Review Actions',
        desc: 'Manager can: Approve (Active), Request Changes (Draft), or Reject.',
        icon: FiRotateCcw,
        bg: '#fff5f5',
        border: '#fecaca',
        color: '#991b1b',
        branches: [
          { label: 'Approve', status: 'ACTIVE', bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
          { label: 'Changes', status: 'DRAFT', bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
          { label: 'Reject', status: 'REJECTED', bg: '#f1f5f9', border: '#cbd5e1', color: '#334155' }
        ]
      });
    } else {
      steps.push({
        role: 'System',
        action: 'Goal Active (Immediate)',
        desc: 'Goal bypasses review and activates immediately.',
        icon: FiCheckCircle,
        bg: '#ecfdf5',
        border: '#a7f3d0',
        color: '#065f46'
      });
    }
  } else {
    // HYBRID
    steps.push({
      role: 'Manager & Employee',
      action: 'Create Goal',
      desc: 'Both managers and employees can propose goals.',
      icon: FiUser,
      bg: '#f0f3ff',
      border: '#c7d2fe',
      color: '#312e81'
    });

    if (approvalRequired) {
      steps.push({
        role: 'Manager',
        action: 'Approve Goal',
        desc: 'Manager review and approval is required.',
        icon: FiGitPullRequest,
        bg: '#fffbeb',
        border: '#fde68a',
        color: '#92400e'
      });
    }
    steps.push({
      role: 'System',
      action: 'Goal Active',
      desc: 'Goal is activated for progress recording.',
      icon: FiCheckCircle,
      bg: '#ecfdf5',
      border: '#a7f3d0',
      color: '#065f46'
    });
  }

  return (
    <div style={s.card}>
      <div>
        <h3 style={s.title}>Workflow Preview</h3>
        <p style={s.desc}>Dynamic simulation of the goal lifecycle</p>
      </div>

      <div style={s.flowWrapper}>
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <FiArrowDown size={16} style={{ color: '#cbd5e1', margin: '4px 0' }} />}
              
              <div style={{
                ...s.stepBox,
                background: step.bg,
                borderColor: step.border,
                color: step.color
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={s.iconBox}>
                    <StepIcon size={18} style={{ color: step.color }} />
                  </div>
                  <div>
                    <span style={s.badgeLabel}>{step.role}</span>
                    <span style={s.stepTitle}>{step.action}</span>
                    <p style={s.stepDesc}>{step.desc}</p>
                  </div>
                </div>

                {/* Render Branch Options if review actions exist */}
                {step.branches && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '8px'
                  }}>
                    {step.branches.map((b, bIdx) => (
                      <div key={bIdx} style={{
                        padding: '6px 4px',
                        borderRadius: '8px',
                        border: `1.5px solid ${b.border}`,
                        background: b.bg,
                        textAlign: 'center',
                        color: b.color
                      }}>
                        <div style={{ fontSize: '9px', fontWeight: '800' }}>{b.label}</div>
                        <div style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.04em' }}>{b.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
