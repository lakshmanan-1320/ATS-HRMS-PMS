import React from 'react';
import { Steps } from 'antd';

const STATUS_FLOW = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED'];

export default function KpiStatusTimeline({ currentStatus }) {
  const isRejected = currentStatus === 'REJECTED';
  const isChangesRequested = currentStatus === 'CHANGES_REQUESTED';
  
  let currentIdx = STATUS_FLOW.indexOf(currentStatus);
  let stepStatus = 'process';

  if (isRejected) {
    currentIdx = 1; // Mark pending approval step as error
    stepStatus = 'error';
  } else if (isChangesRequested) {
    currentIdx = 1;
    stepStatus = 'warning';
  }

  const items = STATUS_FLOW.map((status, index) => {
    let title = status.replace('_', ' ');
    if (status === 'PENDING_APPROVAL' && isRejected) {
      title = 'REJECTED';
    } else if (status === 'PENDING_APPROVAL' && isChangesRequested) {
      title = 'CHANGES REQUESTED';
    }
    return { title };
  });

  return (
    <Steps
      size="small"
      current={currentIdx === -1 ? 0 : currentIdx}
      status={stepStatus}
      items={items}
      style={{ padding: '8px 0' }}
    />
  );
}
