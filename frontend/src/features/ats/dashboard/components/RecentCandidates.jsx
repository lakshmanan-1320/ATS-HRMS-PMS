import React from "react";
import { FiUser, FiChevronRight } from "react-icons/fi";

const candidates = [
  {
    id: 1,
    name: "Rahul Sharma",
    position: "Senior React Developer",
    stage: "Technical Interview",
    status: "Shortlisted",
  },
  {
    id: 2,
    name: "Anjali Nair",
    position: "UI / UX Designer",
    stage: "HR Round",
    status: "Interview Scheduled",
  },
  {
    id: 3,
    name: "Arjun Kumar",
    position: "QA Engineer",
    stage: "Offer Discussion",
    status: "Offer Sent",
  },
  {
    id: 4,
    name: "Priya Menon",
    position: "Node.js Developer",
    stage: "Application Review",
    status: "Applied",
  },
];

const getBadge = (status) => {
  switch (status) {
    case "Shortlisted":
      return "bg-success";
    case "Interview Scheduled":
      return "bg-warning text-dark";
    case "Offer Sent":
      return "bg-primary";
    default:
      return "bg-secondary";
  }
};

export default function RecentCandidates() {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">

      <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">

        <div>
          <h5 className="fw-bold mb-1">
            Recent Candidates
          </h5>

          <small className="text-muted">
            Latest applications received
          </small>
        </div>

        <button className="btn btn-sm btn-outline-primary">
          View All
        </button>

      </div>

      <div className="card-body p-0">

        {candidates.map((candidate) => (

          <div
            key={candidate.id}
            className="d-flex justify-content-between align-items-center p-3 border-bottom"
          >

            <div className="d-flex align-items-center">

              <div
                className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-3"
                style={{
                  width: 45,
                  height: 45,
                }}
              >
                <FiUser size={20} />
              </div>

              <div>

                <h6 className="mb-1 fw-semibold">
                  {candidate.name}
                </h6>

                <small className="text-muted d-block">
                  {candidate.position}
                </small>

                <small className="text-muted">
                  {candidate.stage}
                </small>

              </div>

            </div>

            <div className="text-end">

              <span className={`badge ${getBadge(candidate.status)}`}>
                {candidate.status}
              </span>

              <div className="mt-2">

                <button className="btn btn-sm btn-light">
                  <FiChevronRight />
                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}