package com.ecms_web_application.OC01.dto.request.chat;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AddParticipantRequest {

    @NotEmpty(message = "Danh sách thành viên không được để trống")
    private List<Long> accountIds;
}