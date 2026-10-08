package com.ecms_web_application.OC01.service.impl;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import com.ecms_web_application.OC01.service.EmailService;

@Service
public class EmailServiceImpl implements EmailService {
    @Autowired private JavaMailSender mailSender;
    @Value("${spring.mail.username}")
    private String fromEmail;

    /** Gửi email chứa mã OTP đặt lại mật khẩu */
    @Override
    public void sendOtpEmail(String to, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Mã OTP đặt lại mật khẩu");
            String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>"
                    + "<h2 style='color: #333; text-align: center;'>Đặt lại mật khẩu</h2>"
                    + "<p style='color: #666; text-align: center;'>Mã OTP của bạn là:</p>"
                    + "<div style='background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;'>"
                    + "<h1 style='color: #2196F3; font-size: 48px; letter-spacing: 10px; margin: 0;'>" + otp + "</h1>"
                    + "</div>"
                    + "<p style='color: #999; font-size: 14px;'>Mã OTP hết hạn sau <strong>5 phút</strong>.</p>"
                    + "</div>";
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    /** Gửi email thông báo mật khẩu đã được thay đổi thành công */
    @Override
    public void sendPasswordChangedEmail(String to) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Mật khẩu đã được thay đổi");
            String htmlContent = "<div style='font-family: Arial, sans-serif; padding: 20px;'>"
                    + "<h2 style='color: #333;'>Mật khẩu đã được thay đổi</h2>"
                    + "<p>Mật khẩu của bạn vừa được thay đổi thành công.</p>"
                    + "<p style='color: #999;'>Nếu không phải bạn, hãy liên hệ hỗ trợ ngay.</p>"
                    + "</div>";
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            // log warning, không throw
        }
    }
}