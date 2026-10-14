package com.ecms_web_application.OC01.dto.request.course;

import com.ecms_web_application.OC01.entity.enums.QuizCategory;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Setter @Getter
public class QuizCreateRequest {
    @NotBlank @Size(max = 255) private String title;
    @NotNull private QuizCategory quizType = QuizCategory.OPTIONAL;
    @NotNull @Min(0) @Max(100) private Integer passingScore = 70;
    @Min(1) private Integer maxAttempts;
    private Integer timeLimit;
    private Boolean shuffleQuestions = false;
    @Min(1) private Integer totalQuestions = 10;
    @Size(max = 500) private String hashtagFilter;
    private LocalDateTime availableFrom;
    private LocalDateTime availableUntil;
}