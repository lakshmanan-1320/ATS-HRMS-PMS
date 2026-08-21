// src/modules/ats/dashboard/pages/Dashboard.jsx

import React from "react";
import {
  FaUsers,
  FaUserTie,
  FaClipboardList,
  FaCalendarCheck,
  FaArrowUp,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

import "./Dashboard.css";

const stats = [
  {
    title: "Total Candidates",
    value: "1,248",
    change: "+12%",
    color: "primary",
    icon: <FaUsers />,
  },
  {
    title: "Open Positions",
    value: "32",
    change: "+4",
    color: "success",
    icon: <FaClipboardList />,
  },
  {
    title: "Interviews Today",
    value: "18",
    change: "+6",
    color: "warning",
    icon: <FaCalendarCheck />,
  },
  {
    title: "Offers Released",
    value: "9",
    change: "+2",
    color: "danger",
    icon: <FaUserTie />,
  },
];

const recentCandidates = [
  {
    name: "John Mathew",
    role: "Frontend Developer",
    stage: "HR Round",
    status: "In Progress",
  },
  {
    name: "Anjali Nair",
    role: "UI/UX Designer",
    stage: "Technical",
    status: "Scheduled",
  },
  {
    name: "Rahul Krishna",
    role: "Node.js Developer",
    stage: "Offer",
    status: "Selected",
  },
  {
    name: "Priya Sharma",
    role: "QA Engineer",
    stage: "Screening",
    status: "Pending",
  },
];

const activities = [
  {
    icon: <FaCheckCircle />,
    title: "Rahul Krishna moved to Offer Stage",
    time: "10 min ago",
    color: "green",
  },
  {
    icon: <FaCalendarCheck />,
    title: "Interview scheduled with Anjali",
    time: "30 min ago",
    color: "orange",
  },
  {
    icon: <FaClock />,
    title: "Resume uploaded by Vivek",
    time: "1 hour ago",
    color: "blue",
  },
  {
    icon: <FaExclamationTriangle />,
    title: "Java Developer position closing tomorrow",
    time: "3 hours ago",
    color: "red",
  },
];

const Dashboard = () => {
  return (
    <div className="ats-dashboard">

      {/* Header */}

      <div className="dashboard-header">
        <div>
          <h2>Applicant Tracking Dashboard</h2>
          <p>Welcome back! Here's your recruitment overview.</p>
        </div>

        <button className="new-job-btn">
          + Create Job
        </button>
      </div>

      {/* Statistics */}

      <div className="stats-grid">
        {stats.map((item, index) => (
          <div className={`stat-card ${item.color}`} key={index}>
            <div className="stat-icon">{item.icon}</div>

            <div className="stat-content">
              <h3>{item.value}</h3>
              <span>{item.title}</span>

              <p>
                <FaArrowUp />
                {item.change} this month
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Section */}

      <div className="dashboard-main">

        {/* Pipeline */}

        <div className="pipeline-card card">

          <div className="card-header">
            <h4>Recruitment Pipeline</h4>
          </div>

          <div className="pipeline">

            <div className="stage">
              <div className="circle screening">
                146
              </div>
              <span>Applied</span>
            </div>

            <div className="line"></div>

            <div className="stage">
              <div className="circle shortlisted">
                72
              </div>
              <span>Shortlisted</span>
            </div>

            <div className="line"></div>

            <div className="stage">
              <div className="circle interview">
                34
              </div>
              <span>Interview</span>
            </div>

            <div className="line"></div>

            <div className="stage">
              <div className="circle offer">
                12
              </div>
              <span>Offer</span>
            </div>

            <div className="line"></div>

            <div className="stage">
              <div className="circle hired">
                8
              </div>
              <span>Hired</span>
            </div>

          </div>
        </div>

        {/* Recent Candidates */}

        <div className="card">

          <div className="card-header">
            <h4>Recent Candidates</h4>
          </div>

          <table className="candidate-table">

            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {recentCandidates.map((candidate, index) => (
                <tr key={index}>
                  <td>{candidate.name}</td>
                  <td>{candidate.role}</td>
                  <td>{candidate.stage}</td>

                  <td>
                    <span
                      className={`status ${candidate.status
                        .replace(/\s/g, "")
                        .toLowerCase()}`}
                    >
                      {candidate.status}
                    </span>
                  </td>
                </tr>
              ))}

            </tbody>

          </table>
        </div>

      </div>

      {/* Bottom Section */}

      <div className="dashboard-bottom">

        {/* Activity */}

        <div className="card activity-card">

          <div className="card-header">
            <h4>Recent Activity</h4>
          </div>

          <div className="activity-list">

            {activities.map((item, index) => (
              <div className="activity-item" key={index}>

                <div
                  className="activity-icon"
                  style={{ background: item.color }}
                >
                  {item.icon}
                </div>

                <div className="activity-content">
                  <h5>{item.title}</h5>
                  <span>{item.time}</span>
                </div>

              </div>
            ))}

          </div>

        </div>

        {/* Upcoming */}

        <div className="card">

          <div className="card-header">
            <h4>Upcoming Interviews</h4>
          </div>

          <div className="interview-list">

            <div className="interview-item">
              <h5>10:00 AM</h5>
              <div>
                <strong>Frontend Developer</strong>
                <p>John Mathew</p>
              </div>
            </div>

            <div className="interview-item">
              <h5>12:30 PM</h5>
              <div>
                <strong>React Developer</strong>
                <p>Arjun S</p>
              </div>
            </div>

            <div className="interview-item">
              <h5>03:00 PM</h5>
              <div>
                <strong>QA Engineer</strong>
                <p>Meera Thomas</p>
              </div>
            </div>

            <div className="interview-item">
              <h5>04:45 PM</h5>
              <div>
                <strong>Node.js Developer</strong>
                <p>Akhil Raj</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;