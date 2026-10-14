package com.ecms_web_application.OC01.dto.request.course;

import com.ecms_web_application.OC01.entity.enums.QuizCategory;
import com.ecms_web_application.OC01.entity.enums.ResourceStatus;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Setter @Getter
public class ResourceUpdateRequest {
    @Size(max = 255) private String title;
    private String description;
    @Min(0) private Integer orderIndex;
    private Boolean isRequired;
    private Boolean isFreePreview;
    @Min(0) private Integer duration;
    private String content;
    @Size(max = 500) private String thumbnailUrl;
    @Size(max = 255) private String fileName;
    @Size(max = 500) private String fileUrl;
    private Long fileSize;
    @Size(max = 50) private String fileFormat;
    @Size(max = 100) private String mimeType;
    @Min(1) private Integer maxAttempts;
    @DecimalMin("0") @DecimalMax("100") private BigDecimal passingScore;
    @Min(0) private Integer timeLimit;
    @DecimalMin("0") private BigDecimal points;
    private LocalDateTime deadline;
    private Map<String, Object> settings;
    private ResourceStatus status;
    private LocalDateTime availableFrom;
    private LocalDateTime availableUntil;
    private QuizCategory quizCategory;
}