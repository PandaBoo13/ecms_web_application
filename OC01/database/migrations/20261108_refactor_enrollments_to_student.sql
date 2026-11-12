-- ============================================================================
-- Enrollment refactor: a paid enrollment always belongs to a Student.
-- Removes the redundant enrollment_type (derived from course.course_type) and
-- account_id (derived from student.user_id) columns.
-- ============================================================================

-- 1. Backfill legacy ONLINE enrollments that only had account_id.
DO $$
DECLARE
    rec RECORD;
    new_lead_id BIGINT;
    new_student_id BIGINT;
    v_name TEXT;
    v_phone TEXT;
    v_code TEXT;
BEGIN
    FOR rec IN
        SELECT e.enrollment_id, e.account_id, e.course_id, a.email AS email
        FROM enrollments e
        JOIN account a ON a.id = e.account_id
        WHERE e.student_id IS NULL AND e.account_id IS NOT NULL
    LOOP
        SELECT up.full_name, up.phone
        INTO v_name, v_phone
        FROM user_profile up
        WHERE up.account_id = rec.account_id;

        IF v_name IS NULL OR btrim(v_name) = '' THEN
            v_name := rec.email;
        END IF;
        IF v_phone IS NULL THEN
            v_phone := '';
        END IF;

        SELECT s.id INTO new_student_id
        FROM students s
        WHERE s.user_id = rec.account_id OR s.email = rec.email
        LIMIT 1;

        IF new_student_id IS NULL THEN
            INSERT INTO leads (
                full_name, email, phone, course_id, status, consulted_at, converted_at,
                source_name, channel_type, created_at, updated_at, interactions
            ) VALUES (
                v_name, rec.email, v_phone, rec.course_id, 'CONSULTED', now(), now(),
                'Website', 'ONLINE', now(), now(), '[]'::jsonb
            )
            RETURNING id INTO new_lead_id;

            v_code := 'STD20261190' || rec.enrollment_id;
            INSERT INTO students (
                student_code, lead_id, user_id, full_name, email, phone, status, created_at, updated_at
            ) VALUES (
                v_code, new_lead_id, rec.account_id, v_name, rec.email, v_phone, 'ACTIVE', now(), now()
            )
            RETURNING id INTO new_student_id;

            UPDATE leads SET student_id = new_student_id WHERE id = new_lead_id;
        END IF;

        UPDATE enrollments
        SET student_id = new_student_id,
            updated_at = now()
        WHERE enrollment_id = rec.enrollment_id;

        UPDATE invoices
        SET student_id = new_student_id
        WHERE invoice_id = (SELECT e.invoice_id FROM enrollments e WHERE e.enrollment_id = rec.enrollment_id)
          AND student_id IS NULL;
    END LOOP;
END $$;

-- 2. Every enrollment must reference a Student.
ALTER TABLE enrollments ALTER COLUMN student_id SET NOT NULL;

-- 3. Drop account_id (ownership is student.user_id).
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS fk_enrollments_account;
DROP INDEX IF EXISTS idx_enrollments_account;
ALTER TABLE enrollments DROP COLUMN IF EXISTS account_id;

-- 4. Drop enrollment_type (derived from course.course_type).
DROP INDEX IF EXISTS idx_enrollments_type;
ALTER TABLE enrollments DROP COLUMN IF EXISTS enrollment_type;
DROP TYPE IF EXISTS enrollment_type;

-- 5. Guest checkout invoices are created by the system, not a staff account.
ALTER TABLE invoices ALTER COLUMN created_by DROP NOT NULL;
