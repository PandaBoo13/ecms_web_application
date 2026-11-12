-- Bỏ invoices.account_id: chủ sở hữu hóa đơn được xác định qua student_id (người mua đã có
-- hồ sơ/tài khoản) hoặc lead_id (khách mua trước khi có tài khoản). Với hóa đơn có student,
-- tài khoản được suy ra qua students.user_id nên account_id là dữ liệu dư thừa.
--
-- Đã kiểm tra trên Neon: 12/49 hóa đơn có account_id và tất cả đều đã có student_id,
-- không có trường hợp account_id khác students.user_id. Vì vậy drop cột không mất thông tin.
ALTER TABLE invoices
    DROP CONSTRAINT IF EXISTS fk_invoices_account;

DROP INDEX IF EXISTS idx_invoices_account;

ALTER TABLE invoices
    DROP COLUMN IF EXISTS account_id;
