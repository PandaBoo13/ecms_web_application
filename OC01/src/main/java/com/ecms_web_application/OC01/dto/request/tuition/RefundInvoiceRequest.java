package com.ecms_web_application.OC01.dto.request.tuition;

import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class RefundInvoiceRequest {
    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    @NotNull
    private PaymentMethod paymentMethod;

    private String transactionReference;

    @NotBlank
    private String reason;

    /** Ảnh minh chứng hoàn tiền (bắt buộc với mọi phương thức). */
    @NotBlank(message = "Vui lòng tải ảnh minh chứng hoàn tiền")
    private String proofUrl;

    /** Thông tin người nhận hoàn — lưu snapshot trên chứng từ. */
    @NotBlank(message = "Vui lòng nhập họ tên người nhận hoàn")
    private String payerName;

    @NotBlank(message = "Vui lòng nhập email người nhận hoàn")
    @Email(message = "Email người nhận hoàn không hợp lệ")
    private String payerEmail;

    private String payerPhone;

    /** Ngày hoàn tiền thực tế; bỏ trống thì dùng thời điểm ghi nhận. */
    @PastOrPresent(message = "Ngày hoàn tiền không được ở tương lai")
    private LocalDateTime refundedAt;
}
