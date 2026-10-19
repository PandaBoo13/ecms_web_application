package com.ecms_web_application.OC01.service;

import java.time.LocalDateTime;

/**
 * Service gửi email giao dịch.
 */
public interface EmailService {
    void sendOtpEmail(String to, String otp);
    void sendPasswordChangedEmail(String to);
    void sendAccountLockedEmail(String to, String fullName, String reason, LocalDateTime lockedUntil);
}