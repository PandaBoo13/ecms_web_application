package com.ecms_web_application.OC01.entity;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

/**
 * Composite key cho instructor_specialization.
 * Tên field PHẢI khớp chính xác với tên field @Id trong entity chính.
 */
@Setter
@Getter
@EqualsAndHashCode
public class InstructorSpecializationId implements Serializable {
    private Long account;
    private Long category;
}