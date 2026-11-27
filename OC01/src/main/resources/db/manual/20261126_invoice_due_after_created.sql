-- Prevent invoice deadlines earlier than invoice creation, including direct SQL edits in Neon.
-- NOT VALID leaves any existing bad rows untouched, but enforces the rule for new/updated rows.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_invoices_due_at_after_created_at'
    ) THEN
        ALTER TABLE invoices
            ADD CONSTRAINT chk_invoices_due_at_after_created_at
            CHECK (due_at IS NULL OR due_at >= created_at)
            NOT VALID;
    END IF;
END $$;

-- After correcting any legacy violations, validate the constraint with:
-- ALTER TABLE invoices VALIDATE CONSTRAINT chk_invoices_due_at_after_created_at;
