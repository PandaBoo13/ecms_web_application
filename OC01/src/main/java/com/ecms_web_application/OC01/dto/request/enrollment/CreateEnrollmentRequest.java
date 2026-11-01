package com.ecms_web_application.OC01.dto.request.enrollment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateEnrollmentRequest {
    @NotNull
    private Long invoiceId;
}
