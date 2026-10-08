package com.ecms_web_application.OC01.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class ForgotPasswordRequest {

    @NotBlank(message = "Email là bắt buộc")
    @Email(message = "Email không đúng định dạng")
    private String email;
}