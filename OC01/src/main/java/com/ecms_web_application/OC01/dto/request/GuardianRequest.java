package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GuardianRequest {

    @NotBlank(message = "Họ tên người giám hộ không được để trống")
    @Size(max = 255, message = "Họ tên người giám hộ tối đa 255 ký tự")
    private String fullName;

    @NotBlank(message = "Mối quan hệ không được để trống (Cha, Mẹ, Người bảo hộ...)")
    @Size(max = 100, message = "Mối quan hệ tối đa 100 ký tự")
    private String relationship;

    @NotBlank(message = "Số điện thoại người giám hộ không được để trống")
    @Pattern(regexp = "^$|^[0-9+()\\s.-]{8,20}$", message = "Số điện thoại không hợp lệ")
    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    private String email;
}

