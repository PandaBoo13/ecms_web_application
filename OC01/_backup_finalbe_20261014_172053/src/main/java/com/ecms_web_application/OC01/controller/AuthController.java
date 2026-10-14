package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.config.CookieUtil;
import com.ecms_web_application.OC01.dto.request.auth.*;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.auth.LoginResponse;
import com.ecms_web_application.OC01.dto.response.auth.RegisterResponse;
import com.ecms_web_application.OC01.dto.response.auth.UserInfoResponse;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.service.AuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Controller xử lý xác thực.
 * - AUTH-01: Đăng ký            (POST /api/auth/register)
 * - AUTH-02: Đăng nhập          (POST /api/auth/login)
 * - AUTH-03: Đăng xuất          (POST /api/auth/logout)
 * - AUTH-04: Refresh token      (POST /api/auth/refresh-token)
 * - AUTH-05: Lấy user hiện tại  (GET  /api/auth/me)
 * - AUTH-06: Đổi mật khẩu       (POST /api/auth/change-password)
 * - AUTH-07: Quên mật khẩu      (POST /api/auth/forgot-password)
 * - AUTH-08: Xác minh OTP       (POST /api/auth/verify-otp)
 * - AUTH-09: Đặt lại mật khẩu   (POST /api/auth/reset-password)
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationService authenticationService;
    private final CookieUtil cookieUtil;

    // ============================================================
    // AUTH-01: REGISTER
    // ============================================================
    @PostMapping("/register")
    public ResponseEntity<RequestResponse> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse data = authenticationService.register(request);
        RequestResponse response = new RequestResponse(data, "Đăng ký thành công");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ============================================================
    // AUTH-02: LOGIN
    // ============================================================
    @PostMapping("/login")
    public ResponseEntity<RequestResponse> login(@Valid @RequestBody LoginRequest request,
                                                 HttpServletResponse httpResponse) {
        LoginResponse data = authenticationService.login(request);
        setAuthCookies(httpResponse, data);
        RequestResponse response = new RequestResponse(data, "Đăng nhập thành công");
        return ResponseEntity.ok(response);
    }

    // ============================================================
// AUTH-03: LOGOUT
// ============================================================
    @PostMapping("/logout")
    public ResponseEntity<RequestResponse> logout(HttpServletRequest httpRequest,
                                                  HttpServletResponse httpResponse) {

        // Lấy refresh token hiện tại từ cookie
        String refreshToken = cookieUtil.getRefreshTokenFromCookies(httpRequest).orElse(null);

        // Revoke CHỈ session này + clear context + xóa cookie
        authenticationService.logout(refreshToken, httpResponse);

        RequestResponse response = new RequestResponse("Đăng xuất thành công");
        return ResponseEntity.ok(response);
    }
    // ============================================================
    // AUTH-04: REFRESH TOKEN
    // ============================================================
    @PostMapping("/refresh-token")
    public ResponseEntity<RequestResponse> refreshToken(HttpServletRequest httpRequest,
                                                        HttpServletResponse httpResponse) {
        // Lấy refresh token từ cookie
        String refreshToken = cookieUtil.getRefreshTokenFromCookies(httpRequest)
                .orElseThrow(() -> new ErrorHandler(
                        HttpStatus.UNAUTHORIZED, "Refresh token not found"));

        // Sinh access token mới
        LoginResponse data = authenticationService.refreshToken(refreshToken);
        setAuthCookies(httpResponse, data);

        RequestResponse response = new RequestResponse(data, "Làm mới token thành công");
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // AUTH-05: GET CURRENT USER
    // ============================================================
    @GetMapping("/me")
    public ResponseEntity<RequestResponse> getCurrentUser() {
        UserInfoResponse data = authenticationService.getCurrentUserInfo();
        RequestResponse response = new RequestResponse(data, "Lấy thông tin thành công");
        return ResponseEntity.ok(response);
    }

    /** USER-02: PUT /api/users/me */
    @PutMapping("/me")
    public ResponseEntity<RequestResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request) {
        UserInfoResponse data = authenticationService.updateProfile(request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật thông tin thành công"));
    }
    // ============================================================
    // AUTH-06: CHANGE PASSWORD
    // ============================================================
    @PostMapping("/change-password")
    public ResponseEntity<RequestResponse> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletResponse httpResponse) {
        authenticationService.changePassword(request);

        // Đổi pass → xóa cookie (buộc login lại)
        cookieUtil.clearCookies(httpResponse);

        RequestResponse response = new RequestResponse("Đổi mật khẩu thành công, vui lòng đăng nhập lại");
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // AUTH-07: FORGOT PASSWORD
    // ============================================================
    @PostMapping("/forgot-password")
    public ResponseEntity<RequestResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authenticationService.forgotPassword(request);
        RequestResponse response = new RequestResponse("OTP đã được gửi đến email của bạn");
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // AUTH-08: VERIFY OTP
    // ============================================================
    @PostMapping("/verify-otp")
    public ResponseEntity<RequestResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {
        String resetToken = authenticationService.verifyOtp(request);
        RequestResponse response = new RequestResponse(resetToken, "Xác minh OTP thành công");
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // AUTH-09: RESET PASSWORD
    // ============================================================
    @PostMapping("/reset-password")
    public ResponseEntity<RequestResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authenticationService.resetPassword(request);
        RequestResponse response = new RequestResponse("Đặt lại mật khẩu thành công, vui lòng đăng nhập");
        return ResponseEntity.ok(response);
    }


    // ============================================================
    // HELPER: Set cookies cho access + refresh token
    // ============================================================
    private void setAuthCookies(HttpServletResponse httpResponse, LoginResponse data) {
        // Cookie access token
        int accessTtlSeconds = (int) Duration.between(
                LocalDateTime.now(),
                data.getExpiresAt()
        ).getSeconds();
        cookieUtil.addAccessTokenCookie(httpResponse, data.getAccessToken(), accessTtlSeconds);

        // Cookie refresh token (30 ngày)
        int refreshTtlSeconds = 30 * 24 * 60 * 60;
        cookieUtil.addRefreshTokenCookie(httpResponse, data.getRefreshToken(), refreshTtlSeconds);
    }
}