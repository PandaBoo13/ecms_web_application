package com.ecms_web_application.OC01.service.handler;

import com.ecms_web_application.OC01.entity.enums.RequestType;
import org.springframework.stereotype.Component;

/**
 * Fallback handler — dùng cho loại request không cần side-effect.
 *
 * Áp dụng cho: SUPPORT_TICKET, FEEDBACK, BUG_REPORT,
 *              FEATURE_REQUEST, LEAVE_REQUEST, OVERTIME_REQUEST...
 *
 * Không làm gì khi approve/reject — chỉ đổi status.
 * Payload/response_data được xử lý ở tầng Service.
 */
@Component
public class GenericHandler implements RequestHandler {

    @Override
    public RequestType supportedType() {
        return null;   // không đăng ký vào registry — chỉ dùng làm fallback
    }
}