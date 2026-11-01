package com.ecms_web_application.OC01.dto.request.tuition;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CancelInvoiceRequest {
    @NotBlank
    private String reason;
}
