package com.ecms_web_application.OC01.dto.request.tuition;

import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateInvoiceFromStudentRequest {

    @NotNull(message = "Thiếu học viên cần tạo hóa đơn")
    private Long studentId;

    @NotNull(message = "Vui lòng chọn khóa học cần tạo hóa đơn")
    private Long courseId;

    /** CASH = thu tiền mặt ngay; BANK_TRANSFER = gửi link thanh toán VNPAY, hạn 24 giờ. */
    @NotNull(message = "Vui lòng chọn phương thức thanh toán")
    private PaymentMethod paymentMethod;

    /** Ảnh chứng từ (bắt buộc khi thu tiền mặt). Lấy từ API upload file. */
    private String proofUrl;

    /** Email nhận link thanh toán. Bỏ trống → dùng email của học viên. */
    @Email(message = "Email không hợp lệ")
    private String email;
}
