-- Bỏ cờ "cần hoàn tiền": hoàn tiền là nghiệp vụ thủ công (hoàn ngoài trước,
-- sau đó admin ghi chứng từ REFUND kèm ảnh minh chứng). Hệ thống không cần
-- đánh dấu hóa đơn PAID là "cần hoàn tiền".
ALTER TABLE invoices
    DROP COLUMN IF EXISTS refund_required;
