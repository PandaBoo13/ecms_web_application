package com.ecms_web_application.OC01.service.impl;

import jakarta.mail.MessagingException;
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

    @Value("${spring.mail.username}")
    private String fromEmail;

    // ===== CRITICAL → throw khi lỗi =====
    @Override
    public void sendOtpEmail(String to, String otp) {
        String html = buildHtml("Đặt lại mật khẩu",
                "<p style='text-align:center'>Mã OTP của bạn là:</p>"
                        + "<div class='code'>" + otp + "</div>"
                        + "<p class='muted'>Mã hết hạn sau <strong>5 phút</strong>.</p>");
        doSend(to, "Mã OTP đặt lại mật khẩu", html, true);
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
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("[Email] Sent '{}' to {}", subject, to);
        } catch (Exception e) {
            log.warn("[Email] Failed '{}' to {}: {}", subject, to, e.getMessage());
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


}