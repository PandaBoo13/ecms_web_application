package com.ecms_web_application.OC01.dto.response.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class RequestResponse {

    private Long id;
    private String requestCode;

    private String requestType;
    private String requestTypeName;

    private Long requesterId;
    private String requesterName;

    private String targetEntityType;
    private Long targetEntityId;

    private String title;
    private String status;
    private String rejectReason;

    private LocalDateTime resolvedAt;
    private Long resolvedBy;
    private String resolvedByName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}