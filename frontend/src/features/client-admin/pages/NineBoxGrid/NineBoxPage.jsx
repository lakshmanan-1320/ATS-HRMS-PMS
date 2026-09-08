import React, { useEffect, useState } from 'react';
import { Typography, Row, Col } from 'antd';
import { FiGrid } from 'react-icons/fi';

import ClientAdminSidebar from '../../../../components/layout/ClientAdminSidebar';
import ClientAdminTopBar from '../../../../components/layout/ClientAdminTopBar';
import PageHeader from '../../../../components/common/PageHeader';
import {
  getNineBoxGrid,
  generateNineBoxGrid,
} from '../../api/nineBox.api';
import NineBoxSummaryCards from './NineBoxSummaryCards';
import NineBoxMatrix from './NineBoxMatrix';
import NineBoxEmployeeDrawer from './NineBoxEmployeeDrawer';
// import { getNineBoxGrid } from '../../api/nineBox.api';
import './nineBox.css';

const { Title, Paragraph } = Typography;

export default function NineBoxPage() {
  const [activeTab, setActiveTab] = useState('matrix');
  const [gridData, setGridData] = useState({
    box9: [],
    box8: [],
    box7: [],
    box6: [],
    box5: [],
    box4: [],
    box3: [],
    box2: [],
    box1: [],
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Replace this later with the selected appraisal cycle
  const cycleId = '7f9f2d58-91ea-4888-a6c4-17fd0f1b5ec5';

  useEffect(() => {
    loadGrid();
  }, []);

//   const loadGrid = async () => {
//     try {
//       const response = await getNineBoxGrid(cycleId);
//       setGridData(response.data);
//     } catch (error) {
//       console.error('Failed to load 9-box grid', error);
//     }
//   };


//For Testing 
// const loadGrid = async () => {
//   try {
//     const response = await getNineBoxGrid(cycleId);

//     console.log('GRID DATA:', response.data);

//     setGridData(response.data);
//   } catch (error) {
//     console.error('Failed to load 9-box grid', error);
//   }
// };
const loadGrid = async () => {
  try {
    console.log('Generating Nine Box for cycle:', cycleId);

    // Step 1: Generate assessments from existing appraisal data
    const generated = await generateNineBoxGrid(cycleId);

    console.log('NINE BOX GENERATED:', generated);

    // Step 2: Fetch the generated 9-box data
    const response = await getNineBoxGrid(cycleId);

    console.log('NINE BOX API RESPONSE:', response);
    console.log('NINE BOX GRID DATA:', response?.data);

    const grid = response?.data || {};

    setGridData({
      box1: grid.box1 || [],
      box2: grid.box2 || [],
      box3: grid.box3 || [],
      box4: grid.box4 || [],
      box5: grid.box5 || [],
      box6: grid.box6 || [],
      box7: grid.box7 || [],
      box8: grid.box8 || [],
      box9: grid.box9 || [],
    });
  } catch (error) {
    console.error('FAILED TO LOAD NINE BOX:', error);
    console.error('Response:', error?.response?.data);
  }
};
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <ClientAdminSidebar active="nine-box" />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <ClientAdminTopBar />

        {/* Header */}
        <div
          style={{
            padding: '24px 32px 12px 32px',
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <PageHeader
            icon={FiGrid}
            title="Talent Calibration Matrix"
            subtitle="Assess employee performance and future potential using the 9-box talent framework."
          />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
            <button
              onClick={() => setActiveTab('matrix')}
              style={{
                padding: '12px 8px',
                background: 'none',
                border: 'none',
                borderBottom:
                  activeTab === 'matrix'
                    ? '3px solid #6366f1'
                    : '3px solid transparent',
                color: activeTab === 'matrix' ? '#6366f1' : '#64748b',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              9-Box Matrix
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              style={{
                padding: '12px 8px',
                background: 'none',
                border: 'none',
                borderBottom:
                  activeTab === 'employees'
                    ? '3px solid #6366f1'
                    : '3px solid transparent',
                color: activeTab === 'employees' ? '#6366f1' : '#64748b',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Employee Calibration
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 32, flex: 1 }}>
          <NineBoxSummaryCards gridData={gridData} />

          <div style={{ marginTop: 24 }}>
            <NineBoxMatrix
              gridData={gridData}
              onEmployeeClick={setSelectedEmployee}
            />
          </div>
        </div>
      </div>

      <NineBoxEmployeeDrawer
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
}