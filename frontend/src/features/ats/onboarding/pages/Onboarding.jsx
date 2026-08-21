// src/features/ats/onboarding/pages/Onboarding.jsx

import React from "react";
import {
  FaUserCheck,
  FaBuilding,
  FaLaptop,
  FaIdBadge,
  FaFileAlt,
  FaEnvelope,
  FaPhoneAlt,
  FaCheckCircle,
  FaClock,
  FaArrowRight,
} from "react-icons/fa";
import "./Onboarding.css";

const employees = [
  {
    id: 1,
    name: "John Mathew",
    designation: "Frontend Developer",
    joiningDate: "25 Aug 2026",
    status: "In Progress",
  },
  {
    id: 2,
    name: "Anjali Nair",
    designation: "UI/UX Designer",
    joiningDate: "28 Aug 2026",
    status: "Completed",
  },
  {
    id: 3,
    name: "Rahul Krishna",
    designation: "Backend Developer",
    joiningDate: "01 Sep 2026",
    status: "Pending",
  },
];

const checklist = [
  {
    icon: <FaEnvelope />,
    title: "Offer Letter Accepted",
    completed: true,
  },
  {
    icon: <FaFileAlt />,
    title: "Documents Uploaded",
    completed: true,
  },
  {
    icon: <FaIdBadge />,
    title: "ID Card Generation",
    completed: false,
  },
  {
    icon: <FaLaptop />,
    title: "Laptop Allocation",
    completed: false,
  },
  {
    icon: <FaBuilding />,
    title: "Department Assignment",
    completed: false,
  },
  {
    icon: <FaPhoneAlt />,
    title: "Official Account Creation",
    completed: false,
  },
];

const Onboarding = () => {
  return (
    <div className="onboarding-page">

      <div className="onboarding-header">

        <div>
          <h2>Employee Onboarding</h2>
          <p>
            Complete onboarding process for newly hired employees.
          </p>
        </div>

      </div>

      <div className="onboarding-grid">

        {/* LEFT */}

        <div className="employee-list-card">

          <div className="section-title">
            <h3>New Joiners</h3>
          </div>

          {employees.map((employee) => (

            <div
              className="employee-card"
              key={employee.id}
            >

              <div className="employee-avatar">
                <FaUserCheck />
              </div>

              <div className="employee-details">

                <h4>{employee.name}</h4>

                <p>{employee.designation}</p>

                <span>
                  Joining :
                  {" "}
                  {employee.joiningDate}
                </span>

              </div>

              <div
                className={`employee-status ${employee.status
                  .replace(/\s/g, "")
                  .toLowerCase()}`}
              >
                {employee.status}
              </div>

            </div>

          ))}

        </div>

        {/* RIGHT */}

        <div className="checklist-card">

          <div className="section-title">
            <h3>Onboarding Checklist</h3>
          </div>

          <div className="checklist">

            {checklist.map((item, index) => (

              <div
                className="checklist-item"
                key={index}
              >

                <div
                  className={`check-icon ${
                    item.completed ? "completed" : ""
                  }`}
                >
                  {item.completed ? (
                    <FaCheckCircle />
                  ) : (
                    item.icon
                  )}
                </div>

                <span>{item.title}</span>

                <FaArrowRight />

              </div>

            ))}

          </div>

        </div>

      </div>

      {/* SUMMARY */}

      <div className="summary-card">

        <div className="summary-item">

          <FaCheckCircle />

          <div>
            <h3>12</h3>
            <p>Completed</p>
          </div>

        </div>

        <div className="summary-item">

          <FaClock />

          <div>
            <h3>6</h3>
            <p>Pending</p>
          </div>

        </div>

        <div className="summary-item">

          <FaUserCheck />

          <div>
            <h3>18</h3>
            <p>Total Employees</p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Onboarding;