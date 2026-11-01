package com.ecms_web_application.OC01.dto.request.enrollment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ReserveEnrollmentRequest {
    @NotBlank
    private String reason;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;
}
