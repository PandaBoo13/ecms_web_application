package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.dto.request.auth.*;
import com.ecms_web_application.OC01.dto.response.auth.LoginResponse;
import com.ecms_web_application.OC01.dto.response.auth.RegisterResponse;
import com.ecms_web_application.OC01.dto.response.auth.UserInfoResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ecms_web_application.OC01.config.CookieUtil;
import com.ecms_web_application.OC01.config.JwtService;
import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.AuthSession;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.UserProfile;
import com.ecms_web_application.OC01.entity.enums.DeviceType;
import com.ecms_web_application.OC01.entity.enums.OtpPurpose;
import com.ecms_web_application.OC01.entity.enums.RevokedReason;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.GeneralService;
import com.ecms_web_application.OC01.generic.mapper.AuthenticationMapper;
import com.ecms_web_application.OC01.generic.validator.AuthValidator;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.AuthSessionRepository;
import com.ecms_web_application.OC01.repository.RoleRepository;
import com.ecms_web_application.OC01.repository.UserProfileRepository;
import com.ecms_web_application.OC01.service.AuthenticationService;
import com.ecms_web_application.OC01.service.EmailService;
import com.ecms_web_application.OC01.service.OtpService;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationServiceImpl implements AuthenticationService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GeneralService generalService;
    private final AuthenticationMapper authMapper;
    private final CookieUtil cookieUtil;
    private final OtpService otpService;
    private final EmailService emailService;
    private final AuthValidator authValidator;

    /** ⚠️ ĐỔI: role mặc định khi đăng ký — STUDENT thay vì CUSTOMER */
    private static final String DEFAULT_ROLE = "STUDENT";

    // ============================================================
    // AUTH-01: REGISTER
    // ============================================================
    @Override
    @Transactional
    public RegisterResponse register(RegisterRequest request) {

        boolean emailExists = accountRepository.existsByEmail(request.getEmail());
        authValidator.validateForRegister(request, emailExists);

        // ⚠️ SỬA: default role = STUDENT
        String roleCode = request.getRoleCode() != null
                ? request.getRoleCode().toUpperCase()
                : DEFAULT_ROLE;

        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new ErrorHandler(
                        HttpStatus.BAD_REQUEST,
                        "Role " + roleCode + " không tồn tại"
                ));

        String encodedPassword = passwordEncoder.encode(request.getPassword());
        Account account = authMapper.toAccount(request, role, encodedPassword);
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        UserProfile profile = authMapper.toUserProfile(request, account);
        profile.setCreatedAt(LocalDateTime.now());
        profile.setUpdatedAt(LocalDateTime.now());

        account.setUserProfile(profile);

        accountRepository.save(account);

        log.info("Đăng ký thành công: email={}, role={}", account.getEmail(), roleCode);

        return authMapper.toRegisterResponse(account);
    }

    // ============================================================
    // AUTH-02: LOGIN
    // ============================================================
    @Override
    public LoginResponse login(LoginRequest request) {
        authValidator.validateForLogin(request.getEmail(), request.getPassword());

        Account account = accountRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));

        authValidator.validateAccountStatusForLogin(
                Boolean.TRUE.equals(account.getIsActive()),
                account.getDeletedAt() != null,
                Boolean.TRUE.equals(account.getIsLocked()),
                account.getLockedUntil()
        );

        if (Boolean.TRUE.equals(account.getIsLocked())
                && (account.getLockedUntil() == null
                || LocalDateTime.now().isAfter(account.getLockedUntil()))) {
            account.setIsLocked(false);
            account.setLockedUntil(null);
            account.setFailedLoginCount(0);
            accountRepository.saveAndFlush(account);
        }

        boolean passwordMatch = passwordEncoder.matches(request.getPassword(), account.getPasswordHash());
        if (!passwordMatch) {
            handleFailedLogin(account);
            authValidator.validateLoginPassword(false);
        }

        account.setFailedLoginCount(0);
        account.setIsLocked(false);
        account.setLockedUntil(null);
        account.setLastLoginAt(LocalDateTime.now());
        accountRepository.saveAndFlush(account);

        // ⚠️ SỬA: default role = STUDENT
        String roleCode = account.getRole() != null ? account.getRole().getCode() : DEFAULT_ROLE;
        String accessToken = jwtService.generateAccessTokenWithUserInfo(
                account.getEmail(),
                Math.toIntExact(account.getId()),
                account.getEmail(),
                roleCode
        );
        String refreshToken = jwtService.generateRefreshToken(account.getEmail());

        saveAuthSession(account, refreshToken);

        log.info("Đăng nhập thành công: email={}, role={}", account.getEmail(), roleCode);

        int ttlSeconds = jwtService.getAccessTokenExpirationSeconds();
        return authMapper.toLoginResponse(accessToken, refreshToken, ttlSeconds);
    }

    // ============================================================
    // AUTH-03: LOGOUT
    // ============================================================
    @Transactional
    @Override
    public void logout(String refreshToken, HttpServletResponse response) {

        Account currentAccount = SecurityUtils.getCurrentAccount();

        if (refreshToken != null && !refreshToken.isBlank()) {
            String hash = hashToken(refreshToken);
            authSessionRepository.findByRefreshTokenHash(hash)
                    .ifPresent(session -> {
                        if (session.getRevokedAt() == null) {
                            session.setRevokedAt(LocalDateTime.now());
                            session.setRevokedReason(RevokedReason.LOGOUT);
                            authSessionRepository.save(session);
                            log.info("Revoke session hiện tại: accountId={}, sessionId={}",
                                    session.getAccount().getId(), session.getId());
                        }
                    });
        }

        SecurityContextHolder.clearContext();
        cookieUtil.clearCookies(response);

        if (currentAccount != null) {
            log.info("Đăng xuất thành công (1 thiết bị): email={}", currentAccount.getEmail());
        }
    }

    // ============================================================
    // AUTH-04: REFRESH TOKEN
    // ============================================================
    @Override
    @Transactional
    public LoginResponse refreshToken(String refreshToken) {

        if (Boolean.FALSE.equals(jwtService.isRefreshToken(refreshToken))
                || Boolean.TRUE.equals(jwtService.isTokenExpired(refreshToken))) {
            throw new ErrorHandler(HttpStatus.UNAUTHORIZED,
                    "Refresh token không hợp lệ hoặc đã hết hạn");
        }

        String hash = hashToken(refreshToken);
        AuthSession session = authSessionRepository.findByRefreshTokenHash(hash)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.UNAUTHORIZED, "Session không tồn tại"));

        if (session.getRevokedAt() != null) {
            throw new ErrorHandler(HttpStatus.UNAUTHORIZED, "Session đã bị thu hồi");
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ErrorHandler(HttpStatus.UNAUTHORIZED, "Session đã hết hạn");
        }

        Account account = session.getAccount();
        if (Boolean.FALSE.equals(account.getIsActive()) || account.getDeletedAt() != null) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Tài khoản đã bị vô hiệu hóa");
        }

        // ⚠️ SỬA: default role = STUDENT
        String roleCode = account.getRole() != null ? account.getRole().getCode() : DEFAULT_ROLE;
        String newAccessToken = jwtService.generateAccessTokenWithUserInfo(
                account.getEmail(),
                Math.toIntExact(account.getId()),
                account.getEmail(),
                roleCode
        );

        session.setLastActiveAt(LocalDateTime.now());
        authSessionRepository.save(session);

        log.info("Refresh token thành công: email={}", account.getEmail());

        int ttlSeconds = jwtService.getAccessTokenExpirationSeconds();
        return authMapper.toLoginResponse(newAccessToken, refreshToken, ttlSeconds);
    }

    // ============================================================
    // AUTH-05: GET CURRENT USER INFO
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public UserInfoResponse getCurrentUserInfo() {

        Account account = SecurityUtils.requireCurrentAccount();

        UserInfoResponse response = new UserInfoResponse();
        response.setAccountId(account.getId());
        response.setEmail(account.getEmail());
        response.setRoleCode(account.getRole() != null ? account.getRole().getCode() : null);

        UserProfile profile = account.getUserProfile();
        if (profile != null) {
            response.setFullName(profile.getFullName());
            response.setPhone(profile.getPhone());
            response.setAvatarUrl(profile.getAvatarUrl());
            response.setAddress(profile.getAddress());
        }

        return response;
    }

    // ============================================================
    // AUTH-06: CHANGE PASSWORD
    // ============================================================
    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request) {

        Account account = SecurityUtils.requireCurrentAccount();

        boolean oldMatch = passwordEncoder.matches(request.getOldPassword(), account.getPasswordHash());
        authValidator.validateForChangePassword(request, oldMatch);

        boolean sameAsOld = passwordEncoder.matches(request.getNewPassword(), account.getPasswordHash());
        authValidator.validateNewPasswordDifferentFromOld(sameAsOld);

        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        account.setPasswordChangedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());
        accountRepository.save(account);

        authSessionRepository.findByAccountIdAndRevokedAtIsNullAndExpiresAtAfter(
                        account.getId(), LocalDateTime.now())
                .forEach(session -> {
                    session.setRevokedAt(LocalDateTime.now());
                    session.setRevokedReason(RevokedReason.PASSWORD_CHANGE);
                    authSessionRepository.save(session);
                });

        emailService.sendPasswordChangedEmail(account.getEmail());

        log.info("Đổi mật khẩu thành công: email={}", account.getEmail());
    }

    // ============================================================
    // AUTH-07: FORGOT PASSWORD
    // ============================================================
    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {

        authValidator.validateForForgotPassword(request);

        String email = request.getEmail().toLowerCase();
        Optional<Account> accountOpt = accountRepository.findByEmail(email);

        if (accountOpt.isEmpty()) {
            log.warn("Forgot password cho email không tồn tại: {}", email);
            return;
        }

        Account account = accountOpt.get();

        if (Boolean.FALSE.equals(account.getIsActive()) || account.getDeletedAt() != null) {
            log.warn("Forgot password cho account bị vô hiệu hóa: {}", email);
            return;
        }

        otpService.generateAndSend(email, OtpPurpose.FORGOT_PASSWORD);

        log.info("Gửi OTP forgot password: email={}", email);
    }

    // ============================================================
    // AUTH-08: VERIFY OTP
    // ============================================================
    @Override
    @Transactional
    public String verifyOtp(VerifyOtpRequest request) {

        authValidator.validateForVerifyOtp(request);

        String email = request.getEmail().toLowerCase();

        boolean valid = otpService.verify(email, request.getOtp(), OtpPurpose.FORGOT_PASSWORD);
        authValidator.validateOtpResult(valid);

        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.BAD_REQUEST, "OTP không hợp lệ"));

        authValidator.validateAccountStatusForLogin(
                Boolean.TRUE.equals(account.getIsActive()),
                account.getDeletedAt() != null,
                false,
                null
        );

        String resetToken = jwtService.generateAccessTokenWithUserInfo(
                account.getEmail(),
                Math.toIntExact(account.getId()),
                account.getEmail(),
                "RESET_PASSWORD"
        );

        log.info("Xác minh OTP thành công: email={}", email);

        return resetToken;
    }

    // ============================================================
    // AUTH-09: RESET PASSWORD
    // ============================================================
    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {

        authValidator.validateForResetPassword(request);

        String resetToken = request.getResetToken();

        boolean isExpired = Boolean.TRUE.equals(jwtService.isTokenExpired(resetToken));
        String tokenRole = jwtService.extractClaim(resetToken, "role", String.class);
        String email = jwtService.extractUsername(resetToken);

        authValidator.validateResetToken(isExpired, tokenRole, email);

        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.BAD_REQUEST, "Reset token không hợp lệ"));

        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        account.setPasswordChangedAt(LocalDateTime.now());
        account.setFailedLoginCount(0);
        account.setIsLocked(false);
        account.setLockedUntil(null);
        account.setUpdatedAt(LocalDateTime.now());
        accountRepository.save(account);

        authSessionRepository.findByAccountIdAndRevokedAtIsNullAndExpiresAtAfter(
                        account.getId(), LocalDateTime.now())
                .forEach(session -> {
                    session.setRevokedAt(LocalDateTime.now());
                    session.setRevokedReason(RevokedReason.PASSWORD_CHANGE);
                    authSessionRepository.save(session);
                });

        emailService.sendPasswordChangedEmail(email);

        log.info("Reset mật khẩu thành công: email={}", email);
    }

    @Override
    @Transactional
    public UserInfoResponse updateProfile(UpdateProfileRequest request) {

        Account account = SecurityUtils.requireCurrentAccount();

        UserProfile profile = account.getUserProfile();
        if (profile == null) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Hồ sơ người dùng không tồn tại");
        }

        boolean phoneTakenByOther = false;
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            phoneTakenByOther = userProfileRepository.findByPhone(request.getPhone().trim())
                    .map(existing -> !existing.getAccount().getId().equals(account.getId()))
                    .orElse(false);
        }

        authValidator.validateForUpdateProfile(request, phoneTakenByOther);

        applyField(request.getFullName(), profile::setFullName);
        applyField(request.getPhone(),     profile::setPhone);
        applyField(request.getAvatarUrl(), profile::setAvatarUrl);
        applyField(request.getAddress(),   profile::setAddress);

        profile.setUpdatedAt(LocalDateTime.now());
        userProfileRepository.save(profile);

        log.info("Cập nhật profile thành công: email={}", account.getEmail());

        return getCurrentUserInfo();
    }

    // ============================================================
    // REVOKE SESSION
    // ============================================================
    @Override
    @Transactional
    public void revokeSession(String refreshToken) {

        String hash = hashToken(refreshToken);
        authSessionRepository.findByRefreshTokenHash(hash)
                .ifPresent(session -> {
                    if (session.getRevokedAt() == null) {
                        session.setRevokedAt(LocalDateTime.now());
                        session.setRevokedReason(RevokedReason.LOGOUT);
                        authSessionRepository.save(session);
                        log.info("Revoke session: accountId={}", session.getAccount().getId());
                    }
                });
    }

    // ============================================================
    // UserDetailsService
    // ============================================================
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Optional<Account> account = accountRepository.findByEmailWithRole(email);
        return account.orElseThrow(() -> new ErrorHandler(HttpStatus.UNAUTHORIZED, "Account not exist"));
    }

    // ============================================================
    // HELPERS
    // ============================================================
    private void saveAuthSession(Account account, String refreshToken) {
        AuthSession session = new AuthSession();
        session.setAccount(account);
        session.setRefreshTokenHash(hashToken(refreshToken));
        session.setDeviceType(DeviceType.OTHER);
        session.setLastActiveAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusDays(30));
        session.setCreatedAt(LocalDateTime.now());
        authSessionRepository.save(session);
    }

    private void handleFailedLogin(Account account) {
        int failedCount = (account.getFailedLoginCount() != null
                ? account.getFailedLoginCount() : 0) + 1;
        account.setFailedLoginCount(failedCount);

        if (failedCount >= 5) {
            account.setIsLocked(true);
            account.setLockedUntil(LocalDateTime.now().plusMinutes(15));
            log.warn("Tài khoản bị khóa do sai mật khẩu quá nhiều: {}", account.getEmail());
        }

        accountRepository.save(account);
    }

    private String hashToken(String token) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Không thể hash token", e);
        }
    }

    private static void applyField(String newValue, Consumer<String> setter) {
        if (newValue == null) return;
        String trimmed = newValue.trim();
        setter.accept(trimmed.isEmpty() ? null : trimmed);
    }
}