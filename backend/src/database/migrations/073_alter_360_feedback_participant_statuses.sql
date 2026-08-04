-- Migration 073: Expand 360° Feedback Participant Statuses
-- Add INVITED and ACCEPTED to the reviewer lifecycle

ALTER TABLE feedback_participants
  DROP CONSTRAINT IF EXISTS feedback_participants_status_check;

ALTER TABLE feedback_participants
  ADD CONSTRAINT feedback_participants_status_check
    CHECK (status IN ('INVITED', 'ACCEPTED', 'PENDING', 'SUBMITTED', 'EXPIRED', 'DECLINED'));

-- Update existing PENDING rows to INVITED (since they haven't been explicitly accepted)
UPDATE feedback_participants SET status = 'INVITED' WHERE status = 'PENDING';
