import React from 'react';

/**
 * PageHeader - Standardized page header component for Client Admin and feature modules.
 * Matches exact specs from Image 2 reference:
 * - 44x44px rounded container with brand red tint background (#FEECEE)
 * - Brand red stroke icon (#C2071A)
 * - 22px extra-bold title (#111827)
 * - 13px medium subtitle (#64748b)
 * - Right-aligned slot for action buttons / filters
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {Icon && (
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            flexShrink: 0,
            backgroundImage: 'linear-gradient(#FEECEE, #FEECEE)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={24} style={{ color: '#C2071A', stroke: '#C2071A' }} strokeWidth={2.25} />
          </div>
        )}
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.4px',
            lineHeight: 1.2
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin: '3px 0 0',
              color: '#64748b',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.4
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {(actions || children) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {actions || children}
        </div>
      )}
    </div>
  );
}
