package com.ecms_web_application.OC01.dto.request.rbac;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccountResetPasswordRequest {

    @NotBlank(message = "Mật khẩu mới là bắt buộc")
    @Size(min = 6, max = 100, message = "Mật khẩu phải từ 6 đến 100 ký tự")
    private String newPassword;
}

