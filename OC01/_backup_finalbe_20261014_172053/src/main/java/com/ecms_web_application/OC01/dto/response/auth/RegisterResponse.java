package com.ecms_web_application.OC01.dto.response.auth;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class RegisterResponse {

    private Long accountId;
    private String email;
    private String fullName;
    private String roleCode;
    private String message;
}