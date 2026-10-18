package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class StudentResponse {

    private Long id;
    private String studentCode;
    private Long leadId;
    private Long userId;
    private String fullName;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private String address;
    private String status;
    private Boolean hasAccount;
    private Boolean isAccountLocked;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
