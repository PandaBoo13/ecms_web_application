package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.response.tuition.VnpayReturnResponse;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.PaymentWebhookLog;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.entity.enums.WebhookProcessingStatus;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.PaymentWebhookLogRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VnpayGatewayService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");
    private static final DateTimeFormatter VNPAY_DATE_SECONDS = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final PaymentWebhookLogRepository webhookLogRepository;
    private final StudentRepository studentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${VNPAY_TMN_CODE:}") private String tmnCode;
    @Value("${VNPAY_HASH_SECRET:}") private String hashSecret;
    @Value("${VNPAY_PAY_URL:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") private String payUrl;
    @Value("${VNPAY_RETURN_URL:http://localhost:8080/api/public/tuition/vnpay-return-page}") private String returnUrl;

    /** Tài khoản đã đăng nhập tạo URL VNPAY cho hoá đơn thuộc sở hữu của mình. */
    @Transactional(readOnly = true)
    public String createPaymentUrl(Long invoiceId, String clientIp) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
        requireCanView(invoice);
        return buildPaymentUrl(invoice, clientIp);
    }

    /**
     * Dựng URL VNPAY (hết hạn sau 15 phút) cho một hoá đơn học phí PENDING.
     * Không kiểm tra người gọi: nơi gọi phải tự xác thực (đăng nhập, hoặc token của link thanh toán).
     */
    public String buildPaymentUrl(Invoice invoice, String clientIp) {
        requireConfiguration();
        if (invoice.getType() != InvoiceType.TUITION_PAYMENT || invoice.getStatus() != InvoiceStatus.PENDING) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ thanh toán được hóa đơn học phí PENDING");
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM);
        long amount;
        try { amount = invoice.getAmount().movePointRight(2).longValueExact(); }
        catch (ArithmeticException e) { throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Số tiền hóa đơn không hợp lệ cho VNPAY"); }

        String txnRef = invoice.getId() + now.format(VNPAY_DATE);
        LocalDateTime expireAt = now.plusMinutes(15);
        boolean offlineCourse = courseRepository.findById(invoice.getCourseId())
                .map(course -> course.getCourseType() == CourseType.OFFLINE)
                .orElse(false);
        if (offlineCourse && invoice.getDueAt() != null && invoice.getDueAt().isBefore(expireAt)) {
            expireAt = invoice.getDueAt();
        }
        if (!expireAt.isAfter(now)) throw new ErrorHandler(HttpStatus.CONFLICT, "Hóa đơn đã hết hạn thanh toán");

        TreeMap<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);
        params.put("vnp_Amount", Long.toString(amount));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", "Thanh toan hoc phi " + invoice.getInvoiceCode());
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", normalizeIp(clientIp));
        params.put("vnp_CreateDate", now.format(VNPAY_DATE_SECONDS));
        params.put("vnp_ExpireDate", expireAt.format(VNPAY_DATE_SECONDS));

        String hashData = toQuery(params);
        String secureHash = hmacSha512(hashSecret, hashData);
        return payUrl + "?" + hashData + "&vnp_SecureHash=" + secureHash;
    }

    /** VNPAY gọi server-to-server (nguồn sự thật chính trên môi trường thật). */
    @Transactional
    public Map<String, String> handleIpn(Map<String, String> params) {
        CallbackResult result = processCallback(params, "IPN");
        return ipnResponse(result.rspCode(), result.message());
    }

    /**
     * Trang kết quả (return URL) gửi lại đúng bộ tham số VNPAY đã ký.
     * Kiểm chữ ký y hệt IPN rồi ghi nhận nếu IPN chưa tới — cần khi chạy local, nơi VNPAY không gọi được IPN.
     * Gọi lặp hoặc IPN tới sau đều an toàn (hoá đơn đã PAID thì không đổi gì).
     */
    @Transactional
    public VnpayReturnResponse handleReturn(Map<String, String> params) {
        CallbackResult result = processCallback(params, "RETURN");
        String responseCode = params.get("vnp_ResponseCode");
        if (!result.signatureValid()) {
            return new VnpayReturnResponse(false, null, null, null, null, responseCode,
                    "Dữ liệu trả về từ VNPAY không hợp lệ");
        }
        Invoice invoice = result.invoice();
        boolean paid = invoice != null && invoice.getStatus() == InvoiceStatus.PAID;
        String message;
        if (paid) message = "Thanh toán học phí thành công";
        else if ("00".equals(responseCode)) message = "Chưa xác nhận được thanh toán, vui lòng liên hệ trung tâm";
        else message = describeResponseCode(responseCode);
        CourseType courseType = invoice == null ? null : courseRepository.findById(invoice.getCourseId())
                .map(course -> course.getCourseType()).orElse(null);
        return new VnpayReturnResponse(paid,
                invoice != null ? invoice.getInvoiceCode() : null,
                invoice != null ? invoice.getAmount() : null,
                invoice != null ? invoice.getStatus() : null,
                courseType,
                responseCode, message);
    }

    private record CallbackResult(String rspCode, String message, boolean signatureValid, Invoice invoice) {
    }

    private CallbackResult processCallback(Map<String, String> params, String source) {
        String tag = "[" + source + "] ";
        PaymentWebhookLog log = new PaymentWebhookLog();
        log.setRawPayload(params.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));
        Long invoiceId = invoiceIdFromTxnRef(params.get("vnp_TxnRef"));
        if (invoiceId != null && invoiceRepository.existsById(invoiceId)) log.setInvoiceId(invoiceId);

        if (!hasConfiguration() || !isValidSignature(params)) {
            finishLog(log, WebhookProcessingStatus.INVALID_SIGNATURE, false, tag + "Chữ ký VNPAY không hợp lệ");
            return new CallbackResult("97", "Invalid signature", false, null);
        }
        if (!tmnCode.equals(params.get("vnp_TmnCode"))) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, tag + "Sai mã merchant");
            return new CallbackResult("97", "Invalid merchant", false, null);
        }
        if (invoiceId == null) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, tag + "Không đọc được mã hóa đơn từ vnp_TxnRef");
            return new CallbackResult("01", "Order not found", true, null);
        }

        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId).orElse(null);
        if (invoice == null) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, tag + "Không tìm thấy hóa đơn");
            return new CallbackResult("01", "Order not found", true, null);
        }
        if (invoice.getType() != InvoiceType.TUITION_PAYMENT
                || !isExpectedAmount(invoice.getAmount(), params.get("vnp_Amount"))) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, tag + "Loại hóa đơn hoặc số tiền không khớp");
            return new CallbackResult("04", "Invalid amount or order type", true, invoice);
        }

        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        boolean captured = "00".equals(responseCode) && "00".equals(transactionStatus);
        if (!captured) {
            finishLog(log, WebhookProcessingStatus.PROCESSED, true,
                    tag + "Giao dịch không thành công (mã " + responseCode + "); hóa đơn giữ nguyên trạng thái");
            return new CallbackResult("00", "Confirm Success", true, invoice);
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            finishLog(log, WebhookProcessingStatus.DUPLICATE, true, tag + "Hóa đơn đã được xác nhận thanh toán trước đó");
            return new CallbackResult("02", "Order already confirmed", true, invoice);
        }

        // Tiền VNPAY đã thu: luôn ghi nhận PAID, kể cả khi hóa đơn không còn khả dụng
        // (đã hủy/quá hạn) hoặc lớp đã đủ sĩ số. Ghi danh chạy sau commit; nếu thất bại,
        // hóa đơn vẫn PAID và xuất hiện trong danh sách đối soát để admin xử lý.
        invoice.setStatus(InvoiceStatus.PAID);
        // VNPAY is the gateway; the invoice payment method remains BANK_TRANSFER.
        invoice.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        invoice.setTransactionReference(params.getOrDefault("vnp_TransactionNo", params.get("vnp_TxnRef")));
        invoice.setPaidAt(parsePaidAt(params.get("vnp_PayDate")));
        invoiceRepository.save(invoice);
        finishLog(log, WebhookProcessingStatus.PROCESSED, true, tag + "Thanh toán VNPAY thành công");
        eventPublisher.publishEvent(new InvoicePaidEvent(invoice.getId()));
        return new CallbackResult("00", "Confirm Success", true, invoice);
    }

    /** Mô tả mã phản hồi VNPAY (vnp_ResponseCode) cho người dùng cuối. */
    private String describeResponseCode(String code) {
        if (code == null) return "Không nhận được kết quả giao dịch";
        return switch (code) {
            case "07" -> "Giao dịch bị nghi ngờ gian lận";
            case "09" -> "Thẻ/tài khoản chưa đăng ký Internet Banking";
            case "10" -> "Xác thực thông tin thẻ/tài khoản sai quá 3 lần";
            case "11" -> "Đã hết hạn chờ thanh toán";
            case "12" -> "Thẻ/tài khoản bị khóa";
            case "13" -> "Sai mật khẩu xác thực giao dịch (OTP)";
            case "24" -> "Bạn đã hủy giao dịch";
            case "51" -> "Tài khoản không đủ số dư";
            case "65" -> "Tài khoản đã vượt hạn mức giao dịch trong ngày";
            case "75" -> "Ngân hàng thanh toán đang bảo trì";
            case "79" -> "Nhập sai mật khẩu thanh toán quá số lần quy định";
            default -> "Giao dịch không thành công (mã " + code + ")";
        };
    }

    private void requireCanView(Invoice invoice) {
        if (SecurityUtils.hasRole("ADMIN")) return;
        Long accountId = SecurityUtils.requireCurrentAccountId();
        boolean ownsAsStudent = studentRepository.findByUserId(accountId)
                .map(student -> student.getId().equals(invoice.getStudentId())
                        || (invoice.getLeadId() != null && invoice.getLeadId().equals(student.getLeadId())))
                .orElse(false);
        if (!ownsAsStudent) throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không có quyền thanh toán hóa đơn này");
    }

    private void requireConfiguration() {
        if (!hasConfiguration()) throw new ErrorHandler(HttpStatus.SERVICE_UNAVAILABLE,
                "Chưa cấu hình VNPAY: cần VNPAY_TMN_CODE, VNPAY_HASH_SECRET và VNPAY_RETURN_URL");
    }

    private boolean hasConfiguration() {
        return tmnCode != null && !tmnCode.isBlank() && hashSecret != null && !hashSecret.isBlank()
                && returnUrl != null && !returnUrl.isBlank();
    }

    private boolean isValidSignature(Map<String, String> params) {
        if (hashSecret == null || hashSecret.isBlank()) return false;
        String received = params.get("vnp_SecureHash");
        if (received == null || received.isBlank()) return false;
        TreeMap<String, String> signed = new TreeMap<>(params);
        signed.remove("vnp_SecureHash");
        signed.remove("vnp_SecureHashType");
        String expected = hmacSha512(hashSecret, toQuery(signed));
        return MessageDigest.isEqual(expected.toLowerCase().getBytes(StandardCharsets.UTF_8),
                received.toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    private String toQuery(Map<String, String> values) {
        return values.entrySet().stream().map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String hmacSha512(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo chữ ký VNPAY", e);
        }
    }

    private Long invoiceIdFromTxnRef(String txnRef) {
        if (txnRef == null || txnRef.length() <= 17) return null;
        try { return Long.parseLong(txnRef.substring(0, txnRef.length() - 17)); }
        catch (NumberFormatException e) { return null; }
    }

    private boolean isExpectedAmount(BigDecimal amount, String receivedAmount) {
        if (receivedAmount == null) return false;
        try { return amount.movePointRight(2).longValueExact() == Long.parseLong(receivedAmount); }
        catch (NumberFormatException | ArithmeticException e) { return false; }
    }

    private LocalDateTime parsePaidAt(String payDate) {
        try { return LocalDateTime.parse(payDate, VNPAY_DATE_SECONDS); }
        catch (Exception e) { return LocalDateTime.now(VIETNAM); }
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.isBlank() || ip.length() > 45) return "127.0.0.1";
        String normalized = ip.trim();
        // Local browser/API requests can resolve localhost as IPv6. VNPAY's
        // sandbox examples and integrations use IPv4 for vnp_IpAddr.
        if ("::1".equalsIgnoreCase(normalized)
                || "0:0:0:0:0:0:0:1".equalsIgnoreCase(normalized)) {
            return "127.0.0.1";
        }
        if (normalized.regionMatches(true, 0, "::ffff:", 0, 7)) {
            return normalized.substring(7);
        }
        return normalized;
    }

    private void finishLog(PaymentWebhookLog log, WebhookProcessingStatus status, boolean signatureValid, String note) {
        log.setProcessingStatus(status);
        log.setSignatureValid(signatureValid);
        log.setProcessingNote(note);
        log.setProcessedAt(LocalDateTime.now(VIETNAM));
        webhookLogRepository.save(log);
    }

    private Map<String, String> ipnResponse(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
    }
}
