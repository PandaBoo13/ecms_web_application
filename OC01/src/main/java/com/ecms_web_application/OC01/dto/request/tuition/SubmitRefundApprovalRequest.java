package com.ecms_web_application.OC01.dto.request.tuition;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SubmitRefundApprovalRequest {
    @NotNull(message = "Vui lòng nhập số tiền dự kiến hoàn")
    @DecimalMin(value = "0.01", message = "Số tiền hoàn phải lớn hơn 0")
    private BigDecimal amount;

    @NotBlank(message = "Vui lòng nhập lý do hoàn tiền")
    private String reason;
}
