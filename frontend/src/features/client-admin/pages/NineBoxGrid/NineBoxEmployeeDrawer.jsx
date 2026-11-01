import React from 'react';

export default function NineBoxEmployeeDrawer({ employee, onClose }) {
  if (!employee) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 420,
        height: '100vh',
        background: '#ffffff',
        borderLeft: '1px solid #E3E7EE',
        boxShadow: '-8px 0 24px rgba(15,23,42,0.08)',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Employee Details</h2>

      <p><strong>Name:</strong> {employee.employeeName}</p>
      <p><strong>Department:</strong> {employee.department}</p>
      <p><strong>Score:</strong> {employee.score}</p>
      <p><strong>Box:</strong> {employee.boxLabel}</p>

      <button
        onClick={onClose}
        style={{
          marginTop: 24,
          padding: '10px 18px',
          background: '#0466C8',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Close
      </button>
    </div>
  );
}