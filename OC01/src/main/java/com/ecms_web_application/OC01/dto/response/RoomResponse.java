package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Setter @Getter
public class RoomResponse {
    private Long id;
    private String code;
    private String name;
    private Integer capacity;
    private String location;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}