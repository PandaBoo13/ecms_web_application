package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Setter @Getter
public class QuizSubmitRequest {
    @NotNull private Long attemptId;
    @NotNull private String answers;
}