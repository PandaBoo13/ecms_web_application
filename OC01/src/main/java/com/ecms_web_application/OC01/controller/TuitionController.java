package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.tuition.CancelInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CashConfirmationRequest;
import com.ecms_web_application.OC01.dto.request.tuition.BankTransferConfirmationRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceFromStudentRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.ExtendInvoiceDueDateRequest;
import com.ecms_web_application.OC01.dto.request.tuition.OnlineCheckoutRequest;
import com.ecms_web_application.OC01.dto.request.tuition.RefundInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.SendPaymentLinkRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.service.TuitionService;
import com.ecms_web_application.OC01.service.impl.tuition.TuitionPaymentLinkService;
import com.ecms_web_application.OC01.service.impl.tuition.VnpayGatewayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tuition/invoices")
@RequiredArgsConstructor
public class TuitionController {
    private final TuitionService tuitionService;
    private final TuitionPaymentLinkService paymentLinkService;
    private final VnpayGatewayService vnpayGatewayService;

    @PostMapping
    public ResponseEntity<RequestResponse> createOffline(@Valid @RequestBody CreateInvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse(
                tuitionService.createOfflineInvoice(request), "Tạo hóa đơn học phí thành công"));
    }

    @PostMapping("/checkout")
    public ResponseEntity<RequestResponse> checkoutOnline(@RequestParam Long courseId,
                                                           @Valid @RequestBody OnlineCheckoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse(
                tuitionService.createOnlineCheckoutInvoice(courseId, request), "Tạo hóa đơn thanh toán thành công"));
    }

    /** Danh sách lead đã tư vấn, chưa có hóa đơn học phí đang mở. */
    @GetMapping("/eligible-leads")
    public ResponseEntity<RequestResponse> eligibleLeads(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
        return ResponseEntity.ok(new RequestResponse(
                tuitionService.searchEligibleLeads(search, pageable),
                "Lấy danh sách lead chờ tạo hóa đơn thành công"));
    }

    /** Tạo hóa đơn học phí từ lead (số tiền lấy từ Course.price). */
    @PostMapping("/from-lead")
    public ResponseEntity<RequestResponse> createFromLead(
            @Valid @RequestBody CreateInvoiceFromLeadRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse(
                tuitionService.createInvoiceFromLead(request), "Tạo hóa đơn học phí thành công"));
    }

    /** Tạo hóa đơn học phí cho học viên hiện có (học viên cũ đăng ký thêm khóa). */
    @PostMapping("/from-student")
    public ResponseEntity<RequestResponse> createFromStudent(
            @Valid @RequestBody CreateInvoiceFromStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse(
                tuitionService.createInvoiceFromStudent(request), "Tạo hóa đơn học phí thành công"));
    }

    /** Gửi (hoặc gửi lại) link thanh toán qua email cho hóa đơn PENDING. Email được gửi nền sau commit. */
    @PostMapping("/{invoiceId}/payment-link")
    public ResponseEntity<RequestResponse> sendPaymentLink(
            @PathVariable Long invoiceId,
            @Valid @RequestBody(required = false) SendPaymentLinkRequest request) {
        String email = request != null ? request.getEmail() : null;
        return ResponseEntity.ok(new RequestResponse(paymentLinkService.queuePaymentLink(invoiceId, email),
                "Đã tạo link thanh toán và xếp hàng gửi email"));
    }

    @PostMapping("/{invoiceId}/vnpay")
    public ResponseEntity<RequestResponse> createVnpayPayment(
            @PathVariable Long invoiceId, jakarta.servlet.http.HttpServletRequest request) {
        String paymentUrl = vnpayGatewayService.createPaymentUrl(invoiceId, request.getRemoteAddr());
        return ResponseEntity.ok(new RequestResponse(java.util.Map.of("paymentUrl", paymentUrl),
                "Tạo liên kết thanh toán VNPAY thành công"));
    }

    @GetMapping
    public ResponseEntity<RequestResponse> search(
            @RequestParam(required = false) InvoiceType type,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) CourseType courseType,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long leadId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean refundable,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        return ResponseEntity.ok(new RequestResponse(
                tuitionService.search(type, status, courseType, courseId, studentId, leadId, search,
                        refundable, pageable),
                "Lấy danh sách hóa đơn thành công"));
    }

    /** Thống kê số lượng hóa đơn học phí theo trạng thái — 1 query thay cho 5 lần gọi danh sách. */
    @GetMapping("/stats")
    public ResponseEntity<RequestResponse> stats() {
        return ResponseEntity.ok(new RequestResponse(tuitionService.getStats(),
                "Lấy thống kê hóa đơn thành công"));
    }

    @GetMapping("/{invoiceId}")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long invoiceId) {
        return ResponseEntity.ok(new RequestResponse(tuitionService.getById(invoiceId),
                "Lấy hóa đơn thành công"));
    }

    @PostMapping("/{invoiceId}/cash-confirmation")
    public ResponseEntity<RequestResponse> confirmCash(
            @PathVariable Long invoiceId,
            @RequestBody(required = false) CashConfirmationRequest request) {
        String proofUrl = request != null ? request.getProofUrl() : null;
        return ResponseEntity.ok(new RequestResponse(tuitionService.confirmCashPayment(invoiceId, proofUrl),
                "Xác nhận thu tiền mặt thành công"));
    }

    @PostMapping("/{invoiceId}/bank-transfer-confirmation")
    public ResponseEntity<RequestResponse> confirmBankTransfer(
            @PathVariable Long invoiceId,
            @Valid @RequestBody BankTransferConfirmationRequest request) {
        return ResponseEntity.ok(new RequestResponse(tuitionService.confirmBankTransferPayment(
                invoiceId, request.getTransactionReference(), request.getProofUrl()),
                "Xác nhận chuyển khoản thành công"));
    }

    @PatchMapping("/{invoiceId}/due-date")
    public ResponseEntity<RequestResponse> extendDueDate(
            @PathVariable Long invoiceId,
            @Valid @RequestBody ExtendInvoiceDueDateRequest request) {
        return ResponseEntity.ok(new RequestResponse(tuitionService.extendDueDate(invoiceId, request),
                "Gia hạn hóa đơn thành công"));
    }

    @PostMapping("/{invoiceId}/cancel")
    public ResponseEntity<RequestResponse> cancel(
            @PathVariable Long invoiceId,
            @Valid @RequestBody CancelInvoiceRequest request) {
        return ResponseEntity.ok(new RequestResponse(tuitionService.cancel(invoiceId, request),
                "Hủy hóa đơn thành công"));
    }

    @PostMapping("/{invoiceId}/refund")
    public ResponseEntity<RequestResponse> refund(
            @PathVariable Long invoiceId,
            @Valid @RequestBody RefundInvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse(
                tuitionService.refund(invoiceId, request), "Tạo chứng từ hoàn tiền thành công"));
    }
}
