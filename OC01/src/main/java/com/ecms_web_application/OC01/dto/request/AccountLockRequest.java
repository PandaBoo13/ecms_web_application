package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccountLockRequest {

    @NotNull(message = "Trạng thái khóa (isLocked) không được để trống")
    private Boolean isLocked;

    private String reason;
}

