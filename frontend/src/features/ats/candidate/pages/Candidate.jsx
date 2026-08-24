// src/features/ats/candidate/pages/Candidates.jsx

import React, { useMemo, useState } from "react";
import {
  FaSearch,
  FaFilter,
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";
import "./Candidates.css";

const candidateData = [
  {
    id: 1,
    name: "John Mathew",
    email: "john@gmail.com",
    phone: "+91 9876543210",
    position: "Frontend Developer",
    stage: "Technical",
    experience: "3 Years",
    status: "Active",
  },
  {
    id: 2,
    name: "Anjali Nair",
    email: "anjali@gmail.com",
    phone: "+91 9876543211",
    position: "UI/UX Designer",
    stage: "HR Round",
    experience: "2 Years",
    status: "Active",
  },
  {
    id: 3,
    name: "Rahul Krishna",
    email: "rahul@gmail.com",
    phone: "+91 9876543212",
    position: "Backend Developer",
    stage: "Offer",
    experience: "4 Years",
    status: "Selected",
  },
  {
    id: 4,
    name: "Meera Thomas",
    email: "meera@gmail.com",
    phone: "+91 9876543213",
    position: "QA Engineer",
    stage: "Screening",
    experience: "1 Year",
    status: "Pending",
  },
];

const Candidate = () => {
  const [search, setSearch] = useState("");

  const filteredCandidates = useMemo(() => {
    return candidateData.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(search.toLowerCase()) ||
        candidate.position.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className="candidate-page">

      <div className="candidate-header">
        <div>
          <h2>Candidates</h2>
          <p>Manage all applicants in one place.</p>
        </div>

        <button className="candidate-add-btn">
          <FaPlus />
          Add Candidate
        </button>
      </div>

      <div className="candidate-toolbar">

        <div className="candidate-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search candidate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="candidate-filter-btn">
          <FaFilter />
          Filter
        </button>

      </div>

      <div className="candidate-table-card">

        <table className="candidate-table">

          <thead>
            <tr>
              <th>Candidate</th>
              <th>Position</th>
              <th>Stage</th>
              <th>Experience</th>
              <th>Status</th>
              <th align="center">Actions</th>
            </tr>
          </thead>

          <tbody>

            {filteredCandidates.map((candidate) => (
              <tr key={candidate.id}>

                <td>

                  <div className="candidate-info">

                    <div className="candidate-avatar">
                      <FaUserTie />
                    </div>

                    <div>

                      <h4>{candidate.name}</h4>

                      <p>
                        <FaEnvelope />
                        {candidate.email}
                      </p>

                      <span>
                        <FaPhone />
                        {candidate.phone}
                      </span>

                    </div>

                  </div>

                </td>

                <td>{candidate.position}</td>

                <td>
                  <span className="candidate-stage">
                    {candidate.stage}
                  </span>
                </td>

                <td>{candidate.experience}</td>

                <td>
                  <span
                    className={`candidate-status ${candidate.status
                      .toLowerCase()
                      .replace(/\s/g, "")}`}
                  >
                    {candidate.status}
                  </span>
                </td>

                <td>

                  <div className="candidate-actions">

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

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default Candidate;