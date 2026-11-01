package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.PaymentWebhookLog;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.entity.enums.WebhookProcessingStatus;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
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
    private final PaymentWebhookLogRepository webhookLogRepository;
    private final StudentRepository studentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${VNPAY_TMN_CODE:}") private String tmnCode;
    @Value("${VNPAY_HASH_SECRET:}") private String hashSecret;
    @Value("${VNPAY_PAY_URL:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") private String payUrl;
    @Value("${VNPAY_RETURN_URL:}") private String returnUrl;

    @Transactional(readOnly = true)
    public String createPaymentUrl(Long invoiceId, String clientIp) {
        requireConfiguration();
        if (!SecurityUtils.hasRole("ADMIN") && !SecurityUtils.hasRole("STUDENT")) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ học viên mới được thanh toán hóa đơn");
        }
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
        requireCanView(invoice);
        if (invoice.getType() != InvoiceType.TUITION_PAYMENT || invoice.getStatus() != InvoiceStatus.PENDING) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ thanh toán được hóa đơn học phí PENDING");
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM);
        long amount;
        try { amount = invoice.getAmount().movePointRight(2).longValueExact(); }
        catch (ArithmeticException e) { throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Số tiền hóa đơn không hợp lệ cho VNPAY"); }

        String txnRef = invoice.getId() + now.format(VNPAY_DATE);
        LocalDateTime expireAt = now.plusMinutes(15);
        if (invoice.getDueAt() != null && invoice.getDueAt().isBefore(expireAt)) expireAt = invoice.getDueAt();
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

    @Transactional
    public Map<String, String> handleIpn(Map<String, String> params) {
        PaymentWebhookLog log = new PaymentWebhookLog();
        log.setRawPayload(params.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));
        Long invoiceId = invoiceIdFromTxnRef(params.get("vnp_TxnRef"));
        if (invoiceId != null && invoiceRepository.existsById(invoiceId)) log.setInvoiceId(invoiceId);

        if (!hasConfiguration() || !isValidSignature(params)) {
            finishLog(log, WebhookProcessingStatus.INVALID_SIGNATURE, false, "Chữ ký VNPAY không hợp lệ");
            return ipnResponse("97", "Invalid signature");
        }
        if (!tmnCode.equals(params.get("vnp_TmnCode"))) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, "Sai mã merchant");
            return ipnResponse("97", "Invalid merchant");
        }
        if (invoiceId == null) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, "Không đọc được mã hóa đơn từ vnp_TxnRef");
            return ipnResponse("01", "Order not found");
        }

        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId).orElse(null);
        if (invoice == null) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, "Không tìm thấy hóa đơn");
            return ipnResponse("01", "Order not found");
        }
        if (invoice.getType() != InvoiceType.TUITION_PAYMENT
                || !isExpectedAmount(invoice.getAmount(), params.get("vnp_Amount"))) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, "Loại hóa đơn hoặc số tiền không khớp");
            return ipnResponse("04", "Invalid amount or order type");
        }

        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        boolean paid = "00".equals(responseCode) && "00".equals(transactionStatus);
        if (!paid) {
            finishLog(log, WebhookProcessingStatus.PROCESSED, true, "Giao dịch không thành công; hóa đơn giữ nguyên trạng thái");
            return ipnResponse("00", "Confirm Success");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            finishLog(log, WebhookProcessingStatus.DUPLICATE, true, "Hóa đơn đã được xác nhận thanh toán trước đó");
            return ipnResponse("02", "Order already confirmed");
        }
        if (invoice.getStatus() != InvoiceStatus.PENDING) {
            finishLog(log, WebhookProcessingStatus.ERROR, true, "Hóa đơn không còn ở trạng thái PENDING");
            return ipnResponse("02", "Order already confirmed or not payable");
        }

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaymentMethod(PaymentMethod.VNPAY);
        invoice.setTransactionReference(params.getOrDefault("vnp_TransactionNo", params.get("vnp_TxnRef")));
        invoice.setPaidAt(parsePaidAt(params.get("vnp_PayDate")));
        invoiceRepository.save(invoice);
        finishLog(log, WebhookProcessingStatus.PROCESSED, true, "Thanh toán VNPAY thành công");
        eventPublisher.publishEvent(new InvoicePaidEvent(invoice.getId()));
        return ipnResponse("00", "Confirm Success");
    }

    private void requireCanView(Invoice invoice) {
        if (SecurityUtils.hasRole("ADMIN")) return;
        Long accountId = SecurityUtils.requireCurrentAccountId();
        boolean ownsAsAccount = accountId.equals(invoice.getAccountId());
        boolean ownsAsStudent = invoice.getStudentId() != null && studentRepository.findByUserId(accountId)
                .map(student -> student.getId().equals(invoice.getStudentId())).orElse(false);
        if (!ownsAsAccount && !ownsAsStudent) throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không có quyền thanh toán hóa đơn này");
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
        return ip == null || ip.isBlank() || ip.length() > 45 ? "127.0.0.1" : ip;
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
