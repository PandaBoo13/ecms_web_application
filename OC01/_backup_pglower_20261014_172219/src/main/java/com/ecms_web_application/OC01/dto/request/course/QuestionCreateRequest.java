package com.ecms_web_application.OC01.dto.request.course;

import com.ecms_web_application.OC01.entity.enums.QuestionStatus;
import com.ecms_web_application.OC01.entity.enums.QuestionType;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Setter @Getter
public class QuestionCreateRequest {
    private Long lessonId;
    @NotNull private QuestionType questionType;
    @NotBlank private String content;
    private List<String> options;
    private List<String> correctAnswer;
    private String explanation;
    @Size(max = 255) private String hashtag;
    @DecimalMin("0") private BigDecimal points = BigDecimal.ONE;
    @Min(0) private Integer orderIndex = 0;
    private QuestionStatus status = QuestionStatus.ACTIVE;
}