import React from 'react';
import { Modal } from 'antd';

export default function DeleteKpiDialog({ visible, kpiTitle, onConfirm, onCancel, confirmLoading }) {
  return (
    <Modal
      title="Delete KPI"
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Delete"
      okButtonProps={{ danger: true, loading: confirmLoading }}
      cancelButtonProps={{ disabled: confirmLoading }}
    >
      <p>Are you sure you want to delete the KPI <strong>"{kpiTitle}"</strong>?</p>
      <p>This action cannot be undone and will cascade delete all submission history and proofs.</p>
    </Modal>
  );
}
