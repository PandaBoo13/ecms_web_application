package com.ecms_web_application.OC01.dto.request.course;

import com.ecms_web_application.OC01.entity.enums.CourseType;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Setter @Getter
public class CourseCreateRequest {

    @NotBlank @Size(max = 255) private String title;
    @Size(max = 500) private String shortDescription;
    private String description;
    private String thumbnailUrl;
    private List<String> outcomes;

    @NotNull @DecimalMin("0") private BigDecimal price = BigDecimal.ZERO;
    @DecimalMin("0") private BigDecimal oldPrice;
    private Boolean isFree = false;

    @NotNull private CourseType courseType = CourseType.ONLINE;
    private Long categoryId;
    private Long teacherId;
    private Long roomId;
}