import React from 'react';

/**
 * PageHeader — standard PMS page heading (Figma "PMS" design system).
 * - Optional 48px soft-blue icon tile (#EEF8FF) with a PMS-blue stroke icon (#0466C8)
 * - Large Poppins navy title (#001233) + muted subtitle (#7D8597)
 * - Right-aligned slot for action buttons / filters (wraps under the title on narrow screens)
 * Props are unchanged so every page using it keeps working as before.
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, children }) {
  return (
    <div className="pms-page-header" style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px 24px',
      marginBottom: 28,
      fontFamily: "'Poppins', 'Inter', sans-serif"
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        {Icon && (
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundImage: 'linear-gradient(#EEF8FF, #EEF8FF)',
            border: '1px solid #C9DDF3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={22} style={{ color: '#0466C8', stroke: '#0466C8' }} strokeWidth={2} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            margin: 0,
            fontFamily: "'Poppins', 'Inter', sans-serif",
            fontSize: 'clamp(24px, 2.4vw, 32px)',
            fontWeight: 700,
            color: '#001233',
            letterSpacing: '-0.5px',
            lineHeight: 1.3
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin: '2px 0 0',
              fontFamily: "'Poppins', 'Inter', sans-serif",
              color: '#7D8597',
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 1.5
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {(actions || children) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {actions || children}
        </div>
      )}
    </div>
  );
}
