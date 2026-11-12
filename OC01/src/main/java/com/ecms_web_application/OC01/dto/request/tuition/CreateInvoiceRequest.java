package com.ecms_web_application.OC01.dto.request.tuition;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CreateInvoiceRequest {
    @NotNull
    private Long courseId;

    private Long studentId;
    private Long leadId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    @Future
    private LocalDateTime dueAt;
}
