-- Replace absence-only rows with an explicit status for each recorded learner/session.
-- Existing rows are historical, confirmed absences and remain ABSENT.
ALTER TABLE IF EXISTS attendance_absences RENAME TO attendance_records;

ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ABSENT',
    ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS note TEXT NULL,
    ADD COLUMN IF NOT EXISTS marked_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS marked_by BIGINT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT NULL;

UPDATE attendance_records
SET marked_at = COALESCE(marked_at, created_at),
    marked_by = COALESCE(marked_by, created_by)
WHERE status = 'ABSENT';

ALTER TABLE attendance_records ALTER COLUMN status SET DEFAULT 'NOT_MARKED';

ALTER TABLE attendance_records
    ADD CONSTRAINT chk_attendance_records_status
    CHECK (status IN ('NOT_MARKED', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED'));

CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session_id);
