package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Setter @Getter
public class CourseUpdateRequest {
    @Size(max = 255) private String title;
    @Size(max = 500) private String shortDescription;
    private String description;
    private String thumbnailUrl;
    private List<String> outcomes;
    @DecimalMin("0") private BigDecimal price;
    @DecimalMin("0") private BigDecimal oldPrice;
    private Boolean isFree;
    private Long categoryId;
    private Long roomId;

    @Size(max = 20)
    @Pattern(regexp = "^$|^(AUTONOMOUS|SEQUENTIAL)$",
            message = "learning_mode chỉ chấp nhận AUTONOMOUS hoặc SEQUENTIAL")
    private String learningMode;

    private List<Long> allowedRoomIds;

    // 🆕 BỔ SUNG
    @Min(value = 0, message = "total_sessions_expected phải >= 0")
    private Integer totalSessionsExpected;    private Long certificateTypeId;
    private java.util.Map<String, Object> certificateConfig;

}