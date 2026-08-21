CREATE TABLE IF NOT EXISTS nine_box_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    appraisal_cycle_id UUID NOT NULL,
    performance_score NUMERIC(5,2),
    performance_level VARCHAR(10) CHECK (performance_level IN ('LOW','MEDIUM','HIGH')),
    potential_level VARCHAR(10) CHECK (potential_level IN ('LOW','MEDIUM','HIGH')),
    box_number INTEGER CHECK (box_number BETWEEN 1 AND 9),
    box_label VARCHAR(50),
    manager_notes TEXT,
    hr_notes TEXT,
    is_manual_override BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nine_box_employee
ON nine_box_assessments(employee_id);

CREATE INDEX idx_nine_box_cycle
ON nine_box_assessments(appraisal_cycle_id);