package com.ecms_web_application.OC01.service.impl;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import com.ecms_web_application.OC01.service.EmailService;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@ecms.vn}")
    private String fromEmail;

    /** Tên hiển thị của người gửi (có thể ghi đè bằng biến môi trường MAIL_FROM_NAME). */
    @Value("${MAIL_FROM_NAME:ECMS}")
    private String fromName;

    // ===== CRITICAL → gửi OTP =====
    @Override
    public void sendOtpEmail(String to, String otp) {
        log.info("==========================================================");
        log.info("[OTP XÁC MINH ĐẶT LẠI MẬT KHẨU] Email: {} | Mã OTP: {}", to, otp);
        log.info("==========================================================");
        String html = buildHtml("Đặt lại mật khẩu",
                "<p style='text-align:center'>Mã OTP của bạn là:</p>"
                        + "<div class='code'>" + otp + "</div>"
                        + "<p class='muted'>Mã hết hạn sau <strong>5 phút</strong>.</p>");
        doSend(to, "Mã OTP đặt lại mật khẩu", html, false);
    }

    // ===== Informational → swallow khi lỗi =====
    @Override
    public void sendPasswordChangedEmail(String to) {
        String html = buildHtml("Mật khẩu đã được thay đổi",
                "<p>Mật khẩu của bạn vừa được thay đổi thành công.</p>"
                        + "<p class='muted'>Nếu không phải bạn, hãy liên hệ hỗ trợ ngay.</p>");
        doSend(to, "Mật khẩu đã được thay đổi", html, false);
    }

    // ===== CORE =====
    private void doSend(String to, String subject, String html, boolean throwOnError) {
        try {
            String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "noreply@ecms.vn";
            String senderName = (fromName != null && !fromName.isBlank()) ? fromName.trim() : null;
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            if (senderName != null) {
                helper.setFrom(new InternetAddress(sender, senderName, "UTF-8"));
            } else {
                helper.setFrom(sender);
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("[Email] Sent '{}' to {}", subject, to);
        } catch (Exception e) {
            log.warn("[Email] Không thể gửi email trực tiếp qua SMTP ('{}' tới {}): {}", subject, to, e.getMessage());
            if (throwOnError) throw new RuntimeException("Failed to send email", e);
        }
    }

    private String buildHtml(String title, String bodyHtml) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;"
                + "border:1px solid #eee;border-radius:8px'>"
                + "<h2 style='color:#333;text-align:center;margin-bottom:16px'>" + esc(title) + "</h2>"
                + bodyHtml
                + "<hr style='border:none;border-top:1px solid #eee;margin:24px 0'/>"
                + "<p style='color:#999;font-size:12px;text-align:center'>ECMS</p>"
                + "<style>"
                + ".code{background:#f5f5f5;padding:20px;border-radius:8px;text-align:center;"
                + "margin:20px 0;font-size:36px;letter-spacing:8px;color:#2196F3;font-weight:bold}"
                + ".muted{color:#999;font-size:14px}"
                + ".reason{background:#fff3e0;border-left:4px solid #ff9800;padding:12px;margin:16px 0}"
                + "</style></div>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    @Override
    public void sendAccountLockedEmail(String to, String fullName,
                                       String reason, LocalDateTime lockedUntil) {
        String body = "<p>Xin chào <strong>" + esc(fullName) + "</strong>,</p>"
                + "<p>Tài khoản ECMS của bạn đã bị <strong style='color:#d32f2f'>khóa</strong>.</p>"
                + (reason != null && !reason.isBlank()
                ? "<div class='reason'><b>Lý do:</b> " + esc(reason) + "</div>" : "")
                + (lockedUntil != null
                ? "<p><b>Tự động mở khóa lúc:</b> " + lockedUntil + "</p>"
                : "<p>Tài khoản sẽ bị khóa cho đến khi quản trị viên mở lại.</p>")
                + "<p class='muted'>Nếu bạn không thực hiện hành động này, hãy liên hệ hỗ trợ ngay.</p>";

        doSend(to, "Tài khoản của bạn đã bị khóa",
                buildHtml("Tài khoản đã bị khóa", body), false);
    }

    @Override
    public void sendTuitionPaymentLinkEmail(String to, String fullName, String invoiceCode, String courseTitle,
                                            java.math.BigDecimal amount, LocalDateTime dueAt, String paymentLink) {
        String amountText = String.format("%,.0f đ", amount).replace(',', '.');
        String dueText = dueAt != null
                ? dueAt.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"))
                : null;
        String body = "<p>Xin chào <strong>" + esc(fullName) + "</strong>,</p>"
                + "<p>Trung tâm gửi bạn thông tin học phí khóa học <strong>" + esc(courseTitle) + "</strong>.</p>"
                + "<table style='width:100%;border-collapse:collapse;margin:16px 0'>"
                + row("Mã hóa đơn", esc(invoiceCode))
                + row("Số tiền", "<strong>" + esc(amountText) + "</strong>")
                + (dueText != null ? row("Hạn thanh toán", esc(dueText)) : "")
                + "</table>"
                + "<p style='text-align:center;margin:24px 0'>"
                + "<a href='" + esc(paymentLink) + "' style='background:#2196F3;color:#fff;padding:12px 28px;"
                + "border-radius:6px;text-decoration:none;font-weight:bold'>Thanh toán qua VNPAY</a></p>"
                + "<p class='muted'>Nếu nút không bấm được, mở liên kết sau: <br/>"
                + "<a href='" + esc(paymentLink) + "'>" + esc(paymentLink) + "</a></p>"
                + "<p class='muted'>Sau khi thanh toán thành công, bạn sẽ nhận được email xác nhận.</p>";
        doSend(to, "Thanh toán học phí " + invoiceCode, buildHtml("Thanh toán học phí", body), true);
    }

    @Override
    public void sendTuitionPaidInvoiceEmail(String to, String fullName, String phone, String invoiceCode,
                                            LocalDateTime invoiceCreatedAt, String courseCode, String courseTitle,
                                            LocalDateTime paidAt, java.math.BigDecimal amount, String paymentMethod,
                                            String transactionReference) {
        String amountText = String.format("%,.0f ₫", amount).replace(',', '.');
        String invoiceDateText = formatInvoiceDate(invoiceCreatedAt);
        String paidText = paidAt != null
                ? formatInvoiceDate(paidAt)
                : "Đã thanh toán";
        String itemName = (courseCode != null && !courseCode.isBlank()
                ? "<span style='color:#64748b;font-size:12px'>" + esc(courseCode) + "</span><br/>" : "")
                + "<strong style='color:#0f172a'>" + esc(courseTitle) + "</strong>";
        String body = "<p style='margin:0 0 16px'>Xin chào <strong>" + esc(fullName) + "</strong>,</p>"
                + "<p style='margin:0 0 20px;color:#475569'>ECMS xác nhận đã nhận thanh toán học phí. "
                + "Thông tin hóa đơn của bạn được ghi dưới đây.</p>"
                + "<div style='padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:18px'>"
                + "<div style='font-size:12px;color:#64748b;margin-bottom:5px'>MÃ HÓA ĐƠN</div>"
                + "<strong style='font-size:18px;letter-spacing:.3px;color:#0f172a'>" + esc(invoiceCode) + "</strong>"
                + "<span style='float:right;padding:5px 10px;background:#dcfce7;color:#15803d;"
                + "border-radius:20px;font-size:12px;font-weight:bold'>ĐÃ THANH TOÁN</span></div>"
                + "<div style='font-weight:bold;color:#0f172a;margin:18px 0 8px'>Thông tin người thanh toán</div>"
                + "<table role='presentation' style='width:100%;border-collapse:collapse;margin-bottom:18px'>"
                + invoiceRow("Họ và tên", esc(fullName))
                + invoiceRow("Email", esc(to))
                + (phone != null && !phone.isBlank() ? invoiceRow("Số điện thoại", esc(phone)) : "")
                + "</table>"
                + "<div style='font-weight:bold;color:#0f172a;margin:18px 0 8px'>Chi tiết hóa đơn</div>"
                + "<table role='presentation' style='width:100%;border-collapse:collapse;margin-bottom:12px'>"
                + invoiceRow("Ngày tạo hóa đơn", esc(invoiceDateText))
                + invoiceRow("Loại hóa đơn", "Học phí khóa học")
                + "</table>"
                + "<table role='presentation' style='width:100%;border-collapse:collapse;border:1px solid #e2e8f0'>"
                + "<thead><tr style='background:#f1f5f9'>"
                + invoiceCell("Nội dung", true) + invoiceCell("SL", true)
                + invoiceCell("Thành tiền", true) + "</tr></thead>"
                + "<tbody><tr>" + invoiceCell(itemName, false)
                + invoiceCell("1", false)
                + invoiceCell(esc(amountText), false) + "</tr></tbody>"
                + "</table>"
                + "<table role='presentation' style='width:100%;border-collapse:collapse;margin-top:12px'>"
                + "<tr><td style='padding:12px 8px;text-align:right;color:#475569'>Tổng thanh toán</td>"
                + "<td style='padding:12px 8px;text-align:right;font-size:20px;font-weight:bold;color:#0b67c2;width:38%'>"
                + esc(amountText) + "</td></tr></table>"
                + "<div style='font-weight:bold;color:#0f172a;margin:18px 0 8px'>Thông tin thanh toán</div>"
                + "<table role='presentation' style='width:100%;border-collapse:collapse'>"
                + invoiceRow("Trạng thái", "<strong style='color:#15803d'>Đã thanh toán</strong>")
                + invoiceRow("Thời gian thanh toán", esc(paidText))
                + invoiceRow("Phương thức", esc(paymentMethod != null && !paymentMethod.isBlank()
                        ? paymentMethod : "Không có thông tin"))
                + (transactionReference != null && !transactionReference.isBlank()
                    ? invoiceRow("Mã giao dịch", esc(transactionReference)) : "")
                + "</table>"
                + "<p style='margin:20px 0 0;color:#64748b;font-size:12px'>Email này được tạo tự động từ hệ thống ECMS. "
                + "Vui lòng lưu lại để tra cứu hoặc đối chiếu khi cần hỗ trợ.</p>";
        doSend(to, "Hóa đơn học phí " + invoiceCode + " - Đã thanh toán",
                buildHtml("Hóa đơn thanh toán học phí", body), false);
    }

    private String formatInvoiceDate(LocalDateTime dateTime) {
        return dateTime != null
                ? dateTime.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"))
                : "—";
    }

    private String invoiceRow(String label, String valueHtml) {
        return "<tr><td style='padding:8px;border-bottom:1px solid #edf2f7;color:#64748b;width:38%'>"
                + esc(label) + "</td><td style='padding:8px;border-bottom:1px solid #edf2f7;color:#0f172a'>"
                + valueHtml + "</td></tr>";
    }

    private String invoiceCell(String valueHtml, boolean header) {
        String style = header
                ? "padding:10px 8px;text-align:left;color:#475569;border-bottom:1px solid #e2e8f0;font-size:12px"
                : "padding:12px 8px;vertical-align:top;color:#0f172a;border-bottom:1px solid #edf2f7";
        return "<td style='" + style + "'>" + valueHtml + "</td>";
    }

    private String row(String label, String valueHtml) {
        return "<tr>"
                + "<td style='padding:8px 0;color:#666;width:40%'>" + esc(label) + "</td>"
                + "<td style='padding:8px 0'>" + valueHtml + "</td>"
                + "</tr>";
    }
}
