package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Cây category — dùng cho UI tree view hoặc dropdown phân cấp.
 */
@Setter
@Getter
public class CategoryTreeResponse {

    private Long id;
    private String name;
    private String slug;
    private Boolean isActive;
    private List<CategoryTreeResponse> children = new ArrayList<>();
}