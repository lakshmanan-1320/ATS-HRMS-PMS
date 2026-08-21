// src/features/ats/job/pages/Jobs.jsx

import React, { useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaFilter,
  FaEye,
  FaEdit,
  FaTrash,
  FaUsers,
  FaMapMarkerAlt,
  FaBriefcase,
} from "react-icons/fa";
import "./Jobs.css";

const initialJobs = [
  {
    id: 1,
    title: "Frontend Developer",
    department: "Engineering",
    location: "Chennai",
    type: "Full Time",
    applicants: 42,
    status: "Open",
  },
  {
    id: 2,
    title: "Backend Developer",
    department: "Engineering",
    location: "Bangalore",
    type: "Full Time",
    applicants: 31,
    status: "Open",
  },
  {
    id: 3,
    title: "UI/UX Designer",
    department: "Design",
    location: "Remote",
    type: "Remote",
    applicants: 18,
    status: "Closed",
  },
  {
    id: 4,
    title: "QA Engineer",
    department: "Testing",
    location: "Hyderabad",
    type: "Full Time",
    applicants: 26,
    status: "Open",
  },
];

const Job = () => {
  const [search, setSearch] = useState("");

  const filteredJobs = initialJobs.filter((job) =>
    job.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="jobs-page">
      <div className="jobs-header">
        <div>
          <h2>Job Management</h2>
          <p>Manage all job openings and recruitment activities.</p>
        </div>

        <button className="add-job-btn">
          <FaPlus />
          Create Job
        </button>
      </div>

      <div className="jobs-toolbar">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="filter-btn">
          <FaFilter />
          Filter
        </button>
      </div>

      <div className="jobs-table-card">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Department</th>
              <th>Location</th>
              <th>Type</th>
              <th>Applicants</th>
              <th>Status</th>
              <th align="center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredJobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <div className="job-title">
                    <FaBriefcase />
                    {job.title}
                  </div>
                </td>

                <td>{job.department}</td>

                <td>
                  <div className="job-location">
                    <FaMapMarkerAlt />
                    {job.location}
                  </div>
                </td>

                <td>{job.type}</td>

                <td>
                  <div className="job-applicants">
                    <FaUsers />
                    {job.applicants}
                  </div>
                </td>

                <td>
                  <span
                    className={`job-status ${job.status.toLowerCase()}`}
                  >
                    {job.status}
                  </span>
                </td>

                <td>
                  <div className="job-actions">
                    <button>
                      <FaEye />
                    </button>

                    <button>
                      <FaEdit />
                    </button>

                    <button className="delete">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredJobs.length === 0 && (
              <tr>
                <td colSpan="7" className="no-data">
                  No jobs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Job;