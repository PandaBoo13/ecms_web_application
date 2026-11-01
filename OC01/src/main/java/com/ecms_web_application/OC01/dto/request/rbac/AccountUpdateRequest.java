package com.ecms_web_application.OC01.dto.request.rbac;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccountUpdateRequest {

    @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự")
    private String fullName;

    @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
    private String phone;

    private String avatarUrl;

    private Long roleId;
    private String roleCode;

    private Boolean isActive;
}

