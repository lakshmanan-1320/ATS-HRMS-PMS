import React from 'react';
import NineBoxEmployeeCard from './NineBoxEmployeeCard';

export default function NineBoxCell({
  cell,
  employees = [],
  onEmployeeClick,
}) {
  return (
    <div className={`ninebox-cell ${cell.color}`}>
      <div className="ninebox-cell-header">
        <span className="ninebox-box-number">Box {cell.box}</span>
        <span className="ninebox-count">{employees.length}</span>
      </div>

      <h3>{cell.title}</h3>

      <div className="ninebox-cell-body">
        {employees.length === 0 ? (
          <p className="ninebox-empty">No employees assigned</p>
        ) : (
          employees.map((employee, index) => (
            <div
              key={employee?.employee_id || index}
              onClick={() => onEmployeeClick?.(employee)}
              style={{ cursor: 'pointer', marginBottom: 10 }}
            >
              <NineBoxEmployeeCard employee={employee} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}