import React from "react";

const overview = [
  {
    label: "Applications",
    value: 245,
    percentage: 100,
    color: "primary",
  },
  {
    label: "Shortlisted",
    value: 86,
    percentage: 65,
    color: "success",
  },
  {
    label: "Interviews",
    value: 42,
    percentage: 45,
    color: "warning",
  },
  {
    label: "Offers Sent",
    value: 18,
    percentage: 25,
    color: "info",
  },
  {
    label: "Hired",
    value: 12,
    percentage: 15,
    color: "dark",
  },
];

export default function HiringOverview() {
  return (
    <div className="card border-0 shadow-sm rounded-4 mt-4">
      <div className="card-body">

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="fw-bold mb-1">
              Recruitment Overview
            </h5>

            <small className="text-muted">
              Current hiring pipeline progress
            </small>
          </div>

          <span className="badge bg-primary">
            This Month
          </span>
        </div>

        {overview.map((item) => (
          <div key={item.label} className="mb-4">

            <div className="d-flex justify-content-between mb-2">

              <span className="fw-semibold">
                {item.label}
              </span>

              <span className="text-muted">
                {item.value}
              </span>

            </div>

            <div className="progress" style={{ height: "8px" }}>

              <div
                className={`progress-bar bg-${item.color}`}
                style={{ width: `${item.percentage}%` }}
              />

            </div>

          </div>
        ))}

      </div>
    </div>
  );
}