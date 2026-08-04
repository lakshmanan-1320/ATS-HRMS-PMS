import React from 'react';
import { Table, Tag, Progress, Button, Tooltip, Space, Popconfirm } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, SendOutlined, AuditOutlined } from '@ant-design/icons';

const PRIORITY_COLORS = {
  LOW: 'blue',
  MEDIUM: 'orange',
  HIGH: 'volcano',
  CRITICAL: 'red'
};

const STATUS_COLORS = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  ACTIVE: 'processing',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  REJECTED: 'error',
  CHANGES_REQUESTED: 'error'
};

export default function KpiList({ 
  kpis, role, loading, onView, onEdit, onDelete, onSubmitWork, onReviewSub, parentGoal 
}) {
  const isManagerOrAdmin = ['client_admin', 'manager', 'hr'].includes(role);
  const isEmployee = role === 'employee';
  console.log('[KpiList] props role:', role, 'isEmployee:', isEmployee, 'parentGoal:', parentGoal);

  const getTargetText = (kpi) => {
    if (kpi.measurement_type === 'CHECKLIST') {
      return `${kpi.tasks?.length || 0} subtasks`;
    }
    if (kpi.measurement_type === 'BOOLEAN') {
      return kpi.target_boolean ? 'YES' : 'NO';
    }
    if (kpi.measurement_type === 'TEXT') {
      return kpi.target_text;
    }
    return `${parseFloat(kpi.target_value)} ${kpi.unit || ''}`;
  };

  const getApprovedText = (kpi) => {
    if (kpi.measurement_type === 'CHECKLIST') {
      const completed = kpi.tasks?.filter(t => t.is_completed).length || 0;
      return `${completed}/${kpi.tasks?.length || 0} tasks`;
    }
    if (kpi.measurement_type === 'BOOLEAN') {
      return kpi.approved_boolean === null ? '—' : (kpi.approved_boolean ? 'YES' : 'NO');
    }
    if (kpi.measurement_type === 'TEXT') {
      return kpi.approved_text || '—';
    }
    return `${parseFloat(kpi.approved_value)} ${kpi.unit || ''}`;
  };

  const columns = [
    {
      title: 'KPI Code & Title',
      key: 'title',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Space>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6366f1' }}>{record.kpi_code}</span>
            <Tag color={PRIORITY_COLORS[record.priority]} style={{ fontSize: 10 }}>{record.priority}</Tag>
          </Space>
          <strong style={{ fontSize: 13, color: '#1e293b', marginTop: 2 }}>{record.title}</strong>
        </div>
      )
    },
    {
      title: 'Weight',
      dataIndex: 'weight_percentage',
      key: 'weight_percentage',
      render: (w) => `${parseFloat(w)}%`
    },
    {
      title: 'Target / Current',
      key: 'target',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div><span style={{ color: '#64748b' }}>Target:</span> {getTargetText(record)}</div>
          <div style={{ marginTop: 2 }}><span style={{ color: '#64748b' }}>Current:</span> {getApprovedText(record)}</div>
        </div>
      )
    },
    {
      title: 'Completion',
      dataIndex: 'completion_percentage',
      key: 'completion_percentage',
      render: (pct) => (
        <div style={{ width: 140 }}>
          <Progress 
            percent={parseFloat(pct)} 
            size="small" 
            status={parseFloat(pct) >= 100 ? 'success' : 'active'} 
          />
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isCompanyOrDeptOrTeam = ['company', 'department', 'team'].includes(parentGoal?.goal_type);
        const employeeCanModify = isEmployee && !isCompanyOrDeptOrTeam;

        const canEdit = isManagerOrAdmin || (employeeCanModify && record.status === 'DRAFT');
        const canDelete = (isManagerOrAdmin || employeeCanModify) && record.status === 'DRAFT';
        const canSubmit = isEmployee && ['ACTIVE', 'IN_PROGRESS', 'CHANGES_REQUESTED'].includes(record.status);
        
        return (
          <Space size="middle">
            <Tooltip title="View KPI Details">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                onClick={() => onView(record.kpi_id)} 
              />
            </Tooltip>

            {canEdit && (
              <Tooltip title="Edit KPI">
                <Button 
                  type="text" 
                  icon={<EditOutlined style={{ color: '#1890ff' }} />} 
                  onClick={() => onEdit(record)} 
                />
              </Tooltip>
            )}

            {canSubmit && (
              <Tooltip title="Submit Work Proof">
                <Button 
                  type="text" 
                  icon={<SendOutlined style={{ color: '#52c41a' }} />} 
                  onClick={() => onSubmitWork(record)} 
                />
              </Tooltip>
            )}

            {canDelete && (
              <Tooltip title="Delete KPI">
                <Button 
                  type="text" 
                  danger
                  icon={<DeleteOutlined />} 
                  onClick={() => onDelete(record)} 
                />
              </Tooltip>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={kpis}
      rowKey="kpi_id"
      loading={loading}
      pagination={false}
      size="middle"
      bordered
    />
  );
}
