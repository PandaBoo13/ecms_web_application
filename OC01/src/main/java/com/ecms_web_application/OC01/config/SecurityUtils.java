package com.ecms_web_application.OC01.config;

import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Nguồn duy nhất đọc SecurityContext.
 * - get*(): trả null nếu chưa đăng nhập (dùng cho filter/aspect).
 * - require*(): throw 401 nếu chưa đăng nhập (dùng cho service/controller).
 */
public final class SecurityUtils {

    private SecurityUtils() {}

    /** Trả null nếu chưa đăng nhập. */
    public static Account getCurrentAccount() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        Object principal = auth.getPrincipal();
        // Account đã implements UserDetails → cast trực tiếp
        if (principal instanceof Account acc) return acc;
        return null;
    }

    /** Throw 401 nếu chưa đăng nhập. */
    public static Account requireCurrentAccount() {
        Account account = getCurrentAccount();
        if (account == null) {
            throw new ErrorHandler(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        return account;
    }

    /** Trả null nếu chưa đăng nhập. */
    public static Long getCurrentAccountId() {
        Account account = getCurrentAccount();
        return account != null ? account.getId() : null;
    }

    /** Throw 401 nếu chưa đăng nhập. */
    public static Long requireCurrentAccountId() {
        return requireCurrentAccount().getId();
    }

    /** Trả null nếu chưa đăng nhập. */
    public static String getCurrentEmail() {
        Account account = getCurrentAccount();
        return account != null ? account.getEmail() : null;
    }

    /** Kiểm tra account hiện tại có role cụ thể không. */
    public static boolean hasRole(String roleCode) {
        Account account = getCurrentAccount();
        if (account == null || account.getRole() == null) return false;
        return account.getRole().getCode().equalsIgnoreCase(roleCode);
    }

    /** Kiểm tra đã đăng nhập chưa. */
    public static boolean isAuthenticated() {
        return getCurrentAccount() != null;
    }
}