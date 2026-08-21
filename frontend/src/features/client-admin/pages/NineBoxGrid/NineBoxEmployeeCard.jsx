import React from 'react';

export default function NineBoxEmployeeCard({ employee }) {
  if (!employee) return null;

  return (
    <div className="ninebox-employee-card">
      <div className="ninebox-employee-name">
        {(employee.first_name || '') + ' ' + (employee.last_name || '')}
      </div>

      <div className="ninebox-employee-department">
        {employee.department_name || 'No Department'}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
        }}
      >
        <span className="ninebox-score">
          {employee.final_score || employee.performance_score || 0}%
        </span>

        <span className="ninebox-potential-badge">
          {employee.potential_level || 'MEDIUM'}
        </span>
      </div>
    </div>
  );
}