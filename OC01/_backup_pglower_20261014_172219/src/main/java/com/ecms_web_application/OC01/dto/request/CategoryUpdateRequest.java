package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class CategoryUpdateRequest {

    @Size(max = 255, message = "Tên danh mục tối đa 255 ký tự")
    private String name;

    @Size(max = 255, message = "Slug tối đa 255 ký tự")
    private String slug;

    @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
    private String description;

    private Long parentId;   // null = đưa lên gốc (nếu muốn đổi)

    private Boolean isActive;
}