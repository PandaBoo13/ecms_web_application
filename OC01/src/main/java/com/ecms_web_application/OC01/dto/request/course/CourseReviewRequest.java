package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Setter @Getter
public class CourseReviewRequest {
    @NotNull private Boolean approved;
    @Size(max = 500) private String rejectReason;
}