package com.ecms_web_application.OC01.dto.request.tuition;

import jakarta.validation.constraints.Email;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendPaymentLinkRequest {
    /** Email nhận link. Bỏ trống → dùng email của Lead / học viên / tài khoản trên hoá đơn. */
    @Email(message = "Email không hợp lệ")
    private String email;
}
