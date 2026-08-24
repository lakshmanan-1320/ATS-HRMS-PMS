import React from 'react';

export default function NineBoxSummaryCards() {
  return (
    <div className="ninebox-summary-grid">
      <div className="ninebox-summary-card success">
        <h4>Future Leaders</h4>
        <div className="value">1</div>
        <p>Box 9</p>
      </div>

      <div className="ninebox-summary-card primary">
        <h4>Core Players</h4>
        <div className="value">12</div>
        <p>Box 6</p>
      </div>

      <div className="ninebox-summary-card warning">
        <h4>Solid Performers</h4>
        <div className="value">6</div>
        <p>Box 5</p>
      </div>

      <div className="ninebox-summary-card danger">
        <h4>At Risk</h4>
        <div className="value">2</div>
        <p>Boxes 1–3</p>
      </div>
    </div>
  );
}