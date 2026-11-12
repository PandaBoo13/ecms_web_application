package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.config.JwtService;
import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.response.tuition.PaymentLinkResponse;
import com.ecms_web_application.OC01.dto.response.tuition.PublicInvoiceResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.EmailService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Link thanh toán học phí gửi qua email cho người chưa có tài khoản (Lead) hoặc học viên.
 * Link mang một token có chữ ký (không lưu DB) và đi qua BE để chuyển hướng thẳng sang VNPAY.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TuitionPaymentLinkService {
    private static final String TOKEN_TYPE = "payment_link";
    private static final Duration DEFAULT_LINK_TTL = Duration.ofDays(7);
    private static final Duration STATUS_PAGE_GRACE = Duration.ofDays(7);

    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final LeadRepository leadRepository;
    private final StudentRepository studentRepository;
    private final AccountRepository accountRepository;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final VnpayGatewayService vnpayGatewayService;
    private final AuditLogService auditLogService;

    @Value("${app.api-url:http://localhost:8080}")
    private String apiUrl;

    @Value("${APP_STUDYING_URL:http://localhost:5174}")
    private String studyingAppUrl;

    public String buildInvoiceStatusPageUrl(String token) {
        return trimTrailingSlash(studyingAppUrl) + "/pay?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    /** Nhân viên gửi (hoặc gửi lại) link thanh toán qua email. */
    @Transactional
    public PaymentLinkResponse sendPaymentLink(Long invoiceId, String emailOverride) {
        if (!SecurityUtils.hasRole("ADMIN")) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Thao tác này chỉ dành cho nhân viên quản lý học phí");
        }
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
        if (invoice.getType() != InvoiceType.TUITION_PAYMENT || invoice.getStatus() != InvoiceStatus.PENDING) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Chỉ gửi link cho hóa đơn học phí PENDING (hóa đơn quá hạn cần gia hạn trước)");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = invoice.getDueAt() != null ? invoice.getDueAt() : now.plus(DEFAULT_LINK_TTL);
        if (!expiresAt.isAfter(now)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Hóa đơn đã quá hạn thanh toán, cần gia hạn trước khi gửi link");
        }

        Payer payer = resolvePayer(invoice);
        String recipient = emailOverride != null && !emailOverride.isBlank()
                ? emailOverride.trim().toLowerCase()
                : payer.email();
        if (recipient == null || recipient.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Hóa đơn chưa có email người nộp, hãy nhập email nhận link");
        }

        // Keep a read-only window after the payment deadline so an old email link can
        // show PAID/OVERDUE/CANCELLED instead of a raw expired-token error. The actual
        // payment URL is still blocked at dueAt by VnpayGatewayService.
        LocalDateTime tokenExpiresAt = invoice.getDueAt() != null
                ? expiresAt.plus(STATUS_PAGE_GRACE)
                : expiresAt;
        String token = jwtService.generateLinkToken(
                Map.of("tokenType", TOKEN_TYPE, "invoiceId", invoice.getId()),
                "invoice:" + invoice.getId(),
                Duration.between(now, tokenExpiresAt).toMillis());
        String link = trimTrailingSlash(apiUrl)
                + "/api/public/tuition/payment-links/redirect?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);

        Course course = courseRepository.findById(invoice.getCourseId()).orElse(null);
        String emailError = null;
        try {
            emailService.sendTuitionPaymentLinkEmail(recipient, payer.name(), invoice.getInvoiceCode(),
                    course != null ? course.getTitle() : "Khóa học #" + invoice.getCourseId(),
                    invoice.getAmount(), invoice.getDueAt(), link);
        } catch (RuntimeException e) {
            // Vẫn trả link để nhân viên sao chép gửi qua Zalo/SMS
            emailError = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            log.warn("[PaymentLink] Gửi email tới {} thất bại: {}", recipient, emailError);
        }

        try {
            auditLogService.log("SEND_PAYMENT_LINK", "Invoice", invoice.getId(),
                    (emailError == null ? "Gửi link thanh toán " : "Tạo link thanh toán (email lỗi) ")
                            + invoice.getInvoiceCode() + " tới " + recipient);
        } catch (Exception e) {
            log.warn("[PaymentLink] Ghi audit log thất bại: {}", e.getMessage());
        }
        return new PaymentLinkResponse(link, recipient, expiresAt, emailError == null, emailError);
    }

    /** Trang /pay (công khai) đọc thông tin hoá đơn từ token. */
    @Transactional(readOnly = true)
    public PublicInvoiceResponse getByToken(String token) {
        Invoice invoice = resolveToken(token);
        Course course = courseRepository.findById(invoice.getCourseId()).orElse(null);
        Payer payer = resolvePayer(invoice);
        InvoiceStatus displayStatus = invoice.getStatus();
        if (displayStatus == InvoiceStatus.PENDING && invoice.getDueAt() != null
                && !invoice.getDueAt().isAfter(LocalDateTime.now())) {
            displayStatus = InvoiceStatus.OVERDUE;
        }
        return new PublicInvoiceResponse(
                invoice.getInvoiceCode(),
                course != null ? course.getTitle() : null,
                course != null ? course.getStartDate() : null,
                invoice.getAmount(),
                invoice.getDueAt(),
                displayStatus,
                payer.name(),
                maskEmail(payer.email()));
    }

    /** Trang /pay (công khai) bấm "Thanh toán" → URL VNPAY mới, hạn 15 phút. */
    @Transactional(readOnly = true)
    public String createVnpayUrlByToken(String token, String clientIp) {
        return vnpayGatewayService.buildPaymentUrl(resolveToken(token), clientIp);
    }

    private Invoice resolveToken(String token) {
        Claims claims;
        try {
            claims = jwtService.extractAllClaimsFromToken(token);
        } catch (Exception e) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Liên kết thanh toán không hợp lệ hoặc đã hết hạn");
        }
        Number invoiceId = claims.get("invoiceId", Number.class);
        if (!TOKEN_TYPE.equals(claims.get("tokenType", String.class)) || invoiceId == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Liên kết thanh toán không hợp lệ hoặc đã hết hạn");
        }
        return invoiceRepository.findById(invoiceId.longValue())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
    }

    private record Payer(String name, String email) { }

    private Payer resolvePayer(Invoice invoice) {
        if (invoice.getStudentId() != null) {
            return studentRepository.findById(invoice.getStudentId())
                    .map(s -> new Payer(s.getFullName(), s.getEmail()))
                    .orElse(new Payer(null, null));
        }
        if (invoice.getLeadId() != null) {
            return leadRepository.findById(invoice.getLeadId())
                    .map(l -> new Payer(l.getFullName(), l.getEmail()))
                    .orElse(new Payer(null, null));
        }
        if (invoice.getAccountId() != null) {
            return accountRepository.findById(invoice.getAccountId())
                    .map(a -> new Payer(accountName(a), a.getEmail()))
                    .orElse(new Payer(null, null));
        }
        return new Payer(null, null);
    }

    private String accountName(Account account) {
        return account.getUserProfile() != null && account.getUserProfile().getFullName() != null
                ? account.getUserProfile().getFullName()
                : account.getEmail();
    }

    private String maskEmail(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 1) return email;
        return email.charAt(0) + "***" + email.substring(at);
    }

    private String trimTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
