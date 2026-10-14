package com.ecms_web_application.OC01.generic.mapper;

import com.ecms_web_application.OC01.dto.response.auth.LoginResponse;
import com.ecms_web_application.OC01.dto.response.auth.RegisterResponse;
import org.springframework.stereotype.Component;

import com.ecms_web_application.OC01.dto.request.auth.RegisterRequest;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.UserProfile;

import java.time.LocalDateTime;

/**
 * Mapper chuyển đổi giữa Entity ↔ DTO cho module Authentication.
 * Chỉ mapping dữ liệu, không chứa business logic.
 */
@Component
public class AuthenticationMapper {

    // ============================================================
    // REGISTER: Request → Account
    // ============================================================
    public Account toAccount(RegisterRequest request, Role role, String encodedPassword) {
        Account account = new Account();
        account.setEmail(request.getEmail().toLowerCase());
        account.setPasswordHash(encodedPassword);
        account.setRole(role);
        account.setIsActive(true);
        account.setIsLocked(false);
        account.setFailedLoginCount(0);
        return account;
    }

    // ============================================================
    // REGISTER: Request → UserProfile
    // ============================================================
    public UserProfile toUserProfile(RegisterRequest request, Account account) {
        UserProfile profile = new UserProfile();
        profile.setAccount(account);
        profile.setFullName(request.getFullName());
        profile.setPhone(request.getPhone());
        return profile;
    }

    // ============================================================
    // REGISTER: Account → Response (gọn)
    // ============================================================
    public RegisterResponse toRegisterResponse(Account account) {
        RegisterResponse response = new RegisterResponse();
        response.setAccountId(account.getId());
        response.setEmail(account.getEmail());
        // Lấy fullName từ userProfile
        if (account.getUserProfile() != null) {
            response.setFullName(account.getUserProfile().getFullName());
        }
        // Lấy roleCode từ role
        if (account.getRole() != null) {
            response.setRoleCode(account.getRole().getCode());
        }
        response.setMessage("Đăng ký thành công");
        return response;
    }

    // ============================================================
    // LOGIN: Tokens → Response (chỉ token)
    // ============================================================
    public LoginResponse toLoginResponse(String accessToken,
                                         String refreshToken,
                                         int accessTokenTtlSeconds) {
        LoginResponse response = new LoginResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);
        response.setExpiresAt(LocalDateTime.now().plusSeconds(accessTokenTtlSeconds));
        return response;
    }
}