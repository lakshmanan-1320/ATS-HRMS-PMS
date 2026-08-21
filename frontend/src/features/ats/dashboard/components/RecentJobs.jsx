import React from "react";
import { FiEye, FiEdit2 } from "react-icons/fi";

const jobs = [
  {
    id: 1,
    title: "Senior React Developer",
    department: "Engineering",
    applications: 42,
    status: "Open",
  },
  {
    id: 2,
    title: "UI/UX Designer",
    department: "Design",
    applications: 18,
    status: "Open",
  },
  {
    id: 3,
    title: "HR Executive",
    department: "Human Resource",
    applications: 25,
    status: "Closed",
  },
  {
    id: 4,
    title: "QA Engineer",
    department: "Engineering",
    applications: 11,
    status: "Draft",
  },
];

export default function RecentJobs() {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">

      <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">

        <div>
          <h5 className="fw-bold mb-1">
            Recent Jobs
          </h5>

          <small className="text-muted">
            Latest job postings
          </small>
        </div>

        <button className="btn btn-sm btn-outline-primary">
          View All
        </button>

      </div>

      <div className="table-responsive">

        <table className="table align-middle mb-0">

          <thead className="table-light">

            <tr>

              <th>Job</th>

              <th>Department</th>

              <th>Applications</th>

              <th>Status</th>

              <th className="text-center">Action</th>

            </tr>

          </thead>

          <tbody>

            {jobs.map((job) => (

              <tr key={job.id}>

                <td>

                  <strong>{job.title}</strong>

                </td>

                <td>{job.department}</td>

                <td>

                  <span className="badge bg-primary">
                    {job.applications}
                  </span>

                </td>

                <td>

                  <span
                    className={`badge ${
                      job.status === "Open"
                        ? "bg-success"
                        : job.status === "Closed"
                        ? "bg-danger"
                        : "bg-warning text-dark"
                    }`}
                  >
                    {job.status}
                  </span>

                </td>

                <td className="text-center">

                  <button className="btn btn-sm btn-light me-2">

                    <FiEye />

                  </button>

                  <button className="btn btn-sm btn-light">

                    <FiEdit2 />

                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}