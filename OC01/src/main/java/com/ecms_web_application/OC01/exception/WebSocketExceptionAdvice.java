// src/main/java/org/wisdom/oc01/exception/WebSocketExceptionAdvice.java
package org.wisdom.oc01.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.web.bind.annotation.ControllerAdvice;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

/**
 * Xử lý exception trong WebSocket STOMP
 *
 * ⚠️ KHÁC với GlobalExceptionHandler (dùng cho REST API):
 * - GlobalExceptionHandler: @RestControllerAdvice + @ExceptionHandler + ResponseEntity
 * - WebSocketExceptionAdvice: @ControllerAdvice + @MessageExceptionHandler + @SendToUser
 *
 * Cơ chế:
 *   FE publish frame → Backend @MessageMapping throw exception
 *   → @MessageExceptionHandler catch
 *   → @SendToUser("/queue/errors") gửi về user đã gọi
 *   → FE subscribe /user/queue/errors → nhận error
 */
@Slf4j
@ControllerAdvice
public class WebSocketExceptionAdvice {

    // ==================== LỖI LOGIC (từ Service) ====================

    /**
     * Bắt ErrorHandler — custom exception của bạn
     * Gửi về user đã gọi qua /user/queue/errors
     */
    @MessageExceptionHandler(ErrorHandler.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleErrorHandler(ErrorHandler ex, Principal principal) {
        String username = principal != null ? principal.getName() : "unknown";
        log.warn("⚠️ [WS] ErrorHandler cho user {}: {} - {}",
                username, ex.getStatus(), ex.getMessage());

        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getMessage());
        error.put("status", ex.getStatus() != null ? ex.getStatus().value() : 500);
        error.put("type", "ErrorHandler");
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }

    // ==================== LỖI PHÂN QUYỀN ====================

    @MessageExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException ex,
            Principal principal) {
        String username = principal != null ? principal.getName() : "unknown";
        log.warn("⚠️ [WS] AccessDenied cho user {}: {}", username, ex.getMessage());

        Map<String, Object> error = new HashMap<>();
        error.put("message", "Bạn không có quyền thực hiện hành động này");
        error.put("status", 403);
        error.put("type", "AccessDenied");
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }

    // ==================== LỖI VALIDATION ====================

    @MessageExceptionHandler(org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleValidation(
            org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException ex,
            Principal principal) {
        String username = principal != null ? principal.getName() : "unknown";
        log.warn("⚠️ [WS] Validation error cho user {}: {}", username, ex.getMessage());

        Map<String, Object> error = new HashMap<>();
        error.put("message", "Dữ liệu không hợp lệ: " + ex.getMessage());
        error.put("status", 400);
        error.put("type", "Validation");
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }

    // ==================== LỖI CHUNG ====================

    /**
     * Catch tất cả exception khác
     * Đảm bảo không có exception nào "rơi vào hư không"
     */
    @MessageExceptionHandler(Exception.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleGeneric(Exception ex, Principal principal) {
        String username = principal != null ? principal.getName() : "unknown";
        log.error("❌ [WS] Unhandled exception cho user {}: ", username, ex);

        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getMessage() != null ? ex.getMessage() : "Đã có lỗi xảy ra");
        error.put("status", 500);
        error.put("type", ex.getClass().getSimpleName());
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }
}