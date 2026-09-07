// Shared design tokens for the employee portal

export const COLORS = {
  primary:    '#C2071A',
  primarySoft:'rgba(194,7,26,0.12)',
  green:      '#10b981',
  greenSoft:  'rgba(16,185,129,0.12)',
  blue:       '#0f766e',
  blueSoft:   'rgba(15,118,110,0.12)',
  amber:      '#f59e0b',
  amberSoft:  'rgba(245,158,11,0.12)',
  red:        '#ef4444',
  redSoft:    'rgba(239,68,68,0.12)',
  purple:     '#7c3aed',
  pink:       '#ec4899',
  slate:      '#94a3b8',
  slateSoft:  'rgba(100,116,139,0.15)',

  text:       '#0f172a',
  textSub:    '#64748b',
  textMuted:  '#94a3b8',
  border:     '#e2e8f0',
  borderLight:'#e8eaf0',
  bg:         '#f0f2f8',
  bgAlt:      '#f5f6fa',
  surface:    '#ffffff',
}

export const STATUS_COLOR = {
  draft:       { bg: COLORS.slateSoft,  color: COLORS.slate   },
  active:      { bg: COLORS.primarySoft, color: '#C2071A'     },
  in_progress: { bg: COLORS.blueSoft,   color: '#0f766e'      },
  submitted:   { bg: COLORS.amberSoft,  color: '#fbbf24'      },
  approved:    { bg: COLORS.greenSoft,  color: '#34d399'      },
  completed:   { bg: 'rgba(16,185,129,0.15)', color: '#34d399'},
  rejected:    { bg: COLORS.redSoft,    color: '#f87171'      },
  pending:     { bg: COLORS.amberSoft,  color: '#d97706'      },
  cancelled:   { bg: COLORS.slateSoft,  color: COLORS.textSub },
}

export const CARD = {
  background:   COLORS.surface,
  borderRadius: '18px',
  padding:      '22px',
  border:       `1px solid ${COLORS.borderLight}`,
  boxShadow:    '0 4px 20px rgba(0,0,0,0.05)',
}

export const TABLE_HEADER = {
  textAlign:     'left',
  fontSize:      '11px',
  fontWeight:    '700',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color:         COLORS.textSub,
  padding:       '12px 16px',
  borderBottom:  `1px solid ${COLORS.borderLight}`,
  background:    '#f8fafc',
}

export const INPUT = {
  width:       '100%',
  padding:     '10px 14px',
  background:  COLORS.surface,
  border:      `1px solid ${COLORS.border}`,
  borderRadius:'10px',
  fontSize:    '13px',
  color:       '#1e293b',
  outline:     'none',
  boxSizing:   'border-box',
  fontFamily:  'inherit',
}

export const GRADIENTS = {
  primary:  'linear-gradient(135deg, #D01021 0%, #B40619 100%)',
  blue:     'linear-gradient(135deg,#0f766e,#0d5f59)',
  green:    'linear-gradient(135deg,#10b981,#059669)',
  amber:    'linear-gradient(135deg,#f59e0b,#d97706)',
  pink:     'linear-gradient(135deg,#ec4899,#a21caf)',
  purple:   'linear-gradient(135deg,#7c3aed,#6d28d9)',
}

export const BAR_COLORS = ['#C2071A','#0f766e','#10b981','#f59e0b','#ec4899','#7c3aed']
