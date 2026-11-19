package com.ecms_web_application.OC01.generic;

import com.ecms_web_application.OC01.entity.course.Course;

import java.util.Locale;

/** Thang điểm cuối khóa: khóa TOEIC chấm theo thang 990, các khóa còn lại thang 100. */
public final class CourseScoreScale {
    public static final int DEFAULT_MAX_SCORE = 100;
    public static final int TOEIC_MAX_SCORE = 990;

    private CourseScoreScale() {
    }

    public static int maxFinalScore(Course course) {
        if (course == null) return DEFAULT_MAX_SCORE;
        String categoryName = course.getCategory() != null ? course.getCategory().getName() : null;
        return isToeic(course.getCode()) || isToeic(course.getDisplayCode())
                || isToeic(course.getTitle()) || isToeic(categoryName)
                ? TOEIC_MAX_SCORE
                : DEFAULT_MAX_SCORE;
    }

    private static boolean isToeic(String value) {
        return value != null && value.toUpperCase(Locale.ROOT).contains("TOEIC");
    }
}
