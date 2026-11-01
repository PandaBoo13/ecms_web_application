package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

/**
 * Request cập nhật PROGRESS của STUDENT trên 1 RESOURCE.
 * Dùng cho PATCH /api/progress/resources/{resourceId}
 */
@Setter @Getter
public class ProgressUpdateRequest {

    @Min(value = 0, message = "percentage phải >= 0")
    @Max(value = 100, message = "percentage phải <= 100")
    private Integer percentage;

    @Min(value = 0, message = "timeSpentSeconds phải >= 0")
    private Long timeSpentSeconds;
}