package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ResourceReorderRequest {

    @NotEmpty(message = "Danh sách reorder không được để trống")
    @Valid
    private List<ReorderItem> items;

    @Getter
    @Setter
    public static class ReorderItem {
        @NotNull(message = "ID không được để trống")
        private Long id;

        @NotNull(message = "OrderIndex không được để trống")
        private Integer orderIndex;
    }
}