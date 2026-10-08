package com.ecms_web_application.OC01.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.userdetails.UserDetailsService;
import com.ecms_web_application.OC01.dto.request.auth.*;
import com.ecms_web_application.OC01.dto.response.auth.LoginResponse;
import com.ecms_web_application.OC01.dto.response.auth.RegisterResponse;
import com.ecms_web_application.OC01.dto.response.auth.UserInfoResponse;

/**
 * Interface xác thực & quản lý phiên đăng nhập.
 * Extends UserDetailsService để tích hợp Spring Security.
 */
public interface AuthenticationService extends UserDetailsService {

    // ============ AUTH-01: REGISTER ============
    RegisterResponse register(RegisterRequest request);

    // ============ AUTH-02: LOGIN ============
    LoginResponse login(LoginRequest request);

    // ============ AUTH-03: LOGOUT ============
    void logout(String refreshToken, HttpServletResponse response);

    // ============ AUTH-04: REFRESH TOKEN ============
    LoginResponse refreshToken(String refreshToken);

    // ============ AUTH-05: GET CURRENT USER INFO ============
    UserInfoResponse getCurrentUserInfo();

    // ============ AUTH-06: CHANGE PASSWORD ============
    void changePassword(ChangePasswordRequest request);

    // ============ AUTH-07: FORGOT PASSWORD ============
    void forgotPassword(ForgotPasswordRequest request);

    // ============ AUTH-08: VERIFY OTP ============
    String verifyOtp(VerifyOtpRequest request);

    // ============ AUTH-09: RESET PASSWORD ============
    void resetPassword(ResetPasswordRequest request);

    // ============ UPDATE PROFILE ============
    UserInfoResponse updateProfile(UpdateProfileRequest request);

    // ============ REVOKE SESSION ============
    void revokeSession(String refreshToken);
}