package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class SpecializationAddRequest {

    @NotNull(message = "Category ID không được để trống")
    private Long categoryId;

    /** Có phải chuyên môn chính không? Mặc định false. */
    private Boolean isPrimary = false;

    /** Số năm kinh nghiệm với chuyên môn này. */
    @Min(value = 0, message = "Số năm kinh nghiệm phải >= 0")
    private Short yearsOfExp;
}