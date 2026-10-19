package com.ecms_web_application.OC01.dto.request.course;

import com.ecms_web_application.OC01.entity.enums.QuizCategory;
import com.ecms_web_application.OC01.entity.enums.ResourceStatus;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Setter @Getter
public class ResourceCreateRequest {

    @NotNull private ResourceType resourceType;
    private Long parentId;
    @NotBlank @Size(max = 255) private String title;
    private String description;
    @Min(0) private Integer orderIndex;
    private Boolean isRequired = false;
    private Boolean isFreePreview = false;
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
    private ResourceStatus status = ResourceStatus.DRAFT;
    private LocalDateTime availableFrom;
    private LocalDateTime availableUntil;
    private QuizCategory quizCategory;
    @Size(max = 500)
    private String hashtagFilter;

    @Min(1)
    private Integer totalQuestions;

    private Boolean shuffleQuestions;
}