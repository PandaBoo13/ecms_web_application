package com.ecms_web_application.OC01.dto.request.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

/**
 * Payload khi requester tạo 1 yêu cầu.
 *  - requestType   : bắt buộc, convert sang enum
 *  - targetEntityId: optional — service tự set từ RequestType.getTargetEntityType()
 *  - payload       : field riêng từng loại (ScheduleChange cần proposed_start, ...)
 */
@Getter
@Setter
public class RequestCreateRequest {

    @NotBlank(message = "Loại yêu cầu là bắt buộc")
    @Size(max = 50, message = "Loại yêu cầu tối đa 50 ký tự")
    private String requestType;

    @NotBlank(message = "Tiêu đề là bắt buộc")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    private String description;

    /** ID của entity đích — null nếu type không gắn entity */
    private Long targetEntityId;

    private Map<String, Object> payload;
}