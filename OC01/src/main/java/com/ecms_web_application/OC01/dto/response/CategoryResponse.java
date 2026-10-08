package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
public class CategoryResponse {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private Long parentId;
    private String parentName;
    private Boolean isActive;
    private Long childCount;   // Số danh mục con trực tiếp
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}