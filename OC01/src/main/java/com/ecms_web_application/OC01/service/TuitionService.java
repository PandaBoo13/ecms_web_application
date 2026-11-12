package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.tuition.CancelInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceFromStudentRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.ExtendInvoiceDueDateRequest;
import com.ecms_web_application.OC01.dto.request.tuition.RefundInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.OnlineCheckoutRequest;
import com.ecms_web_application.OC01.dto.response.tuition.CreateInvoiceFromLeadResponse;
import com.ecms_web_application.OC01.dto.response.tuition.EligibleLeadResponse;
import com.ecms_web_application.OC01.dto.response.tuition.InvoiceResponse;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TuitionService {
    InvoiceResponse createOfflineInvoice(CreateInvoiceRequest request);
    InvoiceResponse createOnlineCheckoutInvoice(Long courseId, OnlineCheckoutRequest request);
    Page<InvoiceResponse> search(InvoiceType type, InvoiceStatus status, CourseType courseType, Long courseId,
                                 Long studentId, Long accountId, Long leadId, String search, Pageable pageable);
    InvoiceResponse getById(Long invoiceId);
    InvoiceResponse confirmCashPayment(Long invoiceId, String proofUrl);
    InvoiceResponse confirmBankTransferPayment(Long invoiceId, String transactionReference, String proofUrl);
    InvoiceResponse extendDueDate(Long invoiceId, ExtendInvoiceDueDateRequest request);
    InvoiceResponse cancel(Long invoiceId, CancelInvoiceRequest request);
    InvoiceResponse refund(Long invoiceId, RefundInvoiceRequest request);

    /** Danh sách lead đã tư vấn, chưa có hóa đơn học phí đang mở. */
    Page<EligibleLeadResponse> searchEligibleLeads(String search, Pageable pageable);

    /** Tạo hóa đơn offline từ lead (số tiền lấy từ Course.price) và xử lý theo phương thức thanh toán. */
    CreateInvoiceFromLeadResponse createInvoiceFromLead(CreateInvoiceFromLeadRequest request);

    /** Tạo hóa đơn offline cho học viên hiện có (học viên cũ đăng ký thêm khóa). */
    CreateInvoiceFromLeadResponse createInvoiceFromStudent(CreateInvoiceFromStudentRequest request);
}
