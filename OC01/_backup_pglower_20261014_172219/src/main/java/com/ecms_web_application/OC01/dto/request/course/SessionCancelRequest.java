package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Setter @Getter
public class SessionCancelRequest {
    @NotBlank @Size(max = 500) private String reason;
}