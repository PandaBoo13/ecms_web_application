package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LeadInteractionCreateRequest {

    @NotBlank(message = "Loại tương tác không được để trống (CALL, MEETING, EMAIL, CHAT, OTHER)")
    private String interactionType;

    private String notes;

    @NotBlank(message = "Kết quả tư vấn không được để trống (INTERESTED, CONSIDERING, REJECTED, CANNOT_CONTACT)")
    private String result;

    private String rejectReason;
}

