package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.tuition.CancelInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.tuition.ExtendInvoiceDueDateRequest;
import com.ecms_web_application.OC01.dto.request.tuition.RefundInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.SubmitRefundApprovalRequest;
import com.ecms_web_application.OC01.dto.request.tuition.OnlineCheckoutRequest;
import com.ecms_web_application.OC01.dto.response.request.RequestDetailResponse;
import com.ecms_web_application.OC01.dto.response.tuition.RefundApprovalStatusResponse;
import com.ecms_web_application.OC01.dto.response.tuition.CreateInvoiceFromLeadResponse;
import com.ecms_web_application.OC01.dto.response.tuition.EligibleLeadResponse;
import com.ecms_web_application.OC01.dto.response.tuition.InvoiceResponse;
import com.ecms_web_application.OC01.dto.response.tuition.PublicCheckoutResponse;
import com.ecms_web_application.OC01.dto.response.tuition.TuitionInvoiceStatsResponse;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TuitionService {
    InvoiceResponse createOnlineCheckoutInvoice(Long courseId, OnlineCheckoutRequest request);
    /** Checkout công khai cho khách chưa có tài khoản; trả về token thanh toán có chữ ký. */
    PublicCheckoutResponse createPublicOnlineCheckout(Long courseId, OnlineCheckoutRequest request);
    Page<InvoiceResponse> search(InvoiceType type, InvoiceStatus status, CourseType courseType, Long courseId,
                                 Long studentId, Long leadId, String search, boolean refundable,
                                 Pageable pageable);
    InvoiceResponse getById(Long invoiceId);

    /** Thống kê số lượng hóa đơn học phí theo trạng thái (1 query, dùng cho các thẻ số liệu). */
    TuitionInvoiceStatsResponse getStats();
    InvoiceResponse confirmCashPayment(Long invoiceId, String proofUrl);
    InvoiceResponse confirmBankTransferPayment(Long invoiceId, String transactionReference, String proofUrl);
    InvoiceResponse extendDueDate(Long invoiceId, ExtendInvoiceDueDateRequest request);
    InvoiceResponse cancel(Long invoiceId, CancelInvoiceRequest request);

    /** Gửi yêu cầu duyệt hoàn tiền (chưa thực hiện hoàn tiền thủ công). */
    RequestDetailResponse submitRefundApprovalRequest(Long invoiceId, SubmitRefundApprovalRequest request);

    /** Kiểm tra đủ điều kiện gửi yêu cầu duyệt hoàn tiền. */
    void validateRefundApprovalRequest(Long invoiceId, SubmitRefundApprovalRequest request);

    /** Trạng thái yêu cầu duyệt hoàn tiền của hóa đơn. */
    RefundApprovalStatusResponse getRefundApprovalStatus(Long invoiceId);

    /** Ghi nhận hoàn tiền đã thực hiện thủ công (yêu cầu phải được duyệt). */
    InvoiceResponse recordApprovedRefund(Long invoiceId, RefundInvoiceRequest request);

    /** Danh sách lead đã tư vấn, chưa có hóa đơn học phí đang mở. */
    Page<EligibleLeadResponse> searchEligibleLeads(String search, Pageable pageable);

    /** Tạo hóa đơn offline từ lead (số tiền lấy từ Course.price) và xử lý theo phương thức thanh toán. */
    CreateInvoiceFromLeadResponse createInvoiceFromLead(CreateInvoiceFromLeadRequest request);
}
