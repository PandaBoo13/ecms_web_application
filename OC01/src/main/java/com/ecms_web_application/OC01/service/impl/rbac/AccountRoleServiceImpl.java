package com.ecms_web_application.OC01.service.impl.rbac;

import com.ecms_web_application.OC01.config.security.PermissionManager;
import com.ecms_web_application.OC01.dto.request.AccountLockRequest;
import com.ecms_web_application.OC01.dto.request.rbac.AssignRoleRequest;
import com.ecms_web_application.OC01.dto.response.rbac.AccountResponse;
import com.ecms_web_application.OC01.dto.response.rbac.AccountRoleResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Role;
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