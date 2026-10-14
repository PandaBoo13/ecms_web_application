package com.ecms_web_application.OC01.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class VerifyOtpRequest {

    @NotBlank(message = "Email là bắt buộc")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "OTP là bắt buộc")
    @Pattern(regexp = "\\d{6}", message = "OTP phải là 6 chữ số")
    private String otp;
}