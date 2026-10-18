package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Entity đại diện cho nguồn Lead (LeadSources).
 * Bảng: lead_sources
 */
@Getter
@Setter
@Entity
@Table(name = "lead_sources")
public class LeadSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "source_name", nullable = false, length = 255)
    private String sourceName;

    @Column(name = "channel_type", nullable = false, length = 50)
    private String channelType;
}

