import React, { useState, useEffect } from 'react';

export default function ActionItemDialog({ isOpen, onClose, onSubmit, defaultAssigneeId, assigneeName, assignees = [], departmentName = '' }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState(defaultAssigneeId || '');

  useEffect(() => {
    if (defaultAssigneeId) {
      setAssignedTo(defaultAssigneeId);
    } else if (assignees.length > 0) {
      setAssignedTo(assignees[0].employee_id);
    } else {
      setAssignedTo('');
    }
  }, [defaultAssigneeId, assignees, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo
    });
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setDueDate('');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <div style={{ background: '#ffffff', borderRadius: 12, width: 450, maxWidth: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Assign Action Item</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {defaultAssigneeId ? (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Assignee (Goal Owner)</label>
              <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                👤 {assigneeName || 'Assigned Employee'}
              </div>
            </div>
          ) : assignees.length > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Assign To {departmentName ? `(${departmentName} Member)` : ''} *
              </label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff', color: '#1e293b' }}
              >
                <option value="">-- Select Sub-Goal Owner --</option>
                {assignees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Action Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Delegate Feature A to junior developer"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Description / Guidance</label>
            <textarea
              rows={3}
              placeholder="Provide specific instructions or expectations..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={!assignedTo} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: assignedTo ? '#00b386' : '#94a3b8', color: '#fff', fontSize: 13, fontWeight: 700, cursor: assignedTo ? 'pointer' : 'not-allowed' }}>
              Assign Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
