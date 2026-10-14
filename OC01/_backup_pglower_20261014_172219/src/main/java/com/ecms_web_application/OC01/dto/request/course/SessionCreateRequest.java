package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Setter @Getter
public class SessionCreateRequest {
    @NotBlank @Size(max = 255) private String title;
    private String description;
    @NotNull private LocalDateTime startTime;
    @NotNull private LocalDateTime endTime;
    private Long teacherId;
    private Long assistantId;
    private Long roomId;
    private String note;
}