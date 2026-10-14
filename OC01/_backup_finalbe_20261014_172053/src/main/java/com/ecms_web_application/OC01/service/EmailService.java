package com.ecms_web_application.OC01.service;

/**
 * Service gửi email giao dịch.
 */
public interface EmailService {

    /** Gửi email chứa mã OTP đặt lại mật khẩu. */
    void sendOtpEmail(String to, String otp);

    /** Gửi email thông báo mật khẩu đã được thay đổi thành công. */
    void sendPasswordChangedEmail(String to);
}