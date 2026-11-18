package com.ecms_web_application.OC01.dto.request.enrollment;

import com.ecms_web_application.OC01.entity.enums.CompletionResult;
import jakarta.validation.constraints.NotNull;

public record CompleteEnrollmentRequest(@NotNull CompletionResult result) {}
