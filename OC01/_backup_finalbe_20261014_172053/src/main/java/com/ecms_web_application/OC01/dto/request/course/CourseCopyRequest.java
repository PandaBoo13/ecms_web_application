package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Setter @Getter
public class CourseCopyRequest {
    @NotBlank @Size(max = 255) private String newTitle;
    @NotBlank @Size(max = 50)  private String newDisplayCode;
    private Boolean resetPrice = false;
}