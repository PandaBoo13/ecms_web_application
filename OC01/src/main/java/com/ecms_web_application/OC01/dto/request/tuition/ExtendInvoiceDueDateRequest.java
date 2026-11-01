package com.ecms_web_application.OC01.dto.request.tuition;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExtendInvoiceDueDateRequest {
    @NotNull
    @Future
    private LocalDateTime dueAt;
}
