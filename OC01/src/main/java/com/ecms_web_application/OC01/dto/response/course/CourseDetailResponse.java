package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.util.ArrayList;
import java.util.List;

@Setter @Getter
public class CourseDetailResponse extends CourseResponse {
    private String description;
    private List<String> outcomes = new ArrayList<>();
    private List<CourseResourceResponse> resources = new ArrayList<>();
    private List<SessionResponse> sessions = new ArrayList<>();
}