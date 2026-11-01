/**
 * Utilities & Validators cho Lead Module theo đặc tả nghiệp vụ FR_02:
 * Chuẩn hóa email viết thường, số điện thoại bỏ khoảng trắng, dạng +84 hoặc 0xxx.
 */

/**
 * Chuẩn hóa email: cắt khoảng trắng 2 đầu và chuyển sang chữ thường
 */
export const normalizeEmail = (email?: string): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

/**
 * Chuẩn hóa số điện thoại: bỏ khoảng trắng, dấu gạch nối, dấu chấm
 */
export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/[\s\-_.]/g, '').trim();
};

/**
 * Regex kiểm tra số điện thoại Việt Nam hợp lệ:
 * Bắt đầu bằng 0 (theo sau là 9 số: 03x, 05x, 07x, 08x, 09x)
 * hoặc bắt đầu bằng +84 (theo sau là 9 số)
 */
export const VIETNAMESE_PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

/**
 * Regex kiểm tra định dạng email chuẩn
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Kiểm tra tính hợp lệ của số điện thoại
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = normalizePhone(phone);
  return VIETNAMESE_PHONE_REGEX.test(cleaned);
};

/**
 * Kiểm tra tính hợp lệ của email
 */
export const isValidEmail = (email: string): boolean => {
  const normalized = normalizeEmail(email);
  return EMAIL_REGEX.test(normalized);
};

/**
 * Ant Design Form rule validator cho Phone
 */
export const phoneFormRule = {
  validator: (_: unknown, value?: string) => {
    if (!value || value.trim() === '') {
      return Promise.reject(new Error('Vui lòng nhập số điện thoại'));
    }
    const cleaned = normalizePhone(value);
    if (!VIETNAMESE_PHONE_REGEX.test(cleaned)) {
      return Promise.reject(
        new Error('Số điện thoại không đúng định dạng (+84 hoặc 03x, 05x, 07x, 08x, 09x)')
      );
    }
    return Promise.resolve();
  },
};

/**
 * Ant Design Form rule validator cho Email
 */
export const emailFormRule = {
  validator: (_: unknown, value?: string) => {
    if (!value || value.trim() === '') {
      return Promise.reject(new Error('Vui lòng nhập địa chỉ email'));
    }
    const normalized = normalizeEmail(value);
    if (!EMAIL_REGEX.test(normalized)) {
      return Promise.reject(new Error('Email không đúng định dạng (vd: user@example.com)'));
    }
    return Promise.resolve();
  },
};

