package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LeadAssignRequest {

    @NotNull(message = "ID tư vấn viên không được để trống")
    private Long consultantId;

    private String reason;
}

