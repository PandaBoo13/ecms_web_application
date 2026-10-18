package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StudentConvertFromLeadRequest {

    @NotNull(message = "ID của Lead không được để trống")
    private Long leadId;

    private Long courseId;

    private Long classId;

    private String note;
}

