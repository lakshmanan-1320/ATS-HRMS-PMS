import React, { useState } from 'react';
import { Card, Table, Input, Select, Button, Space, Tag, Tooltip, Popover, Badge, message, Typography } from 'antd';
import { FiSearch, FiSliders, FiDownload, FiEdit3, FiFileText } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import BellCurveOverrideModal from './BellCurveOverrideModal';

const { Text } = Typography;

export default function BellCurveResults({ run, results, buckets, onOverride }) {
  const [searchText, setSearchText] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedManager, setSelectedManager] = useState('ALL');
  const [selectedBucket, setSelectedBucket] = useState('ALL');
  const [selectedOverride, setSelectedOverride] = useState('ALL');
  
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  // Extract filters locally for speed
  const departments = ['ALL', ...new Set(results.map(r => r.department_name).filter(Boolean))];
  const managers = ['ALL', ...new Set(results.map(r => r.manager_name).filter(Boolean))];

  // Filtering logic
  const filteredData = results.filter(r => {
    const nameMatch = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase().includes(searchText.toLowerCase()) ||
                     (r.employee_code || '').toLowerCase().includes(searchText.toLowerCase());
    
    const deptMatch = selectedDept === 'ALL' || r.department_name === selectedDept;
    const managerMatch = selectedManager === 'ALL' || r.manager_name === selectedManager;
    
    let bucketMatch = true;
    if (selectedBucket !== 'ALL') {
      if (selectedBucket === 'MANUAL_REVIEW') {
        bucketMatch = r.current_bucket_id === null;
      } else {
        bucketMatch = r.current_bucket_id === selectedBucket;
      }
    }

    let overrideMatch = true;
    if (selectedOverride !== 'ALL') {
      overrideMatch = selectedOverride === 'OVERRIDDEN' ? r.is_override : !r.is_override;
    }

    return nameMatch && deptMatch && managerMatch && bucketMatch && overrideMatch;
  });

  const handleOpenOverrideModal = (result) => {
    setSelectedResult(result);
    setOverrideModalVisible(true);
  };

  const handleExportCSV = () => {
    if (!filteredData.length) {
      message.warning('No calibration data available to export.');
      return;
    }

    const headers = ['Employee Name', 'Code', 'Designation', 'Department', 'Manager', 'Appraisal Score', 'Original Bucket', 'Current Bucket', 'Overridden', 'Reason', 'Calibrated By', 'Calibrated Date'];
    const rows = filteredData.map(r => [
      `${r.first_name} ${r.last_name}`,
      r.employee_code || 'N/A',
      r.designation || 'N/A',
      r.department_name || 'N/A',
      r.manager_name || 'N/A',
      r.appraisal_score,
      r.original_bucket_name || 'N/A',
      r.current_bucket_name || 'Unresolved (Tied)',
      r.is_override ? 'YES' : 'NO',
      r.override_reason || 'N/A',
      r.calibrated_by_email || 'N/A',
      r.calibrated_date ? new Date(r.calibrated_date).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bell_curve_calibration_run_${run.run_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('CSV Export downloaded successfully.');
  };

  const handleExportPDF = () => {
    if (!filteredData.length) {
      message.warning('No calibration data available to export.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFont("Helvetica");
    
    // Page Title & Header Metadata
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Bell Curve Forced Ranking Report (Run #${run.run_number})`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Calibration Status: ${run.status}`, 14, 33);
    doc.text(`Tie-Breaker Strategy: ${run.tie_strategy || 'INCLUDE_ALL'}`, 120, 28);
    
    const scopeLabel = run.scope_type === 'DEPARTMENT' 
      ? `Department: ${run.department_name || '—'}` 
      : 'Organization';
    doc.text(`Calibration Scope: ${scopeLabel}`, 120, 33);

    const tableHeaders = [['Employee', 'Code', 'Department', 'Manager', 'Final Score', 'Original Target', 'Calibrated Rating', 'Calibration Comments']];
    const tableRows = filteredData.map(r => [
      `${r.first_name} ${r.last_name}`,
      r.employee_code || 'N/A',
      r.department_name || 'N/A',
      r.manager_name || 'N/A',
      r.appraisal_score,
      r.original_bucket_name || 'N/A',
      r.current_bucket_name || 'Unresolved (Tied)',
      r.is_override ? `Overridden: ${r.override_reason}` : 'Standard Ranking'
    ]);

    doc.autoTable({
      head: tableHeaders,
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillBlack: true, fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        7: { cellWidth: 50 } // Calibration Comments column width
      }
    });

    doc.save(`bell_curve_calibration_run_${run.run_number}.pdf`);
    message.success('PDF Report downloaded successfully.');
  };

  // AntD Columns mapping
  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      sorter: (a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
      render: (_, r) => (
        <div>
          <Text style={{ fontWeight: 700, color: '#001233', display: 'block' }}>{`${r.first_name} ${r.last_name}`}</Text>
          <Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.employee_code || 'N/A'} · {r.designation || 'N/A'}</Text>
        </div>
      )
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department',
      sorter: (a, b) => (a.department_name || '').localeCompare(b.department_name || ''),
      render: (val) => val || <Text style={{ color: '#94a3b8', fontSize: 13 }}>N/A</Text>
    },
    {
      title: 'Manager',
      dataIndex: 'manager_name',
      key: 'manager',
      render: (val) => val || <Text style={{ color: '#94a3b8', fontSize: 13 }}>N/A</Text>
    },
    {
      title: 'Final Score',
      dataIndex: 'appraisal_score',
      key: 'score',
      align: 'center',
      sorter: (a, b) => a.appraisal_score - b.appraisal_score,
      render: (val) => <Text style={{ fontWeight: 800, color: '#0466C8' }}>{val}</Text>
    },
    {
      title: 'Original Bucket',
      key: 'original_bucket',
      render: (_, r) => (
        <Tag color="default" style={{ borderColor: '#cbd5e1', color: '#7D8597', fontWeight: 600, borderRadius: 6 }}>
          {r.original_bucket_name || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'Calibrated Bucket',
      key: 'current_bucket',
      render: (_, r) => {
        if (r.current_bucket_id === null) {
          return (
            <Badge status="processing" color="warning" text={
              <Tooltip title="This employee falls on a score boundary tie. Re-allocate them manually.">
                <Tag color="warning" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                  Tied - Calibration Required
                </Tag>
              </Tooltip>
            } />
          );
        }
        return (
          <Tag color="orange" style={{ background: 'rgba(255,255,255,0.05)', color: r.current_bucket_color, borderColor: r.current_bucket_color, fontWeight: 700, borderRadius: 6 }}>
            {r.current_bucket_name}
          </Tag>
        );
      }
    },
    {
      title: 'Calibration Status',
      key: 'override_status',
      render: (_, r) => {
        if (!r.is_override) return <Tag style={{ borderRadius: 6 }}>Natural Rank</Tag>;
        
        const content = (
          <div style={{ maxWidth: 240, padding: '4px 8px' }}>
            <div><Text style={{ fontWeight: 700, display: 'block', fontSize: 12 }}>Calibrated By</Text></div>
            <Text style={{ fontSize: 11, color: '#7D8597', display: 'block' }}>{r.calibrated_by_email}</Text>
            <Divider style={{ margin: '6px 0' }} />
            <div><Text style={{ fontWeight: 700, display: 'block', fontSize: 12 }}>Reason</Text></div>
            <Text style={{ fontSize: 11, color: '#33415C', display: 'block', whiteSpace: 'normal', wordBreak: 'break-all' }}>{r.override_reason}</Text>
          </div>
        );

        return (
          <Popover content={content} title="Override Justification" trigger="hover">
            <Tag color="indigo" style={{ fontWeight: 700, borderRadius: 6, cursor: 'pointer' }}>Calibrated Override</Tag>
          </Popover>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, r) => {
        const disabled = run.status === 'FROZEN' || run.status === 'PUBLISHED';
        return (
          <Tooltip title={disabled ? 'Workspace is frozen' : 'Override performance rating'}>
            <Button
              type="text"
              icon={<FiEdit3 size={15} />}
              onClick={() => handleOpenOverrideModal(r)}
              disabled={disabled}
              style={{ color: disabled ? '#cbd5e1' : '#0466C8' }}
            />
          </Tooltip>
        );
      }
    }
  ];

  return (
    <Card style={{ borderRadius: 16, border: '1px solid #E3E7EE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
      {/* Filtering Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1, maxWidth: 880 }}>
          {/* Search */}
          <Input
            prefix={<FiSearch style={{ color: '#94a3b8' }} />}
            placeholder="Search by Employee or Code..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220, borderRadius: 8 }}
          />

          {/* Department */}
          <Select
            value={selectedDept}
            onChange={(val) => setSelectedDept(val)}
            style={{ width: 150 }}
            options={departments.map(d => ({ value: d, label: d === 'ALL' ? 'All Departments' : d }))}
          />

          {/* Manager */}
          <Select
            value={selectedManager}
            onChange={(val) => setSelectedManager(val)}
            style={{ width: 150 }}
            options={managers.map(m => ({ value: m, label: m === 'ALL' ? 'All Managers' : m }))}
          />

          {/* Bucket */}
          <Select
            value={selectedBucket}
            onChange={(val) => setSelectedBucket(val)}
            style={{ width: 160 }}
            options={[
              { value: 'ALL', label: 'All Ratings' },
              { value: 'MANUAL_REVIEW', label: 'Tied (Action Required)' },
              ...buckets.map(b => ({ value: b.bucket_id, label: b.bucket_name }))
            ]}
          />

          {/* Overridden */}
          <Select
            value={selectedOverride}
            onChange={(val) => setSelectedOverride(val)}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'All Calibration' },
              { value: 'OVERRIDDEN', label: 'Overridden' },
              { value: 'NATURAL', label: 'Natural Rank' }
            ]}
          />
        </div>

        {/* Download Buttons */}
        <Space>
          <Button icon={<FiDownload />} onClick={handleExportCSV}>Export CSV</Button>
          <Button type="primary" icon={<FiFileText />} onClick={handleExportPDF} style={{ background: '#0353A4', borderColor: '#0353A4' }}>
            Export PDF Report
          </Button>
        </Space>
      </div>

      {/* Grid Sheet */}
      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="result_id"
        pagination={{ pageSize: 15, showSizeChanger: false }}
        style={{ fontFamily: 'inherit' }}
      />

      {/* Override calibration pop-modal */}
      {overrideModalVisible && (
        <BellCurveOverrideModal
          visible={overrideModalVisible}
          result={selectedResult}
          buckets={buckets}
          onClose={() => {
            setOverrideModalVisible(false);
            setSelectedResult(null);
          }}
          onSave={() => {
            setOverrideModalVisible(false);
            setSelectedResult(null);
            onOverride();
          }}
        />
      )}
    </Card>
  );
}
