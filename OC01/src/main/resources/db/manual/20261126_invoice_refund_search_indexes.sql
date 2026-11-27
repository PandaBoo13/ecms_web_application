-- Speeds up the paged list of paid tuition invoices eligible for refund.
-- Run each CREATE INDEX CONCURRENTLY statement outside a transaction.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_refund_candidates
    ON invoices (created_at DESC, invoice_id DESC)
    WHERE type = 'TUITION_PAYMENT' AND status = 'PAID';

-- Refund search uses LOWER(column) LIKE '%term%'; B-tree indexes cannot serve
-- these contains searches. pg_trgm GIN indexes can.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_invoice_code_trgm
    ON invoices USING gin (LOWER(invoice_code) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_payer_name_trgm
    ON invoices USING gin (LOWER(payer_name) gin_trgm_ops)
    WHERE payer_name IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_payer_email_trgm
    ON invoices USING gin (LOWER(payer_email) gin_trgm_ops)
    WHERE payer_email IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_payer_phone_trgm
    ON invoices USING gin (LOWER(payer_phone) gin_trgm_ops)
    WHERE payer_phone IS NOT NULL;
