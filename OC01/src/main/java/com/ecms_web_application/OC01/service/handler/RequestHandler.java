package com.ecms_web_application.OC01.service.handler;

import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;

/**
 * Handler cho 1 loại request cụ thể.
 *
 * Lifecycle:
 *   validateCreate → onCreate → onApprove / onReject / onCancel
 *
 * Mỗi Handler chịu trách nhiệm:
 *  - validateCreate : validate payload + state target (query DB)
 *  - onCreate       : side-effect NGAY khi request vừa save — đồng bộ state
 *                     (vd course.status: DRAFT → PENDING_REVIEW)
 *  - onApprove      : side-effect khi duyệt
 *  - onReject       : side-effect khi từ chối
 *  - onCancel       : side-effect khi requester tự hủy
 *
 * Add loại request mới → tạo 1 class implements interface này.
 */
public interface RequestHandler {

    /**
     * Loại request mà handler này phụ trách.
     * Trả null → GenericHandler (không đăng ký vào registry).
     */
    RequestType supportedType();

    /** Validate khi requester tạo request — CÓ THỂ query DB. */
    default void validateCreate(RequestCreateRequest req, RequestType type) { }

    /**
     * Side-effect NGAY khi tạo request (sau save, cùng transaction).
     * Dùng để đồng bộ state: vd course.status: DRAFT → PENDING_REVIEW.
     *
     * Nếu throw → rollback toàn bộ (request không được tạo).
     */
    default void onCreate(Request request, RequestCreateRequest req) { }

    /** Side-effect khi duyệt — chạy trong cùng transaction với update status. */
    default void onApprove(Request request, RequestReviewRequest review) { }

    /** Side-effect khi từ chối. */
    default void onReject(Request request, RequestReviewRequest review) { }

    /** Side-effect khi requester tự hủy. */
    default void onCancel(Request request) { }
}