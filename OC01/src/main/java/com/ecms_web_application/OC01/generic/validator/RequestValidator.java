package com.ecms_web_application.OC01.generic.validator;

import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.HashMap;

/**
 * Validator cho Request — KHÔNG truy cập DB.
 *
 * Trách nhiệm:
 *  1. Validate format-level (title not blank, target consistency, note bắt buộc khi reject)
 *  2. Normalize payload null → empty map
 *
 * KHÔNG làm:
 *  - Check target entity tồn tại trong DB (đó là việc của Handler.validateCreate)
 *  - Check payload có đủ field riêng (Handler tự làm)
 *  - Check role (đó là việc của Service.assertCanApprove)
 *
 * Pattern: giống AuthValidator / CourseValidator / SessionValidator của project.
 */
@Slf4j
@Component
public class RequestValidator {

    private static final int MAX_NOTE_LENGTH = 2000;
    private static final int MAX_TITLE_LENGTH = 255;
    private static final int MAX_DESCRIPTION_LENGTH = 5000;

    // ============================================================
    // VALIDATE: CREATE
    // ============================================================
    /**
     * @param req  payload từ requester
     * @param type enum đã convert từ service (đã validate RequestType.fromCode)
     */
    public void validateForCreate(RequestCreateRequest req, RequestType type) {

        // 1. Title bắt buộc
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Tiêu đề yêu cầu không được để trống");
        }
        if (req.getTitle().length() > MAX_TITLE_LENGTH) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Tiêu đề tối đa " + MAX_TITLE_LENGTH + " ký tự");
        }

        // 2. Description (optional, giới hạn độ dài)
        if (req.getDescription() != null
                && req.getDescription().length() > MAX_DESCRIPTION_LENGTH) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Mô tả tối đa " + MAX_DESCRIPTION_LENGTH + " ký tự");
        }

        // 3. Target consistency với RequestType
        String expectedTargetType = type.getTargetEntityType();
        boolean expectsTarget = !"NONE".equals(expectedTargetType);

        if (expectsTarget && req.getTargetEntityId() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Loại '" + type.getCode() + "' bắt buộc có targetEntityId (entity: "
                            + expectedTargetType + ")");
        }
        if (!expectsTarget && req.getTargetEntityId() != null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Loại '" + type.getCode() + "' không gắn entity, "
                            + "không được gửi targetEntityId");
        }

        // 4. Normalize payload — không throw, default empty
        if (req.getPayload() == null) {
            req.setPayload(new HashMap<>());
            log.debug("[RequestValidator] payload null → default empty cho type={}",
                    type.getCode());
        }
    }

    // ============================================================
    // VALIDATE: REVIEW
    // ============================================================
    /**
     * @param req payload từ approver (approve hoặc reject)
     */
    public void validateForReview(RequestReviewRequest req) {

        // 1. approved bắt buộc
        if (req.getApproved() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Trường 'approved' không được để trống");
        }

        // 2. Nếu reject → note bắt buộc
        if (!req.getApproved()) {
            if (req.getNote() == null || req.getNote().isBlank()) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Lý do từ chối là bắt buộc khi approved = false");
            }
            if (req.getNote().length() > MAX_NOTE_LENGTH) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Lý do từ chối tối đa " + MAX_NOTE_LENGTH + " ký tự");
            }
        }
    }

    // ============================================================
    // VALIDATE: CANCEL
    // ============================================================
    public void validateForCancel(boolean isRequester) {
        if (!isRequester) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN,
                    "Chỉ người tạo yêu cầu mới được hủy");
        }
    }
}