// src/features/ats/interview/pages/Interviews.jsx

import React, { useState } from "react";
import {
  FaSearch,
  FaPlus,
  FaCalendarAlt,
  FaClock,
  FaUserTie,
  FaVideo,
  FaMapMarkerAlt,
  FaEllipsisV,
} from "react-icons/fa";
import "./Interviews.css";

const interviewData = [
  {
    id: 1,
    candidate: "John Mathew",
    position: "Frontend Developer",
    interviewer: "Sarah Wilson",
    date: "12 Aug 2026",
    time: "10:00 AM",
    mode: "Online",
    status: "Scheduled",
  },
  {
    id: 2,
    candidate: "Anjali Nair",
    position: "UI/UX Designer",
    interviewer: "David Thomas",
    date: "12 Aug 2026",
    time: "11:30 AM",
    mode: "Offline",
    status: "Completed",
  },
  {
    id: 3,
    candidate: "Rahul Krishna",
    position: "Backend Developer",
    interviewer: "Michael Roy",
    date: "13 Aug 2026",
    time: "02:00 PM",
    mode: "Online",
    status: "Pending",
  },
  {
    id: 4,
    candidate: "Meera Thomas",
    position: "QA Engineer",
    interviewer: "Jennifer Paul",
    date: "14 Aug 2026",
    time: "04:00 PM",
    mode: "Offline",
    status: "Scheduled",
  },
];

const Interview = () => {
  const [search, setSearch] = useState("");

  const filtered = interviewData.filter((item) =>
    item.candidate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="interview-page">

      <div className="interview-header">

        <div>
          <h2>Interviews</h2>
          <p>Manage interview schedules and recruitment meetings.</p>
        </div>

        <button className="schedule-btn">
          <FaPlus />
          Schedule Interview
        </button>

      </div>

      <div className="interview-toolbar">

        <div className="interview-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search candidate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

      </div>

      <div className="interview-grid">

        {filtered.map((item) => (

          <div className="interview-card" key={item.id}>

            <div className="interview-top">

              <div className="candidate-avatar">
                <FaUserTie />
              </div>

              <button>
                <FaEllipsisV />
              </button>

            </div>

            <h3>{item.candidate}</h3>

            <p className="position">
              {item.position}
            </p>

            <div className="interview-info">

              <div>
                <FaCalendarAlt />
                {item.date}
              </div>

              <div>
                <FaClock />
                {item.time}
              </div>

              <div>
                {item.mode === "Online" ? (
                  <FaVideo />
                ) : (
                  <FaMapMarkerAlt />
                )}

                {item.mode}
              </div>

            </div>

            <div className="interviewer">

              <strong>Interviewer</strong>

              <span>{item.interviewer}</span>

            </div>

            <div className="card-footer">

              <span
                className={`status ${item.status.toLowerCase()}`}
              >
                {item.status}
              </span>

              <button>
                View Details
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
};

export default Interview;