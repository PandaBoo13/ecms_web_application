package com.ecms_web_application.OC01.dto.request.enrollment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ReplaceSessionAbsencesRequest {
    @NotNull
    private List<Long> absentEnrollmentIds;
}
