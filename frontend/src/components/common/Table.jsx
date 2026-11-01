import React, { useState } from 'react';
import {
  FiSearch,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiSliders,
  FiArrowUp,
  FiArrowDown,
  FiPlus,
  FiCheck,
  FiMinus
} from 'react-icons/fi';

/**
 * Reusable Table Component (Shopify / Polaris Style)
 *
 * Features:
 * - Card styles: borderless outer container, 16px border-radius, soft card elevation
 * - Top segmented filter pills (All, Active, Draft/Inactive, Archived/Terminated, +)
 * - Search & filter action buttons (toggleable search input & extra filters)
 * - Row selection checkboxes (Header "Select All" with indeterminate state)
 * - Sortable columns with sleek chevrons
 * - Responsive table layout with clean cell spacing
 * - Pagination bar with current range and page numbers
 * - Insight HCM color pattern from globals.css (#0466C8 brand red)
 */

export default function Table({
  columns = [],
  data = [],
  rowKey = (row, idx) => row.id || row._id || idx,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  tabs = [],
  activeTab,
  onTabChange,
  onAddTab,
  searchable = true,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  sortColumn,
  sortDirection = 'asc',
  onSort,
  loading = false,
  emptyState,
  pagination,
  extraControls,
  rightActions,
  onRowClick,
  className = '',
  style = {},
}) {
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Helper to extract key
  const getKey = (row, idx) => (typeof rowKey === 'function' ? rowKey(row, idx) : row[rowKey] || idx);

  // Selection calculations
  const allCurrentKeys = data.map((row, idx) => getKey(row, idx));
  const isAllSelected = allCurrentKeys.length > 0 && allCurrentKeys.every(k => selectedKeys.includes(k));
  const isSomeSelected = allCurrentKeys.some(k => selectedKeys.includes(k)) && !isAllSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      // Deselect current page items
      const newKeys = selectedKeys.filter(k => !allCurrentKeys.includes(k));
      const newRows = data.filter(r => newKeys.includes(getKey(r)));
      onSelectionChange(newKeys, newRows);
    } else {
      // Add all current page items
      const set = new Set([...selectedKeys, ...allCurrentKeys]);
      const newKeys = Array.from(set);
      onSelectionChange(newKeys, data);
    }
  };

  const handleSelectRow = (e, row, idx) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    const key = getKey(row, idx);
    let newKeys;
    if (selectedKeys.includes(key)) {
      newKeys = selectedKeys.filter(k => k !== key);
    } else {
      newKeys = [...selectedKeys, key];
    }
    const newRows = data.filter(r => newKeys.includes(getKey(r)));
    onSelectionChange(newKeys, newRows);
  };

  return (
    <div
      className={`reusable-table-card ${className}`}
      style={{
        background: '#ffffff',
        border: 'none',
        borderRadius: '16px',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        ...style
      }}
    >
      {/* ── Top Bar / Controls Area ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid #F1F4F8',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Left: Segmented Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange && onTabChange(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 15px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  background: isActive ? '#eceff3' : 'transparent',
                  color: isActive ? '#001233' : '#7D8597',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: isActive ? '#ffffff' : '#F1F4F8',
                      color: isActive ? 'var(--primary-color, #0466C8)' : '#7D8597',
                      marginLeft: '2px'
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          {onAddTab && (
            <button
              type="button"
              onClick={onAddTab}
              title="Add view"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#7D8597',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F1F4F8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <FiPlus size={14} />
            </button>
          )}
        </div>

        {/* Right: Action Buttons (Search toggle, filter toggle, sort, right actions) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {searchable && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid #E3E7EE',
                borderRadius: '8px',
                background: '#ffffff',
                overflow: 'hidden'
              }}
            >
              <button
                type="button"
                onClick={() => setShowSearchInput(v => !v)}
                title="Search"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 11px',
                  border: 'none',
                  background: showSearchInput || searchValue ? '#f8fafc' : '#ffffff',
                  color: showSearchInput || searchValue ? 'var(--primary-color, #0466C8)' : '#7D8597',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <FiSearch size={15} />
                <FiSliders size={13} />
              </button>

              {showSearchInput && (
                <div style={{ display: 'flex', alignItems: 'center', paddingRight: '8px' }}>
                  <input
                    type="text"
                    className="ca-borderless-input"
                    value={searchValue}
                    onChange={e => onSearchChange && onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    autoFocus
                    style={{
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      background: 'transparent',
                      fontSize: '13.5px',
                      padding: '6px 10px',
                      color: '#001233',
                      width: '210px',
                      fontFamily: 'inherit'
                    }}
                  />
                  {searchValue && (
                    <button
                      type="button"
                      onClick={() => onSearchChange && onSearchChange('')}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex'
                      }}
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sort Button / Toggle */}
          {onSort && (
            <button
              type="button"
              onClick={() => onSort(sortColumn || columns[0]?.key)}
              title="Sort"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #E3E7EE',
                background: '#ffffff',
                color: '#7D8597',
                cursor: 'pointer'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = 'var(--primary-color, #0466C8)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#7D8597';
              }}
            >
              {sortDirection === 'desc' ? <FiArrowDown size={15} /> : <FiArrowUp size={15} />}
            </button>
          )}

          {/* Custom right actions slot */}
          {rightActions}
        </div>
      </div>

      {/* ── Optional Extra Controls / Secondary Filter Bar ── */}
      {extraControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 18px',
            background: '#fafbfc',
            borderBottom: '1px solid #F1F4F8',
            flexWrap: 'wrap'
          }}
        >
          {extraControls}
        </div>
      )}

      {/* ── Selection Bulk Action Bar (if rows selected) ── */}
      {selectable && selectedKeys.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 18px',
            background: 'var(--card-active-bg, #EEF8FF)',
            borderBottom: '1px solid var(--card-active-border, #C9DDF3)',
            color: 'var(--primary-color, #0466C8)',
            fontSize: '12.5px',
            fontWeight: 700
          }}
        >
          <span>{selectedKeys.length} selected</span>
          <button
            type="button"
            onClick={() => onSelectionChange && onSelectionChange([], [])}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color, #0466C8)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              textDecoration: 'underline'
            }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Table Container ── */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          {/* Header Row */}
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F4F8', background: '#ffffff' }}>
              {selectable && (
                <th
                  style={{
                    width: '44px',
                    padding: '12px 14px 12px 18px',
                    textAlign: 'center',
                    verticalAlign: 'middle'
                  }}
                >
                  <div
                    onClick={handleSelectAll}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: isAllSelected || isSomeSelected ? '1.5px solid var(--primary-color, #0466C8)' : '1.5px solid #cbd5e1',
                      background: isAllSelected || isSomeSelected ? 'var(--primary-color, #0466C8)' : '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isAllSelected && <FiCheck size={11} color="#ffffff" strokeWidth={3} />}
                    {isSomeSelected && <FiMinus size={11} color="#ffffff" strokeWidth={3} />}
                  </div>
                </th>
              )}

              {columns.map((col, cIdx) => {
                const isSort = sortColumn === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                    style={{
                      padding: '14px 18px',
                      paddingLeft: cIdx === 0 && !selectable ? '22px' : '18px',
                      paddingRight: cIdx === columns.length - 1 ? '22px' : '18px',
                      fontSize: '13.5px',
                      fontWeight: 650,
                      color: '#001233',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      textAlign: col.align || 'left',
                      width: col.width || 'auto',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      ...col.headerStyle
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start'
                      }}
                    >
                      <span>{col.label || col.title}</span>
                      {col.sortable && (
                        <span
                          style={{
                            display: 'inline-flex',
                            color: isSort ? 'var(--primary-color, #0466C8)' : '#9ca3af',
                            fontSize: '11px'
                          }}
                        >
                          {isSort ? (
                            sortDirection === 'desc' ? <FiArrowDown size={12} /> : <FiArrowUp size={12} />
                          ) : (
                            <svg width="10" height="12" viewBox="0 0 10 14" fill="none" style={{ opacity: 0.6 }}>
                              <path d="M5 1L2 4.5H8L5 1Z" fill="currentColor" />
                              <path d="M5 13L8 9.5H2L5 13Z" fill="currentColor" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body Rows */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={(selectable ? 1 : 0) + columns.length}
                  style={{ padding: '60px 20px', textAlign: 'center', color: '#7D8597' }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid #E3E7EE',
                      borderTopColor: 'var(--primary-color, #0466C8)',
                      borderRadius: '50%',
                      margin: '0 auto 12px',
                      animation: 'spin 0.8s linear infinite'
                    }}
                  />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Loading data...</div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={(selectable ? 1 : 0) + columns.length}
                  style={{ padding: '40px 20px', textAlign: 'center' }}
                >
                  {emptyState || (
                    <div style={{ color: '#7D8597', fontSize: '13.5px' }}>
                      No items found.
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const key = getKey(row, idx);
                const isSelected = selectable && selectedKeys.includes(key);
                const isLast = idx === data.length - 1;

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                      background: isSelected ? '#fff8f8' : '#ffffff',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    {selectable && (
                      <td
                        style={{
                          width: '44px',
                          padding: '13px 14px 13px 18px',
                          textAlign: 'center',
                          verticalAlign: 'middle'
                        }}
                      >
                        <div
                          onClick={e => handleSelectRow(e, row, idx)}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: isSelected ? '1.5px solid var(--primary-color, #0466C8)' : '1.5px solid #cbd5e1',
                            background: isSelected ? 'var(--primary-color, #0466C8)' : '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <FiCheck size={11} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </td>
                    )}

                    {columns.map((col, cIdx) => {
                      const value = col.dataIndex ? row[col.dataIndex] : row[col.key];
                      const rendered = col.render ? col.render(value, row, idx) : value;

                      return (
                        <td
                          key={col.key}
                          style={{
                            padding: '16px 18px',
                            paddingLeft: cIdx === 0 && !selectable ? '22px' : '18px',
                            paddingRight: cIdx === columns.length - 1 ? '22px' : '18px',
                            fontSize: '14px',
                            color: '#001233',
                            verticalAlign: 'middle',
                            textAlign: col.align || 'left',
                            ...col.cellStyle
                          }}
                        >
                          {rendered !== undefined && rendered !== null ? rendered : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Footer ── */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid #F1F4F8',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '13px', color: '#33415C', fontWeight: 500 }}>
            Showing {((pagination.currentPage - 1) * (pagination.pageSize || 10)) + 1}–
            {Math.min(pagination.currentPage * (pagination.pageSize || 10), pagination.totalItems || 0)} of{' '}
            {pagination.totalItems || 0} items
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
              style={{
                padding: '7px 13px',
                border: '1px solid #E3E7EE',
                borderRadius: '8px',
                background: pagination.currentPage <= 1 ? '#f8fafc' : '#ffffff',
                color: pagination.currentPage <= 1 ? '#cbd5e1' : '#33415C',
                fontSize: '13px',
                fontWeight: 600,
                cursor: pagination.currentPage <= 1 ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'inherit'
              }}
            >
              <FiChevronLeft size={14} /> Prev
            </button>

            {/* Page number pill buttons */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.currentPage) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', fontSize: '13px', color: '#94a3b8' }}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => pagination.onPageChange(p)}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      border: p === pagination.currentPage ? 'none' : '1px solid #E3E7EE',
                      background:
                        p === pagination.currentPage
                          ? 'var(--navbar-active-gradient, linear-gradient(135deg, #0466C8 0%, #023E7D 100%))'
                          : '#ffffff',
                      color: p === pagination.currentPage ? '#ffffff' : '#33415C',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
              style={{
                padding: '6px 12px',
                border: '1px solid #E3E7EE',
                borderRadius: '8px',
                background: pagination.currentPage >= pagination.totalPages ? '#f8fafc' : '#ffffff',
                color: pagination.currentPage >= pagination.totalPages ? '#cbd5e1' : '#33415C',
                fontSize: '12px',
                fontWeight: 600,
                cursor: pagination.currentPage >= pagination.totalPages ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'inherit'
              }}
            >
              Next <FiChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
