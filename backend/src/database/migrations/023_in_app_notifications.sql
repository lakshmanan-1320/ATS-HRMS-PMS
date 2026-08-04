CREATE TABLE IF NOT EXISTS notifications (
  id                    SERIAL PRIMARY KEY,
  recipient_employee_id UUID         NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  type                  VARCHAR(60)  NOT NULL,
  title                 VARCHAR(255) NOT NULL,
  message               TEXT,
  entity_id             INTEGER,
  entity_type           VARCHAR(50),
  is_read               BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_employee_id, is_read, created_at DESC);
