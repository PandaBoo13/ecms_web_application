package com.ecms_web_application.OC01.dto.request.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreateConversationRequest {

    @NotBlank(message = "Loại conversation không được để trống")
    @Pattern(regexp = "PRIVATE|GROUP|COURSE",
             message = "Loại conversation phải là PRIVATE, GROUP hoặc COURSE")
    private String conversationType;

    @Size(max = 255, message = "Tên nhóm không được vượt quá 255 ký tự")
    private String name;

    private Long courseId;

    private List<Long> participantIds;
}