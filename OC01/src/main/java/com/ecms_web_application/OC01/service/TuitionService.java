package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.tuition.CancelInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.ExtendInvoiceDueDateRequest;
import com.ecms_web_application.OC01.dto.request.tuition.RefundInvoiceRequest;
import com.ecms_web_application.OC01.dto.response.tuition.InvoiceResponse;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TuitionService {
    InvoiceResponse createOfflineInvoice(CreateInvoiceRequest request);
    InvoiceResponse createOnlineCheckoutInvoice(Long courseId);
    Page<InvoiceResponse> search(InvoiceType type, InvoiceStatus status, Long courseId,
                                 Long studentId, Long accountId, Long leadId, String search, Pageable pageable);
    InvoiceResponse getById(Long invoiceId);
    InvoiceResponse confirmCashPayment(Long invoiceId);
    InvoiceResponse extendDueDate(Long invoiceId, ExtendInvoiceDueDateRequest request);
    InvoiceResponse cancel(Long invoiceId, CancelInvoiceRequest request);
    InvoiceResponse refund(Long invoiceId, RefundInvoiceRequest request);
}
