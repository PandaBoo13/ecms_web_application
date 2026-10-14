package com.ecms_web_application.OC01.generic.validator;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import com.ecms_web_application.OC01.dto.request.auth.*;
import com.ecms_web_application.OC01.exception.ErrorHandler;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * ============================================================
 * AUTH VALIDATOR - KIỂM TRA DỮ LIỆU XÁC THỰC
 * ============================================================
 * Chức năng:
 * - Validate đăng ký / đăng nhập
 * - Validate đổi mật khẩu
 * - Validate quên mật khẩu / OTP / reset password
 *
 * Nguyên tắc:
 * - KHÔNG truy cập DB — chỉ nhận cờ boolean từ service
 * - Message ghi thẳng trong code, không cần constants
 * ============================================================
 */
@Slf4j
@Component
public class AuthValidator {

    private static final String EMAIL_REGEX = "^[\\w.-]+@[\\w.-]+\\.\\w{2,}$";
    private static final String OTP_REGEX   = "\\d{6}";
    private static final String PHONE_REGEX = "^\\d{10,11}$";

    // Regex cho Họ tên: chỉ cho phép chữ cái (bao gồm tiếng Việt) và khoảng trắng, gạch ngang, nháy đơn
    private static final String FULLNAME_VALID_REGEX =
            "^[a-zA-ZàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆĐÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ\\s'-]+$";

    // Regex kiểm tra nhanh XSS: HTML tag + protocol nguy hiểm + inline event handler
    private static final Pattern XSS_HTML_PATTERN =
            Pattern.compile("<[^>]*>|javascript:|on\\w+\\s*=", Pattern.CASE_INSENSITIVE);

    private static final int EMAIL_MAX_LENGTH    = 100;
    private static final int PASSWORD_MIN_LENGTH = 6;
    private static final int PASSWORD_MAX_LENGTH = 100;
    private static final int FULLNAME_MAX_LENGTH = 150;
    private static final int ADDRESS_MAX_LENGTH    = 255;
    private static final int AVATAR_URL_MAX_LENGTH = 500;
    private static final Pattern AVATAR_URL_PATTERN =
            Pattern.compile("^(https?://\\S+|data:image/\\S+|/\\S*)$", Pattern.CASE_INSENSITIVE);

    /**
     * ⚠️ ECMS: Chỉ cho phép đăng ký role STUDENT.
     * INSTRUCTOR do ADMIN tạo để kiểm soát chất lượng giảng viên.
     */
    private static final Set<String> ALLOWED_REGISTER_ROLES = Set.of("STUDENT");

    private static final String RESET_PASSWORD_ROLE = "RESET_PASSWORD";

    // ============================================================
    // VALIDATE TỔNG HỢP
    // ============================================================

