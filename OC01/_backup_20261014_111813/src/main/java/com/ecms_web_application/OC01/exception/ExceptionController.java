package com.ecms_web_application.OC01.exception;//package org.wisdom.oc01.exception;
//
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.ControllerAdvice;
//import org.springframework.web.bind.annotation.ExceptionHandler;
//import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
//
///**
// * Lớp xử lý ngoại lệ toàn cục trong ứng dụng.
// * Sử dụng `@ControllerAdvice` để áp dụng xử lý ngoại lệ cho toàn bộ controller.
// */
//@ControllerAdvice
//public class ExceptionController extends ResponseEntityExceptionHandler {
//
//    /**
//     * Xử lý ngoại lệ `ErrorHandler` tùy chỉnh.
//     * Khi một ngoại lệ `ErrorHandler` được ném ra, phương thức này sẽ bắt và trả về phản hồi lỗi thích hợp.
//     *
//     * @param e Ngoại lệ `ErrorHandler` chứa thông tin lỗi và HTTP status.
//     * @return ResponseEntity chứa thông tin lỗi theo chuẩn `ExceptionResponse`.
//     */
//    @ExceptionHandler(ErrorHandler.class)
//    public ResponseEntity<ExceptionResponse> handleErrorHandlerException(ErrorHandler e) {
//        // Lấy mã trạng thái từ ngoại lệ hoặc mặc định là INTERNAL_SERVER_ERROR
//        HttpStatus status = e.getStatus() != null ? e.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
//
//        // Trả về phản hồi với mã trạng thái và thông tin lỗi
//        return ResponseEntity.status(status).body(new ExceptionResponse(e.getMessage()));
//    }
//}
