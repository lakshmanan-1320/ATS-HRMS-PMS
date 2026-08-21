import React from 'react';
import NineBoxCell from './NineBoxCell';

const matrix = [
  [
    { box: 9, title: 'Future Leaders', color: 'green' },
    { box: 8, title: 'High Potential', color: 'blue' },
    { box: 7, title: 'Emerging Talent', color: 'purple' },
  ],
  [
    { box: 6, title: 'Core Players', color: 'blue' },
    { box: 5, title: 'Solid Performers', color: 'gray' },
    { box: 4, title: 'Inconsistent', color: 'orange' },
  ],
  [
    { box: 3, title: 'Growth Concern', color: 'orange' },
    { box: 2, title: 'Under Performer', color: 'red' },
    { box: 1, title: 'Critical Risk', color: 'red' },
  ],
];

export default function NineBoxMatrix({
  gridData,
  onEmployeeClick,
}) {
  return (
    <div className="ninebox-matrix-card">
      <div className="ninebox-matrix-header">
        <div>
          <h2>9-Box Talent Matrix</h2>
          <p>
            Performance on the horizontal axis and future
            potential on the vertical axis.
          </p>
        </div>

        <button className="ninebox-action-btn">
          Export Matrix
        </button>
      </div>

      <div className="ninebox-axis-top">
        <span>Low Performance</span>
        <span>Medium Performance</span>
        <span>High Performance</span>
      </div>

      <div className="ninebox-grid">
        {matrix.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            <div className="ninebox-axis-label">
              {rowIndex === 0
                ? 'High Potential'
                : rowIndex === 1
                ? 'Medium Potential'
                : 'Low Potential'}
            </div>

            {row.map((cell) => {
              const employees =
                gridData?.[`box${cell.box}`] || [];

              return (
                <NineBoxCell
                  key={cell.box}
                  cell={cell}
                  employees={employees}
                  onEmployeeClick={onEmployeeClick}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}