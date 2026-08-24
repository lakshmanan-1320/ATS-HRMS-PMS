// src/features/ats/offer/pages/Offers.jsx

import React, { useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaFileSignature,
  FaUserTie,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaDownload,
  FaEye,
} from "react-icons/fa";
import "./Offers.css";

const offerData = [
  {
    id: 1,
    candidate: "John Mathew",
    position: "Frontend Developer",
    salary: "₹8,00,000",
    joining: "25 Aug 2026",
    status: "Accepted",
  },
  {
    id: 2,
    candidate: "Anjali Nair",
    position: "UI/UX Designer",
    salary: "₹7,20,000",
    joining: "28 Aug 2026",
    status: "Pending",
  },
  {
    id: 3,
    candidate: "Rahul Krishna",
    position: "Backend Developer",
    salary: "₹10,00,000",
    joining: "01 Sep 2026",
    status: "Rejected",
  },
  {
    id: 4,
    candidate: "Meera Thomas",
    position: "QA Engineer",
    salary: "₹6,50,000",
    joining: "30 Aug 2026",
    status: "Accepted",
  },
];

const Offer = () => {
  const [search, setSearch] = useState("");

  const filtered = offerData.filter((offer) =>
    offer.candidate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="offers-page">

      <div className="offers-header">

        <div>
          <h2>Offer Management</h2>
          <p>Create, track and manage offer letters.</p>
        </div>

        <button className="offer-btn">
          <FaPlus />
          Generate Offer
        </button>

      </div>

      <div className="offers-toolbar">

        <div className="offer-search">
          <FaSearch />

          <input
            type="text"
            placeholder="Search candidate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

      </div>

      <div className="offers-grid">

        {filtered.map((offer) => (

          <div
            className="offer-card"
            key={offer.id}
          >

            <div className="offer-top">

              <div className="offer-avatar">
                <FaUserTie />
              </div>

              <span
                className={`offer-status ${offer.status.toLowerCase()}`}
              >
                {offer.status}
              </span>

            </div>

            <h3>{offer.candidate}</h3>

            <p>{offer.position}</p>

            <div className="offer-details">

              <div>
                <FaMoneyBillWave />
                <span>{offer.salary}</span>
              </div>

              <div>
                <FaCalendarAlt />
                <span>{offer.joining}</span>
              </div>

              <div>
                <FaFileSignature />
                <span>Offer Letter Ready</span>
              </div>

            </div>

            <div className="offer-actions">

              <button>
                <FaEye />
                View
              </button>

              <button>
                <FaDownload />
                Download
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
};

export default Offer;