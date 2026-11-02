package com.ecms_web_application.OC01.dto.request.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

/**
 * Payload khi approver duyệt / từ chối.
 *  - approved = true  → set status APPROVED + Handler.onApprove
 *  - approved = false → bắt buộc note, set status REJECTED + Handler.onReject
 */
@Getter
@Setter
public class RequestReviewRequest {

    @NotNull(message = "approved không được để trống")
    private Boolean approved;

    /** Bắt buộc khi approved = false (service validate) */
    private String note;

    /** Dữ liệu trả về tuỳ loại request (reply, action_taken, ...) */
    private Map<String, Object> responseData;
}