//package com.ecms_web_application.OC01.generic.validator;
//
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.http.HttpStatus;
//import org.springframework.stereotype.Component;
//import org.wisdom.oc01.entity.Request;
//import org.wisdom.oc01.exception.ErrorHandler;
//
//@Slf4j
//@Component
//public class RequestValidator {
//
//    /**
//     * Validate trước khi approve/reject.
//     */
//    public void validateForProcess(Request request, Boolean approved, String reason) {
//        if (request == null) {
//            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Yêu cầu không tồn tại");
//        }
//        if (!request.isPending()) {
//            throw new ErrorHandler(HttpStatus.CONFLICT,
//                    "Yêu cầu đã được xử lý rồi");
//        }
//        if (approved == null) {
//            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
//                    "Trạng thái duyệt là bắt buộc");
//        }
//        if (Boolean.FALSE.equals(approved)
//                && (reason == null || reason.isBlank())) {
//            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
//                    "Lý do từ chối là bắt buộc");
//        }
//        if (reason != null && reason.length() > 500) {
//            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
//                    "Lý do tối đa 500 ký tự");
//        }
//    }
//
//    /**
//     * Validate khi user tự hủy yêu cầu.
//     */
//    public void validateForCancel(Request request, Long currentAccountId) {
//        if (request == null) {
//            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Yêu cầu không tồn tại");
//        }
//        if (!request.getSender().getId().equals(currentAccountId)) {
//            throw new ErrorHandler(HttpStatus.FORBIDDEN,
//                    "Bạn không phải người gửi yêu cầu này");
//        }
//        if (!request.isPending()) {
//            throw new ErrorHandler(HttpStatus.CONFLICT,
//                    "Chỉ hủy được yêu cầu đang chờ xử lý");
//        }
//    }
//}