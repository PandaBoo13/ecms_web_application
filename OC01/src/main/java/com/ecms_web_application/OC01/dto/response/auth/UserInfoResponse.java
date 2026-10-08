package com.ecms_web_application.OC01.dto.response.auth;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class UserInfoResponse {

    private Long accountId;
    private String email;
    private String roleCode;

    // Từ UserProfile
    private String fullName;
    private String phone;
    private String avatarUrl;
    private String address;
}