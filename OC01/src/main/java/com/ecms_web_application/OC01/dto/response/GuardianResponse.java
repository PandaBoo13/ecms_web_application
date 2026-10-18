package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GuardianResponse {

    private Long id;
    private Long studentId;
    private String fullName;
    private String relationship;
    private String phone;
    private String email;
}

