package com.ecms_web_application.OC01.dto.request.tuition;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OnlineCheckoutRequest {
    @NotBlank(message = "Họ tên người thanh toán không được để trống")
    @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
    private String payerName;

    @NotBlank(message = "Email nhận hóa đơn không được để trống")
    @Email(message = "Email nhận hóa đơn không hợp lệ")
    @Size(max = 255, message = "Email tối đa 255 ký tự")
    private String payerEmail;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String payerPhone;
}
