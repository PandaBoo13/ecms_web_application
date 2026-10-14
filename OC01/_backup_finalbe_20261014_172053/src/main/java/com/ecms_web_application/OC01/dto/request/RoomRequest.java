package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Setter @Getter
public class RoomRequest {
    @Size(max = 50) private String code;
    @NotBlank @Size(max = 100) private String name;
    @Min(0) private Integer capacity;
    @Size(max = 255) private String location;
    private Boolean isActive = true;
}