package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class CategoryCreateRequest {

    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 255, message = "Tên danh mục tối đa 255 ký tự")
    private String name;

    @Size(max = 255, message = "Slug tối đa 255 ký tự")
    private String slug;   // Nếu null → tự sinh từ name

    @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
    private String description;

    private Long parentId;  // null nếu là cấp cao nhất
}