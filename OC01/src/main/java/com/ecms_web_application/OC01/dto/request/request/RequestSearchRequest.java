package com.ecms_web_application.OC01.dto.request.request;

import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Getter
@Setter
public class RequestSearchRequest {

    private String requestType;
    /** Loại yêu cầu cần loại khỏi kết quả (vd LEAVE_FEEDBACK — Admin chỉ xem ở buổi điểm danh). */
    private String excludeRequestType;
    private String status;
    private Long requesterId;

    private String targetEntityType;
    private Long targetEntityId;

    private String keyword;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime fromDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime toDate;

    private int page = 0;
    private int size = 20;
    private String sortBy = "createdAt";
    private String sortDirection = "DESC";
}