    /** Validate toàn bộ request đăng ký */
    public void validateForRegister(RegisterRequest request, boolean emailExists) {
        validateEmail(request.getEmail());
        if (emailExists) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Email đã được đăng ký");
        }
        validatePassword(request.getPassword());
        validateConfirmPassword(request.getPassword(), request.getConfirmPassword());
        validateFullName(request.getFullName());
        validatePhone(request.getPhone());
        validateRegisterRole(request.getRoleCode());
        validateAgreedToTerms(request.getAgreedToTerms());
    }

    /** Validate request đăng nhập */
    public void validateForLogin(String email, String password) {
        validateEmail(email);
        if (password == null || password.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mật khẩu là bắt buộc");
        }
    }

    /** Validate request đổi mật khẩu */
    public void validateForChangePassword(ChangePasswordRequest request, boolean isOldPasswordMatch) {
        if (!isOldPasswordMatch) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mật khẩu cũ không đúng");
        }
        validatePassword(request.getNewPassword());
        validateConfirmPassword(request.getNewPassword(), request.getConfirmPassword());
    }

    /** Validate request quên mật khẩu */
    public void validateForForgotPassword(ForgotPasswordRequest request) {
        validateEmail(request.getEmail());
    }

    /** Validate request xác minh OTP */
    public void validateForVerifyOtp(VerifyOtpRequest request) {
        validateEmail(request.getEmail());
        validateOtp(request.getOtp());
    }

    /** Validate request reset password */
    public void validateForResetPassword(ResetPasswordRequest request) {
        if (request.getResetToken() == null || request.getResetToken().isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Reset token là bắt buộc");
        }
        validatePassword(request.getNewPassword());
        validateConfirmPassword(request.getNewPassword(), request.getConfirmPassword());
    }

    // ============================================================
    // VALIDATE TRẠNG THÁI
    // ============================================================

    /** Validate trạng thái account trước khi cho login */
    public void validateAccountStatusForLogin(boolean isActive,
                                              boolean isDeleted,
                                              boolean isLocked,
                                              LocalDateTime lockedUntil) {
        if (!isActive || isDeleted) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Tài khoản đã bị vô hiệu hóa");
        }
        if (isLocked && lockedUntil != null && LocalDateTime.now().isBefore(lockedUntil)) {
            throw new ErrorHandler(HttpStatus.LOCKED, "Tài khoản đang bị khóa. Vui lòng thử lại sau");
        }
    }

    /** Validate mật khẩu login */
    public void validateLoginPassword(boolean isPasswordMatch) {
        if (!isPasswordMatch) {
            throw new ErrorHandler(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng");
        }
    }

    /** Validate mật khẩu mới khác mật khẩu cũ */
    public void validateNewPasswordDifferentFromOld(boolean isSameAsOld) {
        if (isSameAsOld) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng mật khẩu cũ");
        }
    }

    /** Validate kết quả verify OTP từ OtpService */
    public void validateOtpResult(boolean isValid) {
        if (!isValid) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "OTP không đúng hoặc đã hết hạn");
        }
    }

    /** Validate reset token */
    public void validateResetToken(boolean isExpired, String tokenRole, String emailFromToken) {
        if (isExpired) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Reset token đã hết hạn");
        }
        if (!RESET_PASSWORD_ROLE.equals(tokenRole)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Token không hợp lệ cho reset password");
        }
        if (emailFromToken == null || emailFromToken.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Reset token không hợp lệ");
        }
    }

    // ============================================================
    // VALIDATE ENUM / ROLE
    // ============================================================

    public void validateRegisterRole(String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return; // null → service tự gán STUDENT
        }
        String normalized = roleCode.toUpperCase();
        if (!ALLOWED_REGISTER_ROLES.contains(normalized)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Loại tài khoản không hợp lệ");
        }
    }

    public void validateAgreedToTerms(Boolean agreedToTerms) {
        if (agreedToTerms == null || !agreedToTerms) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng đồng ý với điều khoản sử dụng");
        }
    }

    /** Validate request cập nhật profile */
    public void validateForUpdateProfile(UpdateProfileRequest request,
                                         boolean phoneTakenByOther) {
        // fullName: nếu có gửi → phải hợp lệ
        if (request.getFullName() != null) {
            validateFullName(request.getFullName());
        }

        // phone: nếu có gửi → validate format + check trùng
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            validatePhone(request.getPhone());
            if (phoneTakenByOther) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Số điện thoại đã được sử dụng bởi tài khoản khác");
            }
        }

        // address: optional, cho phép clear (empty string → null)
        if (request.getAddress() != null) {
            validateAddress(request.getAddress());
        }

        // avatarUrl: optional, cho phép clear (empty string → null)
        if (request.getAvatarUrl() != null) {
            validateAvatarUrl(request.getAvatarUrl());
        }
    }

    // ============================================================
    // VALIDATE PRIVATE — FORMAT
    // ============================================================

    private void validateEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Email là bắt buộc");
        }
        if (!email.matches(EMAIL_REGEX)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Email không đúng định dạng");
        }
        if (email.length() > EMAIL_MAX_LENGTH) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Email không được vượt quá " + EMAIL_MAX_LENGTH + " ký tự");
        }
    }

    private void validatePassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mật khẩu là bắt buộc");
        }
        if (password.length() < PASSWORD_MIN_LENGTH) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Mật khẩu phải có ít nhất " + PASSWORD_MIN_LENGTH + " ký tự");
        }
        if (password.length() > PASSWORD_MAX_LENGTH) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Mật khẩu không được vượt quá " + PASSWORD_MAX_LENGTH + " ký tự");
        }
    }

    private void validateConfirmPassword(String password, String confirmPassword) {
        if (confirmPassword == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Xác nhận mật khẩu là bắt buộc");
        }
        if (!password.equals(confirmPassword)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mật khẩu xác nhận không khớp");
        }
    }

    private void validateFullName(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Họ tên là bắt buộc");
        }
        String trimmedName = fullName.trim();
        if (trimmedName.length() > FULLNAME_MAX_LENGTH) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Họ tên không được vượt quá " + FULLNAME_MAX_LENGTH + " ký tự");
        }
        // Kiểm tra XSS/HTML + ký tự đặc biệt
        if (XSS_HTML_PATTERN.matcher(trimmedName).find()
                || !trimmedName.matches(FULLNAME_VALID_REGEX)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Họ tên chứa ký tự không hợp lệ");
        }
    }

    private void validatePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return; // optional
        }
        if (!phone.matches(PHONE_REGEX)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Số điện thoại không hợp lệ");
        }
    }

    private void validateOtp(String otp) {
        if (otp == null || otp.trim().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "OTP là bắt buộc");
        }
        if (!otp.matches(OTP_REGEX)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "OTP phải là 6 chữ số");
        }
    }

    private void validateAddress(String address) {
        if (address == null || address.isBlank()) {
            return; // cho phép clear
        }
        String trimmed = address.trim();
        if (trimmed.length() > ADDRESS_MAX_LENGTH) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Địa chỉ không được vượt quá " + ADDRESS_MAX_LENGTH + " ký tự");
        }
        if (XSS_HTML_PATTERN.matcher(trimmed).find()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Địa chỉ chứa ký tự không hợp lệ");
        }
    }

    private void validateAvatarUrl(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return; // cho phép clear
        }
        String trimmed = avatarUrl.trim();
        if (trimmed.length() > AVATAR_URL_MAX_LENGTH) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "URL ảnh đại diện không được vượt quá " + AVATAR_URL_MAX_LENGTH + " ký tự");
        }
        if (!AVATAR_URL_PATTERN.matcher(trimmed).matches()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "URL ảnh đại diện không hợp lệ");
        }
    }
}