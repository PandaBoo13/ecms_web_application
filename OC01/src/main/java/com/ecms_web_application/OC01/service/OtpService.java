package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.entity.enums.OtpPurpose;

/**
 * Service sinh / verify OTP.
 * Lưu OTP in-memory (chưa persist DB).
 */
public interface OtpService {

    // ============ GENERATE + SEND ============
    void generateAndSend(String email, OtpPurpose purpose);

    // ============ OTP STORAGE ============
    void saveOtp(String email, String otp);

    String getOtp(String email);

    void deleteOtp(String email);

    // ============ VERIFY ============
    boolean verify(String email, String otp, OtpPurpose purpose);

    // ============ VERIFIED STATUS ============
    void markEmailAsVerified(String email);

    boolean isEmailVerified(String email);

    void clearEmailVerified(String email);
}