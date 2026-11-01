import React from 'react';

/**
 * Reusable Add Icon for Insight HCM
 *
 * Exact squircle tile geometry:
 * - Pure white squircle background (#ffffff)
 * - Thin, elegant rounded-pill plus icon in brand primary color (#0466C8)
 *
 * Props:
 * @param {number|string} size - Dimensions in pixels (default: 22)
 * @param {'white-tile'|'tile'|'plain'} variant - Visual style (default: 'white-tile')
 * @param {string} color - Plus icon color (default: '#0466C8' primary red)
 * @param {string} bg - Squircle background color (default: '#ffffff')
 * @param {number} strokeWidth - Plus thickness (default: 11 for sleek thin pill arms)
 * @param {object} style - Additional inline styles
 * @param {string} className - Additional CSS class name
 */
export default function AddIcon({
  size = 22,
  variant = 'white-tile',
  color = '#0466C8',
  bg = '#ffffff',
  strokeWidth = 11,
  style = {},
  className = '',
  ...props
}) {
  if (variant === 'plain') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
        className={className}
        {...props}
      >
        <line
          x1="50"
          y1="25"
          x2="50"
          y2="75"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1="25"
          y1="50"
          x2="75"
          y2="50"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // White squircle tile with sleek, thin primary red plus
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12))',
        ...style
      }}
      className={className}
      {...props}
    >
      {/* White squircle tile with 24% corner radius */}
      <rect
        width="100"
        height="100"
        rx="24"
        fill={bg}
      />
      {/* Thin rounded-pill plus sign in primary color (#0466C8) */}
      <line
        x1="50"
        y1="25"
        x2="50"
        y2="75"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1="25"
        y1="50"
        x2="75"
        y2="50"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
