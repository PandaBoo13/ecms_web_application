package com.ecms_web_application.OC01.service.impl.rbac;

import com.ecms_web_application.OC01.config.security.PermissionManager;
import com.ecms_web_application.OC01.dto.request.AccountLockRequest;
import com.ecms_web_application.OC01.dto.request.rbac.AccountCreateRequest;
import com.ecms_web_application.OC01.dto.request.rbac.AccountResetPasswordRequest;
import com.ecms_web_application.OC01.dto.request.rbac.AccountUpdateRequest;
import com.ecms_web_application.OC01.dto.request.rbac.AssignRoleRequest;
import com.ecms_web_application.OC01.dto.response.rbac.AccountResponse;
import com.ecms_web_application.OC01.dto.response.rbac.AccountRoleResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.UserProfile;
import com.ecms_web_application.OC01.entity.enums.AuthProvider;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.AuthSessionRepository;
import com.ecms_web_application.OC01.repository.RoleRepository;
import com.ecms_web_application.OC01.service.AccountRoleService;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountRoleServiceImpl implements AccountRoleService {
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PermissionManager permissionManager;
    private final AuthSessionRepository authSessionRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final PasswordEncoder passwordEncoder;
    private static final String INSTRUCTOR_ROLE_CODE = "INSTRUCTOR";

    @Override
    @Transactional(readOnly = true)
    public List<AccountRoleResponse> getAccountRoles(Long accountId) {
        Account account = getAccountOrThrow(accountId);
        if (account.getRole() == null) return List.of();
        Role r = account.getRole();
        AccountRoleResponse res = new AccountRoleResponse();
        res.setRoleId(r.getId());
        res.setCode(r.getCode());
        res.setDescription(r.getDescription());
        return List.of(res);
    }

    @Override
    @Transactional
    public void assignRoleToAccount(Long accountId, AssignRoleRequest request) {
        Account account = getAccountOrThrow(accountId);
        Role oldRole = account.getRole();
        Role newRole = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        
        account.setRole(newRole);
        accountRepository.save(account);
        
        // Chỉ clear cache của Role (không còn cache theo Account)
        if (oldRole != null) {
            permissionManager.clearCacheByRole(oldRole.getId());
        }
        permissionManager.clearCacheByRole(newRole.getId());
        
        log.info("Gán role {} → {} cho account {}", oldRole != null ? oldRole.getCode() : "null", newRole.getCode(), accountId);
    }

    @Override
    @Transactional
    public void removeRoleFromAccount(Long accountId) {
        Account account = getAccountOrThrow(accountId);
        Role oldRole = account.getRole();
        
        account.setRole(null);
        accountRepository.save(account);
        
        if (oldRole != null) {
            permissionManager.clearCacheByRole(oldRole.getId());
        }
        
        log.info("Xóa role khỏi account {}", accountId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AccountResponse> getAccountsByRole(Long roleId, Pageable pageable) {
        if (!roleRepository.existsById(roleId)) throw new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại");
        return accountRepository.findByRoleIdPageable(roleId, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AccountResponse> searchAccounts(String roleCode, Boolean isActive, String search, Pageable pageable) {
        return accountRepository.searchAccounts(emptyToBlank(roleCode), isActive, emptyToBlank(search), pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getAccountById(Long accountId) {
        Account account = accountRepository.findByIdWithRoleAndProfile(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Account không tồn tại"));
        return toResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountResponse> getTeacherAccounts() {
        return accountRepository.findByRoleCode(INSTRUCTOR_ROLE_CODE).stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public void lockAccount(Long accountId, AccountLockRequest request) {
        Account account = getAccountOrThrow(accountId);
        boolean isLocked = Boolean.TRUE.equals(request.getIsLocked());
        account.setIsLocked(isLocked);
        if (isLocked) {
            account.setLockedUntil(null);
            String reasonText = "Admin khóa tài khoản: " + (request.getReason() != null && !request.getReason().isBlank() ? request.getReason() : "Không có lý do");
            authSessionRepository.revokeAllByAccountId(account.getId(), LocalDateTime.now(), reasonText);
            try {
                auditLogService.log("LOCK_ACCOUNT", "Account", accountId, "Admin khóa tài khoản: " + request.getReason());
            } catch (Exception e) {
                log.warn("[LockAccount] Audit log thất bại: {}", e.getMessage());
            }
            sendLockEmail(account, request.getReason());
        } else {
            account.setLockedUntil(null);
            account.setFailedLoginCount(0);
        }
        accountRepository.save(account);
    }

    @Override
    @Transactional
    public AccountResponse createAccount(AccountCreateRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (accountRepository.existsByEmail(email)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Email đã được sử dụng");
        }

        Role role = null;
        if (request.getRoleId() != null) {
            role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        } else if (request.getRoleCode() != null && !request.getRoleCode().isBlank()) {
            role = roleRepository.findByCode(request.getRoleCode().trim().toUpperCase())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        } else {
            role = roleRepository.findByCode("STUDENT")
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role mặc định STUDENT không tồn tại"));
        }

        Account account = new Account();
        account.setEmail(email);
        account.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        account.setProvider(AuthProvider.LOCAL);
        account.setRole(role);
        account.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        account.setIsLocked(false);
        account.setEmailVerifiedAt(LocalDateTime.now());

        UserProfile profile = new UserProfile();
        profile.setAccount(account);
        profile.setFullName(request.getFullName().trim());
        profile.setPhone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null);
        account.setUserProfile(profile);

        Account saved = accountRepository.save(account);

        try {
            auditLogService.log("CREATE_ACCOUNT", "Account", saved.getId(), "Admin tạo tài khoản mới: " + email + ", role=" + role.getCode());
        } catch (Exception e) {
            log.warn("[CreateAccount] Audit log thất bại: {}", e.getMessage());
        }

        return toResponse(saved);
    }

    @Override
    @Transactional
    public AccountResponse updateAccount(Long accountId, AccountUpdateRequest request) {
        Account account = accountRepository.findByIdWithRoleAndProfile(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Account không tồn tại"));

        if (request.getFullName() != null || request.getPhone() != null || request.getAvatarUrl() != null) {
            UserProfile profile = account.getUserProfile();
            if (profile == null) {
                profile = new UserProfile();
                profile.setAccount(account);
                account.setUserProfile(profile);
            }
            if (request.getFullName() != null && !request.getFullName().isBlank()) {
                profile.setFullName(request.getFullName().trim());
            }
            if (request.getPhone() != null) {
                profile.setPhone(request.getPhone().trim().isEmpty() ? null : request.getPhone().trim());
            }
            if (request.getAvatarUrl() != null) {
                profile.setAvatarUrl(request.getAvatarUrl().trim().isEmpty() ? null : request.getAvatarUrl().trim());
            }
        }

        if (request.getRoleId() != null) {
            Role oldRole = account.getRole();
            Role newRole = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));
            account.setRole(newRole);
            if (oldRole != null) {
                permissionManager.clearCacheByRole(oldRole.getId());
            }
            permissionManager.clearCacheByRole(newRole.getId());
        } else if (request.getRoleCode() != null && !request.getRoleCode().isBlank()) {
            Role oldRole = account.getRole();
            Role newRole = roleRepository.findByCode(request.getRoleCode().trim().toUpperCase())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));
            account.setRole(newRole);
            if (oldRole != null) {
                permissionManager.clearCacheByRole(oldRole.getId());
            }
            permissionManager.clearCacheByRole(newRole.getId());
        }

        if (request.getIsActive() != null) {
            account.setIsActive(request.getIsActive());
            if (!request.getIsActive()) {
                authSessionRepository.revokeAllByAccountId(accountId, LocalDateTime.now(), "Tài khoản bị vô hiệu hóa");
            }
        }

        Account saved = accountRepository.save(account);

        try {
            auditLogService.log("UPDATE_ACCOUNT", "Account", accountId, "Admin cập nhật tài khoản");
        } catch (Exception e) {
            log.warn("[UpdateAccount] Audit log thất bại: {}", e.getMessage());
        }

        return toResponse(saved);
    }

    @Override
    @Transactional
    public void resetPassword(Long accountId, AccountResetPasswordRequest request) {
        Account account = getAccountOrThrow(accountId);
        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        account.setPasswordChangedAt(LocalDateTime.now());
        authSessionRepository.revokeAllByAccountId(accountId, LocalDateTime.now(), "Admin đặt lại mật khẩu");
        accountRepository.save(account);

        try {
            auditLogService.log("RESET_PASSWORD", "Account", accountId, "Admin đặt lại mật khẩu cho tài khoản");
        } catch (Exception e) {
            log.warn("[ResetPassword] Audit log thất bại: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public void deleteAccount(Long accountId) {
        Account account = getAccountOrThrow(accountId);
        account.setDeletedAt(LocalDateTime.now());
        account.setIsActive(false);
        authSessionRepository.revokeAllByAccountId(accountId, LocalDateTime.now(), "Admin xóa tài khoản");
        accountRepository.save(account);

        try {
            auditLogService.log("DELETE_ACCOUNT", "Account", accountId, "Admin xóa tài khoản");
        } catch (Exception e) {
            log.warn("[DeleteAccount] Audit log thất bại: {}", e.getMessage());
        }
    }

    private Account getAccountOrThrow(Long accountId) {
        return accountRepository.findById(accountId).orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Account không tồn tại"));
    }

    private void sendLockEmail(Account acc, String reason) {
        try {
            String fullName = acc.getUserProfile() != null ? acc.getUserProfile().getFullName() : acc.getEmail();
            emailService.sendAccountLockedEmail(acc.getEmail(), fullName, reason, null);
        } catch (Exception e) {
            log.warn("[LockAccount] Gửi mail thất bại cho {}: {}", acc.getEmail(), e.getMessage());
        }
    }

    private String emptyToBlank(String s) {
        return (s == null || s.isBlank()) ? "" : s.trim();
    }

    private AccountResponse toResponse(Account a) {
        AccountResponse res = new AccountResponse();
        res.setAccountId(a.getId());
        res.setEmail(a.getEmail());
        if (a.getRole() != null) {
            res.setRoleId(a.getRole().getId());
            res.setRoleCode(a.getRole().getCode());
        }
        if (a.getUserProfile() != null) {
            res.setFullName(a.getUserProfile().getFullName());
            res.setPhone(a.getUserProfile().getPhone());
            res.setAvatarUrl(a.getUserProfile().getAvatarUrl());
        }
        res.setIsActive(a.getIsActive());
        res.setIsLocked(a.getIsLocked());
        res.setEmailVerifiedAt(a.getEmailVerifiedAt());
        res.setLastLoginAt(a.getLastLoginAt());
        res.setLockedUntil(a.getLockedUntil());
        res.setCreatedAt(a.getCreatedAt());
        res.setUpdatedAt(a.getUpdatedAt());
        return res;
    }
}
