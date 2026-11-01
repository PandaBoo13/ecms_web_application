package com.ecms_web_application.OC01.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/**
 * Lớp đại diện cho nguồn Lead (Model / DTO).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LeadSource implements Serializable {

    private Long id;
    private String sourceName;
    private String channelType;
    private String description;
}
