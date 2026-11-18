package com.ecms_web_application.OC01.service.handler;

import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.dto.request.tuition.SubmitRefundApprovalRequest;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.service.TuitionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

@Slf4j
@Component
public class InvoiceRefundHandler implements RequestHandler {

    private final TuitionService tuitionService;

    // @Lazy phá vỡ chu trình: InvoiceRefundHandler -> TuitionServiceImpl -> EnrollmentServiceImpl
    //                       -> RequestServiceImpl -> RequestHandlerRegistry -> InvoiceRefundHandler
    @Autowired
    public InvoiceRefundHandler(@Lazy TuitionService tuitionService) {
        this.tuitionService = tuitionService;
    }

    @Override
    public RequestType supportedType() {
        return RequestType.INVOICE_REFUND;
    }

    @Override
    public void validateCreate(RequestCreateRequest req, RequestType type) {
        if (req.getTargetEntityId() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu ID hóa đơn cần hoàn tiền");
        }
        SubmitRefundApprovalRequest approvalRequest = toApprovalRequest(req.getPayload());
        tuitionService.validateRefundApprovalRequest(req.getTargetEntityId(), approvalRequest);
    }

    @Override
    public void onApprove(Request request, RequestReviewRequest review) {
        // Phê duyệt yêu cầu hoàn tiền; việc hoàn tiền thủ công và ghi nhận chứng từ
        // được thực hiện ở bước riêng sau khi được duyệt.
        log.info("[InvoiceRefundHandler] Đã phê duyệt yêu cầu hoàn tiền {} cho hóa đơn {}",
                request.getRequestCode(), request.getTargetEntityId());
    }

    @Override
    public void onReject(Request request, RequestReviewRequest review) {
        log.info("[InvoiceRefundHandler] Từ chối yêu cầu hoàn tiền {} cho hóa đơn {}, lý do: {}",
                request.getRequestCode(), request.getTargetEntityId(),
                review != null ? review.getNote() : null);
    }

    private SubmitRefundApprovalRequest toApprovalRequest(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu thông tin yêu cầu hoàn tiền");
        }
        SubmitRefundApprovalRequest req = new SubmitRefundApprovalRequest();
        req.setAmount(toBigDecimal(payload.get("amount")));
        Object reason = payload.get("reason");
        req.setReason(reason == null ? null : String.valueOf(reason));
        return req;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return null;
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException ex) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Số tiền dự kiến hoàn không hợp lệ");
        }
    }
}
