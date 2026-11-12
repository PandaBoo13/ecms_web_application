-- Store the buyer contact details entered during online checkout on the invoice.
-- These fields are independent from the account login email and profile.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payer_name VARCHAR(150);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payer_email VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payer_phone VARCHAR(20);
