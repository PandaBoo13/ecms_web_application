package com.ecms_web_application.OC01.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ============================================================
    // NGUYÊN TẮC:
    // - Message cho user: PHÂN LOẠI rõ (hệ thống / quyền / dữ liệu...)
    // - Chi tiết kỹ thuật: chỉ ghi vào LOG cho dev
    // - KHÔNG leak: tên exception, stack, endpoint, param name...
    // ============================================================

    // ==================== LỖI NGHIỆP VỤ (từ Service throw) ====================
    // Message do Service viết → giữ nguyên (đã thân thiện)
    @ExceptionHandler(ErrorHandler.class)
    public ResponseEntity<ExceptionResponse> handleErrorHandler(ErrorHandler ex) {
        log.warn("Business error: {} - {}", ex.getStatus(), ex.getMessage());

        ExceptionResponse response = new ExceptionResponse(ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 400 - DỮ LIỆU GỬI LÊN SAI ====================
    // Giữ tên field để user biết cần sửa gì
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ExceptionResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));

        log.warn("Validation error: {}", message);

        ExceptionResponse response = new ExceptionResponse(message);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 400 - CONSTRAINTS ====================
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ExceptionResponse> handleConstraintViolation(
            ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining(", "));

        log.warn("Constraint violation: {}", message);

        ExceptionResponse response = new ExceptionResponse(message);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 400 - BODY KHÔNG ĐỌC ĐƯỢC ====================
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ExceptionResponse> handleNotReadable(
            HttpMessageNotReadableException ex) {
        log.warn("400 Not readable: {}", ex.getMessage());

        ExceptionResponse response = new ExceptionResponse(
                "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại."
        );
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 400 - THIẾU THAM SỐ ====================
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ExceptionResponse> handleMissingParam(
            MissingServletRequestParameterException ex) {
        log.warn("400 Missing param: {}", ex.getParameterName());

        ExceptionResponse response = new ExceptionResponse(
                "Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại."
        );
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 401 - CHƯA ĐĂNG NHẬP ====================
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ExceptionResponse> handleBadCredentialsException(BadCredentialsException ex) {
        log.warn("Bad credentials: {}", ex.getMessage());

        ExceptionResponse response = new ExceptionResponse(
                "Tên đăng nhập hoặc mật khẩu không đúng."
        );
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 403 - KHÔNG CÓ QUYỀN ====================
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ExceptionResponse> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());

        ExceptionResponse response = new ExceptionResponse(
                "Bạn không có quyền thực hiện hành động này."
        );
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 404 - KHÔNG TÌM THẤY ====================
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ExceptionResponse> handleNoResourceFoundException(NoResourceFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());

        ExceptionResponse response = new ExceptionResponse(
                "Không tìm thấy thông tin yêu cầu."
        );
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ExceptionResponse> handleNoHandlerFound(NoHandlerFoundException ex) {
        log.warn("404 No handler: {} {}", ex.getHttpMethod(), ex.getRequestURL());

        ExceptionResponse response = new ExceptionResponse(
                "Đường dẫn không tồn tại."
        );
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 405 - HÀNH ĐỘNG KHÔNG HỖ TRỢ ====================
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ExceptionResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex) {
        log.warn("405 Method not supported: {} (supported: {})",
                ex.getMethod(), ex.getSupportedHttpMethods());

        ExceptionResponse response = new ExceptionResponse(
                "Hành động này không được hệ thống hỗ trợ."
        );
        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 409 - DỮ LIỆU TRÙNG ====================
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ExceptionResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String message = "Dữ liệu không hợp lệ.";
        String errorMsg = ex.getMostSpecificCause().getMessage();

        // ✅ Vẫn giữ phân loại cụ thể cho các trường hợp phổ biến
        if (errorMsg != null) {
            if (errorMsg.contains("Duplicate entry") && errorMsg.contains("slug")) {
                message = "Slug đã tồn tại. Vui lòng đổi tên khác.";
            } else if (errorMsg.contains("Duplicate entry") && errorMsg.contains("name")) {
                message = "Tên đã tồn tại.";
            } else if (errorMsg.contains("Duplicate entry")) {
                message = "Dữ liệu đã tồn tại trong hệ thống.";
            } else if (errorMsg.contains("foreign key constraint")) {
                message = "Dữ liệu đang được sử dụng, không thể thay đổi.";
            }
        }

        log.error("Data integrity violation: {}", errorMsg);

        ExceptionResponse response = new ExceptionResponse(message);
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 415 - ĐỊNH DẠNG KHÔNG HỖ TRỢ ====================
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ExceptionResponse> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex) {
        log.warn("415 Unsupported media type: {} (supported: {})",
                ex.getContentType(), ex.getSupportedMediaTypes());

        ExceptionResponse response = new ExceptionResponse(
                "Định dạng dữ liệu không được hỗ trợ."
        );
        return ResponseEntity
                .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 500 - LỖI XỬ LÝ RESPONSE ====================
    @ExceptionHandler(HttpMessageNotWritableException.class)
    public ResponseEntity<ExceptionResponse> handleHttpMessageNotWritableException(HttpMessageNotWritableException ex) {
        log.error("HttpMessageNotWritableException: {}", ex.getMessage());

        ExceptionResponse response = new ExceptionResponse(
                "Lỗi hệ thống. Vui lòng thử lại sau."
        );
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // ==================== 500 - LỖI HỆ THỐNG CHUNG ====================
    // Đây là handler quan trọng nhất
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ExceptionResponse> handleGenericException(Exception ex) {
        // Log đầy đủ stack trace cho dev
        log.error("Unhandled exception: ", ex);

        // Response thân thiện — user biết là lỗi hệ thống
        ExceptionResponse response = new ExceptionResponse(
                "Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
        );
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }
}