-- Run before deploying the PaymentMethod enum without VNPAY.
-- VNPAY is a payment gateway; invoices use BANK_TRANSFER as their payment method.
UPDATE invoices
SET payment_method = 'BANK_TRANSFER'
WHERE payment_method::text = 'VNPAY';
