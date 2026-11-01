// Shared design tokens for the employee portal (PMS navy/blue palette — see PMS below)

export const COLORS = {
  primary:    '#0466C8',
  primarySoft:'rgba(4,102,200,0.12)',
  green:      '#10b981',
  greenSoft:  'rgba(16,185,129,0.12)',
  blue:       '#407BA7',
  blueSoft:   'rgba(64,123,167,0.12)',
  amber:      '#f59e0b',
  amberSoft:  'rgba(245,158,11,0.12)',
  red:        '#ef4444',
  redSoft:    'rgba(239,68,68,0.12)',
  purple:     '#7c3aed',
  pink:       '#ec4899',
  slate:      '#94a3b8',
  slateSoft:  'rgba(100,116,139,0.15)',

  text:       '#001233',
  textSub:    '#7D8597',
  textMuted:  '#94a3b8',
  border:     '#E3E7EE',
  borderLight:'#E3E7EE',
  bg:         '#FFFFFF',
  bgAlt:      '#F1F4F8',
  surface:    '#ffffff',
}

export const STATUS_COLOR = {
  draft:       { bg: COLORS.slateSoft,  color: COLORS.slate   },
  active:      { bg: COLORS.primarySoft, color: '#0466C8'     },
  in_progress: { bg: COLORS.blueSoft,   color: '#407BA7'      },
  submitted:   { bg: COLORS.amberSoft,  color: '#fbbf24'      },
  approved:    { bg: COLORS.greenSoft,  color: '#34d399'      },
  completed:   { bg: 'rgba(16,185,129,0.15)', color: '#34d399'},
  rejected:    { bg: COLORS.redSoft,    color: '#f87171'      },
  pending:     { bg: COLORS.amberSoft,  color: '#d97706'      },
  cancelled:   { bg: COLORS.slateSoft,  color: COLORS.textSub },
}

export const CARD = {
  background:   COLORS.surface,
  borderRadius: '23.5px',
  padding:      '22px',
  border:       `1px solid ${COLORS.borderLight}`,
  boxShadow:    'none',
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
  background:    '#F1F4F8',
}

export const INPUT = {
  width:       '100%',
  padding:     '10px 14px',
  background:  COLORS.surface,
  border:      `1px solid ${COLORS.border}`,
  borderRadius:'10px',
  fontSize:    '13px',
  color:       '#001233',
  outline:     'none',
  boxSizing:   'border-box',
  fontFamily:  'inherit',
}

export const GRADIENTS = {
  primary:  'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
  blue:     'linear-gradient(135deg,#407BA7,#004E89)',
  green:    'linear-gradient(135deg,#10b981,#059669)',
  amber:    'linear-gradient(135deg,#f59e0b,#d97706)',
  pink:     'linear-gradient(135deg,#ec4899,#a21caf)',
  purple:   'linear-gradient(135deg,#7c3aed,#6d28d9)',
}

export const BAR_COLORS = ['#0466C8','#407BA7','#10b981','#f59e0b','#ec4899','#7c3aed']

// ── PMS design system (Figma "PMS" file, Employee dashboard frame 1130:1349) ──
// Navy / blue identity used by the employee portal chrome and dashboard.
export const PMS = {
  navy:        '#001233', // headings, dark panels, banners
  navyDeep:    '#000714', // sidebar gradient start
  navyMid:     '#15294E', // sidebar gradient middle
  navyRow:     '#002855', // rows / icon buttons inside dark panels
  blue:        '#0466C8', // primary accent, CTA, active
  blueDark:    '#023E7D', // gradient end
  blueMid:     '#0353A4',
  steel:       '#407BA7', // secondary accent, badges, avatars
  steelDark:   '#004E89',
  sky:         '#52ACEF',
  slate:       '#33415C', // body text on light
  slateMid:    '#5C677D',
  muted:       '#7D8597', // captions
  ice:         '#EEF8FF', // light text on dark / tinted fills
  pillBlue:    '#E3EEFA', // blue pill background
  pillGrey:    '#EEF1F5', // neutral pill background / grid lines
  surfaceAlt:  '#F1F4F8', // icon chips, empty boxes, tracks
  border:      '#E3E7EE',
  divider:     '#E9E9E9',
  barSoft:     '#C9DDF3',
  barSofter:   '#EAF2FB',
  white:       '#FFFFFF',

  fontHead: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

  gradBlue:     'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
  gradBlueVert: 'linear-gradient(180deg, #0466C8 0%, #023E7D 100%)',
  gradPanel:    'linear-gradient(118deg, #0466C8 0%, #0353A4 55%, #023E7D 100%)',
  gradBarSoft:  'linear-gradient(180deg, #C9DDF3 0%, #EAF2FB 100%)',
  gradSidebar:  'linear-gradient(180deg, #000714 0%, #15294E 46.6%, #001233 100%)',
  gradNavActive:'linear-gradient(90deg, #004E89 0%, #52ACEF 61%, #407BA7 100%)',

  shadowCta:    '0 8px 18px rgba(4,102,200,0.28)',
  shadowRow:    '0 10px 24px rgba(4,102,200,0.35)',
  shadowTile:   '0 10px 20px rgba(4,102,200,0.30)',
  shadowNav:    '0 0 10px rgba(4,102,200,0.55)',

  radiusCard:  '23.5px',
  radiusPanel: '28px',
  radiusInner: '24px',
  radiusRow:   '18px',
}
