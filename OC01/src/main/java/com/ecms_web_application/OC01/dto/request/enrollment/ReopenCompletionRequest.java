package com.ecms_web_application.OC01.dto.request.enrollment;

import jakarta.validation.constraints.NotBlank;

public record ReopenCompletionRequest(@NotBlank String reason) {}
