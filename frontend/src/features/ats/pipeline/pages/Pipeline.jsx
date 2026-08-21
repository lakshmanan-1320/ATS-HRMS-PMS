// src/features/ats/pipeline/pages/Pipeline.jsx

import React from "react";
import {
  FaUser,
  FaArrowRight,
  FaPlus,
  FaEllipsisV,
} from "react-icons/fa";
import "./Pipeline.css";

const pipeline = [
  {
    title: "Applied",
    color: "#3B82F6",
    candidates: [
      {
        id: 1,
        name: "John Mathew",
        role: "Frontend Developer",
      },
      {
        id: 2,
        name: "Arun Kumar",
        role: "React Developer",
      },
    ],
  },
  {
    title: "Screening",
    color: "#F59E0B",
    candidates: [
      {
        id: 3,
        name: "Anjali Nair",
        role: "UI Designer",
      },
      {
        id: 4,
        name: "Rahul S",
        role: "Backend Developer",
      },
    ],
  },
  {
    title: "Interview",
    color: "#8B5CF6",
    candidates: [
      {
        id: 5,
        name: "Meera Thomas",
        role: "QA Engineer",
      },
      {
        id: 6,
        name: "Akhil Raj",
        role: "Node Developer",
      },
    ],
  },
  {
    title: "Offer",
    color: "#10B981",
    candidates: [
      {
        id: 7,
        name: "David Jose",
        role: "DevOps Engineer",
      },
    ],
  },
  {
    title: "Hired",
    color: "#16A34A",
    candidates: [
      {
        id: 8,
        name: "Nithin Roy",
        role: "Full Stack Developer",
      },
    ],
  },
];

const Pipeline = () => {
  return (
    <div className="pipeline-page">

      <div className="pipeline-header">

        <div>
          <h2>Recruitment Pipeline</h2>
          <p>Track candidates across every hiring stage.</p>
        </div>

        <button className="pipeline-btn">
          <FaPlus />
          Add Candidate
        </button>

      </div>

      <div className="pipeline-board">

        {pipeline.map((stage) => (

          <div className="pipeline-column" key={stage.title}>

            <div
              className="pipeline-column-header"
              style={{
                borderTop: `5px solid ${stage.color}`,
              }}
            >

              <div>

                <h4>{stage.title}</h4>

                <span>
                  {stage.candidates.length} Candidates
                </span>

              </div>

              <FaEllipsisV />

            </div>

            <div className="pipeline-list">

              {stage.candidates.map((candidate) => (

                <div
                  className="pipeline-card"
                  key={candidate.id}
                >

                  <div className="candidate-avatar">
                    <FaUser />
                  </div>

                  <div className="candidate-details">

                    <h5>{candidate.name}</h5>

                    <p>{candidate.role}</p>

                  </div>

                  <button>
                    <FaArrowRight />
                  </button>

                </div>

              ))}

            </div>

          </div>

        ))}

      </div>

    </div>
  );
};

export default Pipeline;