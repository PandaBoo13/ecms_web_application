package com.ecms_web_application.OC01.dto.request.enrollment;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateOfflineEnrollmentsRequest(
        @NotEmpty
        @Size(max = 100, message = "Mỗi lần xử lý tối đa 100 học viên")
        List<@NotNull @Positive Long> invoiceIds
) {}
