package com.ecms_web_application.OC01.dto.request.enrollment;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TerminateEnrollmentRequest {
    @NotBlank
    private String reason;
}